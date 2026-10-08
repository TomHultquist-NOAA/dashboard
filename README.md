# OMD Model Performance Dashboard — Prototype v16

This package is a static, production-oriented prototype for an internal OMD model-performance dashboard backed by EVS-style CSV statistics. All included statistics are synthetic and are for interface demonstration only.

#
### Home rank-history chart controls

The Home page rank-history chart supports the same interactions as the detailed charts: drag a box to zoom, use the mouse wheel to zoom horizontally, Shift+drag to pan, reset the view, and save a PNG with a dynamic title/context line.

## Initial regions
The prototype currently includes only **Global**, **Northern Hemisphere**, **Southern Hemisphere**, and **Tropics**. Region files are loaded on demand.

## Initial metric scope

The prototype now reflects the intended initial operational scope only:

- ACC
- RMSE
- Bias
- ETS for 24-hour precipitation

Models included: **GFS, GEFS, AIGFS, AIGEFS, HGEFS**.

The synthetic files contain **90 daily verification dates (2026-07-09 through 2026-10-06)**. The date controls provide 90-, 30-, 15-, and 7-day windows plus a custom range constrained to the available 90-day archive.

## Pages

- **Home** — high-level model ranking and daily performance chart for the selected metric, followed by the compact verification scorecard, notable signals, and category snapshot. Ranking and chart traces cross-highlight on hover.
- **Skill vs Lead** — baseline-relative skill by forecast lead. GFS is the default baseline, but any displayed model may be chosen.
- **Scorecard** — compact side-by-side panels showing percent improvement/degradation relative to a user-selected baseline model. GFS is the default baseline, but any of the five models may be selected.
- **Time Series** — daily absolute verification statistics for a selected forecast lead or all leads.

## Scorecard colors

The scorecards use an opaque, colorblind-aware diverging scale:

**red (worse than baseline) → intermediate reds → gray (baseline/near neutral) → intermediate blues → blue (better than baseline)**

Every cell displays the percent change relative to the selected baseline, so color is never the only information channel. The baseline column is 0.0%.

## Chart interaction

The Home performance chart links directly to its ranked model list: hover a ranked model to emphasize that trace, or hover near a trace to emphasize its ranked model.

Detailed Skill vs Lead and Time Series charts support:

- hover readouts
- zoom in / zoom out buttons
- mouse-wheel zoom on desktop
- drag-to-select box zoom on desktop
- Shift + drag panning on desktop
- clean integer Day 0–15 axis on Skill vs Lead, labeled **Forecast Lead Time (Days)**
- reset chart view
- Save PNG using a direct canvas export (no SVG rasterization dependency)
- any number of selected models, including zero or all five

## Running the prototype

The browser loads CSV files with `fetch()`, so serve the directory through HTTP rather than opening `index.html` directly.

### Windows

Run `start_server.bat`, then open `http://localhost:8000/`.

### macOS/Linux

Run `./start_server.sh`, then open `http://localhost:8000/`.

Or copy the package to any normal web server.

## Data architecture

Data are partitioned by region under `data/regions/`. Only the requested region is loaded and cached in-browser. This keeps startup and mobile usage lighter while retaining a simple CSV-based interface.

See `DATA_FORMAT.md` for the mock normalized contract. The future EVS integration should adapt native EVS CSV output into this contract (or update `DataService`) without requiring the dashboard UI to be rewritten.


## Home model group

The Home **Model Group** selector currently contains only **Global**, representing the five-model suite in this prototype. The selector is retained so additional model groups can be added later without redesigning the control dock.


## Page selectors

The Home, Skill vs Lead, Scorecard, and Time Series pages each use a static selector panel at the top of the page content. On desktop, the Home selector expands to the full available width so a custom Start/End date range remains in the same row. On tablet and mobile widths, the controls reflow responsively rather than requiring a horizontally scrolling selector.

## Model trace colors

The five-model palette intentionally uses widely separated hues (blue, gold, purple/magenta, teal, and orange) with separate dark- and light-theme variants. The same colors are reused consistently for plot traces, legends, model chips, and Home ranking markers.

### Chart navigation (v16)
Detailed line charts use a box-zoom interaction similar to modern benchmark/Plotly-style charts: drag across the plotting area to draw a visible selection rectangle, then release to zoom to that X/Y window. The selected X bounds snap to actual forecast leads or verification dates rather than invented/interpolated values. Mouse-wheel zoom remains available for horizontal zoom, Shift + drag pans, and Reset View restores the full domain. Traces and markers are clipped to the plotting rectangle.

Skill vs Lead is backed by actual daily forecast-lead records from **Day 0 through Day 15** (`forecast_hour` 0–360 in 24-hour increments), so hover sampling is available at every integer forecast day.

### v17 mobile Home layout
The Home performance ranking/chart panel is explicitly constrained to the viewport on phones and tablets. The model ranking becomes a local horizontal scroller, while the chart itself always scales to the available content width. The page should not develop horizontal document-level scrolling from the Home chart.

### Chart labeling and exports
Charts include explicit axis titles. Date-based plots label the X axis as **Date**; Skill vs Forecast Lead uses **Forecast Lead Time (Days)**. Y-axis titles are derived from the selected verification metric and its units. Saved PNGs include a descriptive title plus the active region/date/baseline or forecast-lead context.
### Home rank history

The Home performance chart shows **rank position by valid date**, not the raw verification value. For every displayed valid date, the five models are ranked independently using the selected metric: higher ACC/ETS is better, lower RMSE is better, and Bias closest to zero is better. Rank 1 is plotted at the top. The ranking list to the left remains the overall ranking for the complete selected period using the aggregate verification score. Hovering a model name highlights its trace, and hovering a trace highlights the corresponding model in the ranking list.

### Theme persistence

The light/dark theme selection is stored in browser `localStorage` (`omd-dashboard-theme`). The saved theme is applied from the document head before the main stylesheet renders, so the most recent theme is restored on subsequent visits without a visible theme flash.

