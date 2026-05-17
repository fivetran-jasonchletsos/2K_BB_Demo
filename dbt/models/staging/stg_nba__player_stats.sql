{{ config(materialized='view') }}

-- Portable staging view over bronze_balldontlie.stats.

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
),
normalized as (
    select
        cast(s.id           as bigint)                                        as stat_id,
        cast(s.player_id    as bigint)                                        as player_id,
        cast(s.team_id      as bigint)                                        as team_id,
        cast(s.game_id      as bigint)                                        as game_id,
        g.game_date                                                           as game_date,
        g.season                                                              as season,
        cast(s.min          as varchar)                                       as minutes_str,
        try_cast({{ split_index('cast(s.min as varchar)', ':', 1) }} as integer) as minutes_played,
        cast(s.pts          as integer)                                       as pts,
        cast(s.reb          as integer)                                       as reb,
        cast(s.ast          as integer)                                       as ast,
        cast(s.stl          as integer)                                       as stl,
        cast(s.blk          as integer)                                       as blk,
        cast(s.turnover     as integer)                                       as tov,
        cast(s.pf           as integer)                                       as pf,
        cast(s.fgm          as integer)                                       as fgm,
        cast(s.fga          as integer)                                       as fga,
        cast(s.fg_pct       as double)                                        as fg_pct,
        cast(s.fg3m         as integer)                                       as fg3m,
        cast(s.fg3a         as integer)                                       as fg3a,
        cast(s.fg3_pct      as double)                                        as fg3_pct,
        cast(s.ftm          as integer)                                       as ftm,
        cast(s.fta          as integer)                                       as fta,
        cast(s.ft_pct       as double)                                        as ft_pct,
        cast(s.oreb         as integer)                                       as oreb,
        cast(s.dreb         as integer)                                       as dreb,
        cast(s.plus_minus   as integer)                                       as plus_minus,
        cast(s._fivetran_synced as timestamp)                                 as _synced_at
    from src s
    left join games g on g.game_id = cast(s.game_id as bigint)
),
ranked as (
    select
        n.*,
        row_number() over (
            partition by stat_id order by _synced_at desc
        ) as _rn
    from normalized n
)
select
    stat_id, player_id, team_id, game_id, game_date, season,
    minutes_str, minutes_played,
    pts, reb, ast, stl, blk, tov, pf,
    fgm, fga, fg_pct, fg3m, fg3a, fg3_pct, ftm, fta, ft_pct,
    oreb, dreb, plus_minus, _synced_at
from ranked
where _rn = 1
