{{ config(materialized='view') }}

with src as (
    select *
    from {{ source('nba_balldontlie', 'players') }}
    where coalesce(_fivetran_deleted, false) = false
),
normalized as (
    select
        id::number                                    as player_id,
        first_name::string                            as first_name,
        last_name::string                             as last_name,
        trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) as full_name,
        nullif(position, '')::string                  as position,
        height::string                                as height_raw,
        weight::string                                as weight_raw,
        -- convert "6-7" to inches
        case
            when height like '%-%'
                then try_cast(split_part(height, '-', 1) as number) * 12
                   + try_cast(split_part(height, '-', 2) as number)
        end::number                                   as height_in,
        try_cast(regexp_replace(weight, '[^0-9]', '') as number) as weight_lb,
        jersey_number::string                         as jersey_number,
        college::string                               as college,
        country::string                               as country,
        draft_year::number                            as draft_year,
        draft_round::number                           as draft_round,
        draft_number::number                          as draft_number,
        team_id::number                               as team_id,
        _fivetran_synced::timestamp_tz                as _synced_at
    from src
)
select * from normalized
qualify row_number() over (
    partition by player_id order by _synced_at desc
) = 1
