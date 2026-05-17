{{ config(materialized='view') }}

with drops as (
    select *
    from {{ ref('stg_locker_codes__drops') }}
),
active as (
    select
        code,
        reward_type,
        reward_value,
        game_mode,
        released_at,
        expires_at,
        source_url,
        seen_at,
        datediff('minute', current_timestamp(), expires_at) / 60.0 as hours_remaining
    from drops
    where expires_at is not null
      and expires_at > current_timestamp()
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
    round(hours_remaining, 1)                                    as hours_remaining,
    row_number() over (order by expires_at asc)                  as rank_by_expiry
from active
