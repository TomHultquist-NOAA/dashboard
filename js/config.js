export const CONFIG = {
  dataUrlTemplate: 'data/regions/{region}.csv',
  defaultRegion: 'Global',
  defaultPeriodDays: 30,
  defaultBaseline: 'GFS',
  defaultPrimaryMetric: 'H500_ACC',
  defaultForecastLead: 120,
  periods: [90, 60, 30, 15, 7],
  leads: Array.from({length:16},(_,i)=>i*24),
  scorecardLeads: [24, 72, 120, 168, 240, 360],
  regions: ['Global', 'Northern Hemisphere', 'Southern Hemisphere', 'Tropics'],

  // Fixed model styling for all chart views and exported PNGs.
  // AIGFS and CMC intentionally share the same color/marker per the supplied standard.
  modelMeta: {
    GFS:   { family:'Global', color:'#000000', marker:'o', markerSize:6, lineWidth:3 },
    AIGFS: { family:'Global', color:'#1e3cff', marker:'X', markerSize:7, lineWidth:1.5 },
    CFS:   { family:'Global', color:'#56b4e9', marker:'o', markerSize:6, lineWidth:1.5 },
    CMC:   { family:'Global', color:'#1e3cff', marker:'X', markerSize:7, lineWidth:1.5 },
    ECMWF: { family:'Global', color:'#fb2020', marker:'^', markerSize:7, lineWidth:1.5 },
    FNMOC: { family:'Global', color:'#00dc00', marker:'P', markerSize:7, lineWidth:1.5 },
    UKMET: { family:'Global', color:'#e69f00', marker:'o', markerSize:7, lineWidth:1.5 }
  },

  variables: {
    T2M:      { label:'2m Temperature', short:'2m Temp', category:'Surface', level:'2 m AGL', obsSource:'Verification source pending' },
    T850:     { label:'Temperature 850 hPa', short:'T850', category:'Upper Air', level:'850 hPa', obsSource:'Analysis data' },
    H500:     { label:'Geopotential Height 500 hPa', short:'H500', category:'Upper Air', level:'500 hPa', obsSource:'Analysis data' },
    MSLP:     { label:'Mean Sea Level Pressure', short:'MSLP', category:'Surface', level:'MSL', obsSource:'Analysis data' },
    WIND10:   { label:'10m Wind Speed', short:'10m Wind', category:'Surface', level:'10 m AGL', obsSource:'Verification source pending' },
    PRECIP24: { label:'24h Precipitation', short:'24h QPF', category:'Precipitation', level:'24 h accumulation', obsSource:'Verification source pending' }
  },

  // Only H500 ACC, MSLP RMSE, T850 RMSE currently have incoming .stat feeds.
  // Other metrics remain selectable as N/A, never backfilled with synthetic values.
  metrics: {
    T2M_RMSE: { variable:'T2M', metricType:'RMSE', label:'2m Temperature RMSE', short:'T2m RMSE', direction:'lower', unit:' K', decimals:2, aggregation:'rms', scorecard:{ poor:2.90, neutral:1.85, good:0.85 } },
    T2M_BIAS: { variable:'T2M', metricType:'Bias', label:'2m Temperature Bias', short:'T2m Bias', direction:'target', target:0, unit:' K', decimals:2, aggregation:'mean', scorecard:{ poorDeviation:1.40, neutralDeviation:0.65, goodDeviation:0.15 } },

    T850_RMSE: { variable:'T850', metricType:'RMSE', label:'Temperature 850 hPa RMSE', short:'T850 RMSE', direction:'lower', unit:' K', decimals:2, aggregation:'rms', scorecard:{ poor:3.00, neutral:1.80, good:0.80 } },
    T850_BIAS: { variable:'T850', metricType:'Bias', label:'Temperature 850 hPa Bias', short:'T850 Bias', direction:'target', target:0, unit:' K', decimals:2, aggregation:'mean', scorecard:{ poorDeviation:1.30, neutralDeviation:0.60, goodDeviation:0.14 } },

    H500_ACC: { variable:'H500', metricType:'ACC', label:'Geopotential Height 500 hPa ACC', short:'H500 ACC', direction:'higher', unit:'', decimals:3, aggregation:'fisher', scorecard:{ poor:0.78, neutral:0.90, good:0.975 } },
    H500_RMSE: { variable:'H500', metricType:'RMSE', label:'Geopotential Height 500 hPa RMSE', short:'H500 RMSE', direction:'lower', unit:' m', decimals:0, aggregation:'rms', scorecard:{ poor:100, neutral:57, good:22 } },
    H500_BIAS: { variable:'H500', metricType:'Bias', label:'Geopotential Height 500 hPa Bias', short:'H500 Bias', direction:'target', target:0, unit:' m', decimals:1, aggregation:'mean', scorecard:{ poorDeviation:36, neutralDeviation:16, goodDeviation:4 } },

    MSLP_RMSE: { variable:'MSLP', metricType:'RMSE', label:'Mean Sea Level Pressure RMSE', short:'MSLP RMSE', direction:'lower', unit:' hPa', decimals:2, aggregation:'rms', scorecard:{ poor:8.2, neutral:4.4, good:1.6 } },
    MSLP_BIAS: { variable:'MSLP', metricType:'Bias', label:'Mean Sea Level Pressure Bias', short:'MSLP Bias', direction:'target', target:0, unit:' hPa', decimals:2, aggregation:'mean', scorecard:{ poorDeviation:3.2, neutralDeviation:1.4, goodDeviation:0.28 } },

    WIND10_RMSE: { variable:'WIND10', metricType:'RMSE', label:'10m Wind Speed RMSE', short:'10m Wind RMSE', direction:'lower', unit:' m/s', decimals:2, aggregation:'rms', scorecard:{ poor:3.5, neutral:2.15, good:1.00 } },
    WIND10_BIAS: { variable:'WIND10', metricType:'Bias', label:'10m Wind Speed Bias', short:'10m Wind Bias', direction:'target', target:0, unit:' m/s', decimals:2, aggregation:'mean', scorecard:{ poorDeviation:1.45, neutralDeviation:0.68, goodDeviation:0.14 } },

    PRECIP24_ETS: { variable:'PRECIP24', metricType:'ETS', label:'24h Precipitation ETS', short:'24h QPF ETS', direction:'higher', unit:'', decimals:3, aggregation:'mean', scorecard:{ poor:0.12, neutral:0.28, good:0.48 } }
  },

  sourceMetrics: ['H500_ACC','T850_RMSE','MSLP_RMSE'],

  homeMetrics: ['H500_ACC','T850_RMSE','MSLP_RMSE','T2M_RMSE','WIND10_RMSE','PRECIP24_ETS'],
  scorecardGroups: [
    { title:'500-hPa Height', metrics:['H500_ACC','H500_RMSE','H500_BIAS'] },
    { title:'850-hPa Temperature', metrics:['T850_RMSE','T850_BIAS'] },
    { title:'2-m Temperature', metrics:['T2M_RMSE','T2M_BIAS'] },
    { title:'Mean Sea Level Pressure', metrics:['MSLP_RMSE','MSLP_BIAS'] },
    { title:'10-m Wind Speed', metrics:['WIND10_RMSE','WIND10_BIAS'] },
    { title:'24-h Precipitation', metrics:['PRECIP24_ETS'] }
  ]
};

export const metricKeys = () => Object.keys(CONFIG.metrics);
export const variableKeys = () => Object.keys(CONFIG.variables).filter(v => metricKeys().some(k => CONFIG.metrics[k].variable === v));
export const metricsForVariable = variable => metricKeys().filter(k => CONFIG.metrics[k].variable === variable);
