# Verification data format

**OMD Model Performance Dashboard — version 1.0.8**

## Regional CSV files

The dashboard loads one UTF-8 CSV file per region from `data/regions/`. Each normalized file uses this header:

```csv
valid_date,model,region,metric,forecast_hour,value,sample_count,completeness,verification_source
```

| Field | Description |
|---|---|
| `valid_date` | Forecast verification date in UTC, formatted `YYYY-MM-DD` |
| `model` | `GFS`, `AIGFS`, `CFS`, `CMC`, `ECMWF`, `FNMOC`, or `UKMET` |
| `region` | `Global`, `Northern Hemisphere`, `Southern Hemisphere`, or `Tropics` |
| `metric` | Currently `H500_ACC`, `MSLP_RMSE`, or `T850_RMSE` |
| `forecast_hour` | Forecast lead in hours: 0, 24, 48, …, 360 |
| `value` | Finite verification summary statistic in the metric's units |
| `sample_count` | Blank until a scientifically appropriate sample count is available |
| `completeness` | Blank until a corresponding completeness measure is available |
| `verification_source` | Verifying dataset identifier, if present in the source file |

A record is uniquely identified by its `valid_date`, `model`, `region`, `metric`, and `forecast_hour` combination. Unavailable combinations are omitted from the CSV; the interface displays N/A or a gap. No synthetic values or zeros are substituted.

## Source STAT files

Source file locations follow this convention:

```text
https://emc.ncep.noaa.gov/gmb/mpr/dashboard_stats/YYYYMMDD/model/model_METRIC_YYYYMMDD.stat
```

Current metric suffixes are `H500_ACC`, `T850_RMSE`, and `MSLP_RMSE`.

The importer reads MET Stat-Analysis `COL_NAME` and `SUMMARY` records. It maps `FCST_VALID_BEG` to `valid_date`, `VX_MASK` to region, `FCST_LEAD` to forecast hours, and a valid `WMO_WEIGHTED_MEAN` (otherwise `MEAN`) to `value`. When present, the source `-obtype` identifier is retained as `verification_source`. The current display selects 24-hour forecast-lead intervals; intervening six-hourly leads are not averaged into daily leads.

Source STAT statistics have already been summarized. Aggregation over multiple dates in the browser is an approximation and does not recreate the underlying matched forecast–observation samples.

## Publication and availability

The importer produces `data/ingest_report.json`, which records the ingestion timestamp (`generated_utc`), available dates, file coverage, missing sources, duplicate keys, and errors. The Home page's latest verification date is based on the CSV contents, not the ingestion timestamp.

The scheduled wrapper stages and validates new outputs before publishing the regional CSVs and report together. Raw STAT downloads and temporary files are excluded from the repository by `.gitignore`. See [CRON_SETUP.md](CRON_SETUP.md).

The **complete distribution contains CSV headers only**. Populated production CSVs are produced separately and must be retained when replacing application files. The update-only package excludes generated data.
