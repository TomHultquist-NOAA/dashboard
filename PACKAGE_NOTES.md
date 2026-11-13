## v1.3.2 package note

Targeted presentation/interaction hotfix. The diagnostic Mosaic's floating tooltip wraps long model lists and fits/scrolls within the viewport. Linked case highlighting is reversible by repeating the selection or using **Clear selection**, which stays available while scrolling. Install the update-only ZIP over v1.3.1 to preserve production data and tools. The full ZIP retains header-only region CSV placeholders. No change to ingestion, metrics, verification data or model skill calculations.

## v1.3.1 package note

This is a focused interface/diagnostic interpretation update over v1.3.0. The update-only ZIP contains site assets and documentation; it does not overwrite regional data CSVs or ingestion tools. Leadership Mosaic has an adaptive minimum-two-model comparison pool to reveal valid long-range leads; the changing pool is explicitly disclosed.

# Dashboard v1.3.0 package notes

Source: the user-supplied v1.1.13 full GitHub-ready distribution (excluding populated verification data directories). This v1.3.0 release retains the existing static website, operational ingestion/scheduling tools, example cron configuration, and documentation. It does not alter the data importer or publication scripts.

## Archives

- **Full GitHub-ready distribution:** website files at the ZIP root; includes required `tools/` operational scripts, documentation and *header-only* `data/regions/*.csv` placeholders. It has no production verification observations, download caches or generated ingest report. Replace placeholders with real published CSVs during a fresh deployment; **do not overwrite populated CSVs in an existing deployment**.
- **Update-only / preserve-data distribution:** frontend (`index.html`, `css/`, `js/`), documentation and the two new optional audit/test scripts, but excludes existing operational ingestion/cron tools, local settings and the `data/` directory, so existing `data/regions/*.csv` and `data/ingest_report.json` remain in place. Keep the installed ingestion scripts, cron wrapper and site-specific cron settings intact when applying this package.

## Changes in v1.3.0

- Expand Skill Explorer into four tabbed sections with six new diagnostic graphic types and an opt-in experimental performance-stratification summary. All operate on existing published daily regional verification CSVs.
- Use date/lead available-model pools (minimum two) for Leadership Mosaic, with explicit participant counts; retain a separately disclosed all-model common sample for audit comparisons, same-day matched daily summaries for cases/scatter, paired bias and RMSE records for portraits, and calendar-week removal for sensitivity.
- Add the selected-date link from Case Finder/Mosaic/Scatter to Time Series with a visible vertical chart reference and PNG export annotation. Preserve normal chart behavior when no case is selected.
- Add reusable structured hover details, sample-coverage indicators, selectable model chips and source-comparability notices. Improve audit-cell contrast and tab layout on mobile.
- Add `DIAGNOSTIC_METHODS.md` and optional `tools/test_explorer_diagnostics.mjs`. No ingestion, cron, data paths, normalized CSV format or original mathematical methods were changed.
- Full archive retains header-only data placeholders. **Use update-only on live installations to preserve actual CSVs and ingest setup.**

## Changes in v1.2.2

- Use a single styled, tabulated tooltip for model rows and dated dots on both Performance Consistency panels, rather than overlapping SVG-native and HTML tooltips.
- Preserve accessible focus/readout semantics, existing chart export routines, source warnings, and all dashboard statistical calculations.
- Update only frontend assets and release documentation. Existing production verification data and ingestion scripts remain untouched.

## Changes in v1.2.1

- Move Skill Explorer below Time Series in sidebar navigation.
- Explain that Forecast Lead affects Head-to-Head, Rolling Skill, and Performance Consistency, while Fingerprint and Atlas are always all-lead charts.
- Increase Regional Skill Atlas left label width for full hemisphere names.
- Add hovered model-level summary statistics and daily matched-value sampling to both Performance Consistency plots.
- Replace Explorer SVG-to-Image PNG export with direct Canvas rendering so Save PNG remains functional when CSP disallows blob: images. Existing chart exports are unchanged.
- Verification formulas, regional CSVs and ingest/cron behavior are unchanged. Regression browser checks include restrictive image CSP and both themes.

## Changes in v1.2.0

- New static `js/explorer-analytics.js` and `js/explorer-view.js` modules, new Skill Explorer navigation/page, new Home ACC 0.80 horizon and Skill vs Lead performance-distribution card. Controls share global region selection; other existing filters remain page-specific.
- SVG heatmaps/boxplots with full-size titled PNG export, in addition to the existing model legend chart export. No external JavaScript packages or new server services.
- New documentation `ADVANCED_DATA_REQUIREMENTS.md`, read-only Python 3.6-friendly `tools/audit_advanced_inputs.py`, and deterministic `tools/test_skill_explorer.mjs` (Node test, optional on hosting servers). No changes to normalized CSV format or ingestion/cron scripts.
- **Existing data must be kept.** The full ZIP includes only header-only regional CSV placeholders, not operational verification values; using it to overwrite `data/` will remove your published data. The update-only ZIP avoids `data/` entirely and keeps all existing ingestion/cron scripts.
- Validation: JS syntax and deterministic unit tests pass. Synthetic-data Chromium checks verified five new visualizations, controls, fingerprint-to-Time-Series navigation, full-size PNG exports, theme switch, and old scorecard functionality. A browser security restriction on localStorage in the isolated `about:blank` harness did not affect chart rendering or exports; tests used synthetic scores that are **not** shipped.

## Changes in v1.1.16

- Remove forecast-hour count suffixes from Home Ranking model buttons, keeping labels model-only and retaining coverage hover/tooltips and the expandable availability table.
- No changes to ranking computation, chart/table exports, scorecard visuals, data ingestion, or scheduling. Assets and release labels cache-busted to v1.1.16.

## Changes in v1.1.15

- Narrow table PNG/CSV export controls to the Home Verification Scorecard, the Skill vs Lead Equivalent Forecast-Hour table, and all/individual scorecard panels. Regular Home ranking/availability and Skill vs Lead availability/status tables are view-only, as requested.
- Chart PNG model legends from v1.1.14 remain intact. No changes to scoring, verification data, ingestion/cron tools or other interactions. Version labels and cache-busting paths updated.

## Changes in v1.1.14

- Add self-contained PNG and CSV export of Home ranking, scorecard and lead coverage, all Skill vs Lead tables, and complete or per-category Scorecard page tables. Export includes all scrollable columns and respects current displayed values, labels, colors, baseline, region and date window. New browser-only module: js/table-export.js.

- Include compact, auto-wrapping model legends on exported PNGs of all five interactive chart types. Each legend uses the exact plotted models and their established colors, line widths, and marker shapes; selected models lacking finite plot data are excluded. PNG plot axes/titles remain unchanged; on-screen plots remain uncluttered.
- Update version labels, in-app Changelog, README, and cache-busting paths. No changes to verification scoring, significance, effective lead calculations, source ingestion, cron, CSVs, model styling, or other UI interactions.

## Changes in v1.1.13

- Effective Lead-Time Gain now uses each model's and the baseline's independently available forecast-hour arithmetic means (the same input as Forecast Hour Mean), not per-hour date-paired subsets. This can recover valid model leads previously suppressed by incomplete baseline matching; sample coverage remains disclosed, and no model/data points are invented.
- Remove the Skill vs Lead Comparison Method selector/Strict setting. Its percentage-skill and EVS significance displays retain the fixed Standard date/lead pairing; Scorecard retains its independent Comparison Method selector and optional Strict mode.
- Update the effective-lead line/gap explanatory grid and tooltips for missing baseline/model means and full model forecast-hour bounds. Retain the no-extrapolation, 0.0 h true matches, color scale, Home behavior, and data-preserving packaging.
- Refresh Methodology, README, architecture, CSV conventions, cron setup, and release notes. No changes to importer, cron tools, production verification data or internal test packaging.

## Changes in v1.1.12

- Correct the effective-lead curve plateau ambiguity so genuine same-hour equality reports **0.0 h**, not a later equivalent forecast hour.
- Add a visible hourly status key and explanatory table tooltips for out-of-range/gap/unpaired estimates; do not fill uncomputable values with invented zeroes.
- Update in-dashboard Methodology, README, technical architecture, changelog, versioned assets and PNG subtitles. No change to the verification data, cron/ingestion tools, Home/Scorecard/Time Series or EVS significance.

## Changes in v1.1.11

- Apply familiar graduated red/gray/blue shading to the Skill vs Lead effective lead-time table; a fixed ±48-hour scale, a readable matching legend, and uncolored unavailable statuses. Calculations are unchanged.

## Changes in v1.1.10

1. **Home model selection and fair All-lead rankings:** toggle which models enter the ranking; coverage table shows available forecast hours, dates and record counts. In All mode, overall ranks and daily rank curves use exact common `(valid_date, forecast_hour)` samples across all enabled models. No overlapping data yields N/A instead of incomparable rankings. Home's other scorecards and summaries retain their established independent calculations.
2. **Effective Lead-Time Gain:** new interactive chart plus expandable numeric table under Skill vs Lead. Reports hours of forecast-range improvement/degradation versus chosen baseline at each baseline lead using paired daily average scores, weighted monotonic quality fits, limited interpolation and no extrapolation. Handles higher/lower/target metrics and missing leads explicitly.
3. Updated Methodology/Changelog and technical documentation, version tags, and package notes. Existing relative-skill curves, EVS significance algorithm, model styling and ingestion/cron scripts remain unchanged. No internal test scripts are packaged.

**Caveats:** Lead-time equivalents are descriptive and depend on matched daily coverage. For All-lead Home rankings, the common intersection can narrow considerably when many models are enabled. The separate Home scorecard retains per-model matched baseline comparisons, which may cover different leads under All.

**Deployment:** Keep the root-relative paths (`index.html`, `css/`, `js/`, `tools/`, and `data/`). The dashboard is a static website. Review or keep your own cron configuration instead of adopting the provided example paths blindly.

## GitHub/package hygiene

Developer-only regression suites and local test artifacts are run before release but **not shipped**. Both archives exclude `tests/`, Python caches (`__pycache__/`, `*.pyc`), temporary logs, `.cron-work/`, local `cron.backup`, and machine-specific `tools/dashboard_cron.conf`. The full archive supplies `tools/dashboard_cron.conf.example` for local setup; the update-only archive intentionally does not touch operational `tools/` or `data/`.

