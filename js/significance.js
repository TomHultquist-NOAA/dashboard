// EVS-style paired-difference 95% confidence intervals by forecast hour.
// Method: NOAA-EMC/EVS ush/global_det/global_det_atmos_plots_lead_average.py
// This is the ONLY significance calculation used by the dashboard.
// Input observations are the dashboard's daily regional summary values, not
// EVS's matched forecast/observation samples. No legacy block randomization,
// sign-swapping, shared envelope, or 20-date minimum is used.
import { CONFIG } from './config.js?v=1.3.2';

export const SIGNIFICANCE_METHOD=Object.freeze({confidence:0.95,minPairedDates:2});

export function evs95DifferenceCI(differences){
  const values=differences.filter(Number.isFinite),n=values.length;
  if(n<2)return null;
  const mean=values.reduce((sum,value)=>sum+value,0)/n;
  const populationSd=Math.sqrt(values.reduce((sum,value)=>sum+(value-mean)**2,0)/n);
  // Same population SD, denominator and n-dependent factors as the EVS routine.
  const factor=n>=80?1.960:n>=40?2.000:n>=20?2.042:2.228;
  const halfHeight=factor*populationSd/Math.sqrt(n-1);
  return {mean,n,populationSd,factor,halfHeight,lower:mean-halfHeight,upper:mean+halfHeight,
    significant:Math.abs(mean)>halfHeight};
}

// Render the EVS test's zero-centered interval directly over the existing
// percentage-skill plot without creating another chart. The test is run
// *exclusively* on signed raw (model - baseline) paired daily scores, matching
// EVS. A fixed positive baseline-dependent factor only converts the CI
// half-height to the chart's percent units for visualization: it does not
// change the inference or create a separate skill-based significance test.
// For nonlinear aggregates (RMS/Fisher, and target-zero Bias), the percentage
// skill line is not the mean of these raw daily differences. Therefore the
// outline is an approximate reference, NOT a 95% CI for the skill line.
export function buildSkillSignificanceBoxes(data,{models,baseline,metric,region,comparisonMode='date_lead',...window}){
  const config=CONFIG.metrics[metric];
  if(!config)return {boxes:[],comparisons:0,significant:0,insufficient:0};
  const nonbaseline=models.filter(model=>model!==baseline),boxes=[];
  let comparisons=0,significant=0,insufficient=0;
  for(let modelIndex=0;modelIndex<nonbaseline.length;modelIndex++){
    const model=nonbaseline[modelIndex];
    for(const lead of CONFIG.leads){
      const {pairs}=data.comparisonPairs({model,baseline,metric,region,leads:[lead],comparisonMode,...window});
      if(pairs.length<2){insufficient++;continue}
      const rawDifferences=pairs.map(([row,base])=>row.value-base.value);
      const interval=evs95DifferenceCI(rawDifferences);
      if(!interval){insufficient++;continue}
      const baseAggregate=data.aggregateMetricValues(pairs.map(([,base])=>base.value),metric);
      if(!Number.isFinite(baseAggregate)){insufficient++;continue}
      const target=config.target??0;
      const floor=config.scorecard?.neutralDeviation?config.scorecard.neutralDeviation*.35:0.1;
      const denominator=config.direction==='target'
        ?Math.max(Math.abs(baseAggregate-target),floor)
        :Math.max(Math.abs(baseAggregate),1e-6);
      const displayedHalfHeight=100*interval.halfHeight/denominator;
      if(!Number.isFinite(displayedHalfHeight)){insufficient++;continue}
      boxes.push({x:lead/24,model,n:interval.n,halfHeight:displayedHalfHeight,
        width:Math.max(.15,.75-modelIndex*.11),
        rawHalfHeight:interval.halfHeight,rawMean:interval.mean,
        rawUnit:config.unit?.trim()||'',significant:interval.significant});
      comparisons++;
      if(interval.significant)significant++;
    }
  }
  return {boxes,comparisons,significant,insufficient};
}
