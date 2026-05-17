{{ config(
    materialized='incremental',
    unique_key='player_id',
    on_schema_change='append_new_columns'
) }}

-- Predicted 2K rating delta for each player, with attribution.
-- CTE chain: baseline -> form_delta -> news_penalty -> final clamp.

with p360 as (
    select * from {{ ref('mart_player_360') }}
),
baseline as (
    select
        player_id,
        coalesce(current_2k_rating, 75) as current_rating,
        form_z,
        news_score,
        injury_flag,
        updated_at
    from p360
),
form_delta as (
    select
        player_id,
        current_rating,
        updated_at,
        -- z * 1.5 maps ~+/-2 sigma to ~+/-3 rating points
        round(coalesce(form_z, 0) * 1.5, 2)        as d_form,
        case when injury_flag then -2.0 else 0 end as d_injury,
        round(coalesce(news_score, 0) * 1.0, 2)    as d_news
    from baseline
),
combined as (
    select
        player_id,
        current_rating,
        updated_at,
        d_form, d_injury, d_news,
        greatest(-5.0, least(5.0,
            d_form + d_injury + d_news
        )) as predicted_delta,
        case
            when abs(d_injury) >= abs(d_form) and abs(d_injury) >= abs(d_news)
                then 'injury'
            when abs(d_form) >= abs(d_news) then 'recent_form'
            else 'news_sentiment'
        end as primary_driver,
        least(1.0, 0.4
            + (abs(d_form) * 0.15)
            + (abs(d_news) * 0.10)
            + (case when d_injury <> 0 then 0.15 else 0 end)
        )::float as confidence
    from form_delta
)
select
    player_id,
    current_rating,
    predicted_delta::number(3,1) as predicted_delta,
    confidence,
    primary_driver,
    object_construct(
        'form',   d_form,
        'injury', d_injury,
        'news',   d_news
    ) as driver_breakdown_json,
    current_timestamp()          as computed_at
from combined

{% if is_incremental() %}
    where player_id in (
        select player_id from p360
        where updated_at > (select coalesce(max(computed_at), '1970-01-01'::timestamp_tz) from {{ this }})
    )
{% endif %}
