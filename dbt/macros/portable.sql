{# ============================================================
   Cross-engine helper macros.

   The dbt project runs on either Snowflake-on-Iceberg or
   Athena (Trino dialect). Most SQL is identical, but a handful
   of functions diverge. These macros hide the difference.
   ============================================================ #}

{% macro now_ts() %}
    {%- if target.type == 'snowflake' -%}
        current_timestamp()
    {%- else -%}
        current_timestamp
    {%- endif -%}
{% endmacro %}


{% macro epoch_seconds_to_ts(col) %}
    {%- if target.type == 'snowflake' -%}
        to_timestamp({{ col }})
    {%- else -%}
        from_unixtime(cast({{ col }} as bigint))
    {%- endif -%}
{% endmacro %}


{% macro try_to_ts(col) %}
    {#- try_cast works on both Snowflake and Trino/Athena 3. -#}
    try_cast({{ col }} as timestamp)
{% endmacro %}


{% macro days_ago(n) %}
    {%- if target.type == 'snowflake' -%}
        dateadd(day, -{{ n }}, current_timestamp())
    {%- else -%}
        current_timestamp - interval '{{ n }}' day
    {%- endif -%}
{% endmacro %}


{% macro hours_between(start_col, end_col) %}
    {%- if target.type == 'snowflake' -%}
        datediff('minute', {{ start_col }}, {{ end_col }}) / 60.0
    {%- else -%}
        date_diff('minute', {{ start_col }}, {{ end_col }}) / 60.0
    {%- endif -%}
{% endmacro %}


{% macro json_object_3(k1, v1, k2, v2, k3, v3) %}
    {%- if target.type == 'snowflake' -%}
        object_construct('{{ k1 }}', {{ v1 }}, '{{ k2 }}', {{ v2 }}, '{{ k3 }}', {{ v3 }})
    {%- else -%}
        cast(map(array['{{ k1 }}','{{ k2 }}','{{ k3 }}'],
                 array[cast({{ v1 }} as double), cast({{ v2 }} as double), cast({{ v3 }} as double))) as json)
    {%- endif -%}
{% endmacro %}


{% macro contains_substring(haystack, needle) %}
    {%- if target.type == 'snowflake' -%}
        contains({{ haystack }}, {{ needle }})
    {%- else -%}
        strpos({{ haystack }}, {{ needle }}) > 0
    {%- endif -%}
{% endmacro %}


{% macro count_if(condition) %}
    {# COUNT_IF exists in Snowflake & Trino/Athena #}
    count_if({{ condition }})
{% endmacro %}


{% macro stddev_samp(col) %}
    stddev_samp({{ col }})
{% endmacro %}


{% macro any_value(col) %}
    {%- if target.type == 'snowflake' -%}
        any_value({{ col }})
    {%- else -%}
        arbitrary({{ col }})
    {%- endif -%}
{% endmacro %}


{% macro split_index(str_col, delim, idx) %}
    {#- 1-indexed, matching Snowflake's split_part. -#}
    {%- if target.type == 'snowflake' -%}
        split_part({{ str_col }}, '{{ delim }}', {{ idx }})
    {%- else -%}
        try(split({{ str_col }}, '{{ delim }}')[{{ idx }}])
    {%- endif -%}
{% endmacro %}
