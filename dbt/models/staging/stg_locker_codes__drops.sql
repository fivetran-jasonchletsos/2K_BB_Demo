{{ config(materialized='view') }}

with src as (
    select *
    from {{ source('locker_codes', 'drops') }}
    where coalesce(_fivetran_deleted, false) = false
)
select
    code::string                                  as code,
    reward_type::string                           as reward_type,
    reward_value::string                          as reward_value,
    mode::string                                  as game_mode,
    try_to_timestamp_tz(released_at)              as released_at,
    try_to_timestamp_tz(expires_at)               as expires_at,
    source_url::string                            as source_url,
    try_to_timestamp_tz(seen_at)                  as seen_at,
    _fivetran_synced::timestamp_tz                as _synced_at
from src
qualify row_number() over (
    partition by code order by seen_at desc
) = 1
