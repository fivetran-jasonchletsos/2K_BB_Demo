{{ config(materialized='table') }}

-- Per-player news/sentiment signal derived from Reddit + ESPN news content.
-- We match player names against text_lower in posts/articles within the
-- last 7 days, then score with a simple keyword heuristic:
--   injury terms  -> -1.0 per mention, set injury_flag
--   role downgrade-> -0.5 per mention
--   hype terms    -> +0.5 per mention
-- The aggregated score is averaged over mentions and clamped to [-1, 1].

with players as (
    select
        player_id,
        full_name,
        lower(full_name) as name_lower
    from {{ ref('stg_nba__players') }}
    where full_name is not null
),
reddit as (
    select
        post_id            as doc_id,
        'reddit'           as source,
        text_lower,
        created_at         as event_at
    from {{ ref('stg_reddit__posts') }}
    where created_at >= dateadd(day, -7, current_timestamp())
),
espn as (
    select
        article_id         as doc_id,
        'espn'             as source,
        text_lower,
        published_at       as event_at
    from {{ ref('stg_espn__news') }}
    where published_at >= dateadd(day, -7, current_timestamp())
),
docs as (
    select * from reddit
    union all
    select * from espn
),
mentions as (
    select
        p.player_id,
        d.doc_id,
        d.source,
        d.event_at,
        d.text_lower,
        case when d.text_lower like '%injur%'        then 1 else 0 end as has_injury,
        case when d.text_lower like '%out for%'      then 1 else 0 end as has_out_for,
        case when d.text_lower like '%questionable%' then 1 else 0 end as has_questionable,
        case when d.text_lower like '%benched%'      then 1 else 0 end as has_benched,
        case when d.text_lower like '%demoted%'      then 1 else 0 end as has_demoted,
        case when d.text_lower like '%dropped from starting%' then 1 else 0 end as has_role_down,
        case when d.text_lower like '%dominant%'     then 1 else 0 end as has_dominant,
        case when d.text_lower like '%career-high%'  then 1 else 0 end as has_career_high,
        case when d.text_lower like '%triple-double%' then 1 else 0 end as has_triple_double
    from players p
    join docs d
      on contains(d.text_lower, p.name_lower)
),
scored as (
    select
        player_id,
        doc_id,
        source,
        event_at,
        (
            -1.0 * (has_injury + has_out_for + has_benched)
            -0.5 * (has_questionable + has_demoted + has_role_down)
            +0.5 * (has_dominant + has_career_high + has_triple_double)
        )::float as doc_score,
        greatest(has_injury, has_out_for, has_benched) as is_injury_mention
    from mentions
),
agg as (
    select
        player_id,
        count(*)                                 as mention_count,
        count_if(source = 'reddit')              as reddit_mentions,
        count_if(source = 'espn')                as espn_mentions,
        avg(doc_score)::float                    as raw_score,
        max(is_injury_mention) > 0               as injury_flag,
        max(event_at)                            as latest_mention_at
    from scored
    group by 1
)
select
    player_id,
    mention_count,
    reddit_mentions,
    espn_mentions,
    greatest(-1.0, least(1.0, coalesce(raw_score, 0)))::float as news_score,
    coalesce(injury_flag, false)                              as injury_flag,
    latest_mention_at,
    current_timestamp()                                       as computed_at
from agg
