{{ config(
    materialized='incremental',
    unique_key='player_id',
    on_schema_change='append_new_columns'
) }}

-- One row per player. Profile + recent form + news signal + 2KRatings.
-- Incremental: rebuild only players whose form or news has been recomputed
-- since the last run.

with players as (
    select
        player_id,
        full_name,
        position,
        height_in,
        weight_lb,
        team_id
    from {{ ref('stg_nba__players') }}
),
form as (
    select * from {{ ref('int_player_recent_form') }}
),
news as (
    select * from {{ ref('int_player_news_signal') }}
),
ratings as (
    -- best-effort name join to community ratings; in production this would be
    -- resolved via a dedicated mapping seed.
    select
        lower(full_name) as name_lower,
        current_2k_rating,
        archetype,
        source_url        as ratings_source_url,
        scraped_at        as ratings_scraped_at
    from {{ ref('stg_twokratings__ratings') }}
    qualify row_number() over (
        partition by lower(full_name) order by scraped_at desc
    ) = 1
),
joined as (
    select
        p.player_id,
        p.full_name,
        p.position,
        p.height_in,
        p.weight_lb,
        p.team_id,
        f.pts_l5,
        f.reb_l5,
        f.ast_l5,
        f.min_l5,
        f.plus_minus_l5,
        f.pts_l30d,
        f.reb_l30d,
        f.ast_l30d,
        f.pts_season,
        f.form_z,
        f.games_season,
        n.news_score,
        coalesce(n.injury_flag, false) as injury_flag,
        n.mention_count                as news_mention_count,
        n.latest_mention_at,
        r.current_2k_rating,
        r.archetype,
        r.ratings_source_url,
        r.ratings_scraped_at,
        greatest(
            coalesce(f.computed_at,           '1970-01-01'::timestamp_tz),
            coalesce(n.computed_at,           '1970-01-01'::timestamp_tz),
            coalesce(r.ratings_scraped_at,    '1970-01-01'::timestamp_tz)
        ) as updated_at
    from players p
    left join form    f on f.player_id = p.player_id
    left join news    n on n.player_id = p.player_id
    left join ratings r on r.name_lower = lower(p.full_name)
)
select * from joined

{% if is_incremental() %}
    where updated_at > (select coalesce(max(updated_at), '1970-01-01'::timestamp_tz) from {{ this }})
{% endif %}
