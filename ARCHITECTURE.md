# Architecture

**OMD Model Performance Dashboard — version 1.3.0**

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
Home (model-selected fair All-lead ranking) | Skill vs Lead (native-value mean + relative skill / EVS CI + effective lead-time gain)
Scorecard | Time Series | Methodology | Changelog
```

The full distribution contains header-only CSV placeholders. Operational data are produced by ingestion, not bundled as demonstration observations.

## Normalization and comparison

- Configured models: GFS, AIGFS, CFS, CMC, ECMWF, FNMOC, and UKMET; regions: Global, Northern Hemisphere, Southern Hemisphere, Tropics, and CONUS.
- Supported source products: 500-hPa height ACC/RMSE/ME; 850-hPa temperature RMSE/ME; MSLP RMSE/ME; 2-m temperature RMSE/ME; 10-m wind RMSVE/SPEED_ERR; 24-h QPF ETS at the ≥2.54-mm threshold. Availability is determined per model, region, date, and lead; missing scores remain N/A.
- MET `FCST_LEAD` is decoded from HHMMSS into hours. The present display uses F000–F360 at 24-hour intervals. The uploaded upper-air, pressure, temperature, and wind files use 00 UTC verification valid time; 24-h precipitation ETS uses 12 UTC. No four-cycle daily pooling is currently performed. The separate CONUS region is used for station-based surface and 24-h precipitation products; their records must never be mapped to Global.
- Valid `WMO_WEIGHTED_MEAN` values take precedence over `MEAN`. MET `TOTAL` is not interpreted as a spatial sample count; the normalized `sample_count` field is blank.
- Aggregation uses the supplied daily summary scores. RMSE and RMSVE are combined by equal-record RMS pooling, ACC through an equal-record Fisher transform, and ME/SPEED_ERR/ETS (MET GSS) through an equal-record arithmetic mean. These operations do not replace calculations from original matched forecast–observation pairs.
- Skill vs Lead percentage-skill and EVS significance use only **Standard** valid-date/lead matching (no selectable Strict control); differing verification-source labels can still affect comparability. The Scorecard retains its separate Standard/Strict selector, where Strict requires matching nonblank verification-source labels. Effective lead time instead compares independent available daily per-lead means, which can use different verification dates and sample counts.
- Home rankings use absolute verification values. In All-lead mode, `DataService.comparableAllLeadRows()` intersects exact `(valid_date, forecast_hour)` keys across **all enabled ranking models** and supplies both overall rank values and per-date ranks; no unmatched model/date/hour samples enter those rankings. `modelLeadAvailability()` supplies selectable-model coverage information. Fewer than two models or an empty shared intersection yield N/A. This applies only to the Home ranking; Home scorecards remain independent model/baseline paired comparisons. Skill vs Lead and scorecards use baseline-relative skill; Time Series presents absolute verification values.
- Unavailable model/metric/lead/date combinations appear as N/A or chart gaps. Dropdown availability reflects real loaded records.

Page-level filters retain their own metric and date settings, but share the selected geographic region. Auto-selection of a CONUS-only metric updates that region on every page. Asynchronous region loading guards against outdated requests overwriting newer selections.

The precise normalized CSV fields and source conventions are described in [DATA_FORMAT.md](DATA_FORMAT.md).

## Charts and interaction

`js/config.js` defines model colors, markers, and line widths. The chart renderer in `js/charts.js` handles interactive SVG displays and canvas-based PNG exports. The original deep-navy plotting surface is used in dark mode and white in light mode; only the black GFS trace uses a fine light outline in dark mode.

Model chips on Home, Skill vs Lead, and Time Series support hover-to-highlight behavior. On Skill vs Lead and Time Series, keyboard focus also highlights the associated trace without altering model selection. Chart interactions include sampling, zoom, pan, and export. Automatic y-axis ticks use rounded numerical intervals, with chart and PNG export sharing the same tick positions and labels; tooltip values retain metric-specific precision. The Home rank-history tooltip displays the daily absolute metric values that determined each model rank, alongside the rank, without altering the chart data.

Notable Signals identifies the six largest changes between consecutive 15-day periods, including at least one improvement and one decline when both are present. Badge shades use the blue/red scorecard palette.

## Effective lead time

The Skill vs Lead page includes an **Effective Lead-Time Gain** interactive chart and expandable table, implemented in `js/effective-lead.js` (`effectiveLeadSeries`, `fitDecliningQuality`, `equivalentForecastHour`). For each enabled non-baseline model, `DataService.meanValueByLead()` builds an **independent** forecast-hour arithmetic-mean curve from all available daily regional `value` records in the selected window. The baseline mean curve is independently computed once from its own available records, rather than built from per-comparison paired dates. This is the exact per-lead source used by the Forecast Hour Mean plot; there is no requirement that the baseline and model have scores for the same date or at identical forecast hours.

Each native-unit mean is transformed into higher-is-better quality: ACC/ETS directly, RMSE/RMSVE negated, and Bias/SPEED_ERR negated absolute target distance. A weighted, non-increasing isotonic fit (`n` = number of daily mean inputs at that lead) is applied **only to the effective-lead equivalence calculation**; the absolute Forecast Hour Mean and matched percentage-skill curves remain unchanged. For a baseline lead with an observed mean, invert the model's fitted quality curve via linear interpolation between observed adjacent **24-hour model forecast leads**. `gain_hours = equivalent_model_hour - baseline_forecast_hour`. Exact same-hour fitted equality produces a plotted `0.0 h`. No interpolation across missing intermediate model lead steps and no extrapolation beyond the model's observed horizon. The model can be matched at a different forecast hour even if it lacks verification at the baseline's given hour. If the baseline lacks its mean at a forecast hour, no quality target is available and no gain is reported.

`effectiveLeadSeries()` returns one status row for each baseline F0–F360 hour, with `matched`, `below-range` (equivalent would require an earlier model hour), `beyond-range` (later model hour), `gap` (missing model lead step), `no-baseline-data`, `no-model-data`, or `insufficient`. Only `matched` rows enter the graph. The coverage matrix and numeric table use clear hover/focus explanations and availability boundaries; **no computable result is ever replaced by zero**. Different baseline and comparison sample dates or verifying datasets can introduce sample-composition effects. The method is therefore descriptive, not a matched-event significance estimate. The independent available-mean calculations do **not** alter Home common-sample rankings, the Standard matched percentage-skill curves, the EVS paired raw-difference significance test, or Scorecard Standard/Strict behavior.

## Forecast Hour Mean and EVS-style paired-difference intervals

**Forecast Hour Mean:** `DataService.meanValueByLead()` (`js/data-service.js`) reads the available daily values for each model, metric, region, date window, and forecast lead, then computes an arithmetic mean and count for each lead. This is an **absolute** verification curve, independent of selected baseline or comparison matching. Missing hours remain gaps in the chart (no artificial interpolation across missing 24-hour leads). The mean intentionally differs from the nonlinear RMS/Fisher aggregation used by percentage-skill calculations. The chart is rendered by `renderLineChart()` in `js/charts.js` with an hour-based 0–360 x-axis and separate interaction, hover, and PNG export.

**EVS-style intervals:** `js/significance.js` computes per-lead model-minus-baseline **paired daily difference values**, matched by valid date/lead using the fixed Standard approach on Skill vs Lead. The Scorecard retains its separate Strict option, but that setting does not affect Skill vs Lead. For each non-baseline model and lead having `n >= 2` pairs, compute:

```text
difference_i = model_daily_value_i - baseline_daily_value_i
mean_difference = arithmetic_mean(difference_i)
population_SD = sqrt(sum((difference_i - mean_difference)^2) / n)
CI_half_width = F(n) * population_SD / sqrt(n - 1)
F(n) = 1.960 (n >= 80), 2.000 (40-79), 2.042 (20-39), 2.228 (2-19)
```

This follows the [EVS `global_det_atmos_plots_lead_average.py` comparison method](https://github.com/NOAA-EMC/EVS/blob/develop/ush/global_det/global_det_atmos_plots_lead_average.py#L200). It replaces the old three-day block sign-swap/significance-envelope routine; **no randomization or 20-date minimum remains**. The lower percentage-skill plot has Significance on by default and overlays thin model-colored rectangles centered on zero using the EVS CI half-width divided by the matched baseline scale and multiplied by 100 for display. The raw-score EVS significance decision is unchanged by this visual conversion. The EVS significance decision compares the raw mean difference with its raw CI half-width; the percentage-skill line location must not be treated as the test statistic. No single shared interval is used. The confidence bars are rendered both on-screen and in downloaded PNGs.

The source EVS routine averages precomputed per-day statistics; our dashboard uses already summarized **regional** daily metric values instead of the underlying matched forecast/observation events. This limitation, unadjusted serial dependence and multiple testing, and the nonlinear nature of dashboard percentage skill mean that the intervals do **not** provide an official EVS significance test of the percentage-skill panel. Raw signed Bias differences also do not directly establish improvement. The 0.0% reference tick and existing relative-skill lines remain unchanged on the lower chart. The old randomized/shared-envelope significance method is absent from executable code.

## Scheduled publication

The update wrapper stages a rolling 90-day archive, validates coverage and freshness, and then publishes it via local copy, SSH/SCP, or Git push. Cached successful downloads reduce repeated network requests, while missing dates are retried. Publication credentials and GitHub Pages configuration remain external to the repository.

Detailed settings and operational checks are provided in [CRON_SETUP.md](CRON_SETUP.md).

## Effective lead-time comparison table colors (1.1.11)

The frontend `effectiveLeadCell()` in `js/app.js` renders positive and negative matched gains using the scorecards' existing `heatColor()` diverging palette, with foreground contrast selected by `effectiveLeadTextColor()` (black or white using WCAG relative luminance). `effectiveLeadGrade()` maps signed hours to a fixed square-root scale: `sign(hours) * sqrt(min(abs(hours)/48, 1))`. Positive hours are blue, negative red, zero neutral gray; magnitudes at or beyond 48 h saturate. The scale is independent of which models or dates are visible, and recomputes on light/dark theme switches. Missing and extrapolation/gap statuses are never color coded. CSS uses the existing `.heat` pill style. No data-service, statistical method, or backend changes.


## v1.2.0 Skill Explorer architecture

The existing `DataService` (`js/data-service.js`) and output CSV schema are unchanged. The additional read-only `js/explorer-analytics.js` module computes date/lead matched pairs, ordinal metric-quality comparisons, pairwise win rates, independent regional matrices, rolling paired aggregate scores, observed native-unit distribution summaries, and ACC=0.80 threshold crossings. It reuses `DataService.windowRows()`, `comparisonPairs()`, `aggregateMetricValues()`, `meanValueByLead()`, and `relativeSkill()`. Its comparison type is always Standard (same valid date, forecast hour, region and metric; verification-source discrepancies are surfaced but are not silently removed).

`js/explorer-view.js` renders full-fidelity SVG heatmaps/matrix/box plots with hover/focus details and full-size PNG rasterization. Its rolling chart calls the established `renderLineChart()` exporter, retaining drag zoom, wheel zoom, pan, reset and PNG. Custom SVG images are exported independently of on-screen overflow. `js/app.js` wires the new page, model chips, filters, lazy all-region loading and Time Series deep-link behavior. Home and Skill vs Lead use the same new view helpers, but leave the other chart code untouched.

The new modules have no data-writing side effects. The atlas independently loads all supported regional CSVs *only when Skill Explorer is visited*, without fallback or region substitution for its cells. Region selection remains globally synchronized. Any missing score is presented as N/A or an unfilled/missing cell, never as an artificial zero. Matrix win-equivalent rates are pairwise daily summary wins, not gridpoint/event forecast skill. Rolling scores are computed from matched input records using metric-specific nonlinear aggregations where configured; percentages are not naively averaged across days.

`tools/test_skill_explorer.mjs` is a dependency-free deterministic Node regression suite testing matching, missing-data behavior, source mismatches, metric directionality, regional independence, rolling coverage and ACC horizon crossing. `tools/audit_advanced_inputs.py` inventories `COLUMN` entries in local MET Stat-Analysis source files to inform future data requests. Details for CNT/SL1L2, CTC/CTS, PCT, RHIST and binned spread–skill inputs appear in `ADVANCED_DATA_REQUIREMENTS.md`.

## v1.3.0 diagnostic extension

- `js/explorer-diagnostics.js`: pure daily-summary statistical computations. Functions perform no additional network access; they use `DataService.windowRows`, `comparisonPairs`, `resolveWindow`, `aggregateMetricValues`, `relativeSkill`, and the established metric-direction comparison rules. Functions explicitly preserve unavailable scores as missing and expose verification-source issues.
- `js/explorer-diagnostic-view.js`: CSP-compatible SVG presentation from basic rect/line/circle/text primitives, tabulated hover readouts, linked case selections, and chart-specific PNG downloads through the shared direct-canvas exporter.
- `js/explorer-view.js`: existing v1.2 components retained, with a reusable structured `bindInfo` tooltip for new diagnostic views. The signed bias map does not use the relative-skill color palette.
- `js/app.js`: renders the active Explorer tab only, preserves selected filters across tabs, reuses model chips and common date selectors, handles date links into Time Series, and leaves other page/data workflows intact.
- `js/charts.js`: optional `referenceX`/`referenceLabel` markers for Time Series triggered by a selected diagnostic date. Default null leaves every existing chart unchanged; both on-screen SVG and export Canvas support the marker.
- `tools/test_explorer_diagnostics.mjs`: deterministic no-dependency statistical fixtures for date matching, model leadership, source availability, target-zero metrics, sensitivity and audit calculations. Browser fixture tests are maintained separately from deployable assets.

The new analyses are descriptive comparisons of **daily regional verification statistics**, not individual weather events, independent observation pairs, significance tests, or ensemble performance products. See `DIAGNOSTIC_METHODS.md`. The ingest script and scheduling/publishing workflow are intentionally untouched. No raw MET STAT parsing is required for these charts.

### v1.3.1 Skill Explorer refinement

The analysis group is selected before viewing context-dependent controls. The new Leadership Mosaic sample is computed from all selected models **available** for the same date, forecast hour, metric and region, requiring two or more. First-place shares are conditional on date- and lead-dependent competitor pools; the tooltip discloses the population. In the common-sample comparison, unchanged dates imply zero percentage-point delta by definition, independently of model quality.


### v1.3.2 diagnostic interaction refinement

- Shared diagnostic tooltip styles now wrap long table-value cells in a responsive, viewport-bounded popup, with scrolling if necessary. Distribution tooltip styling is unchanged.
- A selected verification date/lead is a reversible UI state: clicking the exact same date/lead clears the selection; clicking a different lead for the same date changes the selected lead. The explicit clear button appears in the sticky selected-case bar while a selection is active. No analytics change.
