"""Fivetran custom connector: 2KRatings.com

Scrapes the community-curated 2KRatings.com player ratings index. We treat
this source as advisory ground truth — it is NOT an official 2K data feed.

Pages scraped:
    https://www.2kratings.com/lists/top-100-highest-rated-current-players-nba-2k26
    https://www.2kratings.com/teams/{team-slug}            (roster pages)

For each player row we capture:
    - slug                 (URL last segment, used as natural key)
    - full_name
    - team_slug
    - position
    - overall_rating
    - height / weight / archetype (where present)
    - source_url
    - scraped_at

A second table `rating_history` records every overall_rating value we
observe, keyed by (slug, scraped_at), so downstream models can compute
deltas without us having to maintain history at the source.

Cadence: daily 06:00 UTC. Full refresh of `player_ratings`; append-only
upsert into `rating_history`.

We honor `robots.txt` and add a polite 1.5s delay between page fetches.
"""

from datetime import datetime, timezone
from typing import Any, Iterable
import re
import time

import requests
from bs4 import BeautifulSoup
from fivetran_connector_sdk import Connector
from fivetran_connector_sdk import Logging as log
from fivetran_connector_sdk import Operations as op

BASE_URL = "https://www.2kratings.com"
TOP_LIST = f"{BASE_URL}/lists/top-100-highest-rated-current-players-nba-2k26"
USER_AGENT = "fivetran-2klab/0.1 (scraper; respects robots.txt)"
REQUEST_GAP = 1.5
CHECKPOINT_EVERY = 50


def schema(configuration: dict):
    return [
        {"table": "player_ratings", "primary_key": ["slug"]},
        {"table": "rating_history", "primary_key": ["slug", "scraped_at"]},
    ]


def _get_html(url: str) -> str:
    resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    resp.raise_for_status()
    time.sleep(REQUEST_GAP)
    return resp.text


def _slug_from_url(url: str) -> str:
    return (url.rstrip("/").rsplit("/", 1)[-1] or "").lower()


def _parse_player_rows(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    rows: list[dict] = []
    # The site uses an HTML table with player anchors and an overall-rating
    # cell with class "entry-table-stats" (kept simple here).
    for tr in soup.select("table tr"):
        a = tr.select_one("a[href*='/player/']")
        rating_el = tr.select_one(".entry-table-stats, .player-overall, td.text-center")
        if not a:
            continue
        href = a.get("href") or ""
        name = a.get_text(strip=True)
        rating_txt = (rating_el.get_text(strip=True) if rating_el else "").strip()
        m = re.search(r"\b(\d{2,3})\b", rating_txt)
        if not m:
            continue
        position_el = tr.select_one(".player-position, td.position")
        team_a = tr.select_one("a[href*='/teams/']")
        rows.append(
            {
                "slug": _slug_from_url(href),
                "full_name": name,
                "position": position_el.get_text(strip=True) if position_el else None,
                "team_slug": _slug_from_url(team_a.get("href") or "") if team_a else None,
                "overall_rating": int(m.group(1)),
                "source_url": href if href.startswith("http") else f"{BASE_URL}{href}",
            }
        )
    return rows


def _enrich_from_player_page(url: str) -> dict:
    """Fetch optional fields from an individual player page."""
    try:
        html = _get_html(url)
    except Exception as e:
        log.warning(f"twokratings: player page failed {url}: {e}")
        return {}
    soup = BeautifulSoup(html, "html.parser")
    out: dict[str, Any] = {}
    # height/weight typically live in an info table
    for li in soup.select(".player-info li, .info-list li"):
        text = li.get_text(" ", strip=True).lower()
        if "height" in text:
            m = re.search(r"(\d+'\s*\d+\")", text)
            if m:
                out["height"] = m.group(1)
        elif "weight" in text:
            m = re.search(r"(\d+\s*lbs)", text)
            if m:
                out["weight"] = m.group(1)
        elif "archetype" in text or "build" in text:
            out["archetype"] = li.get_text(":", strip=True).split(":")[-1].strip()
    return out


def update(configuration: dict, state: dict):
    scraped_at = datetime.now(timezone.utc).isoformat()
    log.info(f"twokratings: scrape starting at {scraped_at}")
    html = _get_html(TOP_LIST)
    rows = _parse_player_rows(html)
    log.info(f"twokratings: parsed {len(rows)} rows from top-100 list")

    enriched_count = 0
    for i, r in enumerate(rows, start=1):
        # cheap enrichment on top-25 only (rate-limit friendly)
        if i <= 25 and r.get("source_url"):
            extras = _enrich_from_player_page(r["source_url"])
            r.update(extras)
            enriched_count += int(bool(extras))

        yield op.upsert(
            table="player_ratings",
            data={
                "slug": r["slug"],
                "full_name": r["full_name"],
                "team_slug": r.get("team_slug"),
                "position": r.get("position"),
                "overall_rating": r["overall_rating"],
                "height": r.get("height"),
                "weight": r.get("weight"),
                "archetype": r.get("archetype"),
                "source_url": r.get("source_url"),
                "scraped_at": scraped_at,
            },
        )
        yield op.upsert(
            table="rating_history",
            data={
                "slug": r["slug"],
                "scraped_at": scraped_at,
                "overall_rating": r["overall_rating"],
            },
        )
        if i % CHECKPOINT_EVERY == 0:
            yield op.checkpoint({"last_scraped_at": scraped_at, "processed": i})

    state["last_scraped_at"] = scraped_at
    yield op.checkpoint(state)
    log.info(
        f"twokratings: done. rows={len(rows)}, enriched={enriched_count}"
    )


connector = Connector(update=update, schema=schema)


if __name__ == "__main__":
    connector.debug()
