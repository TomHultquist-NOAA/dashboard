// v1.3.1 diagnostic analyses of archived daily regional SUMMARY statistics.
// These are descriptive comparisons of daily scores, not event detection,
// independent gridpoint samples, significance tests, or uncertainty intervals.
import {CONFIG} from './config.js?v=1.3.2';
import {pairedRows,aggregatePaired,advantage,compareQuality,quantile} from './explorer-analytics.js?v=1.3.2';
const DAY=86400000;
const keyDate=d=>d.toISOString().slice(0,10);
const unique=a=>[...new Set(a)];
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
const weekStart=t=>{const d=new Date(t),dow=d.getUTCDay();d.setUTCDate(d.getUTCDate()-(dow+6)%7);return keyDate(d)};
const validModels=models=>unique((models||[]).filter(m=>CONFIG.modelMeta[m]));
function orderedQuality(a,b,metric){return compareQuality(a,b,metric)}
function rowsByDateLead(ds,{models,metric,region,...window}){
 const map=new Map();const ms=validModels(models);
 for(const row of ds.windowRows({...window,region,models:ms,metrics:[metric],leads:CONFIG.leads})){
   const date=keyDate(row.valid_date),key=`${date}|${row.forecast_hour}`;
   if(!map.has(key))map.set(key,new Map());map.get(key).set(row.model,row);
 }
 return map;
}
const sourceCheck=(rows)=>{
 const src=rows.map(r=>(r.verification_source||'').trim().toUpperCase());
 return {unknown:src.some(x=>!x),mismatch:unique(src.filter(Boolean)).length>1};
};
export function modelLeadership(ds,{models,metric,region,...window}){
 const ms=validModels(models),{start,end}=ds.resolveWindow(window),byKey=rowsByDateLead(ds,{...window,models:ms,metric,region});
 const dates=[];for(let t=start.getTime();t<=end.getTime();t+=DAY)dates.push(keyDate(new Date(t)));
 const cells=new Map(),counts=new Map(CONFIG.leads.map(h=>[h,new Map(ms.map(m=>[m,{wins:0,ties:0,days:0,participations:0}]))]));
 const leadStats=new Map(CONFIG.leads.map(h=>[h,{days:0,minModels:Infinity,maxModels:0,modelPools:new Set()}]));
 let valid=0,ties=0,miss=0,mismatches=0,unknown=0;
 for(const date of dates)for(const lead of CONFIG.leads){
   const rows=byKey.get(`${date}|${lead}`);
   // Compare all currently available selected models, not an artificially fixed
   // seven-model pool that disappears after the shortest model's final lead.
   const participants=rows?ms.filter(m=>rows.has(m)).map(m=>rows.get(m)):[];
   if(participants.length<2){miss++;continue}
   const participatingModels=participants.map(r=>r.model),missingModels=ms.filter(m=>!rows.has(m)),src=sourceCheck(participants);
   // Pairwise comparison respects the metric's higher/lower/target definition.
   const ranked=participants.slice().sort((a,b)=>-orderedQuality(a.value,b.value,metric));
   const winners=ranked.filter(r=>orderedQuality(r.value,ranked[0].value,metric)===0).map(r=>r.model);
   const runner=ranked.find(r=>!winners.includes(r.model));
   const margin=winners.length>1?0:(runner?advantage(ranked[0].value,runner.value,metric):0);
   const cell={date,lead,leader:winners.length===1?winners[0]:null,winners,runner:runner?.model||null,margin,
     score:ranked[0].value,runnerScore:runner?.value??NaN,participants:participants.length,
     participatingModels,missingModels,...src};
   cells.set(`${date}|${lead}`,cell);valid++;if(winners.length>1)ties++;if(src.mismatch)mismatches++;if(src.unknown)unknown++;
   const ls=leadStats.get(lead);ls.days++;ls.minModels=Math.min(ls.minModels,participants.length);
   ls.maxModels=Math.max(ls.maxModels,participants.length);ls.modelPools.add(participatingModels.join(', '));
   for(const m of ms){const item=counts.get(lead).get(m);item.days++;
     if(participatingModels.includes(m))item.participations++;
     if(winners.includes(m))item.wins+=1/winners.length;
     if(winners.includes(m)&&winners.length>1)item.ties++}
 }
 return {dates,leads:CONFIG.leads,cells,models:ms,counts,leadStats,valid,ties,missing:miss,mismatches,unknown};
}
export function caseFinder(ds,{model,baseline,metric,region,lead,mode='best',limit=10,...window}){
 const pairs=pairedRows(ds,{model,baseline,metric,region,lead,...window}).filter(p=>Number.isFinite(p.advantage));
 let ordered;
 if(mode==='worst')ordered=pairs.slice().sort((a,b)=>a.advantage-b.advantage);
 else if(mode==='reversal'){
   ordered=pairs.slice().sort((a,b)=>a.time-b.time).map((p,i,arr)=>({...p,change:i&&p.time-arr[i-1].time===DAY?p.advantage-arr[i-1].advantage:NaN,
       previous:i&&p.time-arr[i-1].time===DAY?arr[i-1].date:null})).filter(x=>Number.isFinite(x.change))
       .sort((a,b)=>Math.abs(b.change)-Math.abs(a.change));
 }else ordered=pairs.slice().sort((a,b)=>b.advantage-a.advantage);
 return {pairs,items:ordered.slice(0,limit),mode,n:pairs.length,mismatched:pairs.filter(p=>p.mismatch).length,unknown:pairs.filter(p=>p.unknown).length};
}
export function pairedScatter(ds,{model,baseline,metric,region,lead,...window}){
 const pairs=pairedRows(ds,{model,baseline,metric,region,lead,...window}).filter(p=>Number.isFinite(p.advantage));
 return {pairs,model,baseline,n:pairs.length,wins:pairs.filter(p=>p.advantage>0).length,
  losses:pairs.filter(p=>p.advantage<0).length,ties:pairs.filter(p=>p.advantage===0).length,
  mismatch:pairs.filter(p=>p.mismatch).length,unknown:pairs.filter(p=>p.unknown).length};
}
const BIAS_PAIRS={T2M:['T2M_BIAS','T2M_RMSE'],T850:['T850_BIAS','T850_RMSE'],H500:['H500_BIAS','H500_RMSE'],MSLP:['MSLP_BIAS','MSLP_RMSE']};
export const diagnosticVariables=Object.keys(BIAS_PAIRS);
export function biasMetricPair(variable){return BIAS_PAIRS[variable]||BIAS_PAIRS.H500}
export function biasEvolution(ds,{model,region,variable,...window}){
 const [metric]=biasMetricPair(variable),{start,end}=ds.resolveWindow(window);
 const dates=[];for(let t=start.getTime();t<=end.getTime();t+=DAY)dates.push(keyDate(new Date(t)));
 const rows=ds.windowRows({...window,region,models:[model],metrics:[metric],leads:CONFIG.leads});
 const cells=new Map(rows.map(r=>[`${keyDate(r.valid_date)}|${r.forecast_hour}`,{date:keyDate(r.valid_date),lead:r.forecast_hour,value:r.value,source:r.verification_source||''}]));
 const absValues=[...cells.values()].map(c=>Math.abs(c.value)).sort((a,b)=>a-b);
 // A robust shared symmetric limit avoids one outlier masking all other days.
 const scale=absValues.length?Math.max(1e-9,quantile(absValues,.95)):1;
 return {dates,leads:CONFIG.leads,cells,scale,metric,model};
}
export function errorPortrait(ds,{models,region,variable,...window}){
 const [biasMetric,rmseMetric]=biasMetricPair(variable),ms=validModels(models);
 const rows=ds.windowRows({...window,region,models:ms,metrics:[biasMetric,rmseMetric],leads:CONFIG.leads});
 const byKey=new Map();
 for(const r of rows){const key=`${r.model}|${r.forecast_hour}|${keyDate(r.valid_date)}`;
  if(!byKey.has(key))byKey.set(key,{});byKey.get(key)[r.metric]=r;
 }
 const groups=ms.map(model=>{
   const points=[];
   for(const lead of CONFIG.leads){const matched=[];
     for(const pair of byKey.values())if(pair[biasMetric]?.model===model&&pair[biasMetric]?.forecast_hour===lead&&pair[rmseMetric])matched.push(pair);
     if(!matched.length)continue;
     const b=ds.aggregateMetricValues(matched.map(p=>p[biasMetric].value),biasMetric);
     const rmse=ds.aggregateMetricValues(matched.map(p=>p[rmseMetric].value),rmseMetric);
     const inconsistent=matched.filter(p=>{
       const s1=(p[biasMetric].verification_source||'').trim().toUpperCase(),s2=(p[rmseMetric].verification_source||'').trim().toUpperCase();
       return s1&&s2&&s1!==s2;
     }).length;
     points.push({lead,bias:b,absBias:Math.abs(b),rmse,n:matched.length,inconsistent,
       unknown:matched.filter(p=>!p[biasMetric].verification_source||!p[rmseMetric].verification_source).length});
   }
   return {model,points};
 });
 return {groups,biasMetric,rmseMetric,region,variable};
}
export function weekSensitivity(ds,{model,baseline,metric,region,lead,...window}){
 const pairs=pairedRows(ds,{...window,model,baseline,metric,region,lead}).filter(p=>Number.isFinite(p.advantage));
 const full=aggregatePaired(ds,pairs,metric);
 const weeks=unique(pairs.map(p=>weekStart(p.time))).sort();
 const analyses=weeks.map(week=>{
   const removed=pairs.filter(p=>weekStart(p.time)===week),kept=pairs.filter(p=>weekStart(p.time)!==week);
   const subset=aggregatePaired(ds,kept,metric);
   return {week,removed:removed.length,kept:kept.length,skill:kept.length>=3&&weeks.length>=2?subset.skill:NaN,
     delta:subset.skill-full.skill,changedSign:Number.isFinite(full.skill)&&Number.isFinite(subset.skill)&&Math.sign(full.skill)!==Math.sign(subset.skill)&&Math.sign(full.skill)!==0};
 });
 return {full,analyses,n:pairs.length,weeks:weeks.length,mismatched:full.mismatched,unknown:full.unknown};
}
export function comparisonCoverage(ds,{model,baseline,metric,region,lead,...window}){
 const {start,end}=ds.resolveWindow(window),days=Math.max(0,Math.round((end-start)/DAY)+1);
 const pairs=pairedRows(ds,{...window,model,baseline,metric,region,lead});
 return {days,matched:unique(pairs.map(p=>p.date)).length,mismatched:pairs.filter(p=>p.mismatch).length,
  unknown:pairs.filter(p=>p.unknown).length,model,baseline};
}
