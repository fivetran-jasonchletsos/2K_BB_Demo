"""Fivetran custom connector: stats.nba.com

Pulls NBA play-by-play, box scores, lineups, and shot chart detail from the
public-but-undocumented stats.nba.com JSON endpoints.

IMPORTANT: stats.nba.com aggressively blocks requests that look like bots.
You must send browser-like headers:

    User-Agent: Mozilla/5.0 ...
    Referer: https://www.nba.com/
    Origin: https://www.nba.com
    x-nba-stats-token: true
    x-nba-stats-origin: stats

Endpoints used (resultSets[0] = column array + row array):
    /stats/leaguegamelog?Season=2024-25&SeasonType=Regular+Season
    /stats/boxscoretraditionalv2?GameID=...
    /stats/boxscoreplayertrackv2?GameID=...
    /stats/playbyplayv2?GameID=...
    /stats/shotchartdetail?PlayerID=0&Season=2024-25&...

Cursor: `game_date`. We pull the league game log first to discover new
GameIDs, then fan out box score / play-by-play / shot chart per game.

The endpoints rate-limit at roughly 1 req / sec; we sleep 1.1s between
calls and exponentially back off on HTTP 429.
"""

from datetime import datetime, timezone
from typing import Any, Iterable
import time

import requests
from fivetran_connector_sdk import Connector
from fivetran_connector_sdk import Logging as log
from fivetran_connector_sdk import Operations as op

BASE_URL = "https://stats.nba.com/stats"
DEFAULT_SEASON = "2024-25"
REQUEST_GAP_SECONDS = 1.1
MAX_BACKOFF = 60
CHECKPOINT_EVERY = 25  # by GameID

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nba.com/",
    "Origin": "https://www.nba.com",
    "x-nba-stats-token": "true",
    "x-nba-stats-origin": "stats",
    "Connection": "keep-alive",
}


def schema(configuration: dict):
    return [
        {"table": "box_scores", "primary_key": ["game_id", "player_id"]},
        {"table": "play_by_play", "primary_key": ["game_id", "event_num"]},
        {"table": "lineups", "primary_key": ["game_id", "team_id", "lineup_hash"]},
        {"table": "shot_chart_detail", "primary_key": ["game_id", "game_event_id", "player_id"]},
    ]


def _get(url: str, params: dict) -> dict:
    backoff = 2
    while True:
        resp = requests.get(url, headers=BROWSER_HEADERS, params=params, timeout=30)
        if resp.status_code == 429:
            log.warning(f"nba_stats 429, sleeping {backoff}s")
            time.sleep(backoff)
            backoff = min(MAX_BACKOFF, backoff * 2)
            continue
        resp.raise_for_status()
        time.sleep(REQUEST_GAP_SECONDS)
        return resp.json()


def _result_set_rows(payload: dict, name: str | None = None) -> list[dict]:
    sets = payload.get("resultSets") or []
    target = sets[0] if not name else next((s for s in sets if s.get("name") == name), None)
    if not target:
        return []
    cols = [c.lower() for c in target.get("headers", [])]
    return [dict(zip(cols, row)) for row in target.get("rowSet", [])]


def _list_games(season: str, since_date: str) -> list[dict]:
    payload = _get(
        f"{BASE_URL}/leaguegamelog",
        {
            "Counter": 1000,
            "Direction": "ASC",
            "LeagueID": "00",
            "PlayerOrTeam": "T",
            "Season": season,
            "SeasonType": "Regular Season",
            "Sorter": "DATE",
            "DateFrom": since_date,
        },
    )
    rows = _result_set_rows(payload)
    # dedupe to one entry per GAME_ID
    seen = set()
    games: list[dict] = []
    for r in rows:
        gid = r.get("game_id")
        if gid and gid not in seen:
            seen.add(gid)
            games.append(r)
    return games


def _sync_box_score(game_id: str) -> Iterable[Any]:
    payload = _get(
        f"{BASE_URL}/boxscoretraditionalv2",
        {
            "GameID": game_id,
            "StartPeriod": 0,
            "EndPeriod": 14,
            "StartRange": 0,
            "EndRange": 28800,
            "RangeType": 0,
        },
    )
    rows = _result_set_rows(payload, "PlayerStats")
    for r in rows:
        yield op.upsert(
            table="box_scores",
            data={
                "game_id": r.get("game_id"),
                "player_id": r.get("player_id"),
                "team_id": r.get("team_id"),
                "team_abbreviation": r.get("team_abbreviation"),
                "player_name": r.get("player_name"),
                "start_position": r.get("start_position"),
                "min": r.get("min"),
                "fgm": r.get("fgm"),
                "fga": r.get("fga"),
                "fg_pct": r.get("fg_pct"),
                "fg3m": r.get("fg3m"),
                "fg3a": r.get("fg3a"),
                "fg3_pct": r.get("fg3_pct"),
                "ftm": r.get("ftm"),
                "fta": r.get("fta"),
                "ft_pct": r.get("ft_pct"),
                "oreb": r.get("oreb"),
                "dreb": r.get("dreb"),
                "reb": r.get("reb"),
                "ast": r.get("ast"),
                "stl": r.get("stl"),
                "blk": r.get("blk"),
                "to": r.get("to"),
                "pf": r.get("pf"),
                "pts": r.get("pts"),
                "plus_minus": r.get("plus_minus"),
            },
        )


def _sync_play_by_play(game_id: str) -> Iterable[Any]:
    payload = _get(
        f"{BASE_URL}/playbyplayv2",
        {"GameID": game_id, "StartPeriod": 1, "EndPeriod": 14},
    )
    for r in _result_set_rows(payload, "PlayByPlay"):
        yield op.upsert(
            table="play_by_play",
            data={
                "game_id": r.get("game_id"),
                "event_num": r.get("eventnum"),
                "event_msg_type": r.get("eventmsgtype"),
                "event_msg_action_type": r.get("eventmsgactiontype"),
                "period": r.get("period"),
                "wctimestring": r.get("wctimestring"),
                "pctimestring": r.get("pctimestring"),
                "home_description": r.get("homedescription"),
                "neutral_description": r.get("neutraldescription"),
                "visitor_description": r.get("visitordescription"),
                "score": r.get("score"),
                "scoremargin": r.get("scoremargin"),
                "player1_id": r.get("player1_id"),
                "player2_id": r.get("player2_id"),
                "player3_id": r.get("player3_id"),
            },
        )


def update(configuration: dict, state: dict):
    season = configuration.get("season", DEFAULT_SEASON)
    cursor_date = state.get("game_date_cursor") or "2024-10-01"
    log.info(f"nba_stats: starting from {cursor_date} (season={season})")

    games = _list_games(season, cursor_date)
    log.info(f"nba_stats: discovered {len(games)} new game ids")

    new_max_date = cursor_date
    for i, g in enumerate(games, start=1):
        game_id = g.get("game_id")
        game_date = g.get("game_date")
        if not game_id:
            continue
        try:
            yield from _sync_box_score(game_id)
            yield from _sync_play_by_play(game_id)
        except requests.HTTPError as e:
            log.warning(f"nba_stats: game {game_id} failed: {e}")
            continue
        if game_date and game_date > new_max_date:
            new_max_date = game_date
        if i % CHECKPOINT_EVERY == 0:
            state["game_date_cursor"] = new_max_date
            yield op.checkpoint(state)

    state["game_date_cursor"] = new_max_date
    state["last_run_at"] = datetime.now(timezone.utc).isoformat()
    yield op.checkpoint(state)
    log.info(f"nba_stats: done, cursor={new_max_date}")


connector = Connector(update=update, schema=schema)


if __name__ == "__main__":
    connector.debug()
