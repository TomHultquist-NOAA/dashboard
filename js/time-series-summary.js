// Summarize exactly the daily values plotted in Performance Time Series.
// The caller supplies the existing DataService metric-specific aggregator;
// this avoids inventing a second definition of ACC/RMSE/ETS period scores.
export function buildTimeSeriesPeriodSummary(series,{aggregate,format,aggregation='mean',totalDays=0}={}){
  if(typeof aggregate!=='function'||typeof format!=='function')throw new Error('Period summary requires aggregation and score formatting');
  const rows=(series||[]).map(s=>{
    const values=(s.data||[]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>p.y);
    const score=values.length?aggregate(values):NaN;
    return {name:s.name,color:s.color,score,formatted:Number.isFinite(score)?format(score):'N/A',days:values.length};
  });
  const method=aggregation==='fisher'?'Fisher aggregation of daily scores':aggregation==='rms'?'RMS aggregation of daily scores':'Arithmetic mean of daily scores';
  return {heading:'Selected-period score',method,totalDays:Math.max(0,Math.trunc(totalDays)||0),rows};
}
