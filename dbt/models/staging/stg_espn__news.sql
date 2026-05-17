{{ config(materialized='view') }}

-- Portable staging view over bronze_espn_news.articles.
-- Same SQL runs on Snowflake-on-Iceberg or Athena/Trino.

with src as (
    select *
    from {{ source('espn_news', 'articles') }}
    where coalesce(_fivetran_deleted, false) = false
),
normalized as (
    select
        cast(a.id            as varchar)   as article_id,
        cast(a.type          as varchar)   as article_type,
        cast(a.headline      as varchar)   as headline,
        cast(a.description   as varchar)   as description,
        cast(a.story         as varchar)   as body,
        cast(a.byline        as varchar)   as byline,
        {{ try_to_ts('a.published') }}     as published_at,
        {{ try_to_ts('a.last_modified') }} as last_modified_at,
        cast(a.premium       as boolean)   as is_premium,
        cast(a.link          as varchar)   as link,
        cast(a.athlete_ids   as varchar)   as athlete_ids_csv,
        lower(coalesce(cast(a.headline    as varchar), '') || ' ' ||
              coalesce(cast(a.description as varchar), '') || ' ' ||
              coalesce(cast(a.story       as varchar), ''))
                                           as text_lower,
        cast(a._fivetran_synced as timestamp) as _synced_at
    from src a
),
ranked as (
    select
        n.*,
        row_number() over (
            partition by article_id order by _synced_at desc
        ) as _rn
    from normalized n
)
select
    article_id,
    article_type,
    headline,
    description,
    body,
    byline,
    published_at,
    last_modified_at,
    is_premium,
    link,
    athlete_ids_csv,
    text_lower,
    _synced_at
from ranked
where _rn = 1
