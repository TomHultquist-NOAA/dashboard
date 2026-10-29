# Data format — 1.0.6

## Browser-facing normalized CSVs

The browser reads one UTF-8 CSV per region from `data/regions/`. Files are created by `tools/ingest_evs_stat.py` and have this exact header:

```csv
valid_date,model,region,metric,forecast_hour,value,sample_count,completeness,verification_source
```

| Field | Meaning |
|---|---|
| `valid_date` | Forecast verification date (`YYYY-MM-DD`, interpreted as UTC) |
| `model` | `GFS`, `AIGFS`, `CFS`, `CMC`, `ECMWF`, `FNMOC`, `UKMET` |
| `region` | `Global`, `Northern Hemisphere`, `Southern Hemisphere`, `Tropics` |
| `metric` | Currently `H500_ACC`, `MSLP_RMSE`, or `T850_RMSE`; other configured metrics have no rows until available |
| `forecast_hour` | Numeric forecast lead in hours: 0, 24, …, 360 |
| `value` | Actual finite verification summary statistic, in the metric's units |
| `sample_count` | Empty until a scientifically appropriate raw sample count is available |
| `completeness` | Empty until a suitable completeness measure is supplied |
| `verification_source` | Verifying dataset identifier from source summary metadata; empty when unspecified |

One logical record is identified by `valid_date`, `model`, `region`, `metric`, and `forecast_hour`. A missing combination is **absent** from the CSV and appears as `N/A` or a gap. It must never be silently filled with zero or invented observations.

## Source data

URLs are of the form:

```text
https://emc.ncep.noaa.gov/gmb/mpr/dashboard_stats/YYYYMMDD/model/model_METRIC_YYYYMMDD.stat
```

Metric file suffixes: `H500_ACC`, `T850_RMSE`, `MSLP_RMSE`. The source is MET Stat-Analysis `.stat` format with `COL_NAME` and `SUMMARY` records. The importer parses `FCST_VALID_BEG` into `valid_date`, `VX_MASK` into the region, `FCST_LEAD` from MET HHMMSS into integer forecast hours, and `WMO_WEIGHTED_MEAN` or `MEAN` into `value`. It uses `-obtype` from source `JOB_LIST` as the verification-source label when available. Forecast leads are sampled every 24 hours for the present UI, not temporally averaged.

## Availability and publication

`data/ingest_report.json` includes requested dates, actual date coverage, counts, HTTP 404s, duplicate keys, and importer errors. Its `generated_utc` describes when ingestion ran; it is distinct from `latest_valid_date` shown on Home.

The cron update wrapper stages new files in `.cron-work/` by default, validates the output, and publishes the entire group of regional CSVs and the report. Raw `.stat` download cache and cron temporary files are excluded from the Git repository via `.gitignore`. See [CRON_SETUP.md](CRON_SETUP.md).

The packaged CSVs have headers only. **Copy/retain your real data when updating a populated installation.** The source archive of actual regional CSVs is not available in this environment.
