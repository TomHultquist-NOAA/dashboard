# Architecture

**OMD Model Performance Dashboard — version 1.1.8**

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
Home | Skill vs Lead (relative skill + native-value mean + optional EVS difference/CI)
Scorecard | Time Series | Methodology | Changelog
```

The full distribution contains header-only CSV placeholders. Operational data are produced by ingestion, not bundled as demonstration observations.

## Normalization and comparison

- Configured models: GFS, AIGFS, CFS, CMC, ECMWF, FNMOC, and UKMET; regions: Global, Northern Hemisphere, Southern Hemisphere, Tropics, and CONUS.
- Supported source products: 500-hPa height ACC/RMSE/ME; 850-hPa temperature RMSE/ME; MSLP RMSE/ME; 2-m temperature RMSE/ME; 10-m wind RMSVE/SPEED_ERR; 24-h QPF ETS at the ≥2.54-mm threshold. Availability is determined per model, region, date, and lead; missing scores remain N/A.
- MET `FCST_LEAD` is decoded from HHMMSS into hours. The present display uses F000–F360 at 24-hour intervals. The uploaded upper-air, pressure, temperature, and wind files use 00 UTC verification valid time; 24-h precipitation ETS uses 12 UTC. No four-cycle daily pooling is currently performed. The separate CONUS region is used for station-based surface and 24-h precipitation products; their records must never be mapped to Global.
- Valid `WMO_WEIGHTED_MEAN` values take precedence over `MEAN`. MET `TOTAL` is not interpreted as a spatial sample count; the normalized `sample_count` field is blank.
- Aggregation uses the supplied daily summary scores. RMSE and RMSVE are combined by equal-record RMS pooling, ACC through an equal-record Fisher transform, and ME/SPEED_ERR/ETS (MET GSS) through an equal-record arithmetic mean. These operations do not replace calculations from original matched forecast–observation pairs.
- Relative-skill calculations match model and baseline by verification date and lead. **Standard** permits differing verification-source labels; **Strict** requires matching nonblank labels. Comparison validity depends on the underlying verifying datasets.
- Home rankings use absolute verification values; Skill vs Lead and scorecards use baseline-relative skill; Time Series presents absolute verification values.
- Unavailable model/metric/lead/date combinations appear as N/A or chart gaps. Dropdown availability reflects real loaded records.

Page-level filters retain their own metric and date settings, but share the selected geographic region. Auto-selection of a CONUS-only metric updates that region on every page. Asynchronous region loading guards against outdated requests overwriting newer selections.

The precise normalized CSV fields and source conventions are described in [DATA_FORMAT.md](DATA_FORMAT.md).

## Charts and interaction

`js/config.js` defines model colors, markers, and line widths. The chart renderer in `js/charts.js` handles interactive SVG displays and canvas-based PNG exports. The original deep-navy plotting surface is used in dark mode and white in light mode; only the black GFS trace uses a fine light outline in dark mode.

Model chips on Home, Skill vs Lead, and Time Series support hover-to-highlight behavior. On Skill vs Lead and Time Series, keyboard focus also highlights the associated trace without altering model selection. Chart interactions include sampling, zoom, pan, and export. Automatic y-axis ticks use rounded numerical intervals, with chart and PNG export sharing the same tick positions and labels; tooltip values retain metric-specific precision. The Home rank-history tooltip displays the daily absolute metric values that determined each model rank, alongside the rank, without altering the chart data.

Notable Signals identifies the six largest changes between consecutive 15-day periods, including at least one improvement and one decline when both are present. Badge shades use the blue/red scorecard palette.

## Forecast Hour Mean and EVS-style paired-difference intervals

**Forecast Hour Mean:** `DataService.meanValueByLead()` (`js/data-service.js`) reads the available daily values for each model, metric, region, date window, and forecast lead, then computes an arithmetic mean and count for each lead. This is an **absolute** verification curve, independent of selected baseline or comparison matching. Missing hours remain gaps in the chart (no artificial interpolation across missing 24-hour leads). The mean intentionally differs from the nonlinear RMS/Fisher aggregation used by percentage-skill calculations. The chart is rendered by `renderLineChart()` in `js/charts.js` with an hour-based 0–360 x-axis and separate interaction, hover, and PNG export.

**EVS-style intervals:** `js/significance.js` computes per-lead model-minus-baseline **paired daily difference values**, matched by valid date/lead, with optional Strict matching of verification-source identifiers. For each non-baseline model and lead having `n >= 2` pairs, compute:

```text
difference_i = model_daily_value_i - baseline_daily_value_i
mean_difference = arithmetic_mean(difference_i)
population_SD = sqrt(sum((difference_i - mean_difference)^2) / n)
CI_half_width = F(n) * population_SD / sqrt(n - 1)
F(n) = 1.960 (n >= 80), 2.000 (40-79), 2.042 (20-39), 2.228 (2-19)
```

This follows the [EVS `global_det_atmos_plots_lead_average.py` comparison method](https://github.com/NOAA-EMC/EVS/blob/develop/ush/global_det/global_det_atmos_plots_lead_average.py#L200). It replaces the old three-day block sign-swap/significance-envelope routine; **no randomization or 20-date minimum remains**. The optional comparison panel (off by default) plots mean differences and model-colored outlined rectangles from `−CI_half_width` to `+CI_half_width` centered on zero. A mean difference outside its own rectangle is flagged as pointwise statistically different from zero under that approximation. No single shared interval is used. The confidence bars are rendered both on-screen and in downloaded PNGs.

The source EVS routine averages precomputed per-day statistics; our dashboard uses already summarized **regional** daily metric values instead of the underlying matched forecast/observation events. This limitation, unadjusted serial dependence and multiple testing, and the nonlinear nature of dashboard percentage skill mean that the intervals do **not** provide an official EVS significance test of the percentage-skill panel. Raw signed Bias differences also do not directly establish improvement. The legacy 0.0% reference tick remains on the unmodified relative-skill chart.

## Scheduled publication

The update wrapper stages a rolling 90-day archive, validates coverage and freshness, and then publishes it via local copy, SSH/SCP, or Git push. Cached successful downloads reduce repeated network requests, while missing dates are retried. Publication credentials and GitHub Pages configuration remain external to the repository.

Detailed settings and operational checks are provided in [CRON_SETUP.md](CRON_SETUP.md).
