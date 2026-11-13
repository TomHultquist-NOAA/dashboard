import { CONFIG } from './config.js?v=1.3.2';

// A metric's quality increases as the score improves. Bias/SPEED_ERR use
// distance from the target, not signed magnitude.
export function scoreQuality(value, metric) {
  if (!Number.isFinite(value)) return NaN;
  if (metric.direction === 'higher') return value;
  if (metric.direction === 'lower') return -value;
  return -Math.abs(value - (metric.target ?? 0));
}

// Weighted pool-adjacent-violators isotonic fit: quality must stay constant
// or decline with forecast lead. Observed scores in Forecast Hour Mean stay
// untouched; this fit is used only for finding effective-lead equivalents.
export function fitDecliningQuality(points) {
  const ordered = points.filter(p => Number.isFinite(p.quality) && Number.isFinite(p.hour))
    .slice().sort((a, b) => a.hour - b.hour);
  const blocks = [];
  for (let i = 0; i < ordered.length; i++) {
    const weight = Number.isFinite(ordered[i].n) && ordered[i].n > 0 ? ordered[i].n : 1;
    blocks.push({ first: i, last: i, sum: ordered[i].quality * weight, weight });
    while (blocks.length > 1) {
      const curr = blocks[blocks.length - 1], prev = blocks[blocks.length - 2];
      if (prev.sum / prev.weight >= curr.sum / curr.weight - 1e-12) break;
      prev.last = curr.last;
      prev.sum += curr.sum;
      prev.weight += curr.weight;
      blocks.pop();
    }
  }
  const result = ordered.map(p => ({ ...p }));
  for (const b of blocks) for (let i = b.first; i <= b.last; i++) result[i].fitted = b.sum / b.weight;
  return result;
}

// Invert a non-increasing quality curve using *observed* forecast hours only.
// No extrapolation and no interpolation across missing lead intervals.
// If the fitted model quality equals baseline quality at the SAME forecast
// hour, that explicitly represents 0 h gain. Previously a flat fitted
// plateau could select the last (later) matching hour instead.
export function equivalentForecastHour(fitted, target, intervalHours = 24, baselineHour = NaN) {
  if (!Number.isFinite(target) || !fitted.length) return { status: 'missing', hour: NaN };
  const tolerance = Math.max(1e-10, Math.abs(target) * 1e-9);
  const first = fitted[0], last = fitted[fitted.length - 1];
  const matchingAtSameHour = fitted.find(p => p.hour === baselineHour &&
    Math.abs(p.fitted - target) <= tolerance);
  if (matchingAtSameHour) return { status: 'matched', hour: baselineHour, sameLead: true };
  if (fitted.length < 2) return { status: 'insufficient', hour: NaN };
  if (target > first.fitted + tolerance) return {
    status: 'below-range', hour: NaN, boundaryHour: first.hour
  };
  if (target < last.fitted - tolerance) return {
    status: 'beyond-range', hour: NaN, boundaryHour: last.hour
  };
  // The final observed hour on a fitted plateau is used when the plateau
  // does not include the baseline's own hour (maximal *measured* lead).
  let exactHour = NaN;
  for (const p of fitted) if (Math.abs(p.fitted - target) <= tolerance) exactHour = p.hour;
  if (Number.isFinite(exactHour)) return { status: 'matched', hour: exactHour, sameLead: false };
  for (let i = 0; i < fitted.length - 1; i++) {
    const a = fitted[i], b = fitted[i + 1];
    if (a.fitted > target && b.fitted < target) {
      if (b.hour - a.hour > intervalHours + 1e-9) return {
        status: 'gap', hour: NaN, gapStart: a.hour, gapEnd: b.hour
      };
      return { status: 'matched', hour: a.hour + (target - a.fitted) *
        (b.hour - a.hour) / (b.fitted - a.fitted), sameLead: false };
    }
  }
  return { status: 'missing', hour: NaN };
}

// Effective-lead curves use the SAME independently available daily-score
// arithmetic means as Forecast Hour Mean. The baseline quality at a given
// hour is compared with the independently fitted model quality curve; the
// comparison model need not have any record at that baseline hour. This is a
// descriptive available-sample comparison, NOT paired-event inference.
// Relative skill and EVS significance continue to use date/lead pairs.
export function effectiveLeadSeries(data, { model, baseline, metric, region, ...window }) {
  const meta = CONFIG.metrics[metric], leadHours = CONFIG.leads;
  if (model === baseline) return { model, baseline, points: [], rows: [], modelHours: 0, baselineHours: 0 };
  const args = { metric, region, ...window };
  const modelMean = data.meanValueByLead({ ...args, model });
  const baselineMean = data.meanValueByLead({ ...args, model: baseline });
  const asCurve = values => fitDecliningQuality(values.map(p => ({
    hour: p.lead, value: p.value, quality: scoreQuality(p.value, meta), n: p.n
  })));
  const modelCurve = asCurve(modelMean);
  const baselineCurve = asCurve(baselineMean);
  const baselineByHour = new Map(baselineCurve.map(p => [p.hour, p]));
  const modelByHour = new Map(modelCurve.map(p => [p.hour, p]));
  const firstModelHour = modelCurve.length ? modelCurve[0].hour : NaN;
  const lastModelHour = modelCurve.length ? modelCurve[modelCurve.length - 1].hour : NaN;
  const rows = leadHours.map(hour => {
    const b = baselineByHour.get(hour), m = modelByHour.get(hour);
    const equivalent = !b ? { status: 'no-baseline-data', hour: NaN } :
      !modelCurve.length ? { status: 'no-model-data', hour: NaN } :
      equivalentForecastHour(modelCurve, b.fitted,
        leadHours.length > 1 ? leadHours[1] - leadHours[0] : 24, hour);
    const modelHour = equivalent.hour;
    const rawGain = Number.isFinite(modelHour) ? modelHour - hour : NaN;
    const gain = rawGain === 0 ? 0 : rawGain;
    return { baselineHour: hour, baselineValue: b?.value ?? NaN,
      modelValue: m?.value ?? NaN, baselineQuality: b?.fitted ?? NaN,
      baselineN: b?.n ?? 0, modelN: m?.n ?? 0,
      modelHour, gain, status: equivalent.status,
      sameLead: Boolean(equivalent.sameLead),
      boundaryHour: equivalent.boundaryHour ?? NaN,
      gapStart: equivalent.gapStart ?? NaN, gapEnd: equivalent.gapEnd ?? NaN,
      firstModelHour, lastModelHour };
  });
  return { model, baseline, modelHours: modelCurve.length, baselineHours: baselineCurve.length,
    rows, points: rows.filter(r => Number.isFinite(r.gain)).map(r => ({
      x: r.baselineHour / 24, y: r.gain,
      label: `${baseline} D${r.baselineHour / 24} (F${r.baselineHour}, ${r.baselineN} daily scores) · equivalent ${model} F${r.modelHour.toFixed(1)} · independently available daily samples${r.sameLead?' · equal fitted quality at same lead':''}`,
      baselineHour: r.baselineHour, modelHour: r.modelHour,
      baselineSampleCount: r.baselineN, sameLead: r.sameLead
    })) };
}
