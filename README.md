# OMD Model Performance Dashboard

**Version 1.0.8**

The OMD Model Performance Dashboard provides an interactive view of numerical weather prediction model performance using available summary statistics from NOAA's Office of Modeling and Development (OMD) Evaluation and Verification System (EVS).

The dashboard is a static, responsive website designed for desktop and mobile browsers. It supports comparisons across models, forecast lead times, geographic regions, verification metrics, and selected date ranges. No account or application installation is required.

## Dashboard pages

| Page | Purpose |
|---|---|
| **Home** | Daily model rankings, baseline-relative verification scorecard, and notable changes in recent performance |
| **Skill vs Lead** | Relative model skill as a function of forecast lead time, with optional estimated significance thresholds |
| **Scorecard** | Baseline-relative comparisons across available metrics and forecast leads |
| **Time Series** | Daily absolute verification scores for selected models and forecast leads |
| **Methodology** | Explanations of verification metrics, comparisons, rankings, and interpretation |
| **Changelog** | History of dashboard improvements and releases |

Charts support model selection, mouseover sampling, zooming, panning, and PNG export. Hovering over a model name highlights the corresponding trace on Home, Skill vs Lead, and Time Series. Light and dark themes are available, with the selected theme retained between visits.

## Models and verification data

The currently configured global models are **GFS, AIGFS, CFS, CMC, ECMWF, FNMOC, and UKMET**. Verification covers **Global, Northern Hemisphere, Southern Hemisphere, and Tropics** regions.

| Available verification product | Metric | Preferred direction |
|---|---|---|
| 500-hPa geopotential height | Anomaly correlation coefficient (ACC) | Higher |
| Mean sea level pressure | Root-mean-square error (RMSE) | Lower |
| 850-hPa temperature | Root-mean-square error (RMSE) | Lower |

Precipitation ETS, 2-m temperature, 10-m wind, and other products may appear in the interface before their data are available. Unavailable metric selections are labeled **N/A** and disabled. Individual missing model/date/lead combinations also appear as **N/A** or gaps; they are not replaced with zeros or synthetic scores.

The dashboard supports forecast leads through **Day 15** in 24-hour steps, where available, and date ranges of **7, 15, 30, 60, or 90 days**, plus a custom range within the loaded archive. Available forecast horizons differ by model.

### Reading the comparisons

- **Home rankings** order models using available absolute verification scores for the selected metric, region, lead, and dates; they do not depend on a baseline.
- **Skill vs Lead** and the **scorecards** report performance relative to a selectable baseline (GFS by default). Positive skill indicates improvement over the baseline; negative skill indicates degradation.
- **Time Series** shows absolute verification values rather than percentages relative to a baseline.
- **Standard** comparison matches common valid dates and forecast leads. **Strict** also requires matching verification-dataset identifiers, which can reduce the available comparisons.
- **Notable Signals** highlights the largest changes between successive 15-day periods, using graduated blue for improvement and red for degradation. When both directions are present, the list includes at least one of each.

**Estimated significance thresholds:** Skill vs Lead offers optional gray boxes centered on the always-labeled 0.0% reference. Each box spans the largest estimated pointwise 95% threshold among displayed models with at least 20 matched daily dates for that forecast lead. A trace beyond the box suggests a potentially meaningful difference only for a model with sufficient paired dates; a trace inside the box is inconclusive. The thresholds use three-day block randomization on daily summary scores, not formal EVS testing. The in-dashboard **Methodology** page explains the calculation, interpretation, and limitations.

## Availability and updates

The Home page displays the latest available verification date from the loaded data. Data availability depends on the upstream verification files, so individual models, products, forecast leads, and dates may have different coverage.

Automated updates require an external job to retrieve and normalize the source STAT files and publish the generated regional CSVs. The website itself does not collect source files. See [CRON_SETUP.md](CRON_SETUP.md) for scheduled data updates and publication options.

## Deployment

The dashboard uses HTML, CSS, and JavaScript and can be served by GitHub Pages or another static web server. It does not require an application server or build process. Files are distributed at the root of the archive and should remain in the same relative directory structure.

The **complete distribution includes header-only regional CSV placeholders**, not an archive of operational verification observations. For an existing deployment with populated data, the **update-only distribution** preserves `data/regions/*.csv` and `data/ingest_report.json`. Replacing populated CSV files with the placeholders will result in N/A values until data are regenerated and published.

A functioning deployment must serve files over HTTP(S); opening `index.html` directly from a local file system generally prevents the browser from fetching the CSV data. GitHub Pages deployments require a configured publishing branch or directory. Data generated on a separate processing system must also be published to the website's `data/` directory or GitHub publishing branch.

### Manual data import

The included importer supports **Python 3.6.8 or later**, using only the Python standard library:

```bash
python3 tools/ingest_evs_stat.py --fetch --days 90
```

It downloads available daily source STAT files, produces the four regional CSV files in `data/regions/`, and writes `data/ingest_report.json`. Cached source downloads are excluded from the Git repository. Existing local source files can also be imported:

```bash
python3 tools/ingest_evs_stat.py --input-dir /path/to/dashboard_stats --days 90
```

Additional setup, validation, and publication guidance is available in [CRON_SETUP.md](CRON_SETUP.md). The normalized CSV schema is documented in [DATA_FORMAT.md](DATA_FORMAT.md), and the system design is documented in [ARCHITECTURE.md](ARCHITECTURE.md).

## Methodology and scientific interpretation

The in-dashboard **Methodology** page describes each metric and the interpretation of rankings, scorecards, and skill comparisons. Results are derived from already summarized verification statistics; period-level aggregates are not identical to computations from the original matched forecast–observation pairs.

The optional Skill vs Lead significance boxes are **exploratory estimates based on matched daily summaries**, using three-day block sign-swap randomization. They do not reproduce official MET/EVS confidence intervals, do not adjust for multiple testing across models and leads, and should not be treated as a definitive statistical finding. Missing boxes indicate insufficient information for the estimate, not a conclusion about significance.

For software changes and release history, see [CHANGELOG.md](CHANGELOG.md).

## Contact

Questions and comments can be directed to [Tom Hultquist](mailto:thomas.hultquist@noaa.gov), Office of Modeling and Development, Evaluation and Verification Unit.
