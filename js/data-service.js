import { CONFIG, metricKeys } from './config.js';
import { parseCSV } from './csv.js';

const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
const rms=a=>a.length?Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length):NaN;
const fisher=a=>{const v=a.filter(Number.isFinite).map(x=>Math.atanh(Math.max(-.999999,Math.min(.999999,x))));return v.length?Math.tanh(mean(v)):NaN};
const dateKey=d=>d.toISOString().slice(0,10);
const asUtcDate=v=>v instanceof Date?new Date(v):new Date(`${v}T00:00:00Z`);

export class DataService{
  constructor(){this.rows=[];this.latestDate=null;this.earliestDate=null;this.index=new Map();this.loadedRegions=new Set();this.loadingRegions=new Map()}
  isRegionLoaded(region){return this.loadedRegions.has(region)}
  async load(region=CONFIG.defaultRegion){return this.loadRegion(region)}
  async loadRegion(region){
    if(this.loadedRegions.has(region))return this;
    if(this.loadingRegions.has(region))return this.loadingRegions.get(region);
    const promise=(async()=>{
      const url=CONFIG.dataUrlTemplate.replace('{region}',encodeURIComponent(region));
      const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`Unable to load ${url}: HTTP ${r.status}`);
      const raw=parseCSV(await r.text());let latest=-Infinity,earliest=Infinity;
      const rows=raw.filter(x=>x.valid_date && x.model && x.metric && x.value!=='' && x.value!=='NA' && x.value!=='N/A').map(x=>({...x,forecast_hour:Number(x.forecast_hour),value:Number(x.value),sample_count:x.sample_count===''?NaN:Number(x.sample_count),completeness:x.completeness===''?NaN:Number(x.completeness),verification_source:x.verification_source||'',valid_date:new Date(`${x.valid_date}T00:00:00Z`)})).filter(x=>Number.isFinite(x.value)&&Number.isFinite(x.forecast_hour)&&Number.isFinite(x.valid_date.getTime()));
      for(const row of rows){
        const t=row.valid_date.getTime();latest=Math.max(latest,t);earliest=Math.min(earliest,t);
        const key=`${row.region}|${row.model}|${row.metric}`;if(!this.index.has(key))this.index.set(key,[]);this.index.get(key).push(row);
      }
      this.rows.push(...rows);
      for(const [key,arr] of this.index){if(key.startsWith(`${region}|`))arr.sort((a,b)=>a.valid_date-b.valid_date||a.forecast_hour-b.forecast_hour)}
      this.loadedRegions.add(region);
      if(Number.isFinite(latest)&&(!this.latestDate||latest>this.latestDate.getTime()))this.latestDate=new Date(latest);
      if(Number.isFinite(earliest)&&(!this.earliestDate||earliest<this.earliestDate.getTime()))this.earliestDate=new Date(earliest);
      this.loadingRegions.delete(region);return this;
    })().catch(err=>{this.loadingRegions.delete(region);throw err});
    this.loadingRegions.set(region,promise);return promise;
  }
  // Availability is determined from actual normalized observations in the selected
  // region, across the loaded archive; it is intentionally NOT tied to the current
  // date window, model selection, or forecast lead. Those narrower combinations
  // can legitimately show N/A even when a metric itself is available.
  hasMetricData(region,metric){
    if(!this.loadedRegions.has(region))return false;
    return Object.keys(CONFIG.modelMeta).some(model=>{
      const rows=this.index.get(`${region}|${model}|${metric}`);
      return Boolean(rows&&rows.length);
    });
  }
  async ensureRegion(region){return this.loadRegion(region)}

  resolveWindow({days,startDate,endDate}){
    const fallback=new Date();fallback.setUTCHours(0,0,0,0);fallback.setUTCDate(fallback.getUTCDate()-1);
    const end=endDate?asUtcDate(endDate):new Date(this.latestDate||fallback);
    let start;
    if(startDate) start=asUtcDate(startDate);
    else {start=new Date(end);start.setUTCDate(start.getUTCDate()-((Number(days)||CONFIG.defaultPeriodDays)-1));}
    // Empty or partially populated archives do not invalidate the requested date window.
    // Never extend a custom window beyond available data, and never invent observations.
    if(this.earliestDate&&start<this.earliestDate)start=new Date(this.earliestDate);
    if(this.latestDate&&end>this.latestDate)end.setTime(this.latestDate.getTime());
    return {start,end};
  }
  windowRows({days,startDate,endDate,region,models,metrics,leads}){
    if(!this.loadedRegions.has(region))return[];
    const {start,end}=this.resolveWindow({days,startDate,endDate});
    const leadSet=leads?.length?new Set(leads.map(Number)):null;
    const metricList=metrics?.length?metrics:metricKeys(),candidates=[];
    for(const model of (models||Object.keys(CONFIG.modelMeta)))for(const metric of metricList){const arr=this.index.get(`${region}|${model}|${metric}`);if(arr)candidates.push(...arr)}
    return candidates.filter(row=>row.valid_date>=start&&row.valid_date<=end&&(!leadSet||leadSet.has(row.forecast_hour)));
  }
  aggregateMetricValues(values,metricKey){const m=CONFIG.metrics[metricKey],clean=values.filter(Number.isFinite);if(!clean.length)return NaN;if(m.aggregation==='rms')return rms(clean);if(m.aggregation==='fisher')return fisher(clean);return mean(clean)}
  aggregateValue(opts){const metric=opts.metrics?.[0],vals=this.windowRows(opts).map(r=>r.value);return metric?this.aggregateMetricValues(vals,metric):mean(vals)}
  aggregateCompleteness(opts){return mean(this.windowRows(opts).map(r=>r.completeness))}
  aggregateSamples(opts){return this.windowRows(opts).reduce((s,r)=>s+r.sample_count,0)}
  relativeSkill(value,baseline,metricKey){
    const m=CONFIG.metrics[metricKey];if(!Number.isFinite(value)||!Number.isFinite(baseline))return NaN;
    if(m.direction==='higher')return((value-baseline)/Math.max(Math.abs(baseline),1e-6))*100;
    if(m.direction==='lower')return((baseline-value)/Math.max(Math.abs(baseline),1e-6))*100;
    const target=m.target??0,a=Math.abs(value-target),b=Math.abs(baseline-target);
    const floor=m.scorecard?.neutralDeviation?m.scorecard.neutralDeviation*.35:0.1;
    return((b-a)/Math.max(b,floor))*100;
  }
  comparisonPairs({model,baseline,metric,region,leads,comparisonMode='date_lead',...window}){
    // Both modes require identical UTC valid dates, forecast leads, region and metric.
    // MET -obtype is source metadata; mismatches must be exposed, not silently discarded.
    // Strict mode additionally requires matching, nonblank verification-source labels.
    const rows=this.windowRows({...window,region,models:[model,baseline],metrics:[metric],leads});
    const byKey=new Map();
    for(const r of rows){
      const k=`${r.valid_date.getTime()}|${r.forecast_hour}`;
      if(!byKey.has(k))byKey.set(k,new Map());
      byKey.get(k).set(r.model,r);
    }
    const pairs=[];let differingSources=0,unknownSources=0,temporalPairs=0;
    for(const group of byKey.values()){
      const a=group.get(model),b=group.get(baseline);
      if(!a||!b)continue;
      temporalPairs++;
      const srcA=(a.verification_source||'').trim().toUpperCase();
      const srcB=(b.verification_source||'').trim().toUpperCase();
      if(!srcA||!srcB)unknownSources++;
      else if(srcA!==srcB)differingSources++;
      if(comparisonMode==='same_source'&&(!srcA||srcA!==srcB))continue;
      pairs.push([a,b]);
    }
    return {pairs,temporalPairs,differingSources,unknownSources};
  }
  skillFor({model,baseline,metric,region,leads,comparisonMode='date_lead',...window}){
    const {pairs}=this.comparisonPairs({model,baseline,metric,region,leads,comparisonMode,...window});
    if(!pairs.length)return NaN;
    const v=this.aggregateMetricValues(pairs.map(p=>p[0].value),metric);
    const b=this.aggregateMetricValues(pairs.map(p=>p[1].value),metric);
    return this.relativeSkill(v,b,metric);
  }
  coverageByModel({metric,region,baseline='GFS',models=Object.keys(CONFIG.modelMeta),lead=null,comparisonMode='date_lead',...window}){
    const rows=this.windowRows({...window,region,models,metrics:[metric]});
    const byModel=new Map(models.map(m=>[m,[]]));
    for(const row of rows)if(byModel.has(row.model))byModel.get(row.model).push(row);
    return models.map(model=>{
      const all=byModel.get(model)||[];
      const selected=lead==null?all:all.filter(row=>row.forecast_hour===Number(lead));
      const maxLead=all.length?Math.max(...all.map(row=>row.forecast_hour)):null;
      const {pairs,temporalPairs,differingSources,unknownSources}=this.comparisonPairs({model,baseline,metric,region,
          leads:lead==null?null:[lead],comparisonMode,...window});
      const sources=[...new Set(selected.map(row=>row.verification_source||'(unspecified)'))].sort();
      return {model,records:selected.length,dates:new Set(selected.map(row=>dateKey(row.valid_date))).size,
        maxLead,sources,matchedPairs:pairs.length,temporalPairs,differingSources,unknownSources};
    });
  }
  compositeSkill({model,baseline,region,metrics,...window}){const vals=(metrics||metricKeys()).map(metric=>this.skillFor({...window,model,baseline,metric,region})).filter(Number.isFinite);return mean(vals)}
  verificationMetadata({metric}){const m=CONFIG.metrics[metric],v=m?CONFIG.variables[m.variable]:null;return m&&v?{obs_source:v.obsSource,variable:v.label,level:v.level,metric_type:m.metricType}:null}
  valueByLead({model,metric,region,...window}){return CONFIG.leads.map(lead=>({lead,value:this.aggregateValue({...window,region,models:[model],metrics:[metric],leads:[lead]})})).filter(d=>Number.isFinite(d.value))}
  skillByLead({model,baseline,metric,region,...window}){return CONFIG.leads.map(lead=>{return{lead,value:this.skillFor({...window,model,baseline,metric,region,leads:[lead]})}}).filter(d=>Number.isFinite(d.value))}
  dailyValueSeries({model,metric,region,lead=null,...window}){
    const leads=lead==null?null:[lead],rows=this.windowRows({...window,region,models:[model],metrics:[metric],leads}),byDate=new Map();
    for(const row of rows){const k=dateKey(row.valid_date);if(!byDate.has(k))byDate.set(k,[]);byDate.get(k).push(row.value)}
    const {start,end}=this.resolveWindow(window),out=[];
    for(let date=new Date(start);date<=end;date.setUTCDate(date.getUTCDate()+1)){const vals=byDate.get(dateKey(date));if(vals?.length){const value=this.aggregateMetricValues(vals,metric);if(Number.isFinite(value))out.push({date:new Date(date),value})}}
    return out;
  }
  periodChange({model,metric,region,lead=null,days=15}){
    const currentEnd=new Date(this.latestDate),current=this.aggregateValue({days,region,models:[model],metrics:[metric],leads:lead==null?null:[lead],endDate:currentEnd});
    const priorEnd=new Date(currentEnd);priorEnd.setUTCDate(priorEnd.getUTCDate()-days);
    const prior=this.aggregateValue({days,region,models:[model],metrics:[metric],leads:lead==null?null:[lead],endDate:priorEnd});
    if(!Number.isFinite(current)||!Number.isFinite(prior))return NaN;
    const m=CONFIG.metrics[metric];if(m.direction==='lower')return((prior-current)/Math.max(Math.abs(prior),1e-6))*100;if(m.direction==='higher')return((current-prior)/Math.max(Math.abs(prior),1e-6))*100;
    const target=m.target??0,now=Math.abs(current-target),old=Math.abs(prior-target),floor=m.scorecard?.neutralDeviation?m.scorecard.neutralDeviation*.35:.1;return((old-now)/Math.max(old,floor))*100;
  }
}
