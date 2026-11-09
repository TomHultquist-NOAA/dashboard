# Verification data format

**OMD Model Performance Dashboard — version 1.1.8**

## Regional CSV files

The dashboard loads one UTF-8 CSV file per region from `data/regions/`. Each normalized file uses this header:

```csv
valid_date,model,region,metric,forecast_hour,value,sample_count,completeness,verification_source
```

| Field | Description |
|---|---|
| `valid_date` | Forecast verification date in UTC, formatted `YYYY-MM-DD` |
| `model` | `GFS`, `AIGFS`, `CFS`, `CMC`, `ECMWF`, `FNMOC`, or `UKMET` |
| `region` | `Global`, `Northern Hemisphere`, `Southern Hemisphere`, `Tropics`, or `CONUS` |
| `metric` | One of the 12 normalized metric keys listed below |
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

Supported filename suffixes and the corresponding normalized metric and MET summary column:

| Source suffix | Dashboard metric | Expected MET column |
|---|---|---|
| `H500_ACC` | `H500_ACC` | `ANOM_CORR` or `ACC` |
| `H500_RMSE` | `H500_RMSE` | `RMSE` |
| `H500_ME` | `H500_BIAS` | `ME` |
| `T850_RMSE` | `T850_RMSE` | `RMSE` |
| `T850_ME` | `T850_BIAS` | `ME` |
| `MSLP_RMSE` | `MSLP_RMSE` | `RMSE` |
| `MSLP_ME` | `MSLP_BIAS` | `ME` |
| `T2m_RMSE` | `T2M_RMSE` | `RMSE` |
| `T2m_ME` | `T2M_BIAS` | `ME` |
| `10m_Wind_RMSE` | `WIND10_RMSVE` | `RMSVE` (VCNT) |
| `10m_Wind_ME` | `WIND10_SPEED_ERR` | `SPEED_ERR` (VCNT) |
| `24hQPF_ETS` | `PRECIP24_ETS` | `GSS` (CTS; Gilbert Skill Score/ETS; event ≥2.54 mm) |

The upper-air and pressure summary products provide GLOBAL/NHEM/SHEM/TROPICS masks. The 2-m temperature and 10-m wind products provide CONUS and additional subregional masks; the 24-h QPF ETS product provides CONUS-based masks. Only CONUS is currently included among the surface subregions. No CONUS statistics are relabeled as Global.

The uploaded 24-hour QPF GSS summary files use a 12 UTC verification valid hour (`-fcst_valid_hour 120000`), unlike the 00 UTC setting of the other current products. MET `FCST_VALID_BEG` supplies the UTC date for all products.

The intermediate `grid2grid_* and `grid2obs_*` source products are not necessary for the existing dashboards and are not requested by the importer. The normalized *BIAS* identifiers represent signed scalar **ME**; wind `SPEED_ERR` deliberately has a separate identifier. Absent files and combinations remain absent rather than being filled with zeros.

New source files may differ by model and region. The import report includes counts and diagnostics for files with no usable rows, as well as missing files; an unavailable source does not block other metrics.

The importer reads MET Stat-Analysis `COL_NAME` and `SUMMARY` records. It maps `FCST_VALID_BEG` to `valid_date`, `VX_MASK` to region, `FCST_LEAD` to forecast hours, and a valid `WMO_WEIGHTED_MEAN` (otherwise `MEAN`) to `value`. When present, the source `-obtype` identifier is retained as `verification_source`. The current display selects 24-hour forecast-lead intervals; intervening six-hourly leads are not averaged into daily leads.

Source STAT statistics have already been summarized. Aggregation over multiple dates in the browser is an approximation and does not recreate the underlying matched forecast–observation samples.

## Forecast Hour Mean and paired-difference displays

Version 1.1.8 adds **no new CSV columns, STAT products, or importer requirements**. Forecast Hour Mean derives an arithmetic mean from available `value` records for each selected model and forecast lead. The arithmetic mean is intentionally distinct from the RMS or Fisher aggregation used by the preexisting relative-skill chart; gaps in the underlying data remain gaps in the plot.

The optional EVS-style difference/interval display pairs each model's `value` with the baseline on matching `valid_date` and `forecast_hour` (same metric and region). Standard mode permits different `verification_source` labels; Strict mode additionally requires that both labels are present and match. A minimum of **two matched dates per model/lead** is needed for a confidence interval. The interval uses population standard deviation of the daily differences, the EVS lead-average sample-size multipliers, and a `sqrt(n - 1)` divisor. It operates on available **daily regional summary scores**; it cannot reconstruct official event-level EVS uncertainty or account for interday dependence. Counts are derived at runtime; the blank `sample_count` field is not used or filled in.

## Publication and availability

The importer produces `data/ingest_report.json`, which records the ingestion timestamp (`generated_utc`), available dates, file coverage, missing sources, duplicate keys, and errors. The Home page's latest verification date is based on the CSV contents, not the ingestion timestamp.

The scheduled wrapper stages and validates new outputs before publishing the regional CSVs and report together. Raw STAT downloads and temporary files are excluded from the repository by `.gitignore`. See [CRON_SETUP.md](CRON_SETUP.md).

The **complete distribution contains CSV headers only**. Populated production CSVs are produced separately and must be retained when replacing application files. The update-only package excludes generated data.
