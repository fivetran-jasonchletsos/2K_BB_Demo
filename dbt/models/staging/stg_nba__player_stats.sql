{{ config(materialized='view') }}

with src as (
    select *
    from {{ source('nba_balldontlie', 'stats') }}
    where coalesce(_fivetran_deleted, false) = false
),
games as (
    select
        game_id,
        game_date,
        season,
        home_team_id,
        visitor_team_id
    from {{ ref('stg_nba__games') }}
)
select
    s.id::number                                          as stat_id,
    s.player_id::number                                   as player_id,
    s.team_id::number                                     as team_id,
    s.game_id::number                                     as game_id,
    g.game_date                                           as game_date,
    g.season                                              as season,
    s.min::string                                         as minutes_str,
    try_cast(split_part(s.min, ':', 1) as number)         as minutes_played,
    s.pts::number                                         as pts,
    s.reb::number                                         as reb,
    s.ast::number                                         as ast,
    s.stl::number                                         as stl,
    s.blk::number                                         as blk,
    s.turnover::number                                    as tov,
    s.pf::number                                          as pf,
    s.fgm::number                                         as fgm,
    s.fga::number                                         as fga,
    s.fg_pct::float                                       as fg_pct,
    s.fg3m::number                                        as fg3m,
    s.fg3a::number                                        as fg3a,
    s.fg3_pct::float                                      as fg3_pct,
    s.ftm::number                                         as ftm,
    s.fta::number                                         as fta,
    s.ft_pct::float                                       as ft_pct,
    s.oreb::number                                        as oreb,
    s.dreb::number                                        as dreb,
    s.plus_minus::number                                  as plus_minus,
    s._fivetran_synced::timestamp_tz                      as _synced_at
from src s
left join games g on g.game_id = s.game_id
qualify row_number() over (
    partition by s.id order by s._fivetran_synced desc
) = 1
