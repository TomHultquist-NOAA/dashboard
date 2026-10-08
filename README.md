# OMD Model Performance Dashboard — Prototype v22

**Internal demonstration • Synthetic EVS-style statistics • Not operational verification**

This is a browser-based prototype for quickly exploring and comparing NWP model verification, inspired by Operational WeatherBench's navigation and rank-history presentation. It is designed for static hosting now, with modular CSV ingestion to support a later transition to real OMD Evaluation and Verification System (EVS) data. **Every included numerical result is synthetic.** No displayed score, model rank, or signal should be interpreted as an actual forecast-performance finding.

## Deploy on a web server

Unzip the package **directly into the desired web directory**. The ZIP has **no enclosing folder and no `start_server` scripts**. The root of the deployed directory should look like:

```text
index.html
css/styles.css
js/app.js
js/charts.js
js/config.js
js/data-service.js
js/csv.js
data/regions/Global.csv
              Northern Hemisphere.csv
              Southern Hemisphere.csv
              Tropics.csv
README.md
DATA_FORMAT.md
ARCHITECTURE.md
CHANGELOG.md
tools/generate_demo_data.py
tools/normalize_evs_csv.py
```

Visit `https://<your-server>/<deployed-path>/` (or the corresponding HTTP URL). No server-side interpreter, database, build system, or external JavaScript libraries are needed for the demo. **Serve through HTTP(S)**: opening `index.html` with `file://` generally blocks CSV loading because the application calls `fetch()`.

If a newly deployed revision seems unchanged, perform a hard refresh or clear the site's cache; normal HTTP caching can cause older CSS and JavaScript to persist.

## Current demonstration scope

| Setting | Included in v22 |
| --- | --- |
| Models | **GFS, GEFS, AIGFS, AIGEFS, HGEFS** |
| Model Group | **Global** only (the name of this five-model group) |
| Regions | **Global, Northern Hemisphere, Southern Hemisphere, Tropics** |
| Verification metrics | **ACC, RMSE, Bias, and 24-h precipitation ETS** |
| Variables | 500-hPa geopotential height; 850-hPa temperature; 2-m temperature; MSLP; 10-m wind speed; 24-h precipitation |
| Archive | **90 daily valid dates, July 9–October 6, 2026**, in demo data |
| Forecast leads | **Day 0–15**, every 24 hours (0–360 forecast hours) |
| Period controls | **90, 60, 30, 15, or 7 days**, or **Custom Range** within available dates |
| Default comparison baseline | **GFS**, changeable to any of the five models |
| Theme | Dark by default on first visit; most recently selected light/dark setting is remembered in that browser |

The synthetic CSVs are organized **one file per region** in `data/regions/`. Only the selected region is fetched initially; loaded regions are reused within the current page session. Verification targets vary by parameter: mock configurations currently reference **GDAS Analysis, URMA, and MRMS QPE** as appropriate. These are configurable examples, not claims about the final EVS ingest feed.

## Pages and interpreting their values

### Home — at-a-glance performance

- **Overall model ranking (left)** sorts the five systems using the selected metric's *aggregate* verification score for the selected dates, region, and forecast lead. Lower RMSE is better, higher ACC/ETS is better, and Bias is assessed by distance from zero.
- **Model Rank History (right)** plots each model's **rank at every individual valid date**: Rank 1 is best at the top, Rank 5 worst at the bottom. This is *not* a chart of raw RMSE/ACC/Bias/ETS values. Hovering a model name emphasizes its trace; hovering near a trace emphasizes its model in the ranking list.
- The compact **Verification Scorecard** appears below rank history. Cells are **percentage improvement/degradation relative to the selected baseline**, with strong **blue for better**, **gray for near baseline**, and **red for worse**. The baseline model's value is 0.0% by definition.
- **Notable Signals** and **Category Snapshot** provide quick prototype summaries beneath the scorecard.
- Home filters sit **at the top of the page** and include period/custom date range, region, baseline, metric, and forecast lead. On narrow screens they reflow responsively.

### Skill vs Forecast Lead

- Shows percent skill relative to the **user-selected baseline** (default: GFS), for the selected metric, region and date window.
- X-axis is **Forecast Lead Time (Days)**, with **actual daily samples at Day 0, Day 1, …, Day 15**; Y-axis describes **Skill vs [baseline] (%)**.
- Users may display any combination of the five model traces, **including zero or all five**.

### Scorecard

- Detailed, compact side-by-side cards by variable and metric, using a selected region, baseline, and date window.
- Cells show **percent improvement/degradation against the selected baseline**, not the underlying absolute verification statistic. Colors and numeric signs consistently indicate better/near-baseline/worse performance.
- Columns use the compact lead subset **Days 1, 3, 5, 7, 10, and 15**.
- There is no Deterministic/Probabilistic mode selector in this initial version.

### Time Series

- Shows **actual daily metric values relative to the configured observation/analysis verification source**, **not percent skill against GFS**.
- X-axis is **Date**, Y-axis is the selected metric and units (e.g. RMSE (K), Bias (hPa), ACC, ETS).
- Forecast Lead may be a single daily lead or **All** (prototype lead aggregation). The selected calendar range filters the visible dates.
- Model traces can be selected independently, including none or all five.

## Chart interaction and image export

Interactive graphs appear on **Home, Skill vs Forecast Lead, and Time Series**. The graph control toolbar is now in a **separate compact strip immediately above the plot**, so it **does not overlay or obscure traces** on either desktop or mobile.

- **Hover**: crosshair, per-model values and visual highlighting; on Home, ranking names and lines highlight one another.
- **Click-drag** within the graph: draw a zoom-selection rectangle and release to zoom; horizontal bounds snap to real dates or forecast leads.
- **Mouse wheel**: horizontal zoom around the pointer on desktop.
- **Shift + drag**: pan the viewed window.
- **Zoom In / Zoom Out** buttons: additional accessible zoom controls, useful on touch devices.
- **Reset View**: return the graph to its complete X/Y extent.
- **Download PNG**: exports the currently viewed chart via a canvas, including a descriptive title, region/date/lead or baseline context, axis labels, and the graph; the toolbar itself is **not** part of the exported image.

Traces are clipped to the plotting area when zoomed. Date ticks come from genuine valid dates, rather than fractional or interpolated dates. Graph trace hues are intentionally distinct in both dark and light modes; no embedded legend is necessary because model chips and the Home ranking display matching colors.

## Themes and mobile use

Use the sun/moon button in the header to change the theme. The choice is saved in this browser's `localStorage` under `omd-dashboard-theme` and restored on subsequent visits. A different browser/device or cleared site data has its own preference.

The left navigation converts to a mobile drawer. Home ranking is a horizontally scrollable strip on small screens, graph widths are bounded to the mobile viewport, and the scorecard can scroll within its own table area without widening the page. Touch users have the graph zoom buttons even where desktop drag gestures are unavailable.

## Replacing mock data with actual EVS statistics

The current browser pipeline is:

```text
EVS native CSV files → normalization/adapter → regional normalized CSV
                    → DataService → charts/scorecards
```

The prototype normalized contract is documented in **`DATA_FORMAT.md`**. Its principal fields are:

```text
valid_date,model,region,metric,forecast_hour,value,sample_count,completeness
```

`js/config.js` defines the model list, metric metadata, units, verification sources, lead choices, and presentation labels. `js/data-service.js` handles loading, filtering and aggregation. `js/charts.js` owns chart drawing/interaction/PNG export; `js/app.js` coordinates the interface. The Python scripts in `tools/` support mock-data generation and demonstrate one possible future CSV-normalization approach; they are **not required for serving the website**. The normalization script is a starter template and still needs adaptation to real EVS-native file formats.

**Aggregation caution:** RMSE is pooled as RMS, ACC via Fisher-z, and Bias/ETS via arithmetic mean in this demonstration. Confirm these choices, sample weighting, verification masks/sources, missing-data behavior, and statistical comparability against the actual EVS/METplus output definitions before using any derived quantities operationally. Special care is required for Bias near zero and for pooled scores over different lead times.

Additional technical notes are in **`ARCHITECTURE.md`**; release history is in **`CHANGELOG.md`**.

## Revision notes for v22

- Added a **60 Days** preset to the Date Window selectors on **Home, Skill vs Forecast Lead, Scorecard, and Time Series**.
- All preset windows continue to end on the latest date available in the demo archive (October 6, 2026); Custom Range remains available.
- Preserved v21’s non-overlay chart toolbars, chart interactions, PNG exports, theme persistence, and server-ready ZIP root layout.
