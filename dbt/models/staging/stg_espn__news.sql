{{ config(materialized='view') }}

with src as (
    select *
    from {{ source('espn_news', 'articles') }}
    where coalesce(_fivetran_deleted, false) = false
),
exploded as (
    select
        a.id::string                                  as article_id,
        a.type::string                                as article_type,
        a.headline::string                            as headline,
        a.description::string                         as description,
        a.story::string                               as body,
        a.byline::string                              as byline,
        try_to_timestamp_tz(a.published)              as published_at,
        try_to_timestamp_tz(a.last_modified)          as last_modified_at,
        a.premium::boolean                            as is_premium,
        a.link::string                                as link,
        a.athlete_ids::string                         as athlete_ids_csv,
        lower(coalesce(a.headline,'') || ' ' || coalesce(a.description,'') || ' ' || coalesce(a.story,''))
                                                      as text_lower,
        a._fivetran_synced::timestamp_tz              as _synced_at
    from src a
)
select * from exploded
qualify row_number() over (
    partition by article_id order by _synced_at desc
) = 1
