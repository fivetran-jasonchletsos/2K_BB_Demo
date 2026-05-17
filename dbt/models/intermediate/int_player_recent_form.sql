{{ config(materialized='table') }}

-- Per-player recent form: rolling last-5-game and last-30-day averages for
-- the core box score columns, plus a season average and a simple z-score of
-- recent vs season. Snowflake QUALIFY + window aggregates.

with stats as (
    select
        player_id,
        game_id,
        game_date,
        season,
        minutes_played,
        pts,
        reb,
        ast,
        stl,
        blk,
        tov,
        plus_minus
    from {{ ref('stg_nba__player_stats') }}
    where game_date is not null
      and minutes_played is not null
),
last5 as (
    select
        player_id,
        game_id,
        game_date,
        avg(pts)        over w5 as pts_l5,
        avg(reb)        over w5 as reb_l5,
        avg(ast)        over w5 as ast_l5,
        avg(minutes_played) over w5 as min_l5,
        avg(plus_minus) over w5 as plus_minus_l5,
        count(*)        over w5 as games_in_window_5
    from stats
    window w5 as (
        partition by player_id order by game_date
        rows between {{ var('recent_window_games') - 1 }} preceding and current row
    )
),
last30d as (
    select
        player_id,
        game_id,
        avg(pts)        over w30 as pts_l30d,
        avg(reb)        over w30 as reb_l30d,
        avg(ast)        over w30 as ast_l30d,
        avg(minutes_played) over w30 as min_l30d,
        avg(plus_minus) over w30 as plus_minus_l30d,
        count(*)        over w30 as games_in_window_30d
    from stats
    window w30 as (
        partition by player_id order by game_date
        range between interval '{{ var("recent_window_days") }} days' preceding and current row
    )
),
season_agg as (
    select
        player_id,
        season,
        avg(pts)::float        as pts_season,
        avg(reb)::float        as reb_season,
        avg(ast)::float        as ast_season,
        stddev_samp(pts)::float as pts_std,
        count(*)               as games_season
    from stats
    group by 1, 2
),
latest_game as (
    select
        s.player_id,
        max(s.game_date) as latest_game_date,
        any_value(s.season) as latest_season
    from stats s
    group by 1
),
joined as (
    select
        lg.player_id,
        lg.latest_game_date,
        lg.latest_season                          as season,
        l5.pts_l5,
        l5.reb_l5,
        l5.ast_l5,
        l5.min_l5,
        l5.plus_minus_l5,
        l5.games_in_window_5,
        l30.pts_l30d,
        l30.reb_l30d,
        l30.ast_l30d,
        l30.min_l30d,
        l30.plus_minus_l30d,
        l30.games_in_window_30d,
        sa.pts_season,
        sa.reb_season,
        sa.ast_season,
        sa.pts_std,
        sa.games_season
    from latest_game lg
    left join last5 l5
        on l5.player_id = lg.player_id
       and l5.game_date = lg.latest_game_date
    left join last30d l30
        on l30.player_id = lg.player_id
       and l30.game_id   = (
           select game_id from stats s2
           where s2.player_id = lg.player_id
             and s2.game_date = lg.latest_game_date
           qualify row_number() over (
               partition by s2.player_id order by s2.game_id desc
           ) = 1
       )
    left join season_agg sa
        on sa.player_id = lg.player_id
       and sa.season    = lg.latest_season
)
select
    player_id,
    season,
    latest_game_date,
    round(pts_l5, 2)            as pts_l5,
    round(reb_l5, 2)            as reb_l5,
    round(ast_l5, 2)            as ast_l5,
    round(min_l5, 2)            as min_l5,
    round(plus_minus_l5, 2)     as plus_minus_l5,
    games_in_window_5,
    round(pts_l30d, 2)          as pts_l30d,
    round(reb_l30d, 2)          as reb_l30d,
    round(ast_l30d, 2)          as ast_l30d,
    round(min_l30d, 2)          as min_l30d,
    round(plus_minus_l30d, 2)   as plus_minus_l30d,
    games_in_window_30d,
    round(pts_season, 2)        as pts_season,
    round(reb_season, 2)        as reb_season,
    round(ast_season, 2)        as ast_season,
    round(pts_std, 3)           as pts_std,
    games_season,
    -- z-score of recent points vs season. Null-safe; bounded to +/- 3.
    case
        when pts_std is null or pts_std = 0 then 0
        else greatest(-3, least(3, (pts_l5 - pts_season) / pts_std))
    end::float                  as form_z,
    current_timestamp()         as computed_at
from joined
