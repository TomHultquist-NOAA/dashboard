# Architecture — OMD Model Performance Dashboard 1.0.3

## Data pipeline

```text
Daily NOAA/MET .stat files (dated YYYYMMDD folders; 7 models × 3 products)
  -> tools/ingest_evs_stat.py (Python 3.6.8+, no external packages)
       read SUMMARY rows, decode MET forecast lead, map four regions
       preserve source verification date and dataset identifier
       omit unavailable records; cache raw downloads locally
  -> staged data/regions/*.csv and data/ingest_report.json
  -> tools/check_ingest_output.py (cron quality gate)
       reject missing/empty/corrupt/stale exports and reported errors
  -> tools/update_dashboard_data.sh (publish mode: local | scp | git)
  -> web-served data/regions/*.csv
  -> browser DataService (read / filter / aggregate / match comparisons)
  -> Home | Skill vs Lead | Scorecard | Time Series
           + Methodology | Changelog
```

The browser does not request raw source `.stat` files. It fetches only the normalized regional CSVs. The GitHub ZIP is static and flat; no startup server is included. Data in the ZIP are header-only placeholders, not a copy of the user's actual downloaded archive.

## Verification and display conventions

- Available products: `H500_ACC`, `T850_RMSE`, `MSLP_RMSE` across seven configured models and four regions; others remain N/A.
- `FCST_LEAD` encodes HHMMSS; the UI retains F000 through F360 in 24-hour steps. Files inspected during development select 00 UTC verification valid time; no within-day four-cycle pooling is performed.
- `WMO_WEIGHTED_MEAN` is chosen when valid, falling back to `MEAN`; duplicate date/model/region/metric/lead keys are identified in the audit report.
- MET `TOTAL` cannot be treated as a spatial sample count. The importer leaves `sample_count` blank.
- Date-range and all-lead aggregates combine already summarized statistics (RMSE via equal-record RMS pooling; ACC via equal-record Fisher transform). These are not equivalent to raw-pair pooled verification without additional source information.
- Baseline comparisons pair common verification dates and forecast leads. Standard mode allows differing verification dataset labels; Strict mode requires matching nonblank labels. Whether different labels refer to equivalent data must be verified before formal claims.
- Home ranks available absolute statistics independently of baseline; other pages show relative skill or absolute time series as appropriate.
- Metric dropdowns are enabled only when the loaded region has real records for the chosen metric; missing records remain N/A even for otherwise available products.

## Scheduled publication

The scheduler recomputes the rolling 90-day output into a temporary working directory and validates date coverage, freshness, counts and errors **before publishing**. Current operationally available files are cached to limit repeated requests; 404s are retried on later runs. The local mode copies validated files to a site path; SCP mode transfers over an existing SSH connection; Git mode commits only generated `data/` files and pushes to a configured upstream repository. None of these modes automatically configures credentials or a GitHub Pages publishing branch. See [CRON_SETUP.md](CRON_SETUP.md).

## Validation status

The dashboard and Python ingestion logic were developed against retrieved example files and representative multi-model datasets. The user confirmed a successful ingest report with 1,848 files parsed, seven models, three products and 88 dates on their system. The actual generated CSVs were not uploaded into this environment for this release, so a full source-data/visual validation against that archive was not possible. The current package intentionally retains no synthetic scores.

## Chart styling (1.0.3)

`js/config.js` stores the single canonical style specification per model (`color`, `marker`, `markerSize`, `lineWidth`). `js/app.js` forwards that styling to the shared SVG and Canvas renderers in `js/charts.js`, so PNG export matches the interactive displays. The dark-theme plot field uses the original deep navy (`#091524`) and the light theme uses white. Model trace contrast is calculated against the active plotting field; only traces below a 3:1 contrast ratio gain a thin outline (light against navy, dark against white). This applies consistently to all marker geometries and both live SVG and downloaded PNG charts. All markers have nominal size 7, while line widths and markers retain model-specific styling. Notable Signals selects up to three changes in each direction before filling any remaining slots, and uses the scorecard blue/red shade scale to indicate change magnitude. These presentation changes do not alter verification data.
