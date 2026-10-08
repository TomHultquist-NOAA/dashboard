# Dashboard CSV Contract

Each regional CSV contains one row per daily verification statistic, model, metric, and forecast lead.

```text
valid_date,model,region,metric,forecast_hour,value,sample_count,completeness
2026-10-06,GFS,Global,H500_ACC,120,0.927531,31842,99.21
```

## Fields

- `valid_date` — verification date in `YYYY-MM-DD` format.
- `model` — GFS, GEFS, AIGFS, AIGEFS, or HGEFS in this prototype.
- `region` — verification region.
- `metric` — normalized metric key defined in `js/config.js`.
- `forecast_hour` — forecast lead in hours.
- `value` — verification statistic.
- `sample_count` — contributing verification sample count.
- `completeness` — percent data completeness.

## Initial metric keys

The prototype contains only ACC, RMSE, Bias, and precipitation ETS:

- `T2M_RMSE`, `T2M_BIAS`
- `T850_RMSE`, `T850_BIAS`
- `H500_ACC`, `H500_RMSE`, `H500_BIAS`
- `MSLP_RMSE`, `MSLP_BIAS`
- `WIND10_RMSE`, `WIND10_BIAS`
- `PRECIP24_ETS`

Configured mock truth sources are URMA, GDAS Analysis, and MRMS QPE depending on the parameter.

## Date handling

The dashboard expects daily rows and discovers the available archive bounds from the CSV. The custom date range inputs are constrained to those bounds. For the current v23 demonstration the range is 2026-07-09 through 2026-10-06, i.e. 90 days ending the day before the prototype's October 7, 2026 reference date.

## Forecast-lead cadence

For this prototype, every metric/model/date combination contains one record at each daily forecast lead from **Day 0 through Day 15**: `forecast_hour = 0, 24, 48, ..., 360`. The detailed Skill vs Lead page therefore samples actual data at every integer forecast day rather than interpolating between sparse lead times.

