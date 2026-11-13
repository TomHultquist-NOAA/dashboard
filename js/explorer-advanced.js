// Exploratory analyses of matched DAILY REGIONAL summary scores — not event-level verification.
// These functions never synthesize observations or fill missing date/lead combinations.
import {CONFIG} from './config.js?v=1.3.2';
import {pairedRows,advantage,quantile} from './explorer-analytics.js?v=1.3.9';
const DAY=86400000;
const mean=v=>v.length?v.reduce((a,b)=>a+b,0)/v.length:NaN;
const dateKey=d=>d.toISOString().slice(0,10);
export function leadEnvelope(ds,{model,baseline,metric,region,...window}){
 const leads=CONFIG.leads.map(lead=>{
   const pairs=pairedRows(ds,{model,baseline,metric,region,lead,...window}).filter(p=>Number.isFinite(p.advantage));
   const sorted=pairs.map(p=>p.advantage).sort((a,b)=>a-b);
   return {lead,n:sorted.length,q10:quantile(sorted,.1),median:quantile(sorted,.5),q90:quantile(sorted,.9),
     wins:pairs.filter(p=>p.advantage>0).length,losses:pairs.filter(p=>p.advantage<0).length,
     ties:pairs.filter(p=>p.advantage===0).length,
     mismatch:pairs.filter(p=>p.mismatch).length,unknown:pairs.filter(p=>p.unknown).length};
 });
 return {leads,model,baseline,metric,region};
}
// Every row is an independent baseline pair; the separate focus-model control must not override it.
export function winningFrequency(ds,{models,baseline,metric,region,lead,...window}){
 const points=[...new Set(models)].filter(m=>m!==baseline&&CONFIG.modelMeta[m]).map(model=>{
   const pairs=pairedRows(ds,{...window,model,baseline,metric,region,lead}).filter(p=>Number.isFinite(p.advantage));
   const wins=pairs.filter(p=>p.advantage>0).length,ties=pairs.filter(p=>p.advantage===0).length;
   return {model,n:pairs.length,meanAdvantage:mean(pairs.map(p=>p.advantage)),winRate:pairs.length?100*(wins+ties*.5)/pairs.length:NaN,
     wins,ties,losses:pairs.length-wins-ties,mismatch:pairs.filter(p=>p.mismatch).length,unknown:pairs.filter(p=>p.unknown).length};
 }).filter(p=>p.n>0);
 return {points,metric,region,baseline,lead};
}

// Avoid sparse, trivial scatterplots. This is a VISUAL PRESENTATION heuristic,
// not a significance criterion or an observational sample-size claim.
export function comparisonDisplayFloor(calendarDays){
 return Math.max(3,Math.min(21,Math.ceil(Math.max(0,calendarDays)/2)));
}
export function chooseWinFrequencyPresentation(points,calendarDays){
 const floor=comparisonDisplayFloor(calendarDays),eligible=points.filter(p=>p.n>=floor);
 // A paired model-by-model display keeps near-identical points legible. The
 // sample guide is advisory: it never hides an observed result or its export.
 return {mode:points.length?'paired':'empty',eligible,limited:points.filter(p=>p.n<floor),floor};
}
export function chooseTradeoffPresentation(result,calendarDays){
 const floor=comparisonDisplayFloor(calendarDays),points=result.points||[],frontier=points.filter(p=>p.frontier);
 const reasons=[];
 if(result.commonDates<floor)reasons.push(`limited common-date coverage: ${result.commonDates} days (display guide ${floor})`);
 if(points.length>=2&&frontier.length===1)reasons.push(`${frontier[0].model} is the sole non-dominated model`);
 // A dominant model does not invalidate the real two-metric scatter. Never
 // disable a valid graphic merely because its Pareto frontier has one point.
 return {mode:!points.length?'empty':points.length===1?'profile':'scatter',floor,frontier,reasons};
}
function sourceStatus(rows){const sources=rows.map(r=>(r.verification_source||'').trim().toUpperCase());return {mismatch:new Set(sources.filter(Boolean)).size>1,unknown:sources.some(s=>!s)}}
// All plotted models share IDENTICAL verification dates for both metrics and the baseline.
// No marker is eligible unless all four model/baseline metric values exist on the same day.
export function metricTradeoffs(ds,{models,baseline,metricX,metricY,region,lead,...window}){
 if(!CONFIG.metrics[metricX]||!CONFIG.metrics[metricY]||metricX===metricY)return {points:[],commonDates:0,excluded:[],reason:'Choose two different available metrics.'};
 const wanted=[...new Set([baseline,...models])].filter(m=>CONFIG.modelMeta[m]);
 const rows=ds.windowRows({models:wanted,metrics:[metricX,metricY],region,leads:[lead],...window});
 const byDate=new Map();
 for(const r of rows){const key=dateKey(r.valid_date);if(!byDate.has(key))byDate.set(key,new Map());byDate.get(key).set(`${r.model}|${r.metric}`,r)}
 const candidates=wanted.filter(m=>m!==baseline);
 let eligible=candidates.filter(m=>[...byDate.values()].some(g=>[metricX,metricY].every(k=>g.has(`${m}|${k}`)&&g.has(`${baseline}|${k}`))));
 const excluded=candidates.filter(m=>!eligible.includes(m));
 const omittedForOverlap=[];
 // A single short/disjoint model must not suppress every otherwise valid
 // cross-metric comparison. Keep the largest practical shared-date cohort,
 // explicitly noting dropped models; all RETAINED points still use identical
 // dates for both metrics and their baseline.
 const pairedDays=m=>[...byDate.values()].filter(g=>[metricX,metricY].every(k=>g.has(`${m}|${k}`)&&g.has(`${baseline}|${k}`))).length;
 let keys=[];
 while(eligible.length){
   keys=[...byDate.entries()].filter(([,g])=>[baseline,...eligible].every(m=>[metricX,metricY].every(k=>g.has(`${m}|${k}`))));
   if(keys.length||eligible.length===1)break;
   const drop=[...eligible].sort((a,b)=>pairedDays(a)-pairedDays(b)||a.localeCompare(b))[0];
   omittedForOverlap.push(drop);excluded.push(drop);eligible=eligible.filter(m=>m!==drop);
 }
 const points=eligible.map(model=>{
   const sX=[],sBX=[],sY=[],sBY=[];let mismatch=0,unknown=0;
   for(const [,g] of keys){const mx=g.get(`${model}|${metricX}`),bx=g.get(`${baseline}|${metricX}`),my=g.get(`${model}|${metricY}`),by=g.get(`${baseline}|${metricY}`);
     sX.push(mx.value);sBX.push(bx.value);sY.push(my.value);sBY.push(by.value);
     const status=sourceStatus([mx,bx,my,by]);if(status.mismatch)mismatch++;if(status.unknown)unknown++;
   }
   const x=ds.relativeSkill(ds.aggregateMetricValues(sX,metricX),ds.aggregateMetricValues(sBX,metricX),metricX);
   const y=ds.relativeSkill(ds.aggregateMetricValues(sY,metricY),ds.aggregateMetricValues(sBY,metricY),metricY);
   return {model,x,y,n:keys.length,mismatch,unknown,frontier:false};
 }).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.n>0);
 for(const p of points)p.frontier=!points.some(q=>q!==p&&q.x>=p.x-1e-10&&q.y>=p.y-1e-10&&(q.x>p.x+1e-10||q.y>p.y+1e-10));
 return {points,commonDates:keys.length,excluded,omittedForOverlap,metricX,metricY,region,lead,baseline,reason:!keys.length?'No dates shared by the selected eligible models, baseline and both metrics. Select fewer models or change the lead.':null};
}
function seedFromPairs(pairs){let v=2166136261;for(const p of pairs){for(const c of `${p.date}:${p.lead}:${p.advantage.toPrecision(11)}`){v=Math.imul(v^c.charCodeAt(0),16777619)>>>0}}return v||1}
function rng(seed){let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
export function blockBootstrap(ds,{model,baseline,metric,region,lead,blockDays=7,reps=800,...window}){
 const pairs=pairedRows(ds,{model,baseline,metric,region,lead,...window}).filter(p=>Number.isFinite(p.advantage)).sort((a,b)=>a.time-b.time);
 const lookup=new Map(pairs.map(p=>[p.date,p])),start=ds.resolveWindow(window).start,end=ds.resolveWindow(window).end;
 const calendar=[];for(let t=start.getTime();t<=end.getTime();t+=DAY)calendar.push(lookup.get(dateKey(new Date(t)))?.advantage??null);
 const n=pairs.length,observed=mean(pairs.map(p=>p.advantage)),missing=calendar.length-n;
 // This is a date-wise descriptive sensitivity interval, NOT event-sample confidence.
 if(n<21||calendar.length<21)return {n,observed,missing,blockDays,reps:0,replicates:[],lower:NaN,upper:NaN,positiveFraction:NaN,
   mismatch:pairs.filter(p=>p.mismatch).length,unknown:pairs.filter(p=>p.unknown).length,reason:'At least 21 matched verification dates are required for the exploratory block bootstrap.'};
 const random=rng(seedFromPairs(pairs)),draws=[];const L=calendar.length;
 for(let b=0;b<reps;b++){
   let tot=0,count=0,drawn=0;
   while(drawn<L){const startIndex=Math.floor(random()*L);
     for(let j=0;j<blockDays&&drawn<L;j++,drawn++){const value=calendar[(startIndex+j)%L];if(Number.isFinite(value)){tot+=value;count++}}
   }
   if(count>=Math.max(10,Math.ceil(n*.45)))draws.push(tot/count);
 }
 draws.sort((a,b)=>a-b);
 return {n,observed,missing,blockDays,reps:draws.length,replicates:draws,lower:quantile(draws,.025),upper:quantile(draws,.975),
   positiveFraction:draws.length?draws.filter(x=>x>0).length/draws.length:NaN,
   mismatch:pairs.filter(p=>p.mismatch).length,unknown:pairs.filter(p=>p.unknown).length,
   reason:draws.length<Math.ceil(.9*reps)?'Insufficient valid resamples under the selected calendar-day coverage.':null};
}
