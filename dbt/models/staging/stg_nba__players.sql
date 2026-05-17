{{ config(materialized='view') }}

-- Portable staging view over bronze_balldontlie.players.

with src as (
    select *
    from {{ source('nba_balldontlie', 'players') }}
    where coalesce(_fivetran_deleted, false) = false
),
normalized as (
    select
        cast(id            as bigint)                                            as player_id,
        cast(first_name    as varchar)                                           as first_name,
        cast(last_name     as varchar)                                           as last_name,
        trim(coalesce(cast(first_name as varchar), '') || ' ' ||
             coalesce(cast(last_name  as varchar), ''))                          as full_name,
        nullif(cast(position as varchar), '')                                    as position,
        cast(height        as varchar)                                           as height_raw,
        cast(weight        as varchar)                                           as weight_raw,
        -- convert "6-7" to inches; null-safe.
        case
            when cast(height as varchar) like '%-%'
                then try_cast({{ split_index('cast(height as varchar)', '-', 1) }} as integer) * 12
                   + try_cast({{ split_index('cast(height as varchar)', '-', 2) }} as integer)
        end                                                                       as height_in,
        try_cast(regexp_replace(cast(weight as varchar), '[^0-9]', '') as integer) as weight_lb,
        cast(jersey_number as varchar)                                            as jersey_number,
        cast(college       as varchar)                                            as college,
        cast(country       as varchar)                                            as country,
        cast(draft_year    as integer)                                            as draft_year,
        cast(draft_round   as integer)                                            as draft_round,
        cast(draft_number  as integer)                                            as draft_number,
        cast(team_id       as bigint)                                             as team_id,
        cast(_fivetran_synced as timestamp)                                       as _synced_at
    from src
),
ranked as (
    select
        n.*,
        row_number() over (
            partition by player_id order by _synced_at desc
        ) as _rn
    from normalized n
)
select
    player_id, first_name, last_name, full_name, position,
    height_raw, weight_raw, height_in, weight_lb,
    jersey_number, college, country,
    draft_year, draft_round, draft_number,
    team_id, _synced_at
from ranked
where _rn = 1
