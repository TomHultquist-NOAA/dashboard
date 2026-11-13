**v1.3.11:** The Verification Case Finder table now labels the two score columns with the selected focus model and baseline names, and refreshes those labels when selections change. This is a frontend-only update; verification statistics, published data, and ingestion are unchanged.

**v1.3.10 interface refinement:** The Skill Explorer Beta badge now sits next to the dynamic page title in the top bar, appearing only on Skill Explorer. The duplicate in-page heading is removed; the sidebar Beta marker and analysis tabs remain. In the Pareto Frontier, a ring denotes a non-dominated model—no other displayed model is at least as strong on both metrics and strictly better on one—rather than a separate overall performance score. No data or statistical changes.

# OMD Model Performance Dashboard

**v1.3.9 regression correction:** Mean advantage and win-equivalent frequency are computed independently per selected model, even when the focus-model control is set. Rolling Skill Shifts and Performance Consistency now correctly use their row-model values rather than the focus-model scores. All custom X/Y Skill Explorer plots use full vertical Y-axis titles rendered in the browser and PNG export. Previously published v1.3.8 multi-model comparison values could be duplicated; update the frontend to v1.3.9 before interpreting these three views. No source CSV or ingestion changes.

**Latest update (v1.3.8):** Time Series now includes a model-colored selected-period score inset (value plus valid-day count), using the exact plotted daily values and each metric’s established Fisher/RMS/arithmetic aggregation. The inset moves beneath the chart on narrow displays and appears beside the plot in PNG downloads.  A clear Analysis settings header and selection cue now appear on all five interactive dashboard pages. Skill Explorer model comparisons no longer lose information to overlapping scatter markers or hidden/disabled Pareto graphics. Advantage versus Winning Frequency shows each model on its own row with exact mean native-unit advantage and win-equivalent frequency. The two-metric Trade-Off chart remains visible with valid common-date data, including a single dominant model; one eligible model receives a compact graphical profile. The Save PNG action remains available for every actual SVG chart. None of the forecast/observation statistics, normalized CSVs, private ingestion processes, schedules or public data schemas are modified. AWS and RZDM web assets are identical.

The OMD Model Performance Dashboard provides an interactive view of numerical weather prediction model performance using available summary statistics from NOAA's Office of Modeling and Development (OMD) Evaluation and Verification System (EVS).

The dashboard is a static, responsive website designed for desktop and mobile browsers. It supports comparisons across models, forecast lead times, geographic regions, verification metrics, and selected date ranges. No account or application installation is required.

## Dashboard pages

| Page | Purpose |
|---|---|
| **Home** | Model-selectable daily rankings, baseline-relative scorecard, **ACC 0.80 skill-horizon cards**, and notable changes |
| **Skill vs Lead** | Forecast Hour Mean, baseline-relative skill with EVS-style significance intervals, effective lead-time gain, and effective-lead coverage diagnostics |
| **Scorecard** | Baseline-relative comparisons across available metrics and forecast leads |
| **Time Series** | Daily absolute verification scores for selected models and forecast leads |
| **Skill Explorer (Beta)** | Five clearly labeled groups: **Performance Patterns**, **Model Comparisons**, **Diagnostic Cases**, **Error Diagnostics**, and **Comparison Robustness** |
| **Methodology** | Explanations of verification metrics, comparisons, rankings, and interpretation |
| **Changelog** | History of dashboard improvements and releases |


## Skill Explorer Beta — current v1.3.9

The five prominent navigation tabs group different questions rather than duplicating the same plot. All results use **normalized daily regional summary CSVs** and do not introduce new upstream metrics. The Beta marker is also visible in the left sidebar.

| Group | Views and interpretation |
|---|---|
| **Performance Patterns** | Daily Skill Fingerprint (2D), Lead-Time Advantage Envelope, Regional Skill Atlas, Rolling Skill Shifts, Performance Consistency |
| **Model Comparisons** | Head-to-Head Win Matrix; Average Advantage vs. Winning Frequency (aligned model-by-model comparison scales); Model Trade-Off Explorer with two metrics and a Pareto Frontier (keeps actual charts visible for dominant models and single-model skill profiles) |
| **Diagnostic Cases** | Model Leadership Mosaic with adaptive participation by date/lead, Verification Case Finder and linked date selection, paired daily Model Performance Scatterplot |
| **Error Diagnostics** | Signed Bias Evolution and Bias–RMSE Portrait joining available bias and RMSE scores on matching daily dates/leads |
| **Comparison Robustness** | Exploratory seven-day Paired Block-Bootstrap Uncertainty for mean daily advantage and Leave-One-Week-Out Sensitivity |

**Comparison presentation (v1.3.8):** the win-frequency panel uses separate horizontal axes on each model row for mean daily native-unit advantage and win-equivalent percentage; no point jitter or 2D overplotting is used. Rows with fewer than `max(3,min(21,ceil(calendar_days/2)))` matched dates are visibly flagged, not hidden. The Pareto panel plots every model that remains in the explicitly reported common-date cohort (excluding a model only when its disjoint sample would otherwise erase all shared dates); if only one model is eligible, it shows an exportable two-metric profile instead. A single Pareto winner does not suppress the chart or PNG export. Insufficient matched data still produces an explicit N/A and disables export, as no genuine plot exists. All displayed values are based on actual matched daily regional summary scores; source-reference caveats remain.

The experimental high/low baseline-score diagnostic was **removed** after comparing its same-lead and different-lead behavior: sorting by the baseline score that also enters model advantage introduces a mathematical-coupling risk. No new independent weather-difficulty label can be inferred from the existing daily score summaries.

The **comparison coverage indicator** below the selection controls shows focus-versus-baseline paired daily dates, calendar-day coverage and verification-source issues. The collapsible **Models in comparison** controls affect charts that require multiple selected models (the matrix, Mosaic, and Bias–RMSE Portrait); other diagnostics use the chosen focus model and baseline. The **Forecast Lead** selector affects the Head-to-Head Matrix, Rolling Skill, Performance Consistency, Case Finder, Paired Scatterplot and robustness analyses. All-lead heatmaps and the Bias–RMSE Portrait remain all-lead.

The Case Finder supports largest advantages, largest deficits, and sharpest *consecutive-calendar-day* changes in the signed model advantage. Clicking a case row highlights the date in the scatterplot and Leadership Mosaic, and its Time Series button adds a visible vertical marker in the chart **and PNG export**. Scores are daily regional averages/aggregates, **not** storm events, case-specific forecasts, member-level observations or independent verification samples.

Each new SVG-style diagnostic chart has a titled, full-size **PNG export drawn directly on Canvas**, compatible with restrictive web image policies. The Case Finder and compact grouped comparison tables remain readable on the webpage rather than becoming separate table exports. Responsive dark/light themes, keyboard-accessible cell/dot details, and source warnings are preserved. Details of metric direction, matching and uncertainty limitations appear in the built-in **Methodology** page.

**Interpreting sparse coverage:** the Leadership Mosaic shows a date/lead leader when at least two selected models have valid scores; participants can change across forecast leads and dates, and fewer than two means N/A. First-place percentages are therefore conditional on that changing model pool. Other views use clearly disclosed matching rules. The leave-one-week-out panel is a descriptive sensitivity check, **not** a statistical confidence interval or a new significance test.

The release leaves all previous dashboard ranking/scorecard calculations, EVS-style interval logic, effective lead-time estimation, rolling 90-day limit, per-region source files, cron scripts, and ingest configuration unchanged. Production CSVs must be preserved during deployment—use the **update-only archive** on existing installations.

## v1.3.5 — Skill Explorer Beta (all charting remains client-side)

The five large tabs explicitly invite navigation: **Performance Patterns** (Daily Skill Fingerprint, new Lead-Time Advantage Envelope, Regional Skill Atlas, Rolling Skill Shifts, Performance Consistency), **Model Comparisons** (Head-to-Head Win Matrix, new Average Advantage vs. Winning Frequency, new two-metric Trade-Off/Pareto Frontier), **Diagnostic Cases**, **Error Diagnostics**, and **Comparison Robustness** (new paired block-bootstrap together with Leave-One-Week-Out).

- **Lead-Time Advantage Envelope:** daily native-score difference 10th, 50th and 90th percentiles by available lead, compared with the same baseline; percentile bands are descriptive spread over verification dates, not statistical uncertainty intervals.
- **Average Advantage vs. Winning Frequency:** mean daily native-unit advantage against percentage of paired days won (ties count half) for each selected non-baseline model. Sample dates can differ between models; no combined score is produced.
- **Trade-Off Explorer / Pareto Frontier:** user-selected X/Y metric axes, both converted to percentage skill relative to the baseline using the established metric aggregation. Requires exactly the same dates for every plotted model **and both metrics**. Missing metrics and insufficient overlap remain unavailable; a Pareto frontier is not a scientific rank ordering.
- **Paired Block-Bootstrap:** 800 circular seven-calendar-day block replicates of the mean *daily native-unit advantage*, with a 95% percentile interval when at least 21 matched dates exist. Dates without data remain missing. This is exploratory sensitivity to temporal variation, not EVS formal significance, an event-level confidence interval, or a p-value.

**Original `.stat` files:** The November 11 extended probe examined 20 STAT files covering H500 RMSE/ME, MSLP ME, T2m RMSE, 10m RMSVE and 24hQPF ETS; all 8,171 `SUMMARY` rows had `TOTAL=1`, and four queried surface-data files were unavailable (HTTP 404). These summaries do **not** provide independent forecast/observation variance, raw station/gridpoint counts, contingency-table counts, or ensemble member distributions. No Taylor/reliability diagram or new ingestion fields were added. More advanced verification would require different underlying MET products or data.

**Deployment:** The RZDM and AWS update archives contain the *same front-end code*. Neither includes operational CSVs, input `.stat` data, private ingestion, crontab/systemd definitions or credentials. Unzip into the **existing** dashboard web root and refresh the browser. Nothing under `data/` is touched by this release.

## New in v1.2.0: Skill Explorer

The original **Skill Explorer** page introduced five interactive views built entirely from the *existing* normalized, daily regional CSV scores. It does not change the ingest script, rank calculation, Scorecard, effective lead-time method, or Significance computations.

- **Daily Skill Fingerprint:** date-by-lead heatmap of a selected model's relative skill against a selectable baseline. Click or keyboard-activate a cell to open Time Series for the exact forecast lead. Hover/focus shows dates, raw scores, percentage skill, and verifying-source warnings; gray cells mean no matched pair. The model and baseline must both have a daily score for the same region, metric, valid date, and forecast lead.
- **Head-to-Head Win Matrix:** model-versus-model daily *regional score* comparisons at one forecast lead. A row wins if it has the better daily aggregate score; the displayed rate is `(wins + 0.5 × ties) / matched days`, with sample size `n` on every populated cell. The matrix does **not** give the percentage of individual forecast events verified successfully. Every cell uses its own matched pairwise dates, which can differ between comparisons.
- **Regional Skill Atlas:** a region-by-lead heatmap showing one selected model versus its baseline using *paired* model/baseline scores and existing aggregate metric rules. All five configured regions load when the page is first visited. Each atlas region uses only its own CSV, with no substitute values from other geographic domains. Hover/focus exposes matched sample size and source warnings.
- **Rolling Skill Shifts:** seven- or fifteen-calendar-day trailing baseline-relative percent skill at a single forecast lead, recomputed from paired daily score records. Each plotted point needs at least half the selected window's dates to be matched; missing-data periods are gaps, not zeros. This descriptive view is not a significance test.
- **Performance Consistency:** one box/whisker plot per selected non-baseline model at a forecast lead. Each sample is a **daily regional metric difference** in native units, oriented so positive values mean the model is better. Shows the median, quartiles, sample min/max and individual daily summary differences; this is not the distribution of point-level forecast errors. This view is located in Skill Explorer (not duplicated on Skill vs Lead).

**Home ACC 0.80 Skill Horizon:** displays the forecast lead where the arithmetic mean of available daily H500 ACC scores first crosses 0.80. It interpolates only between adjacent 24-hour leads and never extrapolates across missing lead steps or beyond available data. This is *not* the same as Effective Lead-Time Gain; different models can have different daily samples.

**Exports:** Each new non-line graphic has a Save PNG button that exports the *whole chart*, even when its on-screen container scrolls; Rolling Skill uses the existing interactive chart exporter. All exports retain dark/light palettes and titles. The existing scorecard PNG/CSV exports remain as before. The new views also work when some models or regions have no data: unavailable combinations display N/A, and the original data are never synthesized.

**Limits and advanced roadmap:** The current CSVs are daily MET regional summary scores, not forecast–observation or ensemble-member data. A win rate is not event accuracy, and n matched daily records are not n independent point observations. Taylor/Target diagrams, categorical precipitation performance diagrams, reliability diagrams, ensemble rank histograms, and binned spread–skill require further inputs. See **[ADVANCED_DATA_REQUIREMENTS.md](ADVANCED_DATA_REQUIREMENTS.md)** and run `python3 tools/audit_advanced_inputs.py --path /path/to/raw_stat_cache` to inventory summary columns in the current raw archive. The audit reports candidate fields, but does not prove sufficient matching data exist. No advanced plot is fabricated from unsuitable summary scores.

**Chart and scorecard exports:** Interactive line charts on Home, Skill vs Lead, Skill Explorer and Time Series export to PNG with a model legend matching the plotted series. The Skill Explorer heatmaps, matrix and box plots export to PNG with their own model or region labels. For scorecard-style summaries, the Home Verification Scorecard, Skill vs Lead **Equivalent Forecast-Hour Table**, and Scorecard page (all metrics or individual categories) offer PNG and CSV exports. PNGs retain the score coloring, context, and all off-screen columns, while CSVs contain displayed values and headings. Ordinary ranking, data-availability, and calculation-status tables remain available for on-page viewing but have no separate export controls. The exports run entirely in the browser with no external dependencies.

Charts support model selection, mouseover sampling, zooming, panning, and PNG export. Y-axis ticks use rounded, metric-appropriate intervals; tooltips retain the usual verification-value precision. Hovering over a model name highlights the corresponding trace on Home, Skill vs Lead, and Time Series. The Home rank-history tooltip lists model rank and the corresponding daily absolute verification value for the selected metric and forecast lead. Light and dark themes are available, with the selected theme retained between visits.

## Models and verification data

The currently configured global models are **GFS, AIGFS, CFS, CMC, ECMWF, FNMOC, and UKMET**. Verification domains are **Global, Northern Hemisphere, Southern Hemisphere, Tropics, and CONUS**. The CONUS domain supplies the currently available 2-m temperature, 10-m wind, and 24-hour precipitation scores; those products cannot be inferred for the four global domains.

| Verification product | Available statistic(s) | Preferred direction |
|---|---|---|
| 500-hPa geopotential height | ACC, RMSE, Bias (source ME) | Higher ACC; lower RMSE; Bias closer to zero |
| 850-hPa temperature | RMSE, Bias (source ME) | Lower RMSE; Bias closer to zero |
| Mean sea-level pressure | RMSE, Bias (source ME) | Lower RMSE; Bias closer to zero |
| 2-m temperature | RMSE, Bias (source ME) | Lower RMSE; Bias closer to zero |
| 10-m wind vector | RMSVE, SPEED_ERR | Lower RMSVE; SPEED_ERR closer to zero |
| 24-h precipitation ≥0.10 in (2.54 mm) | ETS (MET GSS) | Higher |

Published regional CSVs are requested afresh when a page loads; versioned application assets prevent older metric menus from persisting after deployments. Availability is determined from the published verification records. Some metrics exist only for certain models, regions, dates, or forecast leads. A metric available in CONUS or Global remains selectable from other regions; choosing it automatically switches the detailed plot to its available verification domain. Only metrics without any published records remain **N/A** and disabled. Missing individual combinations are also shown as **N/A** or gaps; no synthetic or inferred scores are added. Manual region changes and automatic switches to CONUS remain synchronized across all dashboard pages, including Skill Explorer. The Home Primary Metric controls the ranking graph; its scorecard always retains its fixed set of six metrics and identifies the actual verification domain used for each row. The wind statistics are MET vector measures: RMSVE evaluates full vector differences, while SPEED_ERR is the difference between magnitudes of mean wind vectors, **not** conventional scalar wind-speed RMSE or bias.

The 24-hour precipitation ETS records are verified at **12 UTC**, whereas the other currently supplied daily summary products are verified at **00 UTC**. Only one valid-time score per date, model, metric, region, and lead is used; the two verification schedules are not conflated.

The dashboard supports forecast leads through **Day 15** in 24-hour steps, where available, and date ranges of **7, 15, 30, 60, or 90 days**, plus a custom range within the loaded archive. Available forecast horizons differ by model.

### Reading the comparisons

- **Home rankings** use the enabled model chips (showing model names only; forecast-hour coverage remains available in the tooltip and expandable availability table) independently of the Home scorecard and other summaries. For **All forecast leads**, only scores verified for identical valid-date and forecast-hour combinations across **every selected model** are included in the overall rank and daily rank chart. This prevents shorter-lead models from being ranked using easier early periods while longer-lead models include later periods. The expandable Forecast-hour availability table lists each model’s actual hours/dates/records for the selected metric, region, and date window. Toggle models to expand or restrict the common coverage. If fewer than two models are selected or no identical observations overlap, a ranking is not reported. A specific forecast lead continues to use each model’s available dates. These rankings use absolute verification scores and do not depend on the selected baseline. The Home scorecard still computes separate model/baseline paired comparisons and can have model-dependent available lead ranges under All; a warning identifies this limitation.
- **Skill vs Lead** and the **scorecards** report performance relative to a selectable baseline (GFS by default). Positive skill indicates improvement over the baseline; negative skill indicates degradation. Home and full Scorecard use the selected verification region for each metric when possible, otherwise a clearly labeled available domain (currently CONUS or Global). Each metric is computed within one domain; missing model/date/lead values remain N/A. Scores from different regions should not be treated as directly comparable.
- **Time Series** shows absolute verification values rather than percentages relative to a baseline.
- **Skill vs Lead percentage-skill and Significance** always use Standard comparison: shared valid date, forecast hour, metric and region; verification-source labels may differ. The Skill vs Lead Comparison Method selector has been removed. The separate detailed Scorecard still offers Standard and Strict (same verification-source) options. **Effective Lead-Time Gain uses available samples independently for each model and the baseline**, so forecast-hour coverage is not restricted to dates paired between the two models.
- **Notable Signals** highlights the largest changes between successive 15-day periods, using graduated blue for improvement and red for degradation. When both directions are present, the list includes at least one of each.

**Forecast Hour Mean (die-off):** Above the Difference from Baseline chart, each selected model has an absolute verification curve computed as the arithmetic mean of the available daily values at each forecast hour. The chart uses metric-native units, and preserves gaps for missing leads. It does not match pairs or normalize to the baseline; model sample counts may differ. It supports independent zoom, pan, hover and PNG export. Downloaded chart PNGs include a model legend below the plot with the actual plotted series colors, line weights and marker shapes; the legend wraps for additional models without obscuring the axes. This mean is deliberately distinct from the nonlinear Fisher/RMS aggregation used in the relative-skill chart.

**Effective Lead-Time Gain (independent available samples):** A third Skill vs Lead chart and expandable table estimate the forecast hour at which each enabled model reaches the same verification quality as the baseline at each baseline forecast hour with data. The y-axis is **hours gained or lost**, not percentage skill: +24 h at GFS F120 means a model reaches the same fitted quality around F144. **Unlike the percentage-skill and significance plots, model and baseline values do not have to be available on the same verification dates or even at the same forecast hour.** The calculation uses each model's own per-hour arithmetic means of available daily scores, exactly as shown by Forecast Hour Mean, and the baseline's independently available hourly means. A model's mean can have a different number of dates or a different verifying dataset. These are descriptive sample-dependent estimates, not strictly matched comparisons or statistical significance tests.

For each model and the baseline, higher-is-better scores are used directly (ACC/ETS), lower-is-better scores are negated (RMSE/RMSVE), and Bias/SPEED_ERR use negative absolute distance from their zero target. The per-hour mean series undergoes a daily-count-weighted, non-increasing isotonic fit to reduce noisy increases in quality at later leads. The matching quality is found through linear interpolation between **adjacent available 24-hour forecast leads** in the comparison model; gaps in the sampled lead sequence are not bridged and no extrapolation occurs. When fitted model and baseline qualities genuinely match at the same forecast hour, the result is **0.0 h**. An equivalent earlier than the first available model lead or later than its last available lead is **not** zero—it remains unplotted. The **Why lines start or stop** grid uses ● for a computed equivalent, 0 for an equal same-hour match, ‹/› for outside the model's available range, × for a missing lead step, – for a missing baseline mean, ∅ for no model means, and ? for insufficient lead values. Hover or focus for actual boundaries and sample information. The expandable table reports numerical gains with the familiar red/gray/blue scorecard shading, fixed to saturation at ±48 hours; missing entries are uncolored. The resulting curves can extend farther than the previous matched-date method, but comparing different daily samples introduces additional sample-selection uncertainty. The underlying daily data and verification-source labels are never manufactured or extrapolated.

**Significance (on by default):** The checkbox displays the only active significance method: the EVS-style paired raw-score *model minus baseline* 95% zero-centered confidence boxes, directly on the lower Difference from [baseline] chart. It does not add a third plot or change percentage-skill lines. For n >= 2 matched daily values, the 95% half-width follows the EVS lead-average plotting routine: F × population_SD(difference) / sqrt(n-1), F = 1.960 (n ≥ 80), 2.000 (40–79), 2.042 (20–39), or 2.228 (2–19). If the mean difference falls outside its own bar, zero is excluded under this approximate pointwise test. This is not an exact confidence interval for the dashboard percentage-skill curve; for bias, signed raw differences cannot alone establish improvement. The data are daily regional summaries, so results are not official EVS event-level significance. Serial dependence and multiple testing are not corrected. See Methodology for details.

## Availability and updates

The Home page displays the latest available verification date from the loaded data. Data availability depends on the upstream verification files, so individual models, products, forecast leads, and dates may have different coverage.

Automated updates require an external job to retrieve and normalize the source STAT files and publish the generated regional CSVs. The website itself does not collect source files. See [CRON_SETUP.md](CRON_SETUP.md) for scheduled data updates and publication options.

## Deployment

The dashboard uses HTML, CSS, and JavaScript and can be served by GitHub Pages or another static web server. It does not require an application server or build process. Files are distributed at the root of the archive and should remain in the same relative directory structure.

The **complete distribution includes the ingestion and cron tools plus header-only regional CSV placeholders**, not an archive of operational verification observations. The included sample cron configuration should be copied and customized for each deployment; local runtime settings are not shipped. For an existing deployment with populated data, the **update-only distribution** preserves `data/regions/*.csv` and `data/ingest_report.json`. Replacing populated CSV files with the placeholders will result in N/A values until data are regenerated and published.

A functioning deployment must serve files over HTTP(S); opening `index.html` directly from a local file system generally prevents the browser from fetching the CSV data. GitHub Pages deployments require a configured publishing branch or directory. Data generated on a separate processing system must also be published to the website's `data/` directory or GitHub publishing branch.

### Manual data import

The included importer supports **Python 3.6.8 or later**, using only the Python standard library. It requests twelve source products per model and date (missing products are normal):

```bash
python3 tools/ingest_evs_stat.py --fetch --days 90
```

It downloads available daily source STAT files, produces the five regional CSV files in `data/regions/`, and writes `data/ingest_report.json`. Cached source downloads are excluded from the Git repository. Existing local source files can also be imported:

```bash
python3 tools/ingest_evs_stat.py --input-dir /path/to/dashboard_stats --days 90
```

Additional setup, validation, and publication guidance is available in [CRON_SETUP.md](CRON_SETUP.md). The normalized CSV schema is documented in [DATA_FORMAT.md](DATA_FORMAT.md), and the system design is documented in [ARCHITECTURE.md](ARCHITECTURE.md).

## Methodology and scientific interpretation

The in-dashboard **Methodology** page describes each metric and the interpretation of rankings, scorecards, and skill comparisons. Results are derived from already summarized verification statistics; period-level aggregates are not identical to computations from the original matched forecast–observation pairs.

The **Forecast Hour Mean** chart displays the arithmetic mean of the available daily regional verification scores at each forecast hour. Each model uses its own available dates; therefore, the curves can have unequal sample sizes and should not be interpreted as strictly matched-model comparisons. The **Effective Lead-Time Gain** comparison is derived from these same independently available per-hour arithmetic means, with smoothing and within-range interpolation for equivalent skill; it is not the paired-sample calculation used by the lower percentage-skill/Significance display. Missing forecast hours remain unavailable. For RMS and ACC, this arithmetic mean is intentionally **not** the RMS or Fisher-transformed aggregation used for dashboard relative skill.

The **Significance** checkbox (enabled by default) overlays thin, model-colored, zero-centered boxes directly on the existing lower percentage-skill chart. It uses only signed raw *model minus baseline* daily-score differences, not the older randomized significance routine. It follows the approximate formula and sample-size multipliers in the [EVS deterministic lead-average plot implementation](https://github.com/NOAA-EMC/EVS/blob/develop/ush/global_det/global_det_atmos_plots_lead_average.py#L200). At each lead, matched raw daily differences yield an arithmetic mean and a zero-centered interval of half-height `F × population_SD(differences) / sqrt(n − 1)`. The raw mean outside its raw interval excludes zero under this approximation. For placement on the existing percent-skill axis only, interval half-heights are converted using the matching positive baseline denominator; the EVS raw-score test itself is not recomputed in percentages. The test requires at least two matched daily values; intervals from very small samples are unstable. It does not account for temporal autocorrelation or multiple comparisons, and uses *daily regional aggregates* rather than EVS's original event-level verification sample, so it must not be described as the official EVS significance result. For signed Bias (ME), a higher or lower raw difference is not necessarily an improvement.

For software changes and release history, see [CHANGELOG.md](CHANGELOG.md).

## Contact

Questions and comments can be directed to [Tom Hultquist](mailto:thomas.hultquist@noaa.gov), Office of Modeling and Development, Evaluation and Verification Unit.

### v1.2.1 refinements

The Skill Explorer navigation link follows Time Series. Its selector explains which views use **Forecast Lead** (Head-to-Head, Rolling Skill, Performance Consistency) versus all forecast days (Fingerprint and Regional Atlas). Atlas hemisphere labels now fit in full. Performance Consistency provides sample statistics and date-level paired model/baseline scores via hover/focus/tap. Skill Explorer PNGs now use direct Canvas drawing rather than browser SVG-to-image loading, which can fail under restrictive site image policies.

### v1.2.2 — Performance Consistency hover

The single floating readout now uses labeled, aligned statistic/value columns; browser-native SVG title bubbles no longer overlap the styled readout. Hover or focus a model row for summary statistics, or hover/focus/tap a dot for a dated model-versus-baseline comparison. This applies to both Skill Explorer and Skill vs Lead. No additional verification data or ingestion changes are required.
