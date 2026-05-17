{{ config(materialized='view') }}

-- Portable staging view over bronze_locker_codes.drops.

with src as (
    select *
    from {{ source('locker_codes', 'drops') }}
    where coalesce(_fivetran_deleted, false) = false
),
normalized as (
    select
        cast(code         as varchar)       as code,
        cast(reward_type  as varchar)       as reward_type,
        cast(reward_value as varchar)       as reward_value,
        cast(mode         as varchar)       as game_mode,
        {{ try_to_ts('released_at') }}      as released_at,
        {{ try_to_ts('expires_at') }}       as expires_at,
        cast(source_url   as varchar)       as source_url,
        {{ try_to_ts('seen_at') }}          as seen_at,
        cast(_fivetran_synced as timestamp) as _synced_at
    from src
),
ranked as (
    select
        n.*,
        row_number() over (
            partition by code order by seen_at desc
        ) as _rn
    from normalized n
)
select
    code,
    reward_type,
    reward_value,
    game_mode,
    released_at,
    expires_at,
    source_url,
    seen_at,
    _synced_at
from ranked
where _rn = 1
