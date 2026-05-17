{{ config(materialized='view') }}

with src as (
    select *
    from {{ source('nba_balldontlie', 'games') }}
    where coalesce(_fivetran_deleted, false) = false
)
select
    id::number                       as game_id,
    date::date                       as game_date,
    season::number                   as season,
    status::string                   as status,
    period::number                   as period,
    time::string                     as game_clock,
    postseason::boolean              as is_postseason,
    home_team_id::number             as home_team_id,
    visitor_team_id::number          as visitor_team_id,
    home_team_score::number          as home_team_score,
    visitor_team_score::number       as visitor_team_score,
    _fivetran_synced::timestamp_tz   as _synced_at
from src
qualify row_number() over (
    partition by id order by _fivetran_synced desc
) = 1
