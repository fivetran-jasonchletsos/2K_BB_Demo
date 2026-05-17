{{ config(materialized='view') }}

with src as (
    select *
    from {{ source('reddit_2k', 'posts') }}
    where coalesce(_fivetran_deleted, false) = false
)
select
    id::string                                                    as post_id,
    subreddit::string                                             as subreddit,
    author::string                                                as author,
    title::string                                                 as title,
    selftext::string                                              as body,
    lower(coalesce(title, '') || ' ' || coalesce(selftext, ''))   as text_lower,
    url::string                                                   as url,
    permalink::string                                             as permalink,
    score::number                                                 as score,
    upvote_ratio::float                                           as upvote_ratio,
    num_comments::number                                          as num_comments,
    over_18::boolean                                              as is_nsfw,
    stickied::boolean                                             as is_stickied,
    link_flair_text::string                                       as flair,
    to_timestamp_tz(created_utc::number)                          as created_at,
    _fivetran_synced::timestamp_tz                                as _synced_at
from src
qualify row_number() over (
    partition by id order by _fivetran_synced desc
) = 1
