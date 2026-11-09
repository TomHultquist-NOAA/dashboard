# OMD Model Performance Dashboard

**Version 1.1.8**

The OMD Model Performance Dashboard provides an interactive view of numerical weather prediction model performance using available summary statistics from NOAA's Office of Modeling and Development (OMD) Evaluation and Verification System (EVS).

The dashboard is a static, responsive website designed for desktop and mobile browsers. It supports comparisons across models, forecast lead times, geographic regions, verification metrics, and selected date ranges. No account or application installation is required.

## Dashboard pages

| Page | Purpose |
|---|---|
| **Home** | Daily model rankings, baseline-relative verification scorecard, and notable changes in recent performance |
| **Skill vs Lead** | Relative model skill as a function of forecast lead time, with a Forecast Hour Mean (die-off) curve and optional EVS-style confidence intervals |
| **Scorecard** | Baseline-relative comparisons across available metrics and forecast leads |
| **Time Series** | Daily absolute verification scores for selected models and forecast leads |
| **Methodology** | Explanations of verification metrics, comparisons, rankings, and interpretation |
| **Changelog** | History of dashboard improvements and releases |

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

Published regional CSVs are requested afresh when a page loads; versioned application assets prevent older metric menus from persisting after deployments. Availability is determined from the published verification records. Some metrics exist only for certain models, regions, dates, or forecast leads. A metric available in CONUS or Global remains selectable from other regions; choosing it automatically switches the detailed plot to its available verification domain. Only metrics without any published records remain **N/A** and disabled. Missing individual combinations are also shown as **N/A** or gaps; no synthetic or inferred scores are added. Manual region changes and automatic switches to CONUS remain synchronized across all dashboard pages. The Home Primary Metric controls the ranking graph; its scorecard always retains its fixed set of six metrics and identifies the actual verification domain used for each row. The wind statistics are MET vector measures: RMSVE evaluates full vector differences, while SPEED_ERR is the difference between magnitudes of mean wind vectors, **not** conventional scalar wind-speed RMSE or bias.

The 24-hour precipitation ETS records are verified at **12 UTC**, whereas the other currently supplied daily summary products are verified at **00 UTC**. Only one valid-time score per date, model, metric, region, and lead is used; the two verification schedules are not conflated.

The dashboard supports forecast leads through **Day 15** in 24-hour steps, where available, and date ranges of **7, 15, 30, 60, or 90 days**, plus a custom range within the loaded archive. Available forecast horizons differ by model.

### Reading the comparisons

- **Home rankings** order models using available absolute verification scores for the selected metric, region, lead, and dates; they do not depend on a baseline.
- **Skill vs Lead** and the **scorecards** report performance relative to a selectable baseline (GFS by default). Positive skill indicates improvement over the baseline; negative skill indicates degradation. Home and full Scorecard use the selected verification region for each metric when possible, otherwise a clearly labeled available domain (currently CONUS or Global). Each metric is computed within one domain; missing model/date/lead values remain N/A. Scores from different regions should not be treated as directly comparable.
- **Time Series** shows absolute verification values rather than percentages relative to a baseline.
- **Standard** comparison matches common valid dates and forecast leads. **Strict** also requires matching verification-dataset identifiers, which can reduce the available comparisons.
- **Notable Signals** highlights the largest changes between successive 15-day periods, using graduated blue for improvement and red for degradation. When both directions are present, the list includes at least one of each.

**Forecast Hour Mean (die-off):** Beneath the Skill vs Lead chart, each selected model has an absolute verification curve computed as the arithmetic mean of the available daily values at each forecast hour. The chart uses metric-native units, and preserves gaps for missing leads. It does not match pairs or normalize to the baseline; model sample counts may differ. It supports independent zoom, pan, hover and PNG export. This mean is deliberately distinct from the nonlinear Fisher/RMS aggregation used in the relative-skill chart.

**EVS-style confidence intervals:** The checkbox (off by default) displays a separate paired *model minus baseline* daily-mean difference chart in metric-native units, with model-colored outlined bars centered on the zero-difference line. For n >= 2 matched daily values, the 95% half-width follows the EVS lead-average plotting routine: F × population_SD(difference) / sqrt(n-1), F = 1.960 (n ≥ 80), 2.000 (40–79), 2.042 (20–39), or 2.228 (2–19). If the mean difference falls outside its own bar, zero is excluded under this approximate pointwise test. This is not an exact confidence interval for the dashboard percentage-skill curve; for bias, signed raw differences cannot alone establish improvement. The data are daily regional summaries, so results are not official EVS event-level significance. Serial dependence and multiple testing are not corrected. See Methodology for details.

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

The **Forecast Hour Mean** chart displays the arithmetic mean of the available daily regional verification scores at each forecast hour. Each model uses its own available dates; therefore, the curves can have unequal sample sizes and should not be interpreted as strictly matched-model comparisons. Missing hours appear as gaps. For RMS and ACC, this arithmetic mean is intentionally **not** the RMS or Fisher-transformed aggregation used for dashboard relative skill.

The optional **EVS-style 95% confidence-interval chart** is a separate *model minus baseline* comparison, not a statistical overlay on the relative percentage-skill chart. It follows the approximate formula and sample-size multipliers in the [EVS deterministic lead-average plot implementation](https://github.com/NOAA-EMC/EVS/blob/develop/ush/global_det/global_det_atmos_plots_lead_average.py#L200). At each lead, matched daily differences yield an arithmetic mean and an outlined zero-centered bar of half-height `F × population_SD(differences) / sqrt(n − 1)`. A mean plotted outside its own bar excludes zero under this approximation. The test requires at least two matched daily values; intervals from very small samples are unstable. It does not account for temporal autocorrelation or multiple comparisons, and uses *daily regional aggregates* rather than EVS's original event-level verification sample, so it must not be described as the official EVS significance result. For signed Bias (ME), a higher or lower raw difference is not necessarily an improvement.

For software changes and release history, see [CHANGELOG.md](CHANGELOG.md).

## Contact

Questions and comments can be directed to [Tom Hultquist](mailto:thomas.hultquist@noaa.gov), Office of Modeling and Development, Evaluation and Verification Unit.
