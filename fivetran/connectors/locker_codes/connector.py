"""Fivetran custom connector: 2K Locker Codes

Aggregates currently-active 2K locker codes from a community aggregator
JSON endpoint. The endpoint is configurable so we can repoint without
re-deploying. A reasonable default is a static JSON file hosted on
GitHub Pages / Vercel.

Expected upstream JSON shape:
{
  "fetched_at": "2026-05-16T12:00:00Z",
  "codes": [
    {
      "code": "CHASE-THE-CHIP-2K26",
      "reward_type": "player_card",
      "reward_value": "Diamond Steph Curry",
      "released_at": "2026-05-12T18:00:00Z",
      "expires_at":  "2026-05-19T18:00:00Z",
      "source_url": "https://...",
      "mode": "myteam"
    }
  ]
}

Tables:
    drops — one row per (code, seen_at). PK = (code).

Cadence: every 5 minutes.
"""

from datetime import datetime, timezone
from typing import Any, Iterable

import requests
from fivetran_connector_sdk import Connector
from fivetran_connector_sdk import Logging as log
from fivetran_connector_sdk import Operations as op

DEFAULT_FEED_URL = "https://example.invalid/2k-locker-codes/feed.json"
USER_AGENT = "fivetran-2klab/0.1"


def schema(configuration: dict):
    return [
        {"table": "drops", "primary_key": ["code"]},
    ]


def _get_feed(url: str) -> dict:
    resp = requests.get(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def update(configuration: dict, state: dict):
    feed_url = configuration.get("feed_url") or DEFAULT_FEED_URL
    seen_at = datetime.now(timezone.utc).isoformat()
    log.info(f"locker_codes: pulling feed {feed_url}")

    try:
        feed = _get_feed(feed_url)
    except Exception as e:
        log.warning(f"locker_codes: feed fetch failed: {e}")
        # Emit no rows; keep cursor untouched so next sync retries.
        yield op.checkpoint(state)
        return

    codes = feed.get("codes") or []
    log.info(f"locker_codes: received {len(codes)} codes")

    count = 0
    for c in codes:
        code = (c.get("code") or "").strip()
        if not code:
            continue
        yield op.upsert(
            table="drops",
            data={
                "code": code,
                "reward_type": c.get("reward_type"),
                "reward_value": c.get("reward_value"),
                "released_at": c.get("released_at"),
                "expires_at": c.get("expires_at"),
                "source_url": c.get("source_url"),
                "mode": c.get("mode"),
                "seen_at": seen_at,
            },
        )
        count += 1

    state["last_seen_at"] = seen_at
    yield op.checkpoint(state)
    log.info(f"locker_codes: upserted {count} drops at {seen_at}")


connector = Connector(update=update, schema=schema)


if __name__ == "__main__":
    connector.debug()
