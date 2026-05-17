"""Fivetran custom connector: balldontlie.io

Pulls NBA reference data (teams, players, games, stats, season_averages) from
the public balldontlie REST API.

Destination: lands into MDLS (Fivetran Managed Data Lake Service) as Iceberg
tables under the `bronze_balldontlie` schema. Tables registered in the MDLS
catalog (Glue or Polaris):
    bronze_balldontlie.teams
    bronze_balldontlie.players
    bronze_balldontlie.games
    bronze_balldontlie.stats
    bronze_balldontlie.season_averages

Any engine with an Iceberg catalog reader (Snowflake, Databricks, Athena,
Trino) can query these tables directly off S3.

Endpoints (v1):
    GET /v1/teams
    GET /v1/players?cursor=...&per_page=100
    GET /v1/games?cursor=...&per_page=100&dates[]=YYYY-MM-DD
    GET /v1/stats?cursor=...&per_page=100&start_date=YYYY-MM-DD
    GET /v1/season_averages?season=YYYY&player_ids[]=...

Auth: `Authorization: <api_key>` header (free tier supports basic endpoints,
paid tiers unlock stats/season_averages). API key is supplied via
`configuration.json`. Destination config (S3 bucket, catalog) is set on the
MDLS destination in the Fivetran UI, not here.

State / cursors:
    - players are full-refreshed (small table, no public delta)
    - games are pulled by `date >= cursor_date`
    - stats are pulled by `start_date >= cursor_date`
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

import requests
from fivetran_connector_sdk import Connector
from fivetran_connector_sdk import Logging as log
from fivetran_connector_sdk import Operations as op

BASE_URL = "https://api.balldontlie.io/v1"
DEFAULT_START_DATE = "2024-10-01"  # NBA 2024-25 season start
PAGE_SIZE = 100
CHECKPOINT_EVERY = 500


def schema(configuration: dict):
    return [
        {"table": "teams", "primary_key": ["id"]},
        {"table": "players", "primary_key": ["id"]},
        {"table": "games", "primary_key": ["id"]},
        {"table": "stats", "primary_key": ["id"]},
        {"table": "season_averages", "primary_key": ["player_id", "season"]},
    ]


def _headers(configuration: dict) -> dict:
    api_key = configuration.get("api_key")
    if not api_key:
        raise ValueError("Missing required configuration field: api_key")
    return {"Authorization": api_key, "Accept": "application/json"}


def _get(url: str, headers: dict, params: dict | None = None) -> dict:
    resp = requests.get(url, headers=headers, params=params or {}, timeout=30)
    if resp.status_code == 429:
        log.warning(f"balldontlie 429 rate-limited on {url}")
        raise RuntimeError("rate limited")
    resp.raise_for_status()
    return resp.json()


def _paginate(url: str, headers: dict, params: dict) -> Iterable[dict]:
    cursor: Any = None
    while True:
        page_params = {**params, "per_page": PAGE_SIZE}
        if cursor is not None:
            page_params["cursor"] = cursor
        payload = _get(url, headers, page_params)
        for row in payload.get("data", []):
            yield row
        meta = payload.get("meta") or {}
        cursor = meta.get("next_cursor")
        if not cursor:
            break


def _sync_teams(configuration: dict) -> Iterable[Any]:
    headers = _headers(configuration)
    log.info("balldontlie: syncing teams (full refresh)")
    count = 0
    for row in _paginate(f"{BASE_URL}/teams", headers, {}):
        yield op.upsert(
            table="teams",
            data={
                "id": row["id"],
                "abbreviation": row.get("abbreviation"),
                "city": row.get("city"),
                "conference": row.get("conference"),
                "division": row.get("division"),
                "full_name": row.get("full_name"),
                "name": row.get("name"),
            },
        )
        count += 1
    log.info(f"balldontlie: teams upserted={count}")


def _sync_players(configuration: dict) -> Iterable[Any]:
    headers = _headers(configuration)
    log.info("balldontlie: syncing players (full refresh, paginated)")
    count = 0
    for row in _paginate(f"{BASE_URL}/players", headers, {}):
        team = row.get("team") or {}
        yield op.upsert(
            table="players",
            data={
                "id": row["id"],
                "first_name": row.get("first_name"),
                "last_name": row.get("last_name"),
                "position": row.get("position"),
                "height": row.get("height"),
                "weight": row.get("weight"),
                "jersey_number": row.get("jersey_number"),
                "college": row.get("college"),
                "country": row.get("country"),
                "draft_year": row.get("draft_year"),
                "draft_round": row.get("draft_round"),
                "draft_number": row.get("draft_number"),
                "team_id": team.get("id"),
            },
        )
        count += 1
        if count % CHECKPOINT_EVERY == 0:
            yield op.checkpoint({"players_count": count})
    log.info(f"balldontlie: players upserted={count}")


def _sync_games(configuration: dict, state: dict) -> Iterable[Any]:
    headers = _headers(configuration)
    cursor_date = state.get("games_cursor_date") or DEFAULT_START_DATE
    log.info(f"balldontlie: syncing games from {cursor_date}")
    params = {"start_date": cursor_date}
    count = 0
    max_date = cursor_date
    for row in _paginate(f"{BASE_URL}/games", headers, params):
        home = row.get("home_team") or {}
        visitor = row.get("visitor_team") or {}
        game_date = row.get("date")
        if game_date and game_date > max_date:
            max_date = game_date
        yield op.upsert(
            table="games",
            data={
                "id": row["id"],
                "date": game_date,
                "season": row.get("season"),
                "status": row.get("status"),
                "period": row.get("period"),
                "time": row.get("time"),
                "postseason": row.get("postseason"),
                "home_team_id": home.get("id"),
                "visitor_team_id": visitor.get("id"),
                "home_team_score": row.get("home_team_score"),
                "visitor_team_score": row.get("visitor_team_score"),
            },
        )
        count += 1
        if count % CHECKPOINT_EVERY == 0:
            state["games_cursor_date"] = max_date
            yield op.checkpoint(state)
    state["games_cursor_date"] = max_date
    log.info(f"balldontlie: games upserted={count}, new cursor={max_date}")


def _sync_stats(configuration: dict, state: dict) -> Iterable[Any]:
    headers = _headers(configuration)
    cursor_date = state.get("stats_cursor_date") or DEFAULT_START_DATE
    log.info(f"balldontlie: syncing stats from {cursor_date}")
    params = {"start_date": cursor_date}
    count = 0
    max_date = cursor_date
    for row in _paginate(f"{BASE_URL}/stats", headers, params):
        game = row.get("game") or {}
        player = row.get("player") or {}
        team = row.get("team") or {}
        game_date = game.get("date")
        if game_date and game_date > max_date:
            max_date = game_date
        yield op.upsert(
            table="stats",
            data={
                "id": row["id"],
                "game_id": game.get("id"),
                "player_id": player.get("id"),
                "team_id": team.get("id"),
                "min": row.get("min"),
                "pts": row.get("pts"),
                "reb": row.get("reb"),
                "ast": row.get("ast"),
                "stl": row.get("stl"),
                "blk": row.get("blk"),
                "turnover": row.get("turnover"),
                "pf": row.get("pf"),
                "fgm": row.get("fgm"),
                "fga": row.get("fga"),
                "fg_pct": row.get("fg_pct"),
                "fg3m": row.get("fg3m"),
                "fg3a": row.get("fg3a"),
                "fg3_pct": row.get("fg3_pct"),
                "ftm": row.get("ftm"),
                "fta": row.get("fta"),
                "ft_pct": row.get("ft_pct"),
                "oreb": row.get("oreb"),
                "dreb": row.get("dreb"),
                "plus_minus": row.get("plus_minus"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        count += 1
        if count % CHECKPOINT_EVERY == 0:
            state["stats_cursor_date"] = max_date
            yield op.checkpoint(state)
    state["stats_cursor_date"] = max_date
    log.info(f"balldontlie: stats upserted={count}, new cursor={max_date}")


def update(configuration: dict, state: dict):
    log.info(f"balldontlie: update() starting, state={state}")
    yield from _sync_teams(configuration)
    yield from _sync_players(configuration)
    yield from _sync_games(configuration, state)
    yield from _sync_stats(configuration, state)
    yield op.checkpoint(state)
    log.info(f"balldontlie: update() complete, state={state}")


connector = Connector(update=update, schema=schema)


if __name__ == "__main__":
    connector.debug()
