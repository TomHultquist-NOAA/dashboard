// Exploratory, pointwise paired randomization thresholds for Skill vs Lead.
// Daily regional summary scores are NOT independent spatial forecast-observation
// pairs. Swap whole three-day blocks to partially preserve serial dependence;
// never label these estimates as official EVS/MET significance results.
export const SIGNIFICANCE_METHOD = Object.freeze({
  minPairedDates:20, blockDays:3, replicates:499, confidence:0.95
});

function seededRandom(seed){
  let x=seed>>>0||0x9e3779b9;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296};
}
function quantile(sorted,q){
  if(!sorted.length)return NaN;
  const i=(sorted.length-1)*q,lo=Math.floor(i),hi=Math.ceil(i);
  return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);
}
function uniqueDayCount(pairs){return new Set(pairs.map(p=>p[0].valid_date.getTime())).size}

// Compute a null threshold using model/baseline swaps within nonoverlapping
// three-day verification blocks. The skill statistic is recalculated with the
// same nonlinear RMSE or ACC aggregation used for the displayed model trace.
export function pairedNullThreshold(data,{model,baseline,metric,region,lead,comparisonMode='date_lead',...window},settings=SIGNIFICANCE_METHOD){
  if(model===baseline)return null;
  const {pairs}=data.comparisonPairs({model,baseline,metric,region,leads:[lead],comparisonMode,...window});
  const ordered=pairs.slice().sort((a,b)=>a[0].valid_date-b[0].valid_date);
  const days=uniqueDayCount(ordered);
  if(days<settings.minPairedDates)return null;
  const blockStarts=ordered.map(p=>Math.floor(p[0].valid_date.getTime()/86400000/settings.blockDays));
  const blockIds=[...new Set(blockStarts)],random=seededRandom((lead*2654435761+days*40503+model.split('').reduce((v,c)=>v*31+c.charCodeAt(0),7))>>>0);
  if(blockIds.length<Math.ceil(settings.minPairedDates/settings.blockDays))return null;
  const nullValues=[];
  for(let rep=0;rep<settings.replicates;rep++){
    const swaps=new Map(blockIds.map(id=>[id,random()<.5]));
    const modelValues=[],baseValues=[];
    ordered.forEach(([a,b],i)=>{
      const swap=swaps.get(blockStarts[i]);
      modelValues.push(swap?b.value:a.value);
      baseValues.push(swap?a.value:b.value);
    });
    const m=data.aggregateMetricValues(modelValues,metric),b=data.aggregateMetricValues(baseValues,metric);
    const value=data.relativeSkill(m,b,metric);
    if(Number.isFinite(value))nullValues.push(Math.abs(value));
  }
  if(nullValues.length<Math.max(100,Math.floor(settings.replicates*.8)))return null;
  nullValues.sort((a,b)=>a-b);
  return {threshold:quantile(nullValues,settings.confidence),pairedDates:days};
}

// A single neutral box per lead is a conservative envelope: the largest
// individual-model threshold at that lead. Outside => beyond the estimated
// 95% null threshold for that model; inside does NOT rule out significance.
export function buildSignificanceBoxes(data,{models,baseline,metric,region,comparisonMode,...window},settings=SIGNIFICANCE_METHOD){
  const leads=[...Array(16)].map((_,i)=>i*24),boxes=[];
  let comparisons=0,insufficient=0;
  for(const lead of leads){
    const limits=[];
    for(const model of models){
      if(model===baseline)continue;
      const result=pairedNullThreshold(data,{model,baseline,metric,region,lead,comparisonMode,...window},settings);
      if(result){limits.push(result);comparisons++}else insufficient++;
    }
    if(limits.length){
      boxes.push({x:lead/24,halfHeight:Math.max(...limits.map(r=>r.threshold)),nModels:limits.length,
        minPairedDates:Math.min(...limits.map(r=>r.pairedDates))});
    }
  }
  return {boxes,comparisons,insufficient};
}
