{{ config(materialized='view') }}

-- Portable staging view over bronze_balldontlie.games.

with src as (
    select *
    from {{ source('nba_balldontlie', 'games') }}
    where coalesce(_fivetran_deleted, false) = false
),
normalized as (
    select
        cast(id                  as bigint)    as game_id,
        cast(date                as date)      as game_date,
        cast(season              as integer)   as season,
        cast(status              as varchar)   as status,
        cast(period              as integer)   as period,
        cast(time                as varchar)   as game_clock,
        cast(postseason          as boolean)   as is_postseason,
        cast(home_team_id        as bigint)    as home_team_id,
        cast(visitor_team_id     as bigint)    as visitor_team_id,
        cast(home_team_score     as integer)   as home_team_score,
        cast(visitor_team_score  as integer)   as visitor_team_score,
        cast(_fivetran_synced    as timestamp) as _synced_at
    from src
),
ranked as (
    select
        n.*,
        row_number() over (
            partition by game_id order by _synced_at desc
        ) as _rn
    from normalized n
)
select
    game_id,
    game_date,
    season,
    status,
    period,
    game_clock,
    is_postseason,
    home_team_id,
    visitor_team_id,
    home_team_score,
    visitor_team_score,
    _synced_at
from ranked
where _rn = 1
