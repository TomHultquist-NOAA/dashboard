# Changelog

## v32 — October 28, 2026
- Audited the GitHub-ready full package and corrected in-app Changelog order, active version and duplicate v30 entry.
- Updated the Methodology and deployment documentation to reflect the available verification products, seven-model configuration and disabled N/A selectors.
- Added `CRON_SETUP.md`, guarded rolling-90-day update/publish scripts, Python 3.6-compatible data validation, private cron-config template, and `.gitignore` for raw caches and credentials.
- Scheduled updates stage and validate results before publishing, and can publish locally, via SSH/SCP, or via Git commit/push.
- No changes to the underlying verification calculations, model catalog, or graph interactions.

## v31 — October 28, 2026
- Keep all metrics in Home, Skill vs Lead, and Time Series selectors but mark unavailable metrics `— N/A` and disable selection.
- Disable unavailable variables on Skill vs Lead and Time Series; select an available metric automatically on variable or region changes.
- Determine availability from actual loaded data for the selected region, not a hardcoded set of feeds. This is independent of the current date window and lead.
- Preserve full Scorecard N/A cells, model ranking, verification calculations, chart behavior, Python 3.6 importer, and current CSVs.

## v30 — October 28, 2026
- Removed Baseline and Comparison from Home's primary filters because they do not control the absolute-score ranking graph.
- Moved Baseline into the Home Verification Scorecard; its selection also updates Category Snapshot.
- Removed Home's redundant source-coverage panel and simplified model data availability on Skill vs Lead.
- Retained Standard and Strict comparison methods on Skill vs Lead and the detailed Scorecard, with plain-language explanations.
- Removed internal STAT/metadata terminology from the user interface and Methodology without changing matching safeguards, scoring, or ingestion.
- Preserved existing data files, CSV importer, N/A handling, light/dark themes, and mobile layout.

## v29 — October 28, 2026
- Corrected incomplete baseline-relative displays: default exploratory comparisons pair model and baseline by metric, region, valid date, and forecast lead, rather than silently discarding all pairs with different `-obtype` labels. A strict same-verifying-source option remains available.
- Added user-visible verification-source warnings and model coverage tables for Home and Skill vs Lead.
- Default Home forecast lead is Day 5 to reduce misleading comparisons from different model forecast lengths. Date-based graph lines now break across missing daily observations.
- Kept existing real-data importer, Python 3.6.8 support, missing-data N/A, and theme/navigation behavior.

## v28 — October 28, 2026

- Made `tools/ingest_evs_stat.py` compatible with Python 3.6.8, including the dated-file CLI parser.
- No changes to verification data, dashboard calculations, themes, or layout.

## v27 — October 27, 2026

- Added ingestion from dated MET Stat-Analysis `.stat` files for H500 ACC, T850 RMSE, and MSLP RMSE.
- Changed Global model suite to GFS, AIGFS, CFS, CMC, ECMWF, FNMOC and UKMET.
- Preserved four verifying regions: Global, NH, SH and Tropics.
- Removed all bundled synthetic verification rows. Missing metrics, dates, leads, models and regions show **N/A**.
- Added matched date/lead/verification-source pairing for baseline-relative skill and scorecards.
- Added explicit unranked behavior for missing model scores and an audit file for ingested coverage.
- Preserved static hosting, chart interactions, page navigation, light/dark persistence, and flat server-ready packaging.
- Updated methodology, CSV contract, documentation and data integration instructions.

Earlier v1–v26 dashboard interface changes are described in prior release packages.
