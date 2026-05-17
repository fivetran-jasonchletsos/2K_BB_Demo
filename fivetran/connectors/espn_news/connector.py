"""Fivetran custom connector: ESPN News (NBA)

Pulls NBA articles and headlines from ESPN's public JSON endpoints.

Destination: lands into MDLS (Fivetran Managed Data Lake Service) as Iceberg
tables under the `bronze_espn_news` schema. Tables registered in the MDLS
catalog (Glue or Polaris):
    bronze_espn_news.articles
    bronze_espn_news.headlines

Any engine with an Iceberg catalog reader (Snowflake, Databricks, Athena,
Trino) can query these tables directly off S3.

Endpoints:
    https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?limit=50
    https://now.core.api.espn.com/v1/sports/news?limit=50&sport=basketball&league=nba

No auth required. Articles include a `published` ISO timestamp used as the
cursor. Destination config (S3 bucket, catalog) is set on the MDLS
destination in the Fivetran UI, not in this connector.

Tables:
    articles   — long-form ESPN articles with byline, body summary, links
    headlines  — short-form headline events from now-feed

Cadence: every 5 minutes. Cursor: `published`.
"""

from datetime import datetime, timezone
from typing import Any, Iterable

import requests
from fivetran_connector_sdk import Connector
from fivetran_connector_sdk import Logging as log
from fivetran_connector_sdk import Operations as op

ARTICLES_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news"
HEADLINES_URL = "https://now.core.api.espn.com/v1/sports/news"
USER_AGENT = "fivetran-2klab/0.1"
PAGE_LIMIT = 50
CHECKPOINT_EVERY = 50


def schema(configuration: dict):
    return [
        {"table": "articles", "primary_key": ["id"]},
        {"table": "headlines", "primary_key": ["id"]},
    ]


def _get(url: str, params: dict) -> dict:
    resp = requests.get(
        url,
        params=params,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def _first_link(links: dict | list | None) -> str | None:
    if isinstance(links, dict):
        web = (links.get("web") or {})
        return (web.get("href") if isinstance(web, dict) else None) or links.get("href")
    if isinstance(links, list) and links:
        first = links[0]
        if isinstance(first, dict):
            return first.get("href")
    return None


def _sync_articles(state: dict) -> Iterable[Any]:
    cursor = state.get("articles_cursor") or "1970-01-01T00:00:00Z"
    log.info(f"espn_news: articles cursor={cursor}")
    payload = _get(ARTICLES_URL, {"limit": PAGE_LIMIT})
    articles = payload.get("articles") or []
    max_cursor = cursor
    count = 0
    for a in articles:
        published = a.get("published") or a.get("lastModified")
        if not published or published <= cursor:
            continue
        if published > max_cursor:
            max_cursor = published
        cats = a.get("categories") or []
        # Map athlete categories to a player_id list (athlete.id) when present.
        athlete_ids = [
            (c.get("athlete") or {}).get("id")
            for c in cats
            if c.get("type") == "athlete" and (c.get("athlete") or {}).get("id")
        ]
        yield op.upsert(
            table="articles",
            data={
                "id": a.get("id"),
                "type": a.get("type"),
                "headline": a.get("headline"),
                "description": a.get("description"),
                "story": a.get("story"),
                "byline": a.get("byline"),
                "published": published,
                "last_modified": a.get("lastModified"),
                "premium": a.get("premium"),
                "link": _first_link(a.get("links")),
                "athlete_ids": ",".join(str(x) for x in athlete_ids) if athlete_ids else None,
            },
        )
        count += 1
        if count % CHECKPOINT_EVERY == 0:
            state["articles_cursor"] = max_cursor
            yield op.checkpoint(state)
    state["articles_cursor"] = max_cursor
    log.info(f"espn_news: articles upserted={count}, cursor={max_cursor}")


def _sync_headlines(state: dict) -> Iterable[Any]:
    cursor = state.get("headlines_cursor") or "1970-01-01T00:00:00Z"
    log.info(f"espn_news: headlines cursor={cursor}")
    payload = _get(
        HEADLINES_URL,
        {"limit": PAGE_LIMIT, "sport": "basketball", "league": "nba"},
    )
    headlines = payload.get("headlines") or payload.get("items") or []
    max_cursor = cursor
    count = 0
    for h in headlines:
        published = h.get("published") or h.get("lastModified")
        if not published or published <= cursor:
            continue
        if published > max_cursor:
            max_cursor = published
        yield op.upsert(
            table="headlines",
            data={
                "id": h.get("id"),
                "headline": h.get("headline") or h.get("title"),
                "description": h.get("description"),
                "type": h.get("type"),
                "published": published,
                "link": _first_link(h.get("links")),
            },
        )
        count += 1
    state["headlines_cursor"] = max_cursor
    log.info(f"espn_news: headlines upserted={count}, cursor={max_cursor}")


def update(configuration: dict, state: dict):
    log.info(f"espn_news: update() starting, state={state}")
    yield from _sync_articles(state)
    yield from _sync_headlines(state)
    state["last_run_at"] = datetime.now(timezone.utc).isoformat()
    yield op.checkpoint(state)
    log.info(f"espn_news: update() complete, state={state}")


connector = Connector(update=update, schema=schema)


if __name__ == "__main__":
    connector.debug()
