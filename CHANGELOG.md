# Changelog

Version **1.0.0** is the first public release. Earlier internal development builds previously labeled `vN` are recorded as `0.N.0` to distinguish them from the user release.

## 1.1.8 — November 9, 2026
- Add Forecast Hour Mean (die-off) chart below Skill vs Lead, plotting arithmetic means of available daily verification values by forecast hour in native metric units for each selected model, with independent interaction and PNG export.
- Replace the three-day block-randomization significance envelope with a model-specific paired daily difference / 95% interval display based on the EVS global deterministic lead-average routine. Keep it optional and off by default. Plot paired model–baseline differences in native units to avoid mixing linear test intervals with nonlinear percentage-skill aggregation.
- Match EVS population SD, sqrt(n-1), and sample-size multiplier buckets; update labels and statistical caveats. No changes to ingestion, scorecard/Home/Time Series calculations or archive data.

## 1.1.7 — November 8, 2026
- Rename the four user-facing scalar Mean Error selections to **Bias** in metric menus, matching the existing plot terminology.
- Preserve the internal `*_BIAS` keys, upstream `*_ME` source suffixes, metric type, numbers, selection behavior, and all verification calculations.
- Refresh versioned browser assets; no changes to data ingestion, statistical methodology, or cron scheduling.

## 1.1.6 — November 3, 2026
- Show the actual daily verification statistic to the right of each model's rank in the Home Rank History hover table, using the selected metric's appropriate units and precision.
- Order tooltip rows by rank for the hovered date, without affecting the ranking lines, model selections, comparison logic, or PNG output.
- Improve tooltip positioning for narrow chart viewports. No changes to EVS ingestion, cron, data format, or statistical calculations.

## 1.1.5 — November 2, 2026
- Synchronize manual and automatic region selections across Home, Skill vs Lead, Time Series, and Scorecard so an automatic CONUS switch does not leave the full Scorecard on a stale region.
- Prevent obsolete asynchronous region loads from replacing a more recent selection. Avoid displaying stale scorecard cells while loading a new region.
- Clarify that Home Primary Metric controls ranking while its scorecard lists a fixed set of metrics drawn from their labeled verification regions.
- Preserve all verification calculations, metric fallback rules, SVG/PNG rendering, and ingestion/cron behavior.

## 1.1.4 — November 2, 2026
- Make metrics selectable when records are available in the selected region, CONUS, or Global; selecting a metric in a different domain automatically switches detailed plots to that domain.
- Populate Home and full Scorecard using each metric's actual available region (selected region first; CONUS or Global fallback), with visible domain labels and comparison notes. Global fallback is not described as Global-only because the upper-air product may also be available in other hemispheric domains.
- Keep model/date/forecast-lead gaps as N/A; no cross-region substitution within a model comparison and no invented data.
- Reflect mixed-region coverage in Category Snapshot, and explain the regional fallback in Methodology and README.
- Preserve CSV schema, ingest/cron jobs, model styles, and statistical calculations.

## 1.1.3 — November 2, 2026
- Set Skill vs Forecast Lead estimated significance thresholds to **off by default** on fresh page loads; the checkbox continues to enable the same optional display.
- Clarified the default setting in Methodology and README. Statistical testing, regional data, the importer, and scheduled updates are unchanged.

## 1.1.2 — November 2, 2026
- Improved browser asset refresh behavior by versioning the JavaScript module dependency chain and stylesheet URL, preventing mixed old/new metric configurations after deployment.
- Refreshed regional CSV requests with explicit cache-busting URLs in addition to no-store fetch mode; added optional browser-console diagnostics for loaded data coverage.
- Left all data transformations, verification methods, user-facing metric names, cron workflows, and significance calculations unchanged.

## 1.1.1 — November 2, 2026
- Validated all 12 supported daily summary products against actual GFS MET files dated October 31, 2026.
- Corrected 24-h precipitation ETS ingestion to read MET `CTS:GSS` at the `>=2.54` mm event threshold; preserved its 12 UTC verification valid time.
- Added CONUS as a separate fifth domain, allowing the actual 2-m temperature, 10-m wind, and precipitation records to appear without relabeling CONUS as Global.
- Updated the daily publisher, CSV validation, region menus, and release documentation for the fifth regional file; preserved existing Global/NHEM/SHEM/TROPICS data.
- Added real-file parser regression checks and kept model/date/metric gaps as N/A. No changes to verification arithmetic, interactive charts, or statistical significance calculations.

## 1.1.0 — November 2, 2026
- Expanded the data ingestion mapping from three to twelve source statistic products, including scalar mean errors and RMSE, 10-m wind RMSVE and SPEED_ERR, and ≥0.10-in (2.54-mm) 24-hour precipitation ETS.
- Preserved distinct wind-vector definitions; source `10m_Wind_RMSE` is MET RMSVE and source `10m_Wind_ME` is MET SPEED_ERR, not conventional scalar wind-speed RMSE or bias.
- Kept model-specific missing data as N/A; available dropdown choices and plots reflect the contents of the published regional CSVs.
- Improved ingestion diagnostics for unsupported STAT columns/regions; sources with no usable rows are reported separately without inventing values.
- Updated user Methodology, release history, README, DATA_FORMAT, ARCHITECTURE, and CRON_SETUP; existing chart style, significance estimates, and scheduled publication mechanics are unchanged.
- Individual source file contents could not be fetched from the development environment; actual producer file compatibility should be confirmed from the first ingestion report.

## 1.0.9 — November 2, 2026

- Replaced arbitrary, fractional y-axis divisions with rounded, metric-appropriate major tick intervals, especially on Time Series (e.g., ACC to sensible decimal steps, RMSE to whole or fractional steps as needed).
- Removed repeated units from Time Series tick labels; units remain in the axis title, while hover tooltips retain normal verification precision and units.
- Matched live SVG and exported PNG tick positions and label formatting, including zoomed ranges.
- Preserved the labeled 0.0% Skill vs Lead reference, integer Home ranking ticks, chart interactions, verification calculations, ingest and scheduled publication.

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
