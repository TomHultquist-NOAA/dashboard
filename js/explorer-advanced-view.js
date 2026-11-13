// Focused views that reuse the existing structured Skill Explorer tooltip/export.
import {CONFIG} from './config.js?v=1.3.2';
import {leadEnvelope,winningFrequency,metricTradeoffs,blockBootstrap,chooseWinFrequencyPresentation,chooseTradeoffPresentation} from './explorer-advanced.js?v=1.3.9';
import {bindInfo} from './explorer-view.js?v=1.3.9';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(x,n=2)=>Number.isFinite(x)?`${x>0?'+':''}${x.toFixed(n)}`:'N/A';
const theme=()=>document.documentElement.dataset.theme==='light'?{bg:'#ffffff',fg:'#263950',muted:'#61758c',grid:'#dbe4ef',positive:'#286db6',negative:'#c45a59'}:{bg:'#142236',fg:'#e5eefc',muted:'#a8bdd4',grid:'#3a506a',positive:'#6bb9f0',negative:'#fa8f82'};
const svg=(w,h,body,label)=>{const c=theme();return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" style="font-family:Inter,Segoe UI,Arial,sans-serif"><rect width="${w}" height="${h}" fill="${c.bg}"/>${body}</svg>`};
const line=(x1,y1,x2,y2,color,width=1,dash='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const text=(x,y,value,opts={})=>`<text x="${x}" y="${y}" font-size="${opts.size||11}" ${opts.anchor?`text-anchor="${opts.anchor}"`:''} font-weight="${opts.bold?'700':'400'}" fill="${opts.color||theme().fg}">${esc(value)}</text>`;
const rect=(x,y,w,h,fill,opacity=1,rad=0)=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" rx="${rad}" fill="${fill}" fill-opacity="${opacity}"/>`;
const circle=(x,y,r,fill,stroke=fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>`;
const detail=(title,context,rows,foot,warning='')=>({title,context,rows,foot,warning});
const hot=(shapes,info,d)=>`<g class="explorer-cell" tabindex="0" role="img" aria-label="${esc(info)}" data-info="${esc(info)}" data-detail="${esc(JSON.stringify(d))}">${shapes}</g>`;
const setExport=(id,enabled)=>{const button=document.querySelector(`.explorer-svg-export[data-svg-id="${id}"]`);if(button){button.disabled=!enabled;button.title=enabled?'Save this graphic as PNG':'PNG export is available when the view is a chart';}};
const slot=(id,content,label,summary)=>{$(id).innerHTML=content?svg(...content,label):`<div class="explorer-empty">${esc(summary||'No matched verification data for these selections.')}</div>`;setExport(id,Boolean(content));if(content)bindInfo(id,{floating:true,structured:'diagnostic'})};
function summaryTable(id,heading,columns,rows){
 $(id).innerHTML=`<section class="explorer-compact-result" aria-label="${esc(heading)}"><p class="explorer-compact-heading">${esc(heading)}</p><div class="diagnostic-table-scroll"><table class="diagnostic-table"><thead><tr>${columns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(cells=>`<tr>${cells.map((v,i)=>i?`<td>${esc(v)}</td>`:`<th scope="row">${esc(v)}</th>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
 setExport(id,false);
}
const selectedDays=(ds,opts)=>{const {start,end}=ds.resolveWindow(opts);return Math.max(0,Math.round((end-start)/86400000)+1)};
// Full, rotated titles share a common placement for SVG rendering and PNG export.
// Split the metric and the reference/unit into two readable parallel vertical lines.
function rotatedYTitle(title,centerY){
 const parts=title.split(' · ');
 return parts.map((part,i)=>`<text transform="translate(${15+i*17} ${centerY}) rotate(-90)" x="0" y="0" text-anchor="middle" font-size="11" font-weight="700" fill="${theme().fg}">${esc(part)}</text>`).join('');
}
function axes(w,h,left,right,top,bottom,ymin,ymax,yTitle){const c=theme(),ww=w-left-right,hh=h-top-bottom;
 let body=line(left,top,left,top+hh,c.grid,1.2)+line(left,top+hh,left+ww,top+hh,c.grid,1.2);
 for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4,y=top+hh-i*hh/4;const suffix=yTitle.includes('(%)')?'%':'';body+=line(left,y,left+ww,y,c.grid,.8)+text(left-10,y+4,`${Number(v.toPrecision(3))}${suffix}`,{anchor:'end',size:10,color:c.muted})}
 body+=rotatedYTitle(yTitle,top+hh/2);return {body,ww,hh};}
export function renderAdvantageEnvelope(ds,opts){const result=leadEnvelope(ds,opts),items=result.leads.filter(p=>p.n),id='explore-envelope-plot',c=theme();
 if(!items.length){slot(id,null,'','No matched focus-model advantages at available forecast leads.');$('explore-envelope-summary').textContent='';return;}
 const w=930,h=350,left=104,right=34,top=34,bottom=52;
 const raw=items.flatMap(p=>[p.q10,p.q90]),ext=Math.max(...raw.map(Math.abs),1e-9)*1.12;
 const span=Math.max(ext,Number((ext*.05).toPrecision(1))),axis=axes(w,h,left,right,top,bottom,-span,span,`${CONFIG.metrics[opts.metric].label} · Native-unit advantage (${CONFIG.metrics[opts.metric].unit.trim()||'score'})`);
 const X=lead=>left+lead/360*axis.ww,Y=value=>top+axis.hh*(span-value)/(2*span);
 let body=axis.body+line(left,Y(0),w-right,Y(0),c.muted,1.4,'6,4');
 for(let i=0;i<=15;i+=3)body+=text(X(i*24),h-20,`D${i}`,{anchor:'middle',size:11,color:c.muted});
 body+=text((w+left-right)/2,h-3,'Forecast lead',{anchor:'middle',bold:true});
 // 10-90th range as an aligned translucent vertical interval for each day.
 for(const p of items){const x=X(p.lead),y1=Y(p.q90),y2=Y(p.q10);
   const d=detail(`${opts.model} vs ${opts.baseline}`,`${opts.region} · D${p.lead/24} · ${CONFIG.metrics[opts.metric].label}`,[['Matched days',p.n],['10th percentile',num(p.q10,4)],['Median',num(p.median,4)],['90th percentile',num(p.q90,4)],['Wins / ties / losses',`${p.wins} / ${p.ties} / ${p.losses}`]],'Percentiles are across daily matched regional score differences, not observation-level errors.',p.mismatch||p.unknown?`${p.mismatch} differing-source days · ${p.unknown} unknown-source days`:'');
   body+=hot(`${rect(x-8,y1,16,Math.max(2,y2-y1),c.positive,.19,3)}${line(x,y1,x,y2,c.positive,2.2)}${circle(x,Y(p.median),4.7,c.positive)}${rect(x-11,top,22,axis.hh,'transparent')}`,`${opts.model} D${p.lead/24}: median ${num(p.median,3)}; ${p.n} matched days`,d);
 }
 slot(id,[w,h,body],'Advantage envelope with daily quantiles');
 $('explore-envelope-summary').textContent=`Focus ${opts.model} versus ${opts.baseline} · 10th–90th percentile of daily native-unit advantage (vertical ranges), median (dots), and zero (dashed). Positive favors the focus model. Quantiles are descriptive, not confidence intervals. Each lead uses only actual same-date matched scores; missing leads remain blank.`;
}
export function renderWinFrequency(ds,opts){
 const result=winningFrequency(ds,opts),id='explore-winrate-plot',c=theme(),points=result.points;
 if(!points.length){slot(id,null,'','No baseline-paired daily scores for the selected models and forecast lead.');$('explore-winrate-summary').textContent='Select models and a lead with matched dates. No values have been inferred.';return;}
 const policy=chooseWinFrequencyPresentation(points,selectedDays(ds,opts));
 // Two aligned model-by-model axes preserve every exact x and y value without
 // overlapping circular markers or artificially jittering statistical data.
 // The shared row is the link between mean magnitude and win frequency.
 const rows=[...points].sort((a,b)=>b.winRate-a.winRate||b.meanAdvantage-a.meanAdvantage||a.model.localeCompare(b.model));
 const w=1030,h=Math.max(310,160+rows.length*44),left=154,advRight=521,pctLeft=691,pctRight=897,top=99,step=44;
 const lim=Math.max(1e-9,...rows.map(p=>Math.abs(p.meanAdvantage)))*1.08;
 const X=v=>(left+advRight)/2+v/lim*(advRight-left)/2;
 const P=v=>pctLeft+v/100*(pctRight-pctLeft);
 const zero=X(0);
 let body=rect(left-13,49,advRight-left+77,h-90,c.grid,.11,9)+rect(pctLeft-12,49,pctRight-pctLeft+102,h-90,c.grid,.11,9);
 body+=text(left,31,'AVERAGE DAILY ADVANTAGE',{size:12,bold:true})+text(pctLeft,31,'WIN-EQUIVALENT FREQUENCY',{size:12,bold:true});
 body+=text(left,60,`Native units vs ${opts.baseline}; positive = better`,{size:10,color:c.muted})+text(pctLeft,60,'0% = never wins · 100% = always wins',{size:10,color:c.muted});
 body+=line(zero,76,zero,top+rows.length*step+1,c.muted,1.2,'5,4')+line(P(50),76,P(50),top+rows.length*step+1,c.muted,1.2,'5,4');
 for(const p of rows){
   const i=rows.indexOf(p),y=top+i*step;
   const color=CONFIG.modelMeta[p.model].color==='#000000'&&c.bg!=='#ffffff'?'#f8f8fb':CONFIG.modelMeta[p.model].color;
   const d=detail(`${p.model} vs ${opts.baseline}`,`${opts.region} · F${opts.lead} · ${CONFIG.metrics[opts.metric].label}`,[['Matched days',p.n],['Mean daily native-unit advantage',`${num(p.meanAdvantage,6)}${CONFIG.metrics[opts.metric].unit}`],['Win-equivalent frequency',`${p.winRate.toFixed(1)}%`],['Wins / ties / losses',`${p.wins} / ${p.ties} / ${p.losses}`],['Coverage guide',p.n>=policy.floor?'Meets presentation guide':`Limited coverage (${p.n} of ${policy.floor} recommended dates)`]],'Both quantities are on independently scaled axes for the same model row; no coordinates are jittered. Models can have different matched date sets.',p.mismatch||p.unknown?`${p.mismatch} differing-source days · ${p.unknown} unknown-source days`:'');
   body+=line(left-8,y+19,pctRight+96,y+19,c.grid,.5);
   body+=text(left-17,y+4,p.model,{anchor:'end',size:12,bold:true,color});
   body+=text(left-17,y+16,`${p.n} matched`,{anchor:'end',size:9,color:c.muted});
   body+=line(zero,y,X(p.meanAdvantage),y,color,4);
   body+=circle(X(p.meanAdvantage),y,6,color,c.fg);
   body+=text(advRight+10,y+4,num(p.meanAdvantage,5),{size:11,color:c.fg,bold:true});
   body+=line(pctLeft,y,pctRight,y,c.grid,2);
   body+=line(pctLeft,y,P(p.winRate),y,color,4);
   body+=circle(P(p.winRate),y,6,color,c.fg);
   body+=text(pctRight+10,y+4,`${p.winRate.toFixed(1)}%`,{size:11,bold:true});
   if(p.n<policy.floor)body+=text(pctRight+10,y+16,`n=${p.n} · limited`,{size:9,color:c.muted});
   body+=hot(rect(0,y-17,w,35,'transparent'),`${p.model}: mean advantage ${num(p.meanAdvantage,5)}, win-equivalent ${p.winRate.toFixed(1)}%, ${p.n} days`,d);
 }
 const tickY=top+rows.length*step+15;
 for(const frac of [-1,-.5,0,.5,1])body+=text(X(frac*lim),tickY, num(frac*lim,4),{size:10,anchor:'middle',color:c.muted});
 for(const pct of [0,25,50,75,100])body+=text(P(pct),tickY,`${pct}%`,{size:10,anchor:'middle',color:c.muted});
 body+=text(left,tickY+37,'Mean daily native-unit advantage',{size:11,bold:true});
 body+=text(pctLeft,tickY+37,'Win-equivalent (wins + half ties)',{size:11,bold:true});
 slot(id,[w,h,body],'Aligned comparison of average advantage and win-equivalent frequency by model');
 $('explore-winrate-summary').textContent=`Each model has its own row, so near-identical results stay visible instead of overplotting. Two independent horizontal scales show mean native-unit advantage and win-equivalent frequency; the dashed references are zero advantage and 50% win-equivalent. ${rows.length} model${rows.length===1?'':'s'} shown, including ${policy.limited.length} with fewer than ${policy.floor} matched days. All scores come from real same-date baseline pairs, but model rows may use different sets of days or verification sources. Hover or focus a row for exact counts.`;
}
export function renderMetricTradeoffs(ds,opts){
 const result=metricTradeoffs(ds,opts),id='explore-tradeoff-plot',c=theme(),points=result.points;
 if(!points.length){slot(id,null,'',result.reason||'No dates jointly matched across the selected metrics, baseline and models.');$('explore-tradeoff-summary').textContent=`${result.reason||'No jointly matched scores.'} Excluded models: ${result.excluded?.join(', ')||'none'}. Try selecting fewer models, another forecast lead, or different metrics.`;return;}
 const policy=chooseTradeoffPresentation(result,selectedDays(ds,opts));
 if(policy.mode==='profile'){
   // One valid model is still a useful two-metric figure, and must be exportable.
   const p=points[0],w=870,h=280,left=210,right=110,top=75,bottom=42,lim=Math.max(1,Math.abs(p.x),Math.abs(p.y))*1.18;
   const X=v=>left+(v+lim)/(2*lim)*(w-left-right),zero=X(0);
   let body=text(25,30,`${p.model} versus ${opts.baseline} · ${p.n} shared dates`,{size:14,bold:true})+line(zero,60,zero,h-bottom,c.muted,1.5,'5,4');
   for(const [i,metric,value] of [[0,opts.metricX,p.x],[1,opts.metricY,p.y]]){
     const y=115+i*69,color=CONFIG.modelMeta[p.model].color==='#000000'&&c.bg!=='#ffffff'?'#f8f8fb':CONFIG.modelMeta[p.model].color;
     const d=detail(`${p.model} vs ${opts.baseline}`,`${CONFIG.metrics[metric].label} · ${opts.region} · F${opts.lead}`,[['Relative skill',`${num(value,3)}%`],['Jointly matched dates',p.n],['Metric',CONFIG.metrics[metric].label]],'This is a two-metric profile for one eligible model; no multi-model Pareto frontier exists.',p.mismatch||p.unknown?`${p.mismatch} differing-source days · ${p.unknown} unknown-source days`:'');
     body+=text(25,y+4,CONFIG.metrics[metric].short,{size:11,bold:true})+line(zero,y,X(value),y,color,6)+circle(X(value),y,7,color,c.fg)+text(w-right+14,y+4,`${num(value,2)}%`,{size:12,bold:true})+hot(rect(0,y-24,w,48,'transparent'),`${metric}: ${num(value,2)}% relative skill`,d);
   }
   for(const f of [-1,0,1])body+=text(X(f*lim),h-16,`${num(f*lim,1)}%`,{size:10,color:c.muted,anchor:'middle'});
   slot(id,[w,h,body],'Two-metric skill profile for one selected comparison model');
   $('explore-tradeoff-summary').textContent=`Only ${p.model} has both metrics on jointly matched dates for this selection. Showing both measured skill differences as a profile, rather than an empty panel or a fictional Pareto frontier. ${p.n} common dates; ${p.n<policy.floor?'limited coverage (display guide '+policy.floor+' days). ':''}${result.omittedForOverlap?.length?`Models excluded to preserve common dates: ${result.omittedForOverlap.join(', ')}. `:''}Baseline and reference-source caveats still apply.`;
   return;
 }
 const w=950,h=535,left=125,right=190,top=52,bottom=85,limX=Math.max(1,...points.map(p=>Math.abs(p.x)))*1.16,limY=Math.max(1,...points.map(p=>Math.abs(p.y)))*1.16,axis=axes(w,h,left,right,top,bottom,-limY,limY,`${CONFIG.metrics[opts.metricY].label} · Relative skill vs ${opts.baseline} (%)`);
 const X=v=>left+(v+limX)/(2*limX)*axis.ww,Y=v=>top+(limY-v)/(2*limY)*axis.hh;
 let body=axis.body+line(X(0),top,X(0),h-bottom,c.muted,1.2,'5,4')+line(left,Y(0),w-right,Y(0),c.muted,1.2,'5,4');
 const frontier=points.filter(p=>p.frontier).sort((a,b)=>a.x-b.x);
 for(let j=1;j<frontier.length;j++)body+=line(X(frontier[j-1].x),Y(frontier[j-1].y),X(frontier[j].x),Y(frontier[j].y),c.positive,2,'5,3');
 for(const p of points){const x=X(p.x),y=Y(p.y),color=CONFIG.modelMeta[p.model].color==='#000000'&&c.bg!=='#ffffff'?'#f8f8fb':CONFIG.modelMeta[p.model].color;
   const d=detail(`${p.model} vs ${opts.baseline}`,`${opts.region} · F${opts.lead} · ${p.n} common dates`,[[`${CONFIG.metrics[opts.metricX].short} skill`,`${num(p.x,2)}%`],[`${CONFIG.metrics[opts.metricY].short} skill`,`${num(p.y,2)}%`],['Common dates',p.n],['Pareto status',p.frontier?'Non-dominated':'Dominated by another model']], 'Both axes use exactly the same dates for every plotted model. Only non-dominated points form a Pareto frontier, even if only one model is non-dominated.',p.mismatch||p.unknown?`${p.mismatch} differing-source days · ${p.unknown} unknown-source days`:'');
   body+=hot(`${circle(x,y,8,color,p.frontier?c.positive:c.fg)}${p.frontier?circle(x,y,13,'transparent',c.positive):''}${circle(x,y,19,'transparent','transparent')}`,`${p.model}: ${num(p.x,1)}% x, ${num(p.y,1)}% y; ${p.n} days`,d);
 }
 // The side key is deliberately outside the data axes: close points never
 // overwrite model names, and exported PNGs retain exact model coordinates.
 body+=text(w-right+20,top+2,'MODEL VALUES',{size:11,bold:true});
 for(const [i,p] of points.entries()){
   const y=top+30+i*39;
   const color=CONFIG.modelMeta[p.model].color==='#000000'&&c.bg!=='#ffffff'?'#f8f8fb':CONFIG.modelMeta[p.model].color;
   body+=circle(w-right+26,y-4,5,color,p.frontier?c.positive:c.fg);
   body+=text(w-right+39,y,p.model,{size:11,bold:true});
   body+=text(w-right+39,y+13,`${num(p.x,1)}% / ${num(p.y,1)}%`,{size:10,color:c.muted});
 }
 for(let i=-2;i<=2;i++)body+=text(X(i*limX/2),h-bottom+22,`${num(i*limX/2,1)}%`,{anchor:'middle',size:10,color:c.muted});
 body+=text((left+w-right)/2,h-11,`${CONFIG.metrics[opts.metricX].label} · Relative skill vs ${opts.baseline} (%)`,{anchor:'middle',bold:true});
 slot(id,[w,h,body],'Common-sample two-metric model trade-off scatter');
 $('explore-tradeoff-summary').textContent=`${result.commonDates} dates shared across every plotted model, both metrics and the baseline. ${policy.frontier.length===1?`${policy.frontier[0].model} is the sole non-dominated model; all actual points remain shown. `:`${policy.frontier.length} models form the non-dominated set. `}${result.commonDates<policy.floor?`Limited shared coverage (presentation guide: ${policy.floor} days). `:''}Ringed points indicate Pareto membership; a single ring is a valid result, not a reason to hide the chart. Excluded models: ${result.excluded.length?result.excluded.join(', '):'none'}.${result.omittedForOverlap?.length?` ${result.omittedForOverlap.join(', ')} omitted because their dates had no joint overlap with the full initial model group; remaining models use one identical set of dates.`:''} Source references may differ.`;
}
export function renderBootstrap(ds,opts){const result=blockBootstrap(ds,opts),id='explore-bootstrap-plot',c=theme();
 if(result.reason||!result.replicates.length){slot(id,null,'',result.reason||'Insufficient complete paired dates for interval.');$('explore-bootstrap-summary').textContent=`${result.n} matched dates, ${result.missing} dates without paired values. ${result.reason||''}`;return;}
 const spread=result.replicates.at(-1)-result.replicates[0];
 if(!Number.isFinite(spread)||Math.abs(spread)<1e-9){slot(id,null,'No measurable variation in the resampled daily advantage. A one-bin histogram would not add useful information.');$('explore-bootstrap-summary').textContent=`${result.n} matched dates. All ${result.reps} block resamples yield essentially the same mean daily advantage (${num(result.observed,4)} native units). No distribution shape or meaningful interval width can be inferred from this degenerate sample.`;return;}
 const w=900,h=315,left=103,right=38,top=43,bottom=63,a=result.replicates,lim=Math.max(.001,...[result.lower,result.upper,result.observed,0].map(Math.abs))*1.18,bins=32,counts=Array(bins).fill(0);
 for(const v of a){const ix=Math.min(bins-1,Math.max(0,Math.floor((v+lim)/(2*lim)*bins)));counts[ix]++}
 const maxCount=Math.max(1,...counts),maxPct=100*maxCount/a.length*1.16,axis=axes(w,h,left,right,top,bottom,0,maxPct,'Resamples per bin (%)');
 const X=v=>left+(v+lim)/(2*lim)*axis.ww,barW=axis.ww/bins;
 let body=axis.body+line(X(0),top,X(0),h-bottom,c.muted,1.4,'5,4');
 counts.forEach((n,i)=>{const barH=100*n/a.length/maxPct*axis.hh;body+=rect(left+i*barW+.7,top+axis.hh-barH,barW-1.4,barH,c.positive,.42)});
 body+=line(X(result.lower),top,X(result.lower),h-bottom,c.negative,2,'5,3')+line(X(result.upper),top,X(result.upper),h-bottom,c.negative,2,'5,3')+line(X(result.observed),top,X(result.observed),h-bottom,c.positive,2.6);
 body+=text(X(result.observed),top-9,`Observed ${num(result.observed,4)}`,{anchor:'middle',bold:true,size:12});
 for(let i=-2;i<=2;i++)body+=text(X(i*lim/2),h-bottom+21,num(i*lim/2,3),{anchor:'middle',size:10,color:c.muted});
 body+=text((w+left-right)/2,h-9,`Mean daily native-unit advantage (${CONFIG.metrics[opts.metric].unit.trim()||'score units'})`,{anchor:'middle',bold:true});
 const info=`${opts.model} vs ${opts.baseline}: ${result.n} matched days; observed ${num(result.observed,4)}; 95% interval ${num(result.lower,4)} to ${num(result.upper,4)}`;
 const d=detail(`${opts.model} vs ${opts.baseline}`,`${opts.region} · F${opts.lead} · ${CONFIG.metrics[opts.metric].label}`,[['Observed mean daily advantage',num(result.observed,5)],['95% bootstrap percentile interval',`${num(result.lower,5)} to ${num(result.upper,5)}`],['Resampled calendars',result.reps],['Matched verification days',result.n],['Dates missing paired scores',result.missing],['Positive replicate fraction',`${(result.positiveFraction*100).toFixed(1)}%`]],'Circular 7-calendar-day moving blocks; exploratory resampling of daily summaries, not independent gridpoint events or a formal EVS significance claim.',result.mismatch||result.unknown?`${result.mismatch} differing-source days · ${result.unknown} unknown-source days`:'');
 body+=hot(rect(left,top,axis.ww,axis.hh,'transparent'),info,d);slot(id,[w,h,body],'Bootstrap resampled daily advantage histogram');
 $('explore-bootstrap-summary').textContent=`Focus ${opts.model} vs ${opts.baseline} · ${result.n} matched dates · 7-calendar-day circular moving blocks · ${result.reps} deterministic replicates. Mean daily native-unit advantage: ${num(result.observed,4)}; exploratory 95% percentile interval: [${num(result.lower,4)}, ${num(result.upper,4)}]. ${(result.positiveFraction*100).toFixed(1)}% of replicates positive (not a formal probability or p-value). ${result.missing} missing calendar dates remain missing when resampled; consecutive-day dependence is approximated, not proven. This complements Leave-One-Week-Out and is not the existing EVS-style significance interval.`;
}

