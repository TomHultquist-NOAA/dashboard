// EVS-style paired-difference 95% confidence intervals by forecast hour.
// Reference: NOAA-EMC/EVS ush/global_det/global_det_atmos_plots_lead_average.py
// The source computes the population SD of matched daily differences and
// multiplies SD / sqrt(n - 1) by a fixed sample-size-dependent factor.
// These intervals are calculated from the dashboard's daily regional summary
// values; they are not the original forecast/observation event samples.
import { CONFIG } from './config.js?v=1.1.8';

export const SIGNIFICANCE_METHOD=Object.freeze({confidence:0.95,minPairedDates:2});

export function evs95DifferenceCI(differences){
  const values=differences.filter(Number.isFinite),n=values.length;
  if(n<2)return null;
  const mean=values.reduce((s,v)=>s+v,0)/n;
  const populationSd=Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/n);
  // Match the published EVS plotting routine's piecewise constants exactly.
  const factor=n>=80?1.960:n>=40?2.000:n>=20?2.042:2.228;
  const halfHeight=factor*populationSd/Math.sqrt(n-1);
  return {mean,n,populationSd,factor,halfHeight,lower:mean-halfHeight,upper:mean+halfHeight,
    significant:Math.abs(mean)>halfHeight};
}

export function buildEvsDifferenceSeries(data,{models,baseline,metric,region,comparisonMode='date_lead',...window}){
  const nonbaseline=models.filter(model=>model!==baseline),series=[],boxes=[];
  let comparisons=0,insufficient=0,significant=0;
  for(const model of nonbaseline){
    const points=[];
    for(const lead of CONFIG.leads){
      const {pairs}=data.comparisonPairs({model,baseline,metric,region,leads:[lead],comparisonMode,...window});
      const differences=pairs.map(([modelRow,baseRow])=>modelRow.value-baseRow.value).filter(Number.isFinite);
      if(!differences.length){insufficient++;continue}
      const mean=differences.reduce((s,v)=>s+v,0)/differences.length;
      points.push({lead,x:lead/24,y:mean,n:differences.length});
      const interval=evs95DifferenceCI(differences);
      if(interval){
        // EVS draws model-colored outlined bars at x=lead, centered on y=0.
        // Narrower overlapping outlines allow multiple models to remain visible.
        const index=nonbaseline.indexOf(model);
        boxes.push({x:lead/24,model,halfHeight:interval.halfHeight,
          width:Math.max(.15,.75-index*.11),n:interval.n,meanDifference:mean,
          significant:interval.significant});
        comparisons++;if(interval.significant)significant++;
      }else insufficient++;
    }
    series.push({model,points});
  }
  return {series,boxes,comparisons,significant,insufficient};
}
