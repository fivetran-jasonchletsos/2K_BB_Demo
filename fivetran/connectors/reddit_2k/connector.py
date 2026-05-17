"""Fivetran custom connector: reddit r/NBA2k + r/NBA2k26

Pulls new posts and top-level comments from the 2K-focused subreddits.

OAuth2 (script app):
    1. Create a Reddit script-type application at
       https://www.reddit.com/prefs/apps
    2. Store `client_id`, `client_secret`, and `refresh_token` in the
       Fivetran connector configuration.
    3. The connector exchanges the refresh_token for a short-lived
       bearer token on every sync.

Endpoints:
    POST https://www.reddit.com/api/v1/access_token   (auth)
    GET  https://oauth.reddit.com/r/{sub}/new?limit=100&after=...
    GET  https://oauth.reddit.com/comments/{post_id}?depth=1

Cursor:
    state["last_seen_utc"]  — only emit posts with `created_utc > cursor`
"""

from datetime import datetime, timezone
from typing import Any, Iterable

import requests
from requests.auth import HTTPBasicAuth
from fivetran_connector_sdk import Connector
from fivetran_connector_sdk import Logging as log
from fivetran_connector_sdk import Operations as op

USER_AGENT = "fivetran-2klab/0.1 (custom-sdk)"
SUBREDDITS = ["NBA2k", "NBA2k26"]
LISTING_LIMIT = 100
COMMENT_LIMIT = 50
CHECKPOINT_EVERY = 100


def schema(configuration: dict):
    return [
        {"table": "posts", "primary_key": ["id"]},
        {"table": "comments", "primary_key": ["id"]},
    ]


def _get_access_token(configuration: dict) -> str:
    client_id = configuration.get("client_id")
    client_secret = configuration.get("client_secret")
    refresh_token = configuration.get("refresh_token")
    if not (client_id and client_secret and refresh_token):
        raise ValueError(
            "Missing reddit_2k configuration: client_id, client_secret, refresh_token"
        )
    resp = requests.post(
        "https://www.reddit.com/api/v1/access_token",
        auth=HTTPBasicAuth(client_id, client_secret),
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        headers={"User-Agent": USER_AGENT},
        timeout=30,
    )
    resp.raise_for_status()
    token = resp.json().get("access_token")
    if not token:
        raise RuntimeError("reddit: no access_token in response")
    return token


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"bearer {token}", "User-Agent": USER_AGENT}


def _list_new_posts(subreddit: str, headers: dict, after: str | None) -> tuple[list[dict], str | None]:
    params = {"limit": LISTING_LIMIT}
    if after:
        params["after"] = after
    resp = requests.get(
        f"https://oauth.reddit.com/r/{subreddit}/new",
        headers=headers,
        params=params,
        timeout=30,
    )
    resp.raise_for_status()
    payload = resp.json().get("data") or {}
    children = payload.get("children") or []
    return [c.get("data") or {} for c in children], payload.get("after")


def _get_top_comments(post_id: str, headers: dict) -> list[dict]:
    resp = requests.get(
        f"https://oauth.reddit.com/comments/{post_id}",
        headers=headers,
        params={"depth": 1, "limit": COMMENT_LIMIT, "sort": "top"},
        timeout=30,
    )
    if resp.status_code != 200:
        log.warning(f"reddit_2k: comments fetch failed for {post_id}: {resp.status_code}")
        return []
    listings = resp.json()
    if not isinstance(listings, list) or len(listings) < 2:
        return []
    children = ((listings[1] or {}).get("data") or {}).get("children") or []
    return [
        (c.get("data") or {})
        for c in children
        if (c.get("kind") == "t1")
    ]


def update(configuration: dict, state: dict):
    cursor_utc = float(state.get("last_seen_utc") or 0)
    log.info(f"reddit_2k: cursor_utc={cursor_utc}")
    token = _get_access_token(configuration)
    headers = _auth_headers(token)

    max_seen = cursor_utc
    total_posts = 0

    for sub in SUBREDDITS:
        log.info(f"reddit_2k: scanning r/{sub}")
        after: str | None = None
        # Walk pages until we hit posts older than cursor, with a hard cap.
        pages = 0
        while pages < 5:
            posts, after = _list_new_posts(sub, headers, after)
            if not posts:
                break
            stop = False
            for p in posts:
                created = float(p.get("created_utc") or 0)
                if created <= cursor_utc:
                    stop = True
                    continue
                post_id = p.get("id")
                yield op.upsert(
                    table="posts",
                    data={
                        "id": post_id,
                        "subreddit": p.get("subreddit"),
                        "author": p.get("author"),
                        "title": p.get("title"),
                        "selftext": p.get("selftext"),
                        "url": p.get("url"),
                        "permalink": p.get("permalink"),
                        "score": p.get("score"),
                        "upvote_ratio": p.get("upvote_ratio"),
                        "num_comments": p.get("num_comments"),
                        "over_18": p.get("over_18"),
                        "stickied": p.get("stickied"),
                        "link_flair_text": p.get("link_flair_text"),
                        "created_utc": created,
                    },
                )
                total_posts += 1
                if created > max_seen:
                    max_seen = created
                # fetch top comments for moderately-active posts only
                if (p.get("num_comments") or 0) >= 5:
                    for c in _get_top_comments(post_id, headers):
                        yield op.upsert(
                            table="comments",
                            data={
                                "id": c.get("id"),
                                "post_id": post_id,
                                "subreddit": c.get("subreddit"),
                                "author": c.get("author"),
                                "body": c.get("body"),
                                "score": c.get("score"),
                                "created_utc": c.get("created_utc"),
                                "parent_id": c.get("parent_id"),
                            },
                        )
                if total_posts % CHECKPOINT_EVERY == 0:
                    state["last_seen_utc"] = max_seen
                    yield op.checkpoint(state)
            if stop or not after:
                break
            pages += 1

    state["last_seen_utc"] = max_seen
    state["last_run_at"] = datetime.now(timezone.utc).isoformat()
    yield op.checkpoint(state)
    log.info(f"reddit_2k: posts={total_posts}, cursor={max_seen}")


connector = Connector(update=update, schema=schema)


if __name__ == "__main__":
    connector.debug()
