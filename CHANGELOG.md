# v1.3.11 — 2026-11-11

- Verification Case Finder: replace static `Model` and `Baseline` score-column headers with the actual selected model and baseline names, updated on every table render, including selector changes.
- Preserve row selections, scores, source warnings, and Time Series links. HTML-escape displayed names and retain accessible table column scopes.
- Frontend-only, identical RZDM/AWS update assets; no CSVs, ingestion, cache, scheduler, or metric calculations changed.

# v1.3.10 — 2026-11-11

- Move the Skill Explorer Beta badge from the redundant in-page heading to the global top-bar title, visible only on Skill Explorer. Keep the compact sidebar Beta marker and the five prominent analysis tabs.
- Remove the repeated in-page "Skill Explorer" heading; the top-bar title identifies the page and its subtitle now gives the purpose. Preserve all existing chart controls, model comparison calculations, Pareto ring meaning, exports, and responsive behavior.
- Frontend-only update. RZDM and AWS receive identical assets; no changes to CSVs, private ingestion, cache, schedules, metrics, or verification-source handling.

# v1.3.9 — 2026-11-11

- **Critical model-specific comparison correction:** An accidentally retained focus-model option overrode each iteration model in Average Advantage vs. Winning Frequency, Performance Consistency, and Rolling Skill Shifts. Reorder/limit overrides so each model is calculated from its own matched daily scores. Preserve verification-source warnings, N/A handling, and all other established comparisons.
- **Full vertical Y-axis titles:** The two-metric Pareto chart, Advantage Envelope, exploratory bootstrap, Paired Model Performance Scatterplot, Bias–RMSE Portrait, and Leave-One-Week-Out robustness chart use descriptive rotated Y-axis labels rather than tiny top-left titles. Existing standard line charts retain their rotated axis titles; percentage axes now show percent ticks.
- **Export parity:** The direct Canvas SVG-to-PNG renderer now applies the supported translation/rotation transforms to text, keeping the same titles in exported PNGs.
- UI-only update; RZDM/AWS frontend archives identical. No data, ingestion, cache, schedule or metric-aggregation changes.

## v1.3.8 — November 11, 2026

- **Time Series period-score inset:** show an unobtrusive model-colored table with one summary score for each selected model over the complete selected window, valid daily score counts, and the metric-specific aggregation method. Uses existing daily plotted values and metric aggregation (Fisher for ACC, RMS for RMSE/RMSVE, arithmetic otherwise); does not imply equal coverage. The inset is responsive and appears in PNG exports without covering chart lines.

- **Analysis settings visibility:** consistent accent-backed header, selection hint, and focus treatment on Home, Skill vs Forecast Lead, Scorecard, Time Series and all Skill Explorer tabs. Controls keep existing positions, IDs, and behavior; compact/mobile layouts are preserved.
- **Average Advantage vs. Winning Frequency:** replace colliding x/y scatter marks and overprinted model labels with aligned, independent axes for mean native-unit advantage and win-equivalent frequency. Each model receives a row, exact-value hover, explicit zero/50% guides, and a working PNG export. All model rows remain visible even if some have limited coverage; no statistical jitter is introduced.
- **Model Trade-Off / Pareto:** remove the v1.3.7 table-only substitution for a sole Pareto winner or limited common-date coverage. Keep real model points, non-dominated rings, exact common-date notes, and Save PNG; if a disjoint low-coverage model eliminates all common dates, omit it explicitly and plot the remaining matched cohort; display a chart for a single eligible model showing its two actual relative-skill values. Truly absent common data still displays N/A without inventing values.
- **No regression to verification calculations:** daily pairing, common-date rules, source metadata, metric aggregation, filtering, and other plots unchanged. Identical RZDM and AWS frontend updates; no data, cache, ingestion or scheduling changes.

## v1.3.7 — November 11, 2026

- **Audit-led Skill Explorer refinement:** reviewed an additional 20 published MET `.stat` files across H500 RMSE/ME, MSLP ME, 2 m temperature RMSE, 10 m RMSVE and precipitation ETS. All 8,171 SUMMARY records had `TOTAL=1`; no new independent observational moments or forecast-event populations were established. A subset of the requested model/product URLs returned expected HTTP 404. Existing verification-source caveats remain documented.
- **Remove self-conditioned diagnostic:** eliminated the experimental best/worst baseline-score quartiles from Skill Explorer, its computation, and rendering, because conditioning on the reference score (also used in advantage) makes the graphic susceptible to mathematical coupling. No weather-regime difficulty is inferred from these data.
- **Adaptive Model Comparisons:** Advantage vs. Winning Frequency uses an accessible summary table when fewer than three competing models meet a descriptive matched-day display guide. Sparse rows remain visible and flagged; scatterplots show sufficiently covered models.
- **Adaptive Pareto:** show a compact table for one-model comparisons, sparse common-date coverage, or a single non-dominated model instead of a misleading/trivial Pareto geometry. Full paired-score and non-dominance calculations are unchanged. Charts and tables accurately report the sample set and exclusions. PNG export is disabled for table-only results.
- **Compatibility:** frontend-only update, same RZDM and AWS site files. No changes to published CSVs, data schema, private ingress/cache, systemd scheduling, or source verification metrics.

# v1.3.6 — 2026-11-11

- Add a compact Beta indicator to the left Skill Explorer navigation button, matching the existing page heading.
- Remove the optional 3D Skill Landscape, controls, rendering and export code; retain the original 2D Daily Skill Fingerprint and PNG export.
- Remove the Common-Sample Comparison Audit UI, calculations and export. Preserve the Head-to-Head Matrix and the separate matched-sample coverage information elsewhere.
- Suppress tautological one-point Pareto frontiers and degenerate single-bin bootstrap histograms with explanatory N/A messages rather than misleading charts.
- Update active documentation; preserve prior release history. Frontend assets are identical for AWS and RZDM. No ingestion, metric calculation, data, authentication or scheduling changes.

# v1.3.5 — 2026-11-11

- Add **Skill Explorer Beta** status and a more prominent five-tab navigation; move Head-to-Head Win Matrix from Performance Patterns to **Model Comparisons** without changing its statistics or tooltip.
- Add Lead-Time Advantage Envelope (matched daily 10th/median/90th quantiles across leads) and optional rotatable 3D date-by-lead relative-skill surface alongside the unchanged 2D Fingerprint.
- Add Average Advantage vs. Winning Frequency and jointly date-matched two-metric Pareto Trade-Off Explorer; disclose model exclusions and verification-source mismatches.
- Add exploratory 7-calendar-day circular paired block-bootstrap interval for the **mean daily native-unit advantage** with a minimum matched-day rule, deterministic 800 replicates, missing-date retention and explicit statistical caveats.
- Preserve Performance Consistency, Regional Atlas, Rolling Shifts, Diagnostic Cases, Error Diagnostics, Common-Sample Audit and Leave-One-Week-Out.
- Include a separate read-only public `.stat` field auditor as an optional **private** tool; no unsupported Taylor/reliability values are invented.
- Use the same data-preserving front-end payload for AWS and RZDM. No CSV, importer, cron, systemd or public data-source changes.

# v1.3.4 — 2026-11-11

- Replace browser-native/plain-text readouts for Daily Skill Fingerprint, Regional Skill Atlas, and Home ACC 0.80 Skill Horizon with organized, keyboard-accessible floating tooltips matching the Head-to-Head Win Matrix styling.
- Display matched scores, region/date/lead context, source warnings, missing-sample explanations, and available summary statistics without changing the existing calculations.
- Remove **Daily Performance Distribution** and its dedicated forecast-lead selector/PNG export from Skill vs Lead; retain the equivalent chart under **Performance Consistency** in Skill Explorer, including its full functionality and export.
- Preserve the existing verification CSV data, AWS/RZDM ingestion/scheduling scripts, other charts, exports and responsive themes.

# v1.3.3 — 2026-11-11

- Head-to-Head Win Matrix: replace the long native SVG tooltip with a compact structured hover/focus panel, with an at-a-glance win-equivalent percentage, segmented wins/ties/losses display, matched-day counts, mean native-unit advantage, and verification-source quality flags.
- Reuse the existing Explorer tooltip system; remove duplicate native SVG hover titles only from the matrix. Preserve all statistics, calculations, color encodings, and PNG export.
- Cache-bust changed front-end assets. Data ingestion and CSV files unchanged.

## v1.3.2 — November 10, 2026

- **Model Leadership Mosaic tooltip:** Wrap long participant/unavailable-model lists and other diagnostic values within a responsive two-column readout, instead of clipping them at the old fixed tooltip width. Position readouts inside the visible viewport and allow scrolling when screen height is limited. Other chart tooltips remain unchanged.
- **Linked verification case deselection:** Click the same Mosaic cell, Case Finder row or scatterplot point again to clear the selection. Clicking a different lead on the same date changes the selected forecast lead. The **Clear selection** control is explicit and remains visible while scrolling the long Mosaic when a date is selected; **Open in Time Series** is preserved.
- Updated help text, release version and cache-busted assets. No metric, matching, ranking, ingestion, or CSV changes.

## v1.3.1 — November 10, 2026

- **Skill Explorer navigation:** moved the four analysis tabs directly below the page heading, added tab-specific guidance, reorganized the shared selection controls, and collapsed the multi-model checkbox set into a labeled disclosure. Forecast Lead is hidden in Error Diagnostics (which use all available leads), and impact explanations now reflect the active section.
- **Leadership Mosaic:** compare at least two available selected models for each exact date/lead rather than requiring a fixed complete set. This allows coverage into D15 where long-range models continue. Hover readouts identify present and absent models; first-place shares now have detailed per-day-lead hover information, model participation counts, and caveats about changing comparison pools.
- **Case Finder:** removed the redundant Select button. Click any case row to highlight its date across diagnostics; the Time Series button remains a direct shortcut and requires no preliminary selection.
- **Common-Sample Audit:** added an inline interpretation indicating when identical pairwise and common-date samples make every percentage-point change zero by design, without implying identical model skill.
- **Leave-One-Week-Out Robustness:** added a chart-reading guide to explain the full-sample dashed line, per-week omitted samples, red reversals, and sensitivity interpretation.
- Updated the built-in Methodology (including a direct table-of-contents entry) and `DIAGNOSTIC_METHODS.md`. Existing ingestion and daily-score calculations are otherwise unchanged.

## v1.3.0 — November 10, 2026

- Introduce grouped Skill Explorer subnavigation while preserving every v1.2.2 chart: Performance Patterns, Diagnostic Cases, Error Diagnostics, and Comparison Robustness.
- Add **Model Leadership Mosaic** with all-selected-model date/lead intersection, tied leaders and fractional per-lead wins; missing comparisons are N/A.
- Add **Verification Case Finder** (largest focus advantage/deficit, consecutive-day shifts), **Paired Model Scatterplot** with metric-oriented colors, and linked selection of verifying dates across views and Time Series.
- Add signed **Bias Evolution** (color-coded negative versus positive bias, not skill) and **Bias–RMSE Portrait** (same-date, same-lead, same-model bias/RMSE pairs; no error variance decomposition).
- Add **Common-Sample Comparison Audit** contrasting pairwise and all-selected-model win rates, plus leave-one-calendar-week-out **Skill Robustness**, and optional experimental high/low baseline-score stratification with selection-bias warnings.
- Add comparison coverage/source-quality indicators and tabular mouseover sampling; export all new graphical diagnostics to PNG via the established CSP-safe direct Canvas path.
- Add reference-date highlight in Time Series including PNG exports when launched from the Case Finder. Preserve normal Time Series behavior otherwise.
- Improve readability of Common-Sample Audit cell text; preserve model palette, light/dark styling and mobile navigation.
- Add `js/explorer-diagnostics.js`, `js/explorer-diagnostic-view.js`, `DIAGNOSTIC_METHODS.md` and deterministic analytical/browser tests. **No normalized CSV schema changes, no new EVS data inputs, and no ingestion or cron modifications.**
- Synthetic fixture tests validate metric orientation, missingness, date intersections, matching, biases, error portraits, sensitivity and case selection. Chromium checks cover all tabs, legacy charts, visible tooltips, PNG downloads, theme styling, mobile tab layout, and Time Series linked selection.

## v1.2.2 — November 10, 2026

- **Performance Consistency hover:** Remove browser-native SVG `<title>` bubbles from model summaries and daily dots to avoid overlapping the styled tooltip. Retain accessible SVG labels.
- Display one styled, two-column Statistic/Value readout for model-level sample counts, mean, median, quartiles, min/max, wins/losses/ties, and source warnings. Daily dots use the same tabular treatment for date, model/baseline scores, and signed advantage.
- Apply on Skill Explorer and Skill vs Lead; keep the chart data, all exported PNGs, model palette and existing verification/ingestion calculations unchanged. Keep an unobtrusive live region for keyboard/screen-reader sampling.

## v1.2.1 — November 10, 2026

- **PNG exports:** Render Skill Explorer heatmaps/matrices/distributions directly to Canvas, avoiding SVG blob-image restrictions under stricter web CSP settings. Retains full scroll-independent image, titles and both themes.
- **Navigation:** Skill Explorer link now appears below Time Series.
- **Forecast Lead scope:** Selection card explicitly names the three charts that use the selected lead and two all-lead charts.
- **Regional atlas:** Reserve full-width left gutter so Northern/Southern Hemisphere names do not overlap cells.
- **Performance Consistency:** Hover/focus model rows for n, min/Q1/median/Q3/max, mean and better/worse/tie counts. Hover/focus daily dots for date, paired verified scores, native-unit advantage and source warnings; floating tooltip plus details inspector.
- No ingestion or verification formula changes.

# Changelog

## 1.2.0 — November 10, 2026
- Add the **Skill Explorer** page with (1) date×lead Daily Skill Fingerprint, (2) pairwise Head-to-Head Win Matrix with counts and ties, (3) matched-sample Regional Skill Atlas, (4) rolling 7-/15-day relative skill curves, and (5) native-unit Performance Consistency distributions.
- Add Home **ACC 0.80 Skill Horizon** model cards, and a daily matched-difference distribution below the existing Skill vs Lead charts.
- Add full-image PNG export for the new SVG heatmaps, matrix and distributions, including off-screen rows/columns; rolling trend PNG export reuses the established chart export module. Click fingerprint cells to open the corresponding forecast lead in Time Series. Preserve model palette and dark/light theme styling.
- Display matched sample counts and verification-source warnings, use no extrapolation for skill horizons, and preserve missing data rather than inventing zeroes. Add methodological documentation, advanced-data requirements and a read-only MET summary-column audit tool.
- Retain established rank calculations, scorecards, model styling, EVS-style significance, effective lead time, verified ingestion, cron/publication scripts and v1.1.16's cleaned model toggles. Versioned assets updated to v1.2.0.
- Test with deterministic regression cases plus interactive synthetic-data Chromium tests for filtering, cross-page navigation, themes and exports. No synthetic observations are included in distributed regional CSVs.


## 1.1.16 — November 10, 2026
- Remove the numeric “0 leads” / “1 leads” suffix (and other lead counts) from the model selection buttons above the Home Ranking chart, leaving only model names and color indicators.
- Retain each model’s forecast-hour/date/value availability in its hover tooltip and the expandable Forecast-hour availability table. Selection, hover highlighting, ranking calculations, chart exports, scorecard exports, and the ingestion pipeline are unchanged.

## 1.1.15 — November 10, 2026
- Restrict table PNG/CSV export controls to scorecard-style comparisons: Home Verification Scorecard, Skill vs Lead Equivalent Forecast-Hour table, and complete or individual Scorecard categories.
- Remove export controls and no-longer-needed handlers for the Home ranking and forecast-hour availability, Skill vs Lead data availability, and Why Lines Start or Stop calculation-status tables. Their normal display is unchanged.
- Preserve chart PNG exports (including model legends), scorecard formatting, numerical calculations, interactions, and the data ingestion tools. Update application version and documentation.

## 1.1.14 — November 9, 2026
- Add one-click PNG and CSV export of Home overall model ranking and verification scorecard, Home forecast-hour availability, Skill vs Lead comparison data coverage, effective lead-time status and equivalent-hour tables, and the complete Scorecard or each scorecard category. Table PNGs reproduce value colors and model swatches, carry current region, period, baseline and explanatory notes, and include all columns even when the webpage uses horizontal scrolling. CSVs export the displayed values with descriptive headings.
- Add a model legend beneath every exported PNG chart (Home rank history, the three Skill vs Lead plots, and Time Series). Model names, colors, line weights and marker shapes match the visible traces; selected models with no finite plotted data are omitted. Legend rows wrap automatically, preserve all plot labels and work in dark/light mode. On-screen charts remain legend-free.
- Preserve existing chart interactions, EVS significance overlays, data selections, model metrics, importer and scheduling. Refresh versioned browser assets and documentation.

## 1.1.13 — November 9, 2026
- Effective Lead-Time Gain now compares independently available per-forecast-hour arithmetic means for baseline and models. It no longer truncates the model curve to only dates/hours paired with the baseline. Retain non-increasing sample-count-weighted fitting, within-range interpolation, genuine 0.0 h matches, explicit out-of-range/gap statuses and the red-to-blue table. Missing mean data are identified separately for baseline and comparison model.
- Remove Skill vs Lead’s Comparison Method/Strict selector. Percentage-skill and EVS significance calculations use the established Standard valid-date/lead pairing; the Scorecard keeps its independent comparison selector and Strict mode.
- Update on-page explanation, README, Methodology, architecture, data format, cron notes, and package notes. Keep Home, Scorecard, Time Series, ingestion scripts, generated verification data, chart tools, and package structure unchanged.

## 1.1.12 — November 9, 2026
- Fix fitted-quality plateau matching for effective lead time: when model and baseline have equal fitted quality at the *same* forecast hour, report a genuine **0.0 h** difference in the line and numeric table instead of selecting a later plateau endpoint.
- Add a visible, collapsible **Why lines start or stop** status grid across F0–F360 for each selected model. This distinguishes computed equivalents (including zero) from targets before/after the available paired forecast range, missing intervening forecast leads, insufficient leads, and missing matched daily comparisons.
- Show the actual first/last paired forecast-hour boundaries in table status labels and tooltips, clarify why an unplotted value is not zero, and update PNG export subtitles, README, Methodology, architecture and deployment notes.
- Preserve the existing monotonic quality-fit approach, no-extrapolation policy, numerical data, color gradations, EVS significance, Home rankings, scorecards, ingestion tools and cron configuration. Keep internal tests out of GitHub-ready packages.

Version **1.0.0** is the first public release. Earlier internal development builds previously labeled `vN` are recorded as `0.N.0` to distinguish them from the user release.

## 1.1.11 — November 9, 2026
- Color-code the Skill vs Lead **Equivalent Forecast-Hour** table using the same dark/light-mode-aware diverging red → gray → blue palette as the Home and Scorecard comparison tables. Blue means hours gained, red hours lost, and gray no difference.
- Use a consistent signed, square-root-scaled ±48-hour saturation threshold (not a changing per-chart maximum). Preserve numeric hours, equivalent model forecast hours, pair counts, status labels, and all missing-data handling; non-matches remain uncolored.
- Add a visible legend and explain the gradient in the Methodology and README. No changes to verification data, effective-lead calculations, EVS significance, ingestion, or cron jobs.

## 1.1.10 — 2026-11-09

- Home ranking model chips and explicit per-model forecast-hour availability. In All mode, both overall and daily ranks now compare only exact valid-date/forecast-hour samples shared by every enabled model. No intersection or fewer than two selected models yields N/A, not an apparently comparable rank. Other Home panels stay independent and disclose the remaining All-lead limitation.
- Skill vs Lead now includes an effective lead-time gain chart and expandable table: matched daily verification values, higher/lower/target direction handling, weighted monotonic quality fits, and within-range forecast-hour interpolation. Positive values mean more equivalent forecast lead versus baseline; no beyond-range extrapolation or interpolation across missing daily lead steps.
- Refreshed in-app and Markdown documentation. Retained the existing EVS-style significance method and existing importer/cron tools. Only required website and operational files are distributed.

## 1.1.9 — November 9, 2026
- Reorder Skill vs Lead to show Forecast Hour Mean first, followed by percentage skill titled dynamically `Difference from [baseline] — [variable] — [metric]`.
- Display **Significance** (on by default) as thin model-colored zero-centered EVS-style 95% boxes on the existing lower skill chart, including PNG export. Remove the separate difference/interval chart and do not use the former randomization/shared-envelope significance method.
- Use the paired signed **raw model-minus-baseline** difference and EVS's population-SD, sqrt(n−1), and sample-size-dependent factors for inference. Only transform each CI half-width to the chart's percentage scale for display. Signed Bias comparisons are differences, not necessarily skill improvements; daily regional summaries are not event-level EVS samples.
- Update Methodology, README, architecture, data-format, cron and package notes; keep raw verification values and importer behavior unchanged. Distribute only operational website/tools and documentation, not developer tests or local cron configuration.

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
