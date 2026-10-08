# Changelog — OMD Model Performance Dashboard

## v23 (Methodology and Changelog pages)

- Added **Methodology** and **Changelog** as distinct reference pages available from the left sidebar/mobile drawer.
- Methodology documents mock verification sources, the current ACC/RMSE/Bias/ETS aggregation rules, overall and daily ranking, baseline-relative skill calculations, data-window behavior, and pre-operational limitations.
- Changelog page summarizes major project milestones, latest first. Both pages are responsive and work in dark/light themes.
- Updated README to v23. Data, model choices, metric calculations, and chart behavior remain unchanged.

## v22 (60-day preset)

- Added **Last 60 Days** to all four page Date Window selectors: Home, Skill vs Forecast Lead, Scorecard, and Time Series.
- No change to synthetic CSV content, date handling, metric computation, chart behaviors, or server-ready archive structure.

## v21 (README and chart-toolbar layout)

- Replaced outdated v16 README with accurate documentation for v21: site deployment, four pages, actual data/model/metric scope, rank-history interpretation, scorecards, chart export, theme persistence, and future CSV integration.
- Moved Home, Skill vs Lead and Time Series chart toolbars **above the plot** in a dedicated non-overlay control row; the controls no longer cover traces, including in mobile layouts.
- Kept zoom, pan, hover, reset and PNG image export behavior unchanged.
- Preserved flat server-ready packaging without launch scripts.

## v20

- Added the full interactive chart toolbar to the Home page model-rank-history graph.
- Home rank history now supports drag-box zoom, mouse-wheel zoom, Shift+drag panning, Reset View, and PNG export.
- Home PNG exports include a dynamic Model Rank History title plus region, date-window, and forecast-lead context.

## v19

- Changed the Home performance chart to a daily **model rank history** plot: each valid date independently ranks the five models from 1 (best) to 5 (worst) for the selected metric, region, period, and forecast lead.
- Preserved the left-hand Home ranking as the **overall period ranking**, based on each model's aggregate verification score across the selected period.
- Added a reversed rank Y-axis so Rank 1 is shown at the top and Rank 5 at the bottom.
- Preserved two-way highlighting between the Home ranking list and the corresponding graph trace.
- Theme preference is persisted in browser `localStorage` and restored before initial rendering, so the most recently used light/dark mode is retained between visits.

## v18
- Added metric-aware Y-axis titles to Home, Skill vs Forecast Lead, and Time Series charts.
- Added `Date` as the X-axis title on the Home performance graph and Time Series graph.
- PNG exports now include a descriptive chart title and context subtitle (region, period, baseline or forecast lead).
- Export titles are drawn directly into the canvas so they are part of the saved image rather than browser UI.

## v17
- Fixed Home-page mobile horizontal overflow that could make the page appear shrunken and push the performance chart beyond the viewport.
- Converted the mobile Home ranking strip to a bounded horizontal flex scroller so its intrinsic width cannot widen the page.
- Constrained the Home performance chart, SVG, wrappers, and main layout to the available viewport width.
- Changed the Home performance card to clip unintended chart overflow while preserving intentional scorecard-table scrolling.

## v16

- Added drag-to-select box zoom to detailed line charts.
- Retained mouse-wheel horizontal zoom as a secondary interaction.
- Changed panning to Shift + drag so normal dragging is reserved for zoom selection.
- Box-zoom X bounds snap to actual data samples (real verification dates or forecast days).
- Added a visible translucent zoom-selection rectangle.
- Expanded synthetic forecast leads to daily samples from Day 0 through Day 15 (0–360 h every 24 h).
- Skill vs Lead hover sampling now has a real record at every integer forecast day 0–15.
- Plot clipping remains enforced while zoomed.

## v15
- Removed embedded/inset legends from line charts; model colors remain visible in the model selectors and Home ranking.
- Reworked interactive chart zoom to affect the X domain only; the Y scale stays fixed while zooming/panning.
- Changed panning to horizontal-only behavior.
- Added SVG plot clipping so lines and markers cannot draw outside the chart's plotting rectangle when zoomed.
- Time-series X-axis ticks are now selected only from actual verification dates in the loaded data rather than interpolated timestamps.
- Skill-vs-Lead continues to use explicit whole-day ticks from 0 through 15 days.
- Updated PNG rendering to use the same clipped plot behavior and omit embedded legends.

## v14

- Returned all selector panels to static top-of-page placement; removed floating/dragging behavior.
- Expanded the Home selector across the available content width so Custom Range start/end dates fit on one row on normal desktop widths without an internal scrollbar.
- Fixed Skill vs Forecast Lead to use a native 0–15 day X-axis with integer tick labels and the axis title “Forecast Lead Time (Days)”.
- Replaced SVG-to-PNG conversion with a direct canvas-based PNG renderer for much more reliable chart downloads.
- Kept hover readouts, model highlighting, wheel zoom, drag panning, zoom buttons, and reset-view controls, with a cleaner Benchmark-style interaction emphasis.

## v13
- Converted Home and full Scorecard cells to baseline-relative percent improvement/degradation using the selected baseline model.
- Added a Baseline selector to the full Scorecard page; GFS remains the default, and all five models are selectable.
- Reworked scorecard shading to a more vivid, fully opaque red → gray → blue continuous scale, with nonlinear scaling so modest performance differences remain visually apparent.
- Expanded the Home scorecard back to the full card width while keeping rows compact to minimize vertical scrolling.
- Standardized the Home Date Window selector with the detailed pages: 90/30/15/7 days plus custom start/end dates in the prior 90-day archive.
- Rebuilt all page selectors as floating, draggable, one-row filter panels. Their positions persist per page; custom date fields scroll horizontally rather than wrapping.
- Updated model plot colors for stronger separation in both dark and light themes, with consistent colors across traces, legends, model chips, and ranking markers.

## v12
- Simplified Home by removing the KPI card row and the duplicate Skill-vs-Lead and Performance-History mini charts.
- Added a Brightband-inspired Home performance panel with a ranked model list to the left of a daily verification time series.
- Ranking uses the selected absolute metric, period, region, and forecast lead against the metric's configured verifying dataset.
- Added bidirectional hover linking: hovering a ranked model emphasizes its chart trace, and hovering near a chart trace emphasizes its ranked model.
- Kept the compact Home scorecard immediately below the performance panel, followed by Notable Signals and Category Snapshot.
- Added a Home Model Group selector containing only Global for the current five-model suite.
- Preserved the detailed Skill vs Lead, Scorecard, and Time Series pages for deeper analysis.

## v11
- Reduced the region set to Global, Northern Hemisphere, Southern Hemisphere, and Tropics.
- Global is now the default region throughout the dashboard.
- Regenerated the 90-day synthetic CSV dataset for the four-region configuration.

## v10

- Restricted the initial metric catalog to ACC, RMSE, Bias, and precipitation ETS.
- Restricted the model suite to GFS, GEFS, AIGFS, AIGEFS, and HGEFS.
- Expanded mock verification data to 90 daily dates ending October 6, 2026.
- Added 90-, 30-, 15-, and 7-day windows plus user-selectable custom date ranges within the loaded 90-day archive.
- Kept baseline-relative behavior for Skill vs Lead, with GFS as the default and all five models available as baselines.
- Kept Scorecard and Time Series as absolute verification against each metric's configured truth source.
- Removed deterministic/probabilistic scorecard modes.
- Rebuilt the detailed Scorecard as clearly separated compact side-by-side variable panels.
- Moved the Home scorecard above Notable Signals and Category Snapshot.
- Changed scorecard grading to a colorblind-aware red → gray → blue continuous palette.
- Fixed inherited SVG stroke styling that made chart labels/axes appear blurred or glowing.
- Hardened Save PNG chart export and added visible save-in-progress behavior.
- Retained zoom, pan, reset, hover readout, inset legends, mobile navigation, and zero-to-all model selection.
