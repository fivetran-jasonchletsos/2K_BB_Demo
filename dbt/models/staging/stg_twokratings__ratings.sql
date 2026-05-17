{{ config(materialized='view') }}

with src as (
    select *
    from {{ source('twokratings', 'player_ratings') }}
    where coalesce(_fivetran_deleted, false) = false
)
select
    slug::string                                     as player_slug,
    full_name::string                                as full_name,
    team_slug::string                                as team_slug,
    position::string                                 as position,
    overall_rating::number                           as current_2k_rating,
    height::string                                   as height_raw,
    weight::string                                   as weight_raw,
    archetype::string                                as archetype,
    source_url::string                               as source_url,
    try_to_timestamp_tz(scraped_at)                  as scraped_at,
    _fivetran_synced::timestamp_tz                   as _synced_at
from src
qualify row_number() over (
    partition by slug order by scraped_at desc
) = 1
