# Diagnostic Skill Explorer: methods and limitations (v1.3.2)

The new diagnostic views reuse the same daily regional, model, metric, UTC `valid_date`, `forecast_hour`, `value`, and `verification_source` records as the rest of the dashboard. Their results are **descriptive** and cannot be interpreted as gridpoint, member-level, storm-event, or independent observational statistics.

## Pairing and quality

- Every pair of comparison scores is matched on the exact region, metric, UTC verifying day and forecast lead. Source differences and blank sources are counted and disclosed; source matching is not secretly tightened.
- A metric's direction comes from `CONFIG.metrics`: ACC/ETS higher is better; RMSE/RMSVE lower is better; signed Bias/SPEED_ERR nearer target zero is better. The raw signed bias remains signed in the Bias Evolution view.
- Native-unit advantage is `model - baseline` for higher-is-better, `baseline - model` for lower-is-better, and `|baseline-target| - |model-target|` for target metrics. Positive means model advantage. Relative skill uses the dashboard's existing `DataService.relativeSkill` transformation, and aggregate scores use the existing configured mean, RMS or Fisher transform.
- A data-coverage percentage is matched days divided by calendar days in the selected available archive window. It is not a probability, confidence level, or measure of statistical independence.

## Model Leadership Mosaic

Each (date, lead) cell compares the **selected models with available scores on that exact date/lead**. At least two models must be present; otherwise the cell is N/A. This allows the Mosaic to extend through D15 when shorter-range models are no longer available. The hover readout lists participating and unavailable models. The best score wins according to metric direction. Exact or near-floating-point ties split first-place credit. The first-place bar for each forecast lead shows each model's (possibly fractional) winning credit divided by the number of date/lead comparisons with at least two participants; the hover tooltip shows the participant count and each model's share and appearance frequency. **The competition pool can vary across dates and leads.** A Day 15 first-place percentage must not be interpreted as a victory over all initially selected models or compared uncritically with Day 3.


## Verification Case Finder and paired scatterplot

The Case Finder ranks **matched daily score advantages**, not meteorological weather events. The strongest focus-model advantage and largest deficit are ranked by native-unit advantage. The sharpest change uses the absolute change in native advantage between two immediately consecutive UTC verifying dates at the chosen lead. Gaps do not count as consecutive days.

The scatterplot uses baseline daily score on x and focus-model daily score on y. The diagonal means *numerically equal raw scores*. Coloring reflects whether the focus model is better according to metric direction, which is particularly important for RMSE and signed Bias. Each dot is one paired daily regional score. Clicking any Case Finder row (or a Mosaic/scatterplot point) highlights that verification date across diagnostics; each Case Finder row has a separate Time Series button that opens the date directly without requiring selection. Opening Time Series highlights that calendar date in its graph and PNG export.

## Signed Bias Evolution and Bias–RMSE Portrait

Bias Evolution uses signed daily bias for the selected model. Blue means negative bias, red means positive, and neutral means near zero; these are **not skill categories**. Both signs share a symmetric display scale determined by the 95th percentile of plotted |bias|, with visually clipped extreme colors and **unclipped** numerical hover values.

For the portrait, a model–date–lead record is usable only when both the variable's signed-bias and RMSE metrics are present. For each model and lead, bias is averaged as a signed mean and daily RMSE values receive the existing RMS aggregate transformation. Points plot `(absolute aggregated signed bias, aggregated RMSE)`; the distribution is **not** a decomposition of mean squared error into bias and variance because the inputs are daily summary statistics. Different lead points can be based on different matched dates. Lines connect only adjacent 24-hour lead points. Variables supported are H500, T850, T2M and MSLP; WIND10 SPEED_ERR and RMSVE are not automatically treated as a conventional scalar bias/RMSE pair.

## Common-Sample Comparison Audit

An ordinary Head-to-Head cell uses all verifying dates shared by its two models. The audit additionally requires every enabled model to be available on that date and lead; it recomputes each pair's win-equivalent rate on this *shared selected-model intersection*. Both rates use `(wins + 0.5 × ties) / matched days`. Audit cell = common rate minus pairwise rate, in percentage points. A positive change only means the observed win rate is larger in a *different selection of dates*. This is a sample-selection diagnostic, not a claim that skill improved. Empty all-model intersections are N/A. When every selected model is available on exactly the same dates, the comparison samples are identical and the entire audit appropriately displays 0.0 percentage points and unchanged matched-date counts; this is a successful coverage audit, not evidence of equal model skill. The page shows an explicit explanation of such no-change results.

## Leave-One-Week-Out Skill Robustness

Daily focus/baseline paired scores are partitioned into nonoverlapping UTC Monday-start calendar weeks. For every observed week, scores in that week are omitted and existing aggregate relative skill is recomputed from all remaining matched scores. Each estimate requires at least two observed calendar weeks and three matched dates remaining. The dashed horizontal line shows full-sample skill; each point shows recomputed skill after removing the labeled Monday-start calendar week. Vertical distance from the line indicates sensitivity to that week, and a red point indicates that the sign of the advantage reverses. Hovering reveals days excluded/retained and the percentage-point change. A change in the sign of improvement is flagged. Results are **not** confidence intervals, significance tests, independent trials, or estimates of probability of future outcomes. Serial correlation, seasonal changes, shared verification sources and outlier episodes can all affect these descriptive patterns.

## Optional baseline-score strata (experimental)

Matched dates are ranked by the selected baseline model's score according to that metric's preference. The top and bottom quartiles (minimum 2 days each, requiring at least 8 matched days) are compared descriptively using native advantage and aggregate relative skill. Selecting dates on the baseline's own score can induce regression to the mean and other selection effects. 'Worst baseline-score days' does **not** imply physically difficult weather, high-impact events, or an independent predictability measure. This panel is collapsed by default.

## Data handling and exports

None of these views requires new source fields, changes to `tools/ingest_evs_stat.py`, the cron/update scripts, or the published `data/regions/*.csv` schema. Dark/light styling and model colors are preserved. SVG primitive graphics export directly through Canvas rather than relying on blob-image URLs, which some Content-Security-Policy settings disallow. Empty samples remain N/A, not zeros.

The older advanced items—Taylor/Target, categorical precipitation performance, ensemble reliability, rank histograms and spread–skill—remain outside this scope because sufficient raw source statistics are not present in the current normalized summaries. See `ADVANCED_DATA_REQUIREMENTS.md` for those separate needs.


## Selection and hover controls (v1.3.2)

- A Mosaic cell, Verification Case Finder row, or paired Scatterplot point selects a verification date, highlighting related diagnostics. Click the *same* date and forecast lead again to clear its highlight; choose a different date or forecast lead to replace the selection.
- The **Clear selection** button above Diagnostic Cases is also available and stays visible when scrolling with an active selection. The Time Series shortcut remains independent.
- Model Leadership tooltips show all participating/unavailable models and other values with line wrapping. Very short screens may require scrolling inside the tooltip.
