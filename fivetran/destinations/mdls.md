# MDLS Destination (S3 + Iceberg + Catalog)

This project uses **Fivetran Managed Data Lake Service (MDLS)** as the
landing destination for all six custom connectors. MDLS writes Iceberg
tables to an S3 bucket you own and registers them in a managed catalog
(AWS Glue, Snowflake Polaris, or AWS Lake Formation).

The connector SDK code (`op.upsert(...)`, `op.checkpoint(...)`) is
destination-agnostic; the choice of destination is made in the Fivetran UI
when the connector is deployed.

## Destination configuration (Fivetran UI)

Create a destination of type **Managed Data Lake (MDLS)** with:

| Setting           | Example value                                | Notes                                    |
| ----------------- | -------------------------------------------- | ---------------------------------------- |
| Destination name  | `mdls_2k_lab`                                | referenced when deploying connectors     |
| S3 bucket         | `fivetran-mdls-2k-lab`                       | bucket you own, in the same region       |
| AWS region        | `us-east-1`                                  | match downstream engine regions          |
| Catalog type      | `glue` (or `polaris`, `lakeformation`)       | governs which engines can attach         |
| Catalog name      | `mdls_2k_lab_catalog`                        | logical name in the catalog              |
| IAM role ARN      | `arn:aws:iam::111122223333:role/fivetran-mdls` | role Fivetran assumes for write access  |
| File format       | Parquet (Iceberg)                            | MDLS default                             |
| Table format      | Apache Iceberg                               | v2, with row-level deletes               |

The IAM role must grant Fivetran:

- `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket` on the bucket
- `glue:*` (or equivalent Polaris / Lake Formation grants) on the catalog
  namespace

## Per-connector wiring

When deploying each connector with `fivetran deploy`, select the `mdls_2k_lab`
destination and set the target schema to `bronze_<source>`:

| Connector       | Target schema         | Iceberg tables produced                                              |
| --------------- | --------------------- | -------------------------------------------------------------------- |
| balldontlie     | `bronze_balldontlie`  | `teams`, `players`, `games`, `stats`, `season_averages`              |
| nba_stats       | `bronze_nba_stats`    | `box_scores`, `play_by_play`, `lineups`, `shot_chart_detail`         |
| reddit_2k       | `bronze_reddit_2k`    | `posts`, `comments`                                                  |
| twokratings     | `bronze_twokratings`  | `player_ratings`, `rating_history`                                   |
| espn_news       | `bronze_espn_news`    | `articles`, `headlines`                                              |
| locker_codes    | `bronze_locker_codes` | `drops`                                                              |

## S3 bucket layout

MDLS owns the layout under the bucket. Connectors writing into the above
schemas produce paths like:

```
s3://fivetran-mdls-2k-lab/
├── bronze_balldontlie/
│   ├── teams/
│   │   ├── metadata/                # Iceberg manifest + table metadata
│   │   └── data/                    # Parquet data files
│   ├── players/
│   ├── games/
│   ├── stats/
│   └── season_averages/
├── bronze_nba_stats/
│   ├── box_scores/
│   ├── play_by_play/
│   ├── lineups/
│   └── shot_chart_detail/
├── bronze_reddit_2k/
│   ├── posts/
│   └── comments/
├── bronze_twokratings/
│   ├── player_ratings/
│   └── rating_history/
├── bronze_espn_news/
│   ├── articles/
│   └── headlines/
└── bronze_locker_codes/
    └── drops/
```

Each `<table>/metadata/` directory holds the Iceberg `v*.metadata.json`,
manifest list, and manifest files; `<table>/data/` holds the Parquet data
files. Do not write to the bucket out-of-band — MDLS owns the metadata
pointer and concurrent writers will corrupt table state.

## Catalog visibility to downstream engines

The same Iceberg tables are readable by any engine that can attach to the
MDLS catalog. No data copy is required.

### Snowflake (via external Iceberg catalog integration)

```sql
CREATE CATALOG INTEGRATION mdls_2k_lab_catalog_int
  CATALOG_SOURCE = GLUE
  CATALOG_NAMESPACE = 'mdls_2k_lab_catalog'
  TABLE_FORMAT = ICEBERG
  GLUE_AWS_ROLE_ARN = 'arn:aws:iam::111122223333:role/snowflake-glue-reader'
  GLUE_CATALOG_ID = '111122223333'
  GLUE_REGION = 'us-east-1'
  ENABLED = TRUE;

CREATE ICEBERG TABLE bronze_balldontlie.stats
  EXTERNAL_VOLUME = 'mdls_2k_lab_vol'
  CATALOG = 'mdls_2k_lab_catalog_int'
  CATALOG_TABLE_NAME = 'stats'
  CATALOG_NAMESPACE = 'bronze_balldontlie';
```

### Databricks (Unity Catalog federation to Glue)

```sql
CREATE CONNECTION mdls_2k_lab TYPE GLUE
  OPTIONS (aws_region 'us-east-1', credential 'glue_reader_credential');

CREATE FOREIGN CATALOG mdls_2k_lab FOREIGN CONNECTION mdls_2k_lab
  OPTIONS (catalog 'mdls_2k_lab_catalog');

SELECT * FROM mdls_2k_lab.bronze_balldontlie.stats LIMIT 100;
```

### Athena

Glue-backed catalogs are visible to Athena automatically:

```sql
SELECT count(*) FROM "bronze_balldontlie"."stats";
```

### Trino

```
catalog.iceberg.connector.name=iceberg
catalog.iceberg.iceberg.catalog.type=glue
catalog.iceberg.hive.metastore.glue.region=us-east-1
```

```sql
SELECT * FROM iceberg.bronze_balldontlie.stats LIMIT 100;
```

## Operational notes

- **One destination, many engines.** Switch the dbt project's engine
  (Snowflake, Databricks, Athena, Trino) without re-ingesting; the bronze
  tables are the same physical Iceberg files on S3.
- **Compaction.** MDLS runs scheduled compaction on Iceberg tables. No
  action required from the connector side.
- **Time travel.** Iceberg snapshots are retained per MDLS default
  retention; downstream engines can `AS OF` queries against bronze tables.
- **Permissions.** Grant downstream engines a read-only IAM role on the
  bucket and a read-only grant on the catalog namespace; the connectors'
  write role should not be reused for query workloads.
