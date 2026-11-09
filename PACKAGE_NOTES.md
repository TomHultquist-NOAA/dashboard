# Dashboard v1.1.8 package notes

Source: user-supplied `dashboard(1).zip` (the full dashboard distribution, excluding populated verification data directories). This v1.1.8 release retains the existing static website, operational ingestion/scheduling tools, example cron configuration, and documentation. It does not alter the data importer or publication scripts.

## Archives

- **Full GitHub-ready distribution:** website files at the ZIP root; includes required `tools/` operational scripts, documentation and *header-only* `data/regions/*.csv` placeholders. It has no production verification observations, download caches or generated ingest report. Replace placeholders with real published CSVs during a fresh deployment; **do not overwrite populated CSVs in an existing deployment**.
- **Update-only / preserve-data distribution:** frontend (`index.html`, `css/`, `js/`) and documentation updates, but excludes `tools/`, local settings and the `data/` directory, so existing `data/regions/*.csv` and `data/ingest_report.json` remain in place. Keep the installed ingestion scripts, cron wrapper and site-specific cron settings intact when applying this package.

## Changes in v1.1.8

1. A **Forecast Hour Mean** (die-off) chart directly below the existing Skill vs Lead chart, with absolute metric-native values, per-model sample-count hover context and independent zoom/pan/PNG export.
2. A separate, optional model-minus-baseline **EVS-style 95% difference/interval** panel, using matched daily summaries and the piecewise confidence multipliers from EVS's deterministic lead-average plot. It replaces the previous block-randomization/shared-envelope significance display. The existing relative skill chart and its zero reference remain unchanged.
3. Updated in-dashboard Methodology and Changelog, as well as README, architecture, data-format, cron/setup, and package documentation. No change to source metric names, Bias menu labels, ingestion, forecasting scores, and other dashboard pages.

The EVS interval calculation is approximate and uses the dashboard's daily *regional summaries*, not event-level verification samples. Do not interpret its pointwise bars as an official EVS verification significance result. Historical release-note references to the earlier method remain in the changelog as history; v1.1.8 supersedes that behavior.

**Deployment:** Keep the root-relative paths (`index.html`, `css/`, `js/`, `tools/`, and `data/`). The dashboard is a static website. Review or keep your own cron configuration instead of adopting the provided example paths blindly.

## GitHub/package hygiene

Developer-only regression suites and local test artifacts are run before release but **not shipped**. Both archives exclude `tests/`, Python caches (`__pycache__/`, `*.pyc`), temporary logs, `.cron-work/`, local `cron.backup`, and machine-specific `tools/dashboard_cron.conf`. The full archive supplies `tools/dashboard_cron.conf.example` for local setup; the update-only archive intentionally does not touch operational `tools/` or `data/`.

## GitHub/package hygiene

Developer-only regression suites and local test artifacts are run before release but **not shipped**. Both archives exclude `tests/`, Python caches (`__pycache__/`, `*.pyc`), temporary logs, `.cron-work/`, local `cron.backup`, and machine-specific `tools/dashboard_cron.conf`. The full archive supplies `tools/dashboard_cron.conf.example` for local setup; the update-only archive intentionally does not touch operational `tools/` or `data/`.
