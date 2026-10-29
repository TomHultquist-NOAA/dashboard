# OMD Model Performance Dashboard — 1.0.1

A static, responsive dashboard for comparing available **NOAA OMD Evaluation and Verification System (EVS)** summary statistics for global guidance systems. The interface offers Home rankings, Skill vs Lead, Scorecard, Time Series, Methodology, and Changelog, with a persistent dark/light theme and interactive charts.

**Important:** The GitHub-ready ZIP contains **header-only CSV placeholders, not your previously ingested real data**. Before copying the full package over your current deployment, **back up and preserve `data/regions/*.csv` and `data/ingest_report.json`**. The user-generated 88-day archive is not included because those files have not been supplied here. The dashboard does not substitute synthetic statistics for missing observations.

## What's currently supported

| Feature | Current behavior |
|---|---|
| Models | GFS, AIGFS, CFS, CMC, ECMWF, FNMOC, UKMET |
| Regions | Global, Northern Hemisphere, Southern Hemisphere, Tropics |
| Incoming verification products | H500 ACC, T850 RMSE, MSLP RMSE |
| Not yet available | Precipitation ETS, 2-m temperature, 10-m wind and other unprovided metrics |
| Forecast leads | Days 0–15 (every 24 hours, if supplied by a model) |
| History filters | 7, 15, 30, 60, 90 days or custom range within the archive |
| Baseline | GFS by default; selectable on scorecard and detailed comparison pages |
| Missing data | `N/A` or chart gaps, never fabricated values or zeros |
| Metric menus | Unavailable metrics remain listed with `— N/A` and cannot be selected |

Time Series displays absolute verification statistics. Home ranks models by their available absolute scores; its scorecard and Skill vs Lead show baseline-relative comparisons using date- and lead-matched scores. Detailed pages offer **Standard** and **Strict** comparison settings. The Methodology page explains how to interpret these displays without implementation-specific terminology.


## Model display conventions (1.0.1)

Line styles apply consistently to interactive charts and downloaded PNG images. Plotting backgrounds are light in both dark and light modes to keep the standard black GFS trace visible.

| Model | Color | Marker | Marker size | Line width |
|---|---|---|---:|---:|
| GFS | `#000000` | Circle | 6 | 3 |
| AIGFS | `#1e3cff` | X | 7 | 1.5 |
| CFS | `#56b4e9` | Circle | 6 | 1.5 |
| CMC | `#1e3cff` | X | 7 | 1.5 |
| ECMWF | `#fb2020` | Triangle | 7 | 1.5 |
| FNMOC | `#00dc00` | Filled plus | 7 | 1.5 |
| UKMET | `#e69f00` | Circle | 7 | 1.5 |

AIGFS and CMC intentionally have matching line and marker styles, as requested. Notable Signals uses scorecard blue for positive changes and red for negative changes. No statistics or importer behavior are changed in this release.

## Quick start: place on GitHub or a web server

1. Unzip this package into the **root of the repository or static web directory**. There is no enclosing directory. It is a static HTML/CSS/JavaScript site and does not require a backend or build process.
2. **Preserve the current `data/` files** if updating an installation already populated from EVS. New installs will initially show `N/A` until data are ingested.
3. Host it over HTTP(S) (including GitHub Pages when correctly configured); opening `index.html` as `file://` generally prevents the data fetches from working.
4. Visit Home and confirm the latest available verification date and model coverage. If content seems stale, hard-refresh and inspect caching of CSV files.

If using GitHub Pages, configure the publishing source/branch in repository settings. Committing the dashboard code to GitHub does **not** automatically make future generated data available—those updated CSVs also need to reach the publishing branch, or be copied to your web server.

## Loading the verification data

The standard-library Python importer supports **Python 3.6.8+** and requires no pip packages. Run it on a computer that can reach the NOAA source server:

```bash
python3 tools/ingest_evs_stat.py --fetch --days 90
```

The script looks for daily files at:

```text
https://emc.ncep.noaa.gov/gmb/mpr/dashboard_stats/YYYYMMDD/model/model_METRIC_YYYYMMDD.stat
```

where `model` is one of `gfs`, `aigfs`, `cfs`, `cmc`, `ecmwf`, `fnmoc`, `ukmet`, and `METRIC` is `MSLP_RMSE`, `H500_ACC`, or `T850_RMSE`. It produces four regional CSV files under `data/regions/` and `data/ingest_report.json`. Source downloads are cached under `raw_stat_cache/`, which is ignored by Git.

You can also import a local copy of the source tree:

```bash
python3 tools/ingest_evs_stat.py --input-dir /path/to/dashboard_stats --days 90
```

The source `.stat` records use MET forecast leads such as `1200000` for 120 hours. The importer selects whole-day leads F000, F024, …, F360 without interpolating six-hourly lead scores. File dates represent **forecast verification valid dates**, not forecast initialization dates. Currently inspected samples are restricted to 00 UTC valid times; no four-times-per-day averaging is performed. Daily statistics are subsequently aggregated by the dashboard over the chosen period.

The importer retains `WMO_WEIGHTED_MEAN` when available, otherwise `MEAN`, and does not treat MET `TOTAL=1` as a gridpoint count. Differences in coverage and verifying datasets can affect comparisons; use the Strict setting for matching verifying-dataset labels. Summarizing nonlinear statistics across dates is an approximation, not a reprocessing of raw forecast/observation pairs.

## Automated updates with cron

**Read [CRON_SETUP.md](CRON_SETUP.md) for the tested command structure, scheduling example and deployment modes.** New scripts are:

- `tools/run_scheduled_update.sh`: cron entrypoint; loads optional private settings.
- `tools/update_dashboard_data.sh`: requests a rolling 90-day archive ending yesterday **UTC**, validates the results and publishes them (local copy, SSH/SCP transfer, or Git commit/push).
- `tools/check_ingest_output.py`: rejects an empty, stale or inconsistent update so a temporary upstream failure does not wipe out your published data.
- `tools/dashboard_cron.conf.example`: optional settings template, to be copied to an ignored private config file.

For a basic test before adding cron:

```bash
bash tools/run_scheduled_update.sh
```

The default mode publishes to this checkout's `data/` directory. If the live dashboard is on another web host, or served from GitHub Pages, **configure the matching publication mode first**. Running only the importer on a remote processing server will not update the website by itself.

## Files

```text
index.html
css/styles.css
js/{app,charts,config,csv,data-service}.js
data/regions/{Global,Northern Hemisphere,Southern Hemisphere,Tropics}.csv
data/ingest_report.json
tools/ingest_evs_stat.py
tools/check_ingest_output.py
tools/run_scheduled_update.sh
tools/update_dashboard_data.sh
tools/dashboard_cron.conf.example
README.md
CRON_SETUP.md
DATA_FORMAT.md
ARCHITECTURE.md
CHANGELOG.md
.gitignore
```

No startup server scripts or top-level enclosing directory are included. No login credentials, SSH keys, or locally downloaded raw `.stat` files are included.

## Release 1.0.1 — model display styling

- Applied standard model color/marker/width settings across charts and PNG exports.
- Adjusted plot backgrounds for black GFS visibility in dark mode and aligned Notable Signals arrows with scorecard blue/red.

## Release 1.0.0 — first user release

- Custom Range now presents compact Start Date and End Date fields without stretching them to fill large grid columns. The standard 7/15/30/60/90-day selection layout is unchanged.
- Release **1.0.0** established the first public versioning scheme. Earlier development builds are listed as **0.N.0** (for example, the former development build 32 is recorded as **0.32.0**).
- The dashboard remains static and can be deployed from GitHub or a web server without a build step. Verification calculations, metric availability handling, and Python 3.6-compatible cron workflow are unchanged.
- **The full package contains empty regional CSV placeholders**. For an existing live installation, use the update-only ZIP or preserve your real `data/` files before replacing anything.

For scientific interpretation see the **Methodology** page; for data schema and internal design see [DATA_FORMAT.md](DATA_FORMAT.md) and [ARCHITECTURE.md](ARCHITECTURE.md). Questions and comments can be directed to [Tom Hultquist](mailto:thomas.hultquist@noaa.gov), Office of Modeling and Development, Evaluation and Verification Unit.
