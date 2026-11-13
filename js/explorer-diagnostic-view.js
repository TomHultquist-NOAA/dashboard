// v1.3.1: diagnostic graphics, using direct-canvas-safe SVG primitives.
import {CONFIG} from './config.js?v=1.3.2';
import {skillFill,bindInfo} from './explorer-view.js?v=1.3.9';
import {modelLeadership,caseFinder,pairedScatter,biasEvolution,errorPortrait,weekSensitivity,comparisonCoverage,biasMetricPair} from './explorer-diagnostics.js?v=1.3.7';
const $=id=>document.getElementById(id);
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=()=>document.documentElement.dataset.theme==='light'?{bg:'#fff',fg:'#263950',muted:'#586d86',grid:'#dce3ec',empty:'#e6eaf0',zero:'#bdc6d2'}:{bg:'#142236',fg:'#e5effc',muted:'#a5bbd2',grid:'#3b4b60',empty:'#344355',zero:'#65748a'};
const fmt=(v,d=3)=>Number.isFinite(v)?`${v>0?'+':''}${v.toFixed(d)}`:'N/A';
const fixed=(v,d=2)=>Number.isFinite(v)?v.toFixed(d):'N/A';
const labelMetric=(metric,value)=>Number.isFinite(value)?`${fixed(value,CONFIG.metrics[metric]?.decimals??2)}${CONFIG.metrics[metric]?.unit||''}`:'N/A';
const noData=(id,msg)=>{$(id).innerHTML=`<div class="explorer-empty">${escape(msg)}</div>`};
const text=(x,y,value,{size=12,color=t().fg,anchor='start',weight=400}={})=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}">${escape(value)}</text>`;
const rect=(x,y,w,h,fill,rx=2,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const line=(x1,y1,x2,y2,color=t().grid,width=1,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const circ=(x,y,r,fill,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
const svg=(w,h,content,label)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escape(label)}" style="font-family:Inter,Segoe UI,Arial,sans-serif">${rect(0,0,w,h,t().bg,0)}${content}</svg>`;
const readableOn=(fill)=>{
 const rgb=fill.match(/\d+/g)?.map(Number);
 if(!rgb||rgb.length<3)return t().fg;
 return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>151?'#12253a':'#fff';
};
const modelColor=model=>CONFIG.modelMeta[model]?.color||t().fg;
const darkGfs=model=>model==='GFS'&&document.documentElement.dataset.theme!=='light';
const attr=d=>`data-info="${escape((d.title||'')+' · '+(d.context||''))}" data-detail="${escape(JSON.stringify(d))}" aria-label="${escape((d.title||'')+' · '+(d.context||''))}"`;
const detail=(title,context,rows,foot='',warning='')=>({title,context,rows,foot,warning});
const cell=(x,y,w,h,fill,d,extra='',border='')=>`<g role="img" tabindex="0" class="explorer-cell" ${attr(d)} ${extra}>${rect(x,y,w,h,fill,3,border)}</g>`;
const bind=(id)=>bindInfo(id,{floating:true,structured:'diagnostic'});
const updateSummary=(id,msg)=>{$(id).textContent=msg};
const sourceWarning=(x)=>[x.mismatch?'Different verification sources':'',x.unknown?'Unspecified verification source':''].filter(Boolean).join(' · ');
function datePairDetail(p,model,baseline,metric,lead){return detail(`${model} vs ${baseline}`,`${p.date} · F${lead} · ${CONFIG.metrics[metric].label}`,[
 ['Model score',labelMetric(metric,p.modelValue)],['Baseline score',labelMetric(metric,p.baseValue)],['Native-unit advantage',fmt(p.advantage,5)],['Relative skill',fmt(p.relative,2)+'%']],
 'Positive advantage = better daily regional summary score',sourceWarning(p));}
function attachSelection(hostId,onSelect){
 const host=$(hostId);host.onclick=e=>{const el=e.target.closest('[data-date]');if(el)onSelect(el.dataset.date,Number(el.dataset.lead)||0)};
 host.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-date]')){e.preventDefault();e.target.closest('[data-date]').dispatchEvent(new MouseEvent('click',{bubbles:true}))}};
}
export function renderLeadership(ds,opts,selectedDate,onSelect){
 const {metric,region}=opts,result=modelLeadership(ds,opts),{dates,leads,models,cells}=result;
 if(models.length<2){noData('explore-leadership-plot','Select at least two models in “Models in comparison”.');return}
 const left=98,cw=43,top=50,ch=18,extra=132,w=left+leads.length*cw+26,h=top+dates.length*ch+extra,fg=t().fg;let body='';
 leads.forEach((lead,j)=>body+=text(left+j*cw+20,34,`D${lead/24}`,{size:11,color:t().muted,anchor:'middle'}));
 dates.slice().reverse().forEach((date,i)=>{const y=top+i*ch;
   if(i%5===0||i===dates.length-1)body+=text(10,y+12,date.slice(5),{size:10,color:t().muted});
   leads.forEach((lead,j)=>{
     const item=cells.get(`${date}|${lead}`),fill=!item?t().empty:item.leader?modelColor(item.leader):t().zero;
     const rows=item?[['Leader',item.leader||`Tie: ${item.winners.join(', ')}`],['Runner-up',item.runner||'N/A'],['Lead margin',labelMetric(metric,item.margin)],['Models compared',`${item.participants} of ${models.length}`],['Participating',item.participatingModels.join(', ')],['Unavailable',item.missingModels.join(', ')||'None'],['Winning score',labelMetric(metric,item.score)]]:[['Availability','N/A — fewer than two selected models have data'],['Selected models',String(models.length)]];
     const d=detail(item?.leader||'No unique leader',`${date} · F${lead} · ${region}`,rows,'Only models with data for this date/lead participate; model availability varies with lead.',item?sourceWarning(item):'');
     body+=cell(left+j*cw,y,40,15,fill,d,item?`data-date="${date}" data-lead="${lead}"`:'',item&&darkGfs(item.leader)?'stroke="#f3f8ff" stroke-width="1"':'');
     if(date===selectedDate)body+=rect(left+j*cw,y+14,40,1.5,'#f8c15c',0);
   });
 });
 const ly=top+dates.length*ch+18;
 body+=text(12,ly,'Share of first-place finishes by lead (2+ available models)',{size:11,color:fg,weight:700});
 leads.forEach((lead,j)=>{
   const counts=result.counts.get(lead),ls=result.leadStats.get(lead),samples=ls?.days||0;
   const bx=left+j*cw,by=ly+10;
   let frac=0;
   for(const model of models){const win=counts.get(model)?.wins||0;if(!samples||win<=0)continue;
     const part=win/samples,height=24*part;
     body+=rect(bx,by+frac*24,40,height,modelColor(model),0,darkGfs(model)&&height>2?'stroke="#f3f8ff" stroke-width=".8"':'');frac+=part;
   }
   if(!samples)body+=rect(bx,by,40,24,t().empty,0);
   const rows=[['Comparable dates',String(samples)],['Models per date',samples?`${ls.minModels}–${ls.maxModels} of ${models.length}`:'N/A'],
      ...models.filter(m=>counts.get(m)?.participations).map(m=>[m,`${fixed(100*(counts.get(m)?.wins||0)/samples,1)}% · on ${counts.get(m).participations}/${samples} dates`])];
   const d=detail(`Day ${lead/24} first-place share`,`${region} · ${CONFIG.metrics[metric].label}`,rows,
     'Shares sum to 100% on dates with at least two available selected models; ties split credit. The competition pool changes with availability. Not all leads compare the same models.');
   body+=`<g class="explorer-cell diagnostic-lead-share" role="img" tabindex="0" ${attr(d)}>${rect(bx,by,40,24,'transparent',0,'pointer-events="all"')}</g>`;
   body+=text(bx+20,ly+45,samples?String(samples):'–',{size:9,anchor:'middle',color:t().muted});
 });
 body+=text(12,ly+46,'n:',{size:10,color:t().muted});
 const legendY=ly+68;
 models.forEach((model,i)=>{const x=18+(i%7)*108,y=legendY+Math.floor(i/7)*23;
   body+=rect(x,y-10,13,13,modelColor(model),2,darkGfs(model)?'stroke="#f3f8ff" stroke-width="1.2"':'stroke="'+t().grid+'" stroke-width=".6"');
   body+=text(x+19,y+1,model,{size:11,weight:700});
 });
 body+=rect(18,legendY+18,13,11,t().zero,1)+text(38,legendY+28,'Tied first place',{size:10,color:t().muted});
 body+=rect(175,legendY+18,13,11,t().empty,1)+text(195,legendY+28,'Fewer than two models (N/A)',{size:10,color:t().muted});
 $('explore-leadership-plot').innerHTML=svg(w,h,body,'Daily model leadership mosaic');bind('explore-leadership-plot');attachSelection('explore-leadership-plot',onSelect);
 $('explore-leadership-key').innerHTML='';
 updateSummary('explore-leadership-summary',`${result.valid} date/lead comparisons with two or more available models · ${result.ties} ties · ${result.missing} cells with fewer than two models · ${result.mismatches} mixed-source cells · ${result.unknown} unknown-source cells. The model pool can change with forecast lead; first-place shares are conditional on participating models. Hover the share bars for model percentages and availability. Click a date to link it to other plots.`);
}
export function renderCases(ds,opts,selectedDate,onSelect,onOpen){
 const mode=$('explore-case-mode').value||'best';const result=caseFinder(ds,{...opts,mode,limit:10});const host=$('explore-case-table');
 if(!result.items.length){host.innerHTML='<p class="explorer-empty">No matched daily comparisons in this period for this lead.</p>';updateSummary('explore-case-summary','No common daily focus/baseline scores for this lead. Try another forecast day.');return}
 const {model,baseline,metric,lead}=opts;
 host.innerHTML=`<table class="diagnostic-table"><thead><tr><th scope="col">Verification day</th><th scope="col" title="Selected focus model">${escape(model)}</th><th scope="col" title="Selected baseline model">${escape(baseline)}</th><th scope="col">Advantage</th>${mode==='reversal'?'<th>Daily swing</th>':''}<th>Open chart</th></tr></thead><tbody>${result.items.map(p=>`<tr class="${p.date===selectedDate?'diagnostic-selected':''}" data-case-date="${p.date}" tabindex="0" role="button" aria-label="Highlight verification date ${p.date} in diagnostic charts"><th>${p.date}</th><td>${escape(labelMetric(metric,p.modelValue))}</td><td>${escape(labelMetric(metric,p.baseValue))}</td><td class="${p.advantage>=0?'diagnostic-positive':'diagnostic-negative'}">${fmt(p.advantage,4)}</td>${mode==='reversal'?`<td>${fmt(p.change,4)}</td>`:''}<td><button type="button" class="small-button case-open" data-date="${p.date}" title="Open this date in Time Series">Time Series</button></td></tr>`).join('')}</tbody></table>`;
 host.onclick=e=>{const row=e.target.closest('[data-case-date]');if(!row)return;
   const date=row.dataset.caseDate;if(e.target.closest('.case-open'))onOpen(date,lead);else onSelect(date,lead)};
 host.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('tr[data-case-date]')&&!e.target.closest('button')){
   e.preventDefault();onSelect(e.target.closest('tr').dataset.caseDate,lead)}};
 updateSummary('explore-case-summary',`${result.n} matched daily comparisons for ${model} versus ${baseline} at F${lead} · ${result.mismatched} differing-source pairs · ${result.unknown} pairs with unknown sources. “Sharpest change” requires two consecutive verification dates, not merely adjacent available records. Click a result row to highlight that date in the diagnostic charts, or use Time Series to open it directly. Values are daily regional summary scores, not individual weather events.`);
}
// Exact Y-axis titles for all custom diagnostic XY plots, including Canvas PNGs.
const rotatedDiagnosticY=(label,midY)=>`<text transform="translate(19 ${midY}) rotate(-90)" x="0" y="0" font-size="11" font-weight="700" text-anchor="middle" fill="${t().fg}">${escape(label)}</text>`;
export function renderScatter(ds,opts,selectedDate,onSelect){
 const {model,baseline,metric,lead,region}=opts,res=pairedScatter(ds,opts),values=res.pairs;
 if(!values.length){noData('explore-scatter-plot','No matched daily scores for the selected model, baseline and forecast lead.');updateSummary('explore-scatter-summary','N/A — insufficient paired daily statistics.');return}
 const w=890,h=530,left=116,right=40,top=54,bottom=100,plotW=w-left-right,plotH=h-top-bottom;
 const points=values.flatMap(p=>[p.modelValue,p.baseValue]);let min=Math.min(...points),max=Math.max(...points),span=max-min;
 if(span<1e-10)span=Math.max(.001,Math.abs(min)*.01);min-=span*.10;max+=span*.10;
 const sx=v=>left+(v-min)/(max-min)*plotW,sy=v=>top+(max-v)/(max-min)*plotH;
 let body='';for(let i=0;i<=5;i++){const v=min+(max-min)*i/5,x=sx(v),y=sy(v);
   body+=line(x,top,x,top+plotH,t().grid,1)+line(left,y,left+plotW,y,t().grid,1);
   body+=text(x,top+plotH+22,fixed(v,CONFIG.metrics[metric].decimals),{size:10,anchor:'middle',color:t().muted});
   body+=text(left-8,y+4,fixed(v,CONFIG.metrics[metric].decimals),{size:10,anchor:'end',color:t().muted});
 }
 body+=line(sx(min),sy(min),sx(max),sy(max),t().muted,2,'stroke-dasharray="6 5"');
 for(const p of values){const x=sx(p.baseValue),y=sy(p.modelValue),isSelected=p.date===selectedDate,fill=p.advantage>0?'#508fd4':p.advantage<0?'#d56b69':t().zero;
   body+=`<g tabindex="0" role="button" class="diagnostic-point" ${attr(datePairDetail(p,model,baseline,metric,lead))} data-date="${p.date}" data-lead="${lead}">`;
   body+=circ(x,y,isSelected?10:9,'transparent','pointer-events="all"');
   body+=circ(x,y,isSelected?6.6:4.7,fill,`fill-opacity=".86" stroke="${isSelected?'#f4bf58':t().bg}" stroke-width="${isSelected?2.5:1.2}" pointer-events="none"`);
   body+='</g>';
 }
 body+=text(w/2,h-59,`${baseline} · ${CONFIG.metrics[metric].label} (${CONFIG.metrics[metric].unit.trim()||'score'})`,{size:12,weight:700,anchor:'middle'});
 body+=rotatedDiagnosticY(`${model} · ${CONFIG.metrics[metric].label} (${CONFIG.metrics[metric].unit.trim()||'score'})`,top+plotH/2);
 body+=text(left+3,top-21,'Dashed diagonal: equal scores',{size:11,color:t().muted});
 body+=text(w-8,25,`${values.length} pairs`,{size:11,anchor:'end',color:t().muted});
 const ky=h-24;
 for(const [i,c,label] of [[0,'#508fd4',`${model} better`],[1,'#d56b69',`${baseline} better`],[2,t().zero,'Tied preference']]){
   const kx=left+i*185;body+=circ(kx,ky,5,c)+text(kx+12,ky+4,label,{size:11,color:t().muted});
 }
 $('explore-scatter-plot').innerHTML=svg(w,h,body,`${model} versus ${baseline} paired daily verification scores`);bind('explore-scatter-plot');attachSelection('explore-scatter-plot',onSelect);
 updateSummary('explore-scatter-summary',`${res.n} paired days · ${res.wins} ${model} wins · ${res.losses} ${baseline} wins · ${res.ties} ties · ${res.mismatch} source mismatches · ${res.unknown} unspecified sources. Blue = focus model advantage; red = baseline advantage. Identical date/lead/region/metric are required. Scatterpoint values are daily regional statistics, not individual forecast-observation errors.`);
}
const mix=(a,b,portion)=>`rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*portion)).join(',')})`;
function biasFill(value,scale){if(!Number.isFinite(value))return t().empty;
 const a=Math.min(1,Math.sqrt(Math.abs(value)/(scale||1)));
 return value<0?mix([100,114,130],[32,110,187],a):mix([100,114,130],[206,62,51],a);
}
export function renderBiasEvolution(ds,opts){
 const {model,region,variable}=opts,res=biasEvolution(ds,opts),{dates,leads,cells,metric,scale}=res;
 const left=100,cw=43,top=49,ch=18,w=left+leads.length*cw+25,h=top+dates.length*ch+40;let body='';
 leads.forEach((lead,j)=>body+=text(left+j*cw+20,34,`D${lead/24}`,{size:11,color:t().muted,anchor:'middle'}));
 dates.slice().reverse().forEach((date,i)=>{const y=top+i*ch;if(i%5===0||i===dates.length-1)body+=text(10,y+11,date.slice(5),{size:10,color:t().muted});
  leads.forEach((lead,j)=>{const item=cells.get(`${date}|${lead}`);
   const d=detail(`${model} signed bias`,`${date} · F${lead} · ${region}`,[['Bias',item?labelMetric(metric,item.value):'N/A'],['Verification source',item?.source||'Unknown']], 'Blue indicates negative signed bias; red positive. Color intensity clips beyond the 95th percentile of absolute plotted bias.');
   body+=cell(left+j*cw,y,40,15,biasFill(item?.value,scale),d);
  });
 });
 body+=text(12,h-12,`Blue: negative bias · Red: positive bias · Neutral: near zero · Color range approximately ±${fixed(scale,2)}${CONFIG.metrics[metric].unit}`,{size:11,color:t().muted});
 $('explore-bias-plot').innerHTML=svg(w,h,body,`${model} signed bias evolution: ${variable}`);bind('explore-bias-plot');
 updateSummary('explore-bias-summary',`${cells.size} signed ${CONFIG.metrics[metric].label} daily summaries · color scale uses the 95th percentile absolute magnitude (symmetric about zero). The sign is physical bias, not a better/worse score; no matching baseline is required.`);
}
export function renderPortrait(ds,opts){
 const {region,variable,models}=opts,res=errorPortrait(ds,opts),valid=res.groups.flatMap(g=>g.points),w=910,h=510,left=118,right=46,top=52,bottom=65;
 if(!valid.length){noData('explore-portrait-plot','No dates have both signed bias and RMSE for the same model, date and lead.');updateSummary('explore-portrait-summary','N/A — both metrics must be present.');return}
 let maxX=Math.max(...valid.map(v=>v.absBias)),maxY=Math.max(...valid.map(v=>v.rmse));maxX=Math.max(maxX*1.15,1e-6);maxY=Math.max(maxY*1.15,1e-6);
 const sx=x=>left+x/maxX*(w-left-right),sy=y=>top+(maxY-y)/maxY*(h-top-bottom);
 let body='';for(let i=0;i<=5;i++){
  const x=left+(w-left-right)*i/5,y=top+(h-top-bottom)*i/5;
  body+=line(x,top,x,h-bottom)+line(left,y,w-right,y);
  body+=text(x,h-bottom+19,fixed(maxX*i/5,CONFIG.metrics[res.biasMetric].decimals),{size:10,color:t().muted,anchor:'middle'});
  body+=text(left-9,y+4,fixed(maxY*(5-i)/5,CONFIG.metrics[res.rmseMetric].decimals),{size:10,color:t().muted,anchor:'end'});
 }
 body+=rotatedDiagnosticY(`${CONFIG.metrics[res.rmseMetric].label} (${CONFIG.metrics[res.rmseMetric].unit.trim()||'score'})`,top+(h-top-bottom)/2);
 body+=text(w/2,h-16,`Absolute ${CONFIG.metrics[res.biasMetric].label} (horizontal)`,{size:12,weight:700,anchor:'middle'});
 for(const g of res.groups){const color=modelColor(g.model);
   for(let i=1;i<g.points.length;i++)if(g.points[i].lead-g.points[i-1].lead===24){
    const a=g.points[i-1],b=g.points[i];if(darkGfs(g.model))body+=line(sx(a.absBias),sy(a.rmse),sx(b.absBias),sy(b.rmse),'#f4f8ff',4,'stroke-opacity=".9"');body+=line(sx(a.absBias),sy(a.rmse),sx(b.absBias),sy(b.rmse),color,2,'stroke-opacity=".85"');
   }
   for(const p of g.points){const d=detail(`${g.model} · F${p.lead}`,`${region} · ${variable}`,[['Matched dates',String(p.n)],['Signed mean bias',labelMetric(res.biasMetric,p.bias)],['Absolute mean bias',labelMetric(res.biasMetric,p.absBias)],['Aggregated RMSE',labelMetric(res.rmseMetric,p.rmse)]],
    'Each point pairs bias and RMSE on the same date and forecast lead. Lines join adjacent available 24-hour leads only.',p.inconsistent?`${p.inconsistent} within-model metric source mismatches`:p.unknown?`${p.unknown} pairs with unknown source`:'' );
    body+=`<g class="diagnostic-point" tabindex="0" role="img" ${attr(d)}>${circ(sx(p.absBias),sy(p.rmse),8,'transparent','pointer-events="all"')}${circ(sx(p.absBias),sy(p.rmse),4.5,color,`stroke="${darkGfs(g.model)?'#f4f8ff':t().bg}" stroke-width="${darkGfs(g.model)?2:1.5}" pointer-events="none"`)}</g>`;
   }
 }
 const legendY=h+22;
 res.groups.forEach((g,i)=>{const lx=24+i*117;
   body+=rect(lx,legendY-11,12,12,modelColor(g.model),2,darkGfs(g.model)?'stroke="#f4f8ff" stroke-width="1.3"':'stroke="'+t().grid+'" stroke-width=".6"');
   body+=text(lx+19,legendY,g.model,{size:11,weight:700});
 });
 $('explore-portrait-plot').innerHTML=svg(w,h+52,body,'Bias vs RMSE model lead portrait');bind('explore-portrait-plot');
 $('explore-portrait-key').innerHTML='';
 updateSummary('explore-portrait-summary',`${valid.length} model–lead points from ${res.groups.filter(g=>g.points.length).length} models. Each requires both ${res.biasMetric} and ${res.rmseMetric} on the same date, lead, region and model; aggregated signed bias and RMS-aggregated RMSE are different statistical summaries. Model samples may differ across forecast leads. Lower-left means lower RMSE and smaller absolute mean bias.`);
}
export function renderRobustness(ds,opts){
 const {model,baseline,metric,region,lead}=opts,res=weekSensitivity(ds,opts),valid=res.analyses.filter(p=>Number.isFinite(p.skill));
 if(valid.length<2){noData('explore-robustness-plot','Need at least two distinct calendar weeks with matched dates and at least three matched dates remaining after each exclusion.');updateSummary('explore-robustness-summary',`${res.n} matched dates across ${res.weeks} calendar weeks. Insufficient coverage for leave-one-week-out analysis.`);return}
 const w=890,h=435,left=118,right=40,top=50,bottom=85,values=[res.full.skill,...valid.map(p=>p.skill)];let min=Math.min(...values),max=Math.max(...values),span=max-min;
 if(!Number.isFinite(span)||span<1e-9)span=Math.max(1,Math.abs(min)*.2);min-=span*.19;max+=span*.19;
 const sx=i=>left+(i+.5)*(w-left-right)/valid.length,sy=v=>top+(max-v)/(max-min)*(h-top-bottom);
 let body='';for(let i=0;i<=5;i++){const v=min+(max-min)*i/5,y=sy(v);body+=line(left,y,w-right,y)+text(left-8,y+4,fmt(v,1)+'%',{size:10,anchor:'end',color:t().muted})}
 if(min<=0&&max>=0)body+=line(left,sy(0),w-right,sy(0),t().muted,1.5,'stroke-dasharray="3 4"');
 body+=line(left,sy(res.full.skill),w-right,sy(res.full.skill),'#71aee4',2,'stroke-dasharray="8 4"');
 body+=text(left+8,top-18,`Full sample: ${fmt(res.full.skill,2)}% · ${res.n} days`,{size:12,weight:700});
 valid.forEach((p,i)=>{const x=sx(i),y=sy(p.skill),selected=p.changedSign,fill=selected?'#e06f6a':'#71aee4';
  if(i>0)body+=line(sx(i-1),sy(valid[i-1].skill),x,y,t().muted,2);
  const d=detail(`Exclude week of ${p.week}`,`${region} · F${lead} · ${model} vs ${baseline}`,[['Original skill',fmt(res.full.skill,3)+'%'],['Without week',fmt(p.skill,3)+'%'],['Change',fmt(p.delta,3)+' pp'],['Days omitted',p.removed],['Days remaining',p.kept],['Advantage sign reversed',p.changedSign?'Yes':'No']], 'Week exclusion is a sensitivity check, not a confidence interval or a significance test.');
  body+=`<g class="diagnostic-point" tabindex="0" role="img" ${attr(d)}>${circ(x,y,10,'transparent','pointer-events="all"')}${circ(x,y,5.5,fill,`stroke="${t().bg}" stroke-width="1.5" pointer-events="none"`)}</g>`;
  body+=text(x,h-bottom+18,p.week.slice(5),{size:10,anchor:'middle',color:t().muted});
  body+=text(x,h-bottom+35,`−${p.removed}d`,{size:9,anchor:'middle',color:t().muted});
 });
 body+=rotatedDiagnosticY(`Skill vs ${baseline} (%)`,top+(h-top-bottom)/2);
 body+=text(w/2,h-10,'Excluded verification week (Monday start)',{size:12,anchor:'middle',weight:700});
 $('explore-robustness-plot').innerHTML=svg(w,h,body,'Leave-one-week-out skill sensitivity');bind('explore-robustness-plot');
 updateSummary('explore-robustness-summary',`${res.n} matched dates · ${res.weeks} observed calendar weeks · ${valid.filter(p=>p.changedSign).length} excluded-week samples reverse the sign of the full-sample advantage. Curves are descriptive perturbations, not independent tests or confidence intervals. The dotted blue line is the full-sample score.`);
}
export function renderCoverage(ds,opts){
 const c=comparisonCoverage(ds,opts),frac=c.days?Math.round(c.matched/c.days*100):0;
 $('explore-quality').innerHTML=`<div class="diagnostic-quality-heading"><strong>Comparison coverage</strong><span>${escape(opts.model)} vs ${escape(opts.baseline)} · F${opts.lead}</span></div><div class="diagnostic-quality-metrics"><span><strong>${c.matched}</strong> paired dates</span><span><strong>${frac}%</strong> of ${c.days} calendar days</span><span><strong>${c.mismatched}</strong> source differences</span><span><strong>${c.unknown}</strong> unspecified sources</span></div><div class="diagnostic-quality-track"><span style="width:${Math.min(100,frac)}%"></span></div><p>Coverage is descriptive; it does not measure statistical confidence or significance. Pairing requires equal UTC valid date, region, metric, and lead.</p>`;
}
