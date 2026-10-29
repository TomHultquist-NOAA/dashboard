# Architecture

**OMD Model Performance Dashboard — version 1.0.8**

The dashboard is a static web application. Verification summaries are prepared separately and published as regional CSV files, avoiding direct STAT downloads from individual browsers.

## Data flow

```text
NOAA EVS/MET daily STAT files
    |
    v
tools/ingest_evs_stat.py (Python 3.6.8+)
    |  normalize dates, forecast leads, model/metric names, regions
    |  retain verification-source identifiers; omit unavailable records
    v
Staged regional CSV files + data/ingest_report.json
    |
    v
tools/check_ingest_output.py (validation)
    |
    v
tools/update_dashboard_data.sh (local | scp | git publication)
    |
    v
Web-served data/regions/*.csv
    |
    v
Browser CSV parser and DataService
    |
    v
Home | Skill vs Lead | Scorecard | Time Series
Methodology | Changelog
```

The full distribution contains header-only CSV placeholders. Operational data are produced by ingestion, not bundled as demonstration observations.

## Normalization and comparison

- Configured models: GFS, AIGFS, CFS, CMC, ECMWF, FNMOC, and UKMET; regions: Global, Northern Hemisphere, Southern Hemisphere, and Tropics.
- Supported source products: `H500_ACC`, `MSLP_RMSE`, and `T850_RMSE`; other configured metric options remain unavailable until source data are added.
- MET `FCST_LEAD` is decoded from HHMMSS into hours. The present display uses F000–F360 at 24-hour intervals. Source samples select 00 UTC verification valid time; no four-cycle daily pooling is currently performed.
- Valid `WMO_WEIGHTED_MEAN` values take precedence over `MEAN`. MET `TOTAL` is not interpreted as a spatial sample count; the normalized `sample_count` field is blank.
- Aggregation uses the supplied daily summary scores. RMSE is combined by equal-record RMS pooling and ACC through an equal-record Fisher transform. These operations do not replace calculations from original matched forecast–observation pairs.
- Relative-skill calculations match model and baseline by verification date and lead. **Standard** permits differing verification-source labels; **Strict** requires matching nonblank labels. Comparison validity depends on the underlying verifying datasets.
- Home rankings use absolute verification values; Skill vs Lead and scorecards use baseline-relative skill; Time Series presents absolute verification values.
- Unavailable model/metric/lead/date combinations appear as N/A or chart gaps. Dropdown availability reflects real loaded records.

The precise normalized CSV fields and source conventions are described in [DATA_FORMAT.md](DATA_FORMAT.md).

## Charts and interaction

`js/config.js` defines model colors, markers, and line widths. The chart renderer in `js/charts.js` handles interactive SVG displays and canvas-based PNG exports. The original deep-navy plotting surface is used in dark mode and white in light mode; only the black GFS trace uses a fine light outline in dark mode.

Model chips on Home, Skill vs Lead, and Time Series support hover-to-highlight behavior. On Skill vs Lead and Time Series, keyboard focus also highlights the associated trace without altering model selection. Chart interactions include sampling, zoom, pan, and export.

Notable Signals identifies the six largest changes between consecutive 15-day periods, including at least one improvement and one decline when both are present. Badge shades use the blue/red scorecard palette.

## Exploratory significance estimates

`js/significance.js` derives per-lead thresholds from matched daily model and baseline summaries. The implementation uses seeded three-day block sign-swap randomization (499 replicates, minimum 20 matched dates). The gray box at each lead represents the largest model-specific 95th-percentile absolute null threshold among selected non-baseline models. `js/charts.js` displays the boxes and the labeled 0.0% tick in both interactive charts and PNG exports.

These pointwise temporal estimates are exploratory; they are not official MET/EVS significance intervals, do not resample spatial forecast–observation pairs, and are not adjusted for multiple comparisons.

## Scheduled publication

The update wrapper stages a rolling 90-day archive, validates coverage and freshness, and then publishes it via local copy, SSH/SCP, or Git push. Cached successful downloads reduce repeated network requests, while missing dates are retried. Publication credentials and GitHub Pages configuration remain external to the repository.

Detailed settings and operational checks are provided in [CRON_SETUP.md](CRON_SETUP.md).
