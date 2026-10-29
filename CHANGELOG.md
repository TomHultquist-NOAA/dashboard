# Changelog

Version **1.0.0** is the first public release. Earlier internal development builds previously labeled `vN` are recorded as `0.N.0` to distinguish them from the user release.

## 1.0.8 — October 29, 2026

- Added hover and keyboard-focus trace highlighting to the model selectors on **Skill vs Forecast Lead** and **Time Series**, matching Home's ranking graph behavior.
- Highlighting emphasizes the selected model and dims the other plotted traces; hovering does not change model selection. The chart-to-selector highlight also works in reverse.
- Expanded the in-dashboard Methodology to explain interpretation of the pointwise significance boxes, 20-date minimum, three-day randomization, shared threshold, and limitations; clarified Notable Signals and chart interactions. Documentation-only clarification; version remains 1.0.8.
- Preserved the existing verification, significance, PNG export, ingestion, and cron behavior.

## 1.0.7 — October 29, 2026
- Always include a labeled 0.0% major y-axis tick on Skill vs Lead, including SVG and PNG export and interactive y-axis manipulation.
- Add optional, explicitly exploratory 95% zero-centered significance boxes at each lead. Use paired daily scores and three-day block sign-swap randomization with at least 20 paired dates. The plotted box is a conservative envelope across the selected models.
- Suppress significance boxes when the data are insufficient. Document that they are not official MET/EVS confidence intervals, do not correct for multiple testing, and cannot replace matched-pair statistical evaluation.
- Preserve all existing model colors and markers, Home rankings, scorecards, data ingestion, and scheduled updates.

## 1.0.6 — October 29, 2026
- Changed AIGFS from blue `#1e3cff` to purple `#8400c8` throughout charts, model chips, and PNG exports.
- CMC stays blue; no other model styles, statistics, imports, or scheduled updates changed.

## 1.0.5 — October 29, 2026
- Reduced the dark-mode GFS light outline: line under-stroke adds just 1.0 px overall (previously 2.2 px); marker borders are now 0.65 px (previously 1.1 px).
- Shared renderer ensures the finer outline applies consistently to all interactive SVG plots, hover markers and downloaded PNGs. Other model styles and light mode are unchanged.
- Fixed an inconsistent black arrow on similarly shaded red Notable Signals circles: all decline arrows use white text with a light contrast shadow; the red gradient and signal-selection logic remain unchanged.
- No changes to verification calculations, real data, ingestion or scheduled-update scripts.

## 1.0.4 — October 29, 2026
- Fixed a dark-theme SVG rendering bug that painted the GFS line under-stroke dark instead of light. The black GFS trace now has a thin light outline, matching its outlined markers and exported PNGs.
- Restricted outlines to GFS only in dark mode; AIGFS and other model traces and markers are unoutlined. No outlines are drawn on lines or markers in light mode.
- Notable Signals selects the six largest absolute performance changes, and ensures at least one improvement and one decline when both exist; no forced 3/3 split.
- Preserved model style definitions, all verification calculations, ingestion/cron scripts and current data CSVs.

## 1.0.3 — October 29, 2026
- Restored the original dark navy (`#091524`) plotting background in dark mode.
- Introduced contrast-aware thin trace and marker outlines: light borders for black GFS and any other low-contrast colors on navy, and understated dark borders only where needed on white in light mode.
- Applied the same appearance to the live SVG charts and downloaded PNG images, without changing the seven model colors, common marker size or per-model line widths.
- Retained Notable Signals' balanced blue/red gradations, real EVS ingestion, cron, and verification calculations.

## 1.0.2 — October 29, 2026
- Darkened the plot background in dark mode to a muted steel gray while preserving black GFS visibility; subtle contrast outlines keep lighter model traces readable in live charts and exported PNGs.
- Standardized the marker size to 7 for all seven models, keeping each requested line width, marker shape, and model color.
- Notable Signals now uses the existing diverging scorecard palette with blue/red intensity reflecting the magnitude of each displayed change.
- Signal selection reserves up to three improvement and three decline slots, filling remaining slots with the strongest changes; both directions are included whenever both exist.
- Updated user Methodology, in-app and repository Changelog, README and version labeling. No change to EVS ingestion, cron, verification computations, or saved data.

## 1.0.1 — October 29, 2026
- Applied fixed model colors, marker shapes (circle, X, triangle, filled plus), marker sizes and line widths in Home Ranking, Skill vs Lead and Time Series; PNG export and chart hover markers match the screen.
- GFS now uses its requested solid black 3 px trace. Plot backgrounds are light in both themes so black remains visible on dark-themed pages. Model selection swatches have visible outlines on dark controls.
- Updated Notable Signals arrows to the scorecards' positive-blue / negative-red convention.
- No changes to verification calculations, underlying CSV files, metric availability, ingest/cron scripts, or aggregation logic.
- AIGFS and CMC deliberately share the same blue and X marker, as specified.

## 1.0.0 — October 28, 2026
- First public release of the OMD Model Performance Dashboard.
- Compact Custom Range date-picker fields on Home, Skill vs Lead, Scorecard, and Time Series so Start Date and End Date inputs do not expand to fill oversized grid columns.
- Consistent release history in the dashboard, README, and technical documentation, with earlier builds labeled `0.x.x`.
- Preserved current verification calculations, seven models, three available products, N/A behavior, and existing data pipeline.

## 0.32.0 — October 28, 2026
- Audited the GitHub-ready full package and corrected in-app Changelog order, active version and duplicate 0.30.0 entry.
- Updated the Methodology and deployment documentation to reflect the available verification products, seven-model configuration and disabled N/A selectors.
- Added `CRON_SETUP.md`, guarded rolling-90-day update/publish scripts, Python 3.6-compatible data validation, private cron-config template, and `.gitignore` for raw caches and credentials.
- Scheduled updates stage and validate results before publishing, and can publish locally, via SSH/SCP, or via Git commit/push.
- No changes to the underlying verification calculations, model catalog, or graph interactions.

## 0.31.0 — October 28, 2026
- Keep all metrics in Home, Skill vs Lead, and Time Series selectors but mark unavailable metrics `— N/A` and disable selection.
- Disable unavailable variables on Skill vs Lead and Time Series; select an available metric automatically on variable or region changes.
- Determine availability from actual loaded data for the selected region, not a hardcoded set of feeds. This is independent of the current date window and lead.
- Preserve full Scorecard N/A cells, model ranking, verification calculations, chart behavior, Python 3.6 importer, and current CSVs.

## 0.30.0 — October 28, 2026
- Removed Baseline and Comparison from Home's primary filters because they do not control the absolute-score ranking graph.
- Moved Baseline into the Home Verification Scorecard; its selection also updates Category Snapshot.
- Removed Home's redundant source-coverage panel and simplified model data availability on Skill vs Lead.
- Retained Standard and Strict comparison methods on Skill vs Lead and the detailed Scorecard, with plain-language explanations.
- Removed internal STAT/metadata terminology from the user interface and Methodology without changing matching safeguards, scoring, or ingestion.
- Preserved existing data files, CSV importer, N/A handling, light/dark themes, and mobile layout.

## 0.29.0 — October 28, 2026
- Corrected incomplete baseline-relative displays: default exploratory comparisons pair model and baseline by metric, region, valid date, and forecast lead, rather than silently discarding all pairs with different `-obtype` labels. A strict same-verifying-source option remains available.
- Added user-visible verification-source warnings and model coverage tables for Home and Skill vs Lead.
- Default Home forecast lead is Day 5 to reduce misleading comparisons from different model forecast lengths. Date-based graph lines now break across missing daily observations.
- Kept existing real-data importer, Python 3.6.8 support, missing-data N/A, and theme/navigation behavior.

## 0.28.0 — October 28, 2026

- Made `tools/ingest_evs_stat.py` compatible with Python 3.6.8, including the dated-file CLI parser.
- No changes to verification data, dashboard calculations, themes, or layout.

## 0.27.0 — October 27, 2026

- Added ingestion from dated MET Stat-Analysis `.stat` files for H500 ACC, T850 RMSE, and MSLP RMSE.
- Changed Global model suite to GFS, AIGFS, CFS, CMC, ECMWF, FNMOC and UKMET.
- Preserved four verifying regions: Global, NH, SH and Tropics.
- Removed all bundled synthetic verification rows. Missing metrics, dates, leads, models and regions show **N/A**.
- Added matched date/lead/verification-source pairing for baseline-relative skill and scorecards.
- Added explicit unranked behavior for missing model scores and an audit file for ingested coverage.
- Preserved static hosting, chart interactions, page navigation, light/dark persistence, and flat server-ready packaging.
- Updated methodology, CSV contract, documentation and data integration instructions.

Earlier 0.1.0–0.26.0 dashboard interface changes are described in prior release packages.
