// OMD Skill Explorer — only archived daily regional SUMMARY scores are used.
// A 'win' is better daily aggregated score, NOT a forecast-event success rate.
import { CONFIG } from './config.js?v=1.3.2';
const DAY=86400000;
const keyDate=d=>d.toISOString().slice(0,10);
const uniq=a=>[...new Set(a)];
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
const median=a=>{if(!a.length)return NaN;const s=a.slice().sort((a,b)=>a-b);const n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
export function quantile(sorted,q){if(!sorted.length)return NaN;const x=(sorted.length-1)*q,i=Math.floor(x),f=x-i;return sorted[i]+((sorted[i+1]??sorted[i])-sorted[i])*f}
export function advantage(modelValue,baseValue,metric){
 const m=CONFIG.metrics[metric];if(!m||!Number.isFinite(modelValue)||!Number.isFinite(baseValue))return NaN;
 return m.direction==='higher'?modelValue-baseValue:m.direction==='lower'?baseValue-modelValue:Math.abs(baseValue-(m.target??0))-Math.abs(modelValue-(m.target??0));
}
export function compareQuality(a,b,metric){
 const d=advantage(a,b,metric);const scale=Math.max(1,Math.abs(a),Math.abs(b));
 return !Number.isFinite(d)?null:Math.abs(d)<=scale*1e-10?0:d>0?1:-1;
}
export function pairedRows(ds,{model,baseline,metric,region,lead=null,...window}){
 if(!model||!baseline||model===baseline)return [];
 return ds.comparisonPairs({model,baseline,metric,region,leads:lead===null?CONFIG.leads:[Number(lead)],comparisonMode:'date_lead',...window}).pairs
   .map(([a,b])=>({date:keyDate(a.valid_date),time:a.valid_date.getTime(),lead:a.forecast_hour,modelValue:a.value,baseValue:b.value,
     advantage:advantage(a.value,b.value,metric),relative:ds.relativeSkill(a.value,b.value,metric),
     mismatch:!!a.verification_source&&!!b.verification_source&&a.verification_source.trim().toUpperCase()!==b.verification_source.trim().toUpperCase(),
     unknown:!a.verification_source||!b.verification_source}));
}
export function aggregatePaired(ds,pairs,metric){
 if(!pairs.length)return {n:0,skill:NaN,advantage:NaN,mismatched:0,unknown:0,dates:0};
 const a=ds.aggregateMetricValues(pairs.map(p=>p.modelValue),metric),b=ds.aggregateMetricValues(pairs.map(p=>p.baseValue),metric);
 return {n:pairs.length,dates:uniq(pairs.map(p=>p.date)).length,modelValue:a,baseValue:b,
   skill:ds.relativeSkill(a,b,metric),advantage:advantage(a,b,metric),
   mismatched:pairs.filter(p=>p.mismatch).length,unknown:pairs.filter(p=>p.unknown).length};
}
export function fingerprint(ds,opts){
 const {model,baseline,metric,region}=opts, {start,end}=ds.resolveWindow(opts);
 const pairs=pairedRows(ds,{...opts,lead:null});const map=new Map(pairs.map(p=>[`${p.date}|${p.lead}`,p]));
 const dates=[];for(let t=start.getTime();t<=end.getTime();t+=DAY)dates.push(new Date(t).toISOString().slice(0,10));
 return {dates,leads:CONFIG.leads,cells:map,pairs,summary:aggregatePaired(ds,pairs,metric),model,baseline,metric,region};
}
export function headToHead(ds,{models,metric,region,lead,...window}){
 const ms=uniq(models);const rows=ds.windowRows({region,models:ms,metrics:[metric],leads:[Number(lead)],...window});
 const lookup=new Map(ms.map(m=>[m,new Map()]));
 for(const r of rows)lookup.get(r.model)?.set(keyDate(r.valid_date),r);
 const matrix=ms.map(a=>ms.map(b=>{
   if(a===b)return null;
   const left=lookup.get(a),right=lookup.get(b);let wins=0,losses=0,ties=0,different=0,unknown=0;const advantages=[];
   for(const [date,ra] of left){const rb=right.get(date);if(!rb)continue;
     const cmp=compareQuality(ra.value,rb.value,metric);if(cmp===1)wins++;else if(cmp===-1)losses++;else if(cmp===0)ties++;
     advantages.push(advantage(ra.value,rb.value,metric));
     if(!ra.verification_source||!rb.verification_source)unknown++;
     else if(ra.verification_source.trim().toUpperCase()!==rb.verification_source.trim().toUpperCase())different++;
   }
   const n=wins+losses+ties;
   return {wins,losses,ties,n,rate:n?100*(wins+ties*.5)/n:NaN,winRate:n?100*wins/n:NaN,
     advantage:mean(advantages),different,unknown};
 }));
 return {models:ms,matrix,metric,region,lead};
}
export function atlas(ds,{model,baseline,metric,regions=CONFIG.regions,...window}){
 return {regions,leads:CONFIG.leads,metric,model,baseline, cells:regions.map(region=>CONFIG.leads.map(lead=>{
   if(!ds.isRegionLoaded(region))return {n:0,skill:NaN,pending:true};
   return aggregatePaired(ds,pairedRows(ds,{...window,model,baseline,metric,region,lead}),metric);
 }))};
}
// The caller also supplies a separate focus model; each series must retain its own model key.
export function distributions(ds,{models,baseline,metric,region,lead,...window}){
 return models.filter(m=>m!==baseline).map(model=>{
   const pairs=pairedRows(ds,{...window,model,baseline,metric,region,lead}).filter(p=>Number.isFinite(p.advantage));
   const values=pairs.map(p=>p.advantage).sort((a,b)=>a-b);return {model,values,pairs,n:values.length,
     min:values[0],q1:quantile(values,.25),median:median(values),q3:quantile(values,.75),max:values[values.length-1],
     positive:values.filter(x=>x>0).length,negative:values.filter(x=>x<0).length,zero:values.filter(x=>x===0).length};
 });
}
export function rolling(ds,{models,baseline,metric,region,lead,days=7,...window}){
 const {start,end}=ds.resolveWindow(window),xs=[];
 for(let t=start.getTime();t<=end.getTime();t+=DAY)xs.push(t);
 const output=models.filter(m=>m!==baseline).map(model=>{
   const pairs=pairedRows(ds,{...window,model,baseline,metric,region,lead});
   const points=xs.map(t=>{const recent=pairs.filter(p=>p.time>=t-(days-1)*DAY&&p.time<=t);
     const n=uniq(recent.map(p=>p.date)).length,stats=aggregatePaired(ds,recent,metric);
     return {x:t,y:n>=Math.ceil(days/2)?stats.skill:NaN,n,label:`${new Date(t).toISOString().slice(0,10)} · ${n}/${days} matched dates`};
   }).filter(p=>Number.isFinite(p.y));return {model,points};
 });
 return {series:output,xs,days};
}
export function skillHorizon(ds,{models,region,threshold=.8,...window}){
 return models.map(model=>{
   const means=ds.meanValueByLead({model,metric:'H500_ACC',region,...window});
   const byLead=new Map(means.map(d=>[d.lead,d]));
   let result={model,hour:NaN,status:'not-reached',n:0};
   const observed=CONFIG.leads.map(lead=>byLead.get(lead)).filter(Boolean);
   if(!observed.length)return {...result,status:'no-data'};
   if(observed[0].value<threshold)return {...result,status:'before-first',n:observed[0].n};
   if(Math.abs(observed[0].value-threshold)<1e-10)return {...result,hour:observed[0].lead,status:'crossed',n:observed[0].n};
   for(let i=1;i<observed.length;i++){
     const a=observed[i-1],b=observed[i];
     if(a.value>=threshold&&b.value<=threshold){
       if(b.lead-a.lead>24)return {...result,status:'gap',n:Math.min(a.n,b.n)};
       const frac=a.value===b.value?0:(a.value-threshold)/(a.value-b.value);
       return {...result,hour:a.lead+frac*(b.lead-a.lead),status:'crossed',n:Math.min(a.n,b.n)};
     }
   }
   return {...result,status:'beyond-last',n:observed[observed.length-1].n,last:observed[observed.length-1].lead};
 });
}
