import {CONFIG} from './config.js?v=1.3.2';
import {fingerprint,headToHead,atlas,distributions,rolling,skillHorizon} from './explorer-analytics.js?v=1.3.9';
import {renderLineChart} from './charts.js?v=1.3.2';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number.isFinite(x)?`${x>0?'+':''}${x.toFixed(1)}`:'N/A';
const metricVal=(key,x)=>Number.isFinite(x)?`${x.toFixed(CONFIG.metrics[key].decimals)}${CONFIG.metrics[key].unit}`:'N/A';
const theme=()=>document.documentElement.dataset.theme==='light'?{bg:'#ffffff',fg:'#263950',muted:'#5f7187',empty:'#e4e9f0',zero:'#e0e4e9',grid:'#d8e0e8'}:{bg:'#142236',fg:'#e4effd',muted:'#a5bbd2',empty:'#344355',zero:'#576170',grid:'#3a506a'};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const blend=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const rgb=x=>`rgb(${x.join(',')})`;
export function skillFill(skill){
 if(!Number.isFinite(skill))return theme().empty;
 const g=Math.sign(skill)*Math.sqrt(clamp(Math.abs(skill)/10,0,1));
 const stops=[[-1,[178,24,43]],[-.66,[214,72,63]],[-.33,[244,165,130]],[0,document.documentElement.dataset.theme==='light'?[224,228,233]:[82,92,106]],[.33,[146,197,222]],[.66,[67,147,195]],[1,[33,102,172]]];
 for(let i=1;i<stops.length;i++)if(g<=stops[i][0])return rgb(blend(stops[i-1][1],stops[i][1],(g-stops[i-1][0])/(stops[i][0]-stops[i-1][0])));
 return rgb(stops[stops.length-1][1]);
}
function textColor(fill){if(!fill.startsWith('rgb'))return theme().fg;const a=fill.match(/\d+/g).map(Number);return (.2126*a[0]+.7152*a[1]+.0722*a[2])>145?'#13253a':'#fff'}
function svgRoot(w,h,content,label){const c=theme();return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" style="font-family:Inter,Segoe UI,Arial,sans-serif"><rect width="${w}" height="${h}" fill="${c.bg}"/>${content}</svg>`}
const rowLabel=(s,x,y,size=12)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${theme().fg}">${esc(s)}</text>`;
const noData=msg=>`<div class="explorer-empty">${esc(msg)}</div>`;
function setSvg(id,svg){$(id).innerHTML=svg;}
// A single styled readout for Performance Consistency. Native SVG <title> tooltips
// are deliberately omitted for its rows/dots to prevent two overlapping popups.
const tooltipNumber=x=>Number.isFinite(x)?`${x>0?'+':''}${x.toPrecision(5)}`:'N/A';
const tooltipCount=x=>Number.isFinite(x)?String(x):'N/A';
function distributionTooltip(d){
 const heading=`<div class="explorer-tooltip-heading"><strong>${esc(d.model)}</strong><span class="explorer-tooltip-versus">vs ${esc(d.baseline)}</span></div>`;
 const context=`<div class="explorer-tooltip-context">${esc(d.region)} · F${esc(d.lead)} · ${esc(d.metricLabel)}</div>`;
 const rows=d.kind==='day'?
   [['Verification date',d.date], [`${d.model} score`,metricVal(d.metric,d.modelValue)], [`${d.baseline} score`,metricVal(d.metric,d.baseValue)], ['Advantage',tooltipNumber(d.advantage)]]:
   [['Matched days',tooltipCount(d.n)], ['Mean',tooltipNumber(d.mean)], ['Median',tooltipNumber(d.median)], ['Q1 · 25th percentile',tooltipNumber(d.q1)], ['Q3 · 75th percentile',tooltipNumber(d.q3)], ['Minimum',tooltipNumber(d.min)], ['Maximum',tooltipNumber(d.max)], ['Better days',tooltipCount(d.positive)], ['Worse days',tooltipCount(d.negative)], ['Tied days',tooltipCount(d.zero)]];
 const table=`<table class="explorer-tooltip-table"><thead><tr><th scope="col">${d.kind==='day'?'Daily comparison':'Statistic'}</th><th scope="col">Value</th></tr></thead><tbody>${rows.map(([name,val])=>`<tr><th scope="row">${esc(name)}</th><td>${esc(val)}</td></tr>`).join('')}</tbody></table>`;
 const warnings=[];
 if(d.kind==='day'){
   if(d.mismatch)warnings.push('Different verification sources');
   if(d.unknown)warnings.push('Verification source unknown');
 }else{
   if(d.mismatched)warnings.push(`${d.mismatched} days with differing sources`);
   if(d.unknown)warnings.push(`${d.unknown} days with unknown sources`);
 }
 const alert=warnings.length?`<div class="explorer-tooltip-alert">${esc(warnings.join(' · '))}</div>`:'';
 return `${heading}${context}${table}<div class="explorer-tooltip-note">Native-unit advantage · positive = better</div>${alert}`;
}
function diagnosticTooltip(d){
 const heading=`<div class="explorer-tooltip-heading"><strong>${esc(d.title||'Comparison details')}</strong></div>`;
 const context=d.context?`<div class="explorer-tooltip-context">${esc(d.context)}</div>`:'';
 const rows=(d.rows||[]).map(([k,v])=>`<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
 const table=`<table class="explorer-tooltip-table"><thead><tr><th scope="col">Statistic</th><th scope="col">Value</th></tr></thead><tbody>${rows}</tbody></table>`;
 const foot=d.foot?`<div class="explorer-tooltip-note">${esc(d.foot)}</div>`:'';
 const warn=d.warning?`<div class="explorer-tooltip-alert">${esc(d.warning)}</div>`:'';
 return heading+context+table+foot+warn;
}
// Head-to-Head Matrix: use the same compact, structured hover presentation as
// other Skill Explorer statistics instead of a long one-line native SVG tooltip.
function matrixTooltip(d){
 const n=d.n||0;
 const rate=n?`${d.rate.toFixed(1)}%`:'N/A';
 const metric=CONFIG.metrics[d.metric];
 const avg=Number.isFinite(d.advantage)?`${d.advantage>0?'+':''}${d.advantage.toPrecision(4)}${metric?.unit||''}`:'N/A';
 const heading=`<div class="explorer-tooltip-heading"><strong>${esc(d.row)}</strong><span class="explorer-tooltip-versus">vs ${esc(d.column)}</span></div>`;
 const context=`<div class="explorer-tooltip-context">${esc(d.region)} · F${esc(d.lead)} · ${esc(metric?.label||d.metric)}</div>`;
 const pct=value=>n?(100*value/n).toFixed(3):'0';
 const meter=n?`<div class="explorer-matrix-meter" role="img" aria-label="${esc(`${d.wins} wins, ${d.ties} ties, ${d.losses} losses`)}"><span class="wins" style="width:${pct(d.wins)}%"></span><span class="ties" style="width:${pct(d.ties)}%"></span><span class="losses" style="width:${pct(d.losses)}%"></span></div>`:'<div class="explorer-matrix-meter is-empty" aria-hidden="true"></div>';
 const hero=`<div class="explorer-matrix-hero"><div class="explorer-matrix-label">Row model · win-equivalent rate</div><div class="explorer-matrix-rate">${esc(rate)}</div>${meter}<div class="explorer-matrix-key"><span><i class="wins"></i>Wins</span><span><i class="ties"></i>Ties</span><span><i class="losses"></i>Losses</span></div></div>`;
 const rows=[['Matched days',n],['Wins',d.wins],['Losses',d.losses],['Ties',d.ties],['Mean native-unit advantage',avg]];
 const table=`<table class="explorer-tooltip-table"><thead><tr><th scope="col">Comparison statistic</th><th scope="col">Value</th></tr></thead><tbody>${rows.map(([k,v])=>`<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;
 const note='<div class="explorer-tooltip-note">Win-equivalent = (wins + half of ties) / matched days. Positive advantage favors the row model; scores are daily regional summaries, not individual forecast events.</div>';
 const source=d.different||d.unknown?`<div class="explorer-tooltip-alert">Verification sources: ${esc(d.different)} differing · ${esc(d.unknown)} unknown</div>`:'<div class="explorer-matrix-sources">Verification sources: no mismatches or unknowns</div>';
 return heading+context+hero+table+note+source;
}
// Structured comparison readouts for the remaining summary heatmaps and ACC horizon.
// Each readout uses only values already computed for the plotted cell/tile.
function patternTooltip(d){
 const m=CONFIG.metrics[d.metric];
 const metricLabel=m?.label||d.metric;
 const region=d.region||'Verification region';
 const row=(name,value)=>`<tr><th scope="row">${esc(name)}</th><td>${esc(value)}</td></tr>`;
 const percent=value=>Number.isFinite(value)?`${value>0?'+':''}${value.toFixed(1)}%`:'N/A';
 const title=d.kind==='horizon'?`${esc(d.model)} · ACC 0.80 horizon`:`${esc(d.model)} <span class="explorer-tooltip-versus">vs ${esc(d.baseline)}</span>`;
 const heading=`<div class="explorer-tooltip-heading"><strong>${title}</strong></div>`;
 const context=`<div class="explorer-tooltip-context">${esc(region)} · ${d.kind==='horizon'?'500 hPa ACC':`F${esc(d.lead)} (D${esc(d.lead/24)}) · ${esc(metricLabel)}`}${d.kind==='fingerprint'?` · ${esc(d.date)}`:''}</div>`;
 if(d.kind==='horizon'){
   const statuses={crossed:'Threshold crossing', 'before-first':'Below 0.80 at earliest lead','beyond-last':'No crossing in available leads',gap:'Crossing cannot be interpolated', 'no-data':'No ACC data available'};
   const status=statuses[d.status]||'Not estimated';
   const value=d.status==='crossed'&&Number.isFinite(d.hour)?`Day ${(d.hour/24).toFixed(2)}`:d.status==='beyond-last'&&Number.isFinite(d.last)?`≥0.80 through D${d.last/24}`:'N/A';
   const hero=`<div class="explorer-pattern-hero"><div class="explorer-pattern-kicker">Estimated ACC threshold horizon</div><strong>${esc(value)}</strong><span>${esc(status)}</span></div>`;
   const table=`<table class="explorer-tooltip-table"><thead><tr><th scope="col">Horizon statistic</th><th scope="col">Value</th></tr></thead><tbody>${row('ACC threshold','0.80')}${row('Boundary daily summaries',Number.isFinite(d.n)?d.n:'N/A')}${row('Last available lead',Number.isFinite(d.last)?`D${d.last/24}`:d.status==='crossed'?'—':'N/A')}</tbody></table>`;
   return heading+context+hero+table+'<div class="explorer-tooltip-note">Crossings are interpolated only between adjacent available forecast leads; never extrapolated. Boundary sample counts are not confidence intervals.</div>';
 }
 const isDaily=d.kind==='fingerprint',n=isDaily?(d.matched?1:0):(d.n||0);
 const skill=isDaily?d.relative:d.skill;
 const hero=`<div class="explorer-pattern-hero"><div class="explorer-pattern-kicker">${isDaily?'Daily relative skill':'Paired aggregate relative skill'}</div><strong>${esc(percent(skill))}</strong><span>${n?isDaily?'Matched daily model/baseline score':'Computed from matched daily summaries':d.pending?'Region data not loaded':'No matched verification values'}</span></div>`;
 const rows=isDaily?[
   ['Verification date',d.date],['Forecast lead',`F${d.lead} · D${d.lead/24}`],[`${d.model} score`,metricVal(d.metric,d.modelValue)],[`${d.baseline} score`,metricVal(d.metric,d.baseValue)],['Native-unit advantage',Number.isFinite(d.advantage)?`${tooltipNumber(d.advantage)}${m?.unit||''}`:'N/A']
 ]:[
   ['Matched days',d.n||0],['Distinct dates',d.dates||0],[`${d.model} aggregate`,metricVal(d.metric,d.modelValue)],[`${d.baseline} aggregate`,metricVal(d.metric,d.baseValue)],['Native-unit advantage',Number.isFinite(d.advantage)?`${tooltipNumber(d.advantage)}${m?.unit||''}`:'N/A']
 ];
 const table=`<table class="explorer-tooltip-table"><thead><tr><th scope="col">${isDaily?'Daily comparison':'Regional comparison'}</th><th scope="col">Value</th></tr></thead><tbody>${rows.map(([k,v])=>row(k,v)).join('')}</tbody></table>`;
 const mismatch=isDaily?(d.mismatch?1:0):(d.mismatched||0),unknown=isDaily?(d.unknown?1:0):(d.unknown||0);
 const warn=mismatch||unknown?`<div class="explorer-tooltip-alert">Verification sources: ${esc(mismatch)} differing · ${esc(unknown)} unknown</div>`:'';
 const note=isDaily?'A gray cell means no matched model/baseline score. Select the cell to open Time Series for this lead.':'Every cell uses matched daily summaries in its own verification region; different regions may contain different samples.';
 return heading+context+hero+table+`<div class="explorer-tooltip-note">${note}</div>`+warn;
}
export function bindInfo(id,{floating=false,structured=false}={}){
 const host=$(id),out=$(`${id}-info`);if(!host)return;
 const defaultInfo=out?.textContent||'Hover, focus, or tap to inspect the matched sample and values.';
 let tooltip=null,activeEl=null;
 if(floating){
   tooltip=document.createElement('div');tooltip.className='explorer-sample-tooltip'+(structured==='diagnostic'?' is-diagnostic':structured==='matrix'?' is-matrix':structured==='pattern'?' is-pattern':'');
   tooltip.setAttribute('role','tooltip');host.appendChild(tooltip);
   if(structured&&out){out.classList.add('explorer-inspector-sr-only');out.setAttribute('aria-live','polite')}
 }
 function positionTooltip(e,el){
   if(!tooltip)return;
   const bounds=tooltip.getBoundingClientRect();
   const anchor=el.getBoundingClientRect();
   const x=e.type==='focusin'?anchor.left+anchor.width/2:e.clientX;
   const y=e.type==='focusin'?anchor.top:e.clientY;
   const margin=10;
   // Prefer the right/below position, then flip instead of cutting off a long readout.
   let left=x+16, top=y+16;
   if(left+bounds.width>window.innerWidth-margin)left=x-bounds.width-16;
   if(top+bounds.height>window.innerHeight-margin)top=y-bounds.height-16;
   tooltip.style.left=`${Math.max(margin,Math.min(left,window.innerWidth-bounds.width-margin))}px`;
   tooltip.style.top=`${Math.max(margin,Math.min(top,window.innerHeight-bounds.height-margin))}px`;
 }
 function hideTooltip(){if(tooltip)tooltip.classList.remove('visible');activeEl=null}
 const inspect=e=>{
   if(tooltip?.contains(e.target))return; // Allow long diagnostic readouts to be scrolled.
   const el=e.target?.closest?.('[data-info]');
   if(!el||!host.contains(el))return hideTooltip();
   if(el!==activeEl){
     activeEl=el;
     const info=el.dataset.info;
     if(out)out.textContent=info;
     if(tooltip){
       let d=null;
       if(structured&&el.dataset.detail){try{d=JSON.parse(el.dataset.detail)}catch{}}
       tooltip.innerHTML=d?(structured==='diagnostic'?diagnosticTooltip(d):structured==='matrix'?matrixTooltip(d):structured==='pattern'?patternTooltip(d):distributionTooltip(d)):esc(info);
       tooltip.classList.add('visible');
     }
   }
   if(tooltip)positionTooltip(e,el);
 };
 host.onpointerover=inspect;host.onpointermove=inspect;host.onpointerdown=inspect;
 host.onfocusin=inspect;
 // Some browsers focus SVG <g tabindex="0"> without bubbling focusin to its host.
 // Capture the actual focus event as a keyboard-accessible fallback.
 if(host._explorerFocusInspector)host.removeEventListener('focus',host._explorerFocusInspector,true);
 host._explorerFocusInspector=inspect;
 host.addEventListener('focus',inspect,true);
 host.onpointerleave=()=>{hideTooltip();if(out)out.textContent=defaultInfo};
 host.onfocusout=e=>{if(!host.contains(e.relatedTarget))hideTooltip()};
}
function svgButtonLabel(value,info,detail,x,y,w,h,fill){return `<g tabindex="0" role="img" aria-label="${esc(info)}" data-info="${esc(info)}" data-detail="${esc(JSON.stringify(detail))}" class="explorer-cell"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}"/>${value?`<text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle" font-size="11" font-weight="700" fill="${textColor(fill)}" pointer-events="none">${esc(value)}</text>`:''}</g>`}
function makeMapRows(data,formatter,detailBuilder,title,cols,labels,scale='skill'){
 // Reserve enough left gutter for full verification-domain names (including hemispheres).
 const left=204,w=left+cols.length*49+24,h=55+labels.length*25+28,c=theme();let body='';
 cols.forEach((col,i)=>{body+=`<text x="${left+2+i*49+23}" y="35" font-size="11" font-weight="600" text-anchor="middle" fill="${c.muted}">${esc(col.label)}</text>`});
 labels.forEach((name,i)=>{const y=43+i*25;body+=rowLabel(name,12,y+16,12);
   cols.forEach((col,j)=>{const cell=data[i]?.[j],info=formatter(cell,name,col);const color=scale==='rate'?(Number.isFinite(cell?.rate)?skillFill((cell.rate-50)/5):c.empty):skillFill(cell?.skill);
     body+=svgButtonLabel(scale==='rate'&&Number.isFinite(cell?.rate)?`${cell.rate.toFixed(0)}%`:'',info,detailBuilder(cell,name,col),left+j*49,y,45,22,color);
   });
 });
 return svgRoot(w,h,body,title);
}
export function renderFingerprint(ds,opts,onOpen){
 const {model,baseline,metric,region,...win}=opts;
 const result=fingerprint(ds,opts),dates=result.dates.slice().reverse(),c=theme();
 const cols=result.leads.map(h=>({key:h,label:`D${h/24}`}));const w=115+cols.length*45+28,h=56+dates.length*18+24;let body='';
 cols.forEach((col,j)=>body+=`<text x="${115+j*45+21}" y="36" text-anchor="middle" font-size="11" fill="${c.muted}">${col.label}</text>`);
 dates.forEach((date,i)=>{
   const y=46+i*18;if(i%5===0||i===dates.length-1)body+=rowLabel(date.slice(5),10,y+11,10);
   cols.forEach((col,j)=>{
     const cell=result.cells.get(`${date}|${col.key}`);const fill=skillFill(cell?.relative);
     const info=cell?`${date} · ${model} vs ${baseline} · F${col.key} · relative skill ${fmt(cell.relative)}% · ${model}: ${metricVal(metric,cell.modelValue)}, ${baseline}: ${metricVal(metric,cell.baseValue)}${cell.mismatch?' · WARNING: different verification sources':''}${cell.unknown?' · source unknown':''}`:
       `${date} · F${col.key}: N/A (missing matched daily model/baseline score)`;
     const detail={kind:'fingerprint',model,baseline,metric,region,date,lead:col.key,matched:!!cell,relative:cell?.relative,modelValue:cell?.modelValue,baseValue:cell?.baseValue,advantage:cell?.advantage,mismatch:cell?.mismatch,unknown:cell?.unknown};
     body+=`<g tabindex="0" role="button" aria-label="${esc(info)}" class="explorer-cell" data-info="${esc(info)}" data-detail="${esc(JSON.stringify(detail))}" data-date="${date}" data-lead="${col.key}"><rect x="${115+j*45}" y="${y}" width="42" height="15" rx="2.5" fill="${fill}"/></g>`;
   });
 });
 const target=$('explore-fingerprint-plot');setSvg('explore-fingerprint-plot',svgRoot(w,h,body,`${model} compared with ${baseline} — daily skill fingerprint`));
 bindInfo('explore-fingerprint-plot',{floating:true,structured:'pattern'});
 target.onclick=e=>{const cell=e.target.closest('[data-lead]');if(cell)onOpen({date:cell.dataset.date,lead:Number(cell.dataset.lead),model,baseline,metric,region})};
 target.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-lead]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}))}};
 const s=result.summary;
 $('explore-fingerprint-summary').textContent=`${s.n} matched date/hour cells across ${s.dates} distinct days · ${s.mismatched} source mismatches · ${s.unknown} unknown sources. Gray means no matched sample. Click any cell to inspect its forecast lead in Time Series.`;
}
export function renderMatrix(ds,{models,metric,region,lead,...window}){
 const result=headToHead(ds,{models,metric,region,lead,...window}),c=theme(),n=models.length;
 if(n<2){$('explore-matrix-plot').innerHTML=noData('Select at least two models.');$('explore-matrix-summary').textContent='';return}
 const w=155+n*90+24,h=80+n*67+30;let body='';
 models.forEach((m,j)=>{body+=`<text x="${155+j*90+43}" y="48" font-size="13" font-weight="700" text-anchor="middle" fill="${c.fg}">${m}</text>`});
 models.forEach((m,i)=>{
   body+=`<text x="15" y="${85+i*67+32}" font-size="13" font-weight="750" fill="${CONFIG.modelMeta[m].color==='#000000'&&document.documentElement.dataset.theme==='dark'?'#f8fbff':CONFIG.modelMeta[m].color}">${m}</text>`;
   models.forEach((other,j)=>{const stat=result.matrix[i][j],x=155+j*90,y=85+i*67;
     if(!stat){body+=`<rect x="${x}" y="${y}" width="85" height="61" rx="6" fill="${c.empty}" opacity=".45"/>`;return}
     const fill=stat.n?skillFill((stat.rate-50)/5):c.empty;
     const info=`${m} vs ${other} · F${lead} · ${stat.n} matched daily scores · ${stat.wins} wins, ${stat.losses} losses, ${stat.ties} ties · ${stat.n?stat.rate.toFixed(1)+'% win-equivalent':'N/A'} (ties count one-half) · average native-unit advantage ${Number.isFinite(stat.advantage)?stat.advantage.toPrecision(4):'N/A'} · ${stat.different} different sources · ${stat.unknown} unknown sources`;
     const detail={row:m,column:other,region,metric,lead,...stat};
     // aria-label provides a keyboard/screen-reader readout, without a second
     // overlapping browser-native SVG <title> popup.
     body+=`<g tabindex="0" role="img" aria-label="${esc(info)}" class="explorer-cell" data-info="${esc(info)}" data-detail="${esc(JSON.stringify(detail))}"><rect x="${x}" y="${y}" width="85" height="61" rx="6" fill="${fill}"/><text x="${x+42}" y="${y+29}" text-anchor="middle" font-size="19" font-weight="800" fill="${textColor(fill)}" pointer-events="none">${stat.n?stat.rate.toFixed(0)+'%':'N/A'}</text><text x="${x+42}" y="${y+47}" font-size="10" text-anchor="middle" fill="${textColor(fill)}" pointer-events="none">${stat.n?'n='+stat.n:'no pairs'}</text></g>`;
   });
 });
 setSvg('explore-matrix-plot',svgRoot(w,h,body,`Head-to-head matrix: row vs column at forecast F${lead}`));bindInfo('explore-matrix-plot',{floating:true,structured:'matrix'});
 $('explore-matrix-summary').textContent=`Rows versus columns at F${lead}: percentage of matched daily regional scores won, with ties counting half. Pairwise dates may differ between cells; diagonal is not a comparison. No event-level hit rate or statistical significance is implied.`;
}
export function renderAtlas(ds,{model,baseline,metric,regions,...window}){
 const a=atlas(ds,{model,baseline,metric,regions,...window});
 const cols=a.leads.map(h=>({label:`D${h/24}`,key:h}));
 const matrix=a.cells;
 const info=(stat,region,col)=>`${region} · F${col.key} · ${model} vs ${baseline} · ${stat?.n||0} matched dates · ${stat?.n?fmt(stat.skill)+'% skill':'N/A'}${stat?.mismatched?' · '+stat.mismatched+' different verification sources':''}${stat?.unknown?' · '+stat.unknown+' unknown sources':''}`;
 const detail=(stat,region,col)=>({kind:'atlas',model,baseline,metric,region,lead:col.key,pending:!!stat?.pending,n:stat?.n||0,dates:stat?.dates||0,skill:stat?.skill,modelValue:stat?.modelValue,baseValue:stat?.baseValue,advantage:stat?.advantage,mismatched:stat?.mismatched||0,unknown:stat?.unknown||0});
 setSvg('explore-atlas-plot',makeMapRows(matrix,info,detail,`${model} vs ${baseline} by verification domain and lead`,cols,a.regions));bindInfo('explore-atlas-plot',{floating:true,structured:'pattern'});
 $('explore-atlas-summary').textContent=`Each cell aggregates only matched daily scores within that exact region, metric, and lead; no region is substituted. Blue = improvement against ${baseline}. Gray = unavailable data. Different regions have different sample populations.`;
}
export function renderDistribution(ds,{models,baseline,metric,region,lead,...window},plotId='explore-distribution-plot'){
 const groups=distributions(ds,{models,baseline,metric,region,lead,...window});
 const actual=groups.filter(g=>g.n),c=theme();if(!actual.length){$(plotId).innerHTML=noData('N/A — no matched daily differences at this forecast lead.');$(`${plotId}-summary`).textContent='';return}
 const max=Math.max(.001,...actual.flatMap(g=>g.values.map(Math.abs)));const domain=max*1.08;
 const w=920,h=72+groups.length*65+54,left=145,right=30,plotW=w-left-right,sx=v=>left+(v+domain)/(2*domain)*plotW;let body='';
 body+=`<line x1="${sx(0)}" y1="49" x2="${sx(0)}" y2="${h-45}" stroke="${c.muted}" stroke-width="2" stroke-dasharray="5 6"/>`;
 [-1,-.5,0,.5,1].forEach(p=>{const x=sx(p*domain);body+=`<line x1="${x}" y1="49" x2="${x}" y2="${h-45}" stroke="${c.grid}"/><text x="${x}" y="${h-18}" text-anchor="middle" font-size="11" fill="${c.muted}">${(p*domain).toPrecision(3)}</text>`});
 groups.forEach((g,i)=>{const y=65+i*65,color=CONFIG.modelMeta[g.model].color;
   if(!g.n){body+=rowLabel(g.model,12,y+7,13);return}
   const mean=g.values.reduce((a,v)=>a+v,0)/g.n;
   const detail=`${g.model} vs ${baseline} · ${region} · F${lead} · ${CONFIG.metrics[metric].label} · ${g.n} matched days · mean ${mean.toPrecision(4)} · median ${g.median.toPrecision(4)} · Q1 ${g.q1.toPrecision(4)} · Q3 ${g.q3.toPrecision(4)} · minimum ${g.min.toPrecision(4)} · maximum ${g.max.toPrecision(4)} · ${g.positive} better, ${g.negative} worse, ${g.zero} tied. Advantage is in native metric units (positive = better).`;
   const colorRender=color==='#000000'&&document.documentElement.dataset.theme==='dark'?'#f5f9ff':color;
   const rowDetails={kind:'summary',model:g.model,baseline,region,lead,metric,metricLabel:CONFIG.metrics[metric].label,n:g.n,mean,median:g.median,q1:g.q1,q3:g.q3,min:g.min,max:g.max,positive:g.positive,negative:g.negative,zero:g.zero,mismatched:g.pairs.filter(p=>p.mismatch).length,unknown:g.pairs.filter(p=>p.unknown).length};
   body+=`<g tabindex="0" role="img" aria-label="${esc(detail)}" data-info="${esc(detail)}" data-detail="${esc(JSON.stringify(rowDetails))}" class="explorer-cell explorer-distribution-row"><rect x="8" y="${y-19}" width="${w-16}" height="52" fill="transparent" pointer-events="all"/><text x="12" y="${y+7}" font-size="13" fill="${c.fg}">${esc(g.model)}</text><line x1="${sx(g.min)}" y1="${y+5}" x2="${sx(g.max)}" y2="${y+5}" stroke="${colorRender}" stroke-width="2"/><line x1="${sx(g.min)}" y1="${y-3}" x2="${sx(g.min)}" y2="${y+13}" stroke="${colorRender}" stroke-width="2"/><line x1="${sx(g.max)}" y1="${y-3}" x2="${sx(g.max)}" y2="${y+13}" stroke="${colorRender}" stroke-width="2"/><rect x="${sx(g.q1)}" y="${y-9}" width="${Math.max(1,sx(g.q3)-sx(g.q1))}" height="28" rx="3" fill="${colorRender}" fill-opacity=".3" stroke="${colorRender}" stroke-width="2"/><line x1="${sx(g.median)}" y1="${y-9}" x2="${sx(g.median)}" y2="${y+19}" stroke="${colorRender}" stroke-width="3"/><text x="${w-8}" y="${y+8}" text-anchor="end" font-size="10" fill="${c.muted}">n=${g.n}</text></g>`;
   if(g.n<=90)g.pairs.forEach((p,j)=>{
     const jitter=((((j*47+19)%17)-8)/8)*5;
     const sample=`${g.model} vs ${baseline} · ${p.date} · F${lead} · ${CONFIG.metrics[metric].label} · ${g.model}: ${metricVal(metric,p.modelValue)} · ${baseline}: ${metricVal(metric,p.baseValue)} · native-unit advantage ${p.advantage>0?'+':''}${p.advantage.toPrecision(5)}${p.mismatch?' · WARNING: differing verification sources':''}${p.unknown?' · verification source unknown':''}`;
     const dayDetails={kind:'day',model:g.model,baseline,region,lead,metric,metricLabel:CONFIG.metrics[metric].label,date:p.date,modelValue:p.modelValue,baseValue:p.baseValue,advantage:p.advantage,mismatch:p.mismatch,unknown:p.unknown};
     body+=`<g tabindex="0" role="img" aria-label="${esc(sample)}" data-info="${esc(sample)}" data-detail="${esc(JSON.stringify(dayDetails))}" class="explorer-sample-dot"><circle cx="${sx(p.advantage)}" cy="${y+25+jitter}" r="7" fill="transparent" pointer-events="all"/><circle cx="${sx(p.advantage)}" cy="${y+25+jitter}" r="2.8" fill="${colorRender}" opacity=".84" pointer-events="none"/></g>`;
   });
 });
 body+=`<text x="${(left+w-right)/2}" y="${h-2}" text-anchor="middle" font-weight="700" font-size="12" fill="${c.fg}">Native-unit advantage vs ${baseline} (${CONFIG.metrics[metric].unit.trim()||'score units'}) — positive is better</text>`;
 setSvg(plotId,svgRoot(w,h,body,`Daily paired advantage distribution ${metric} at F${lead}`));bindInfo(plotId,{floating:true,structured:true});
 $(`${plotId}-summary`).textContent=`Daily paired differences, not the distribution of individual forecast errors. Boxes show quartiles and median, whiskers show observed minima/maxima, dots show individual daily summary differences (up to 90 days). Avoid interpreting their spread as gridpoint uncertainty. Hover a model row or dot for the tabulated statistics.`;
}
export function renderRolling(ds,{models,baseline,metric,region,lead,rollingDays,...window}){
 // The selected period and focus-model state must never override the rolling-window length.
 const result=rolling(ds,{...window,models,baseline,metric,region,lead,days:rollingDays});
 const series=result.series.map(s=>({name:s.model,color:CONFIG.modelMeta[s.model].color,marker:CONFIG.modelMeta[s.model].marker,markerSize:CONFIG.modelMeta[s.model].markerSize,lineWidth:CONFIG.modelMeta[s.model].lineWidth,
   data:s.points.map(p=>({x:p.x,y:p.y,label:p.label}))}));
 renderLineChart($('explore-rolling-plot'),series,{interactive:true,formatX:x=>new Date(x).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'}),formatTooltipY:y=>`${fmt(y)}%`,xAxisLabel:'Verification date',yAxisLabel:`Rolling skill vs ${baseline} (%)`,ySuffix:'%',zeroLine:true,forceZeroTick:true,maxSegmentGap:1.5*86400000,exportName:`rolling-skill_${metric}_${region}_F${lead}.png`,exportTitle:`Rolling ${rollingDays}-day Skill — ${CONFIG.metrics[metric].label}`,exportSubtitle:`${region} · F${lead} · baseline ${baseline} · at least ${Math.ceil(rollingDays/2)} matched dates per window`,emptyMessage:`N/A — need at least ${Math.ceil(rollingDays/2)} matched dates within ${rollingDays} calendar days.`});
 $('explore-rolling-summary').textContent=`A ${rollingDays}-calendar-day trailing window, recalculating the existing aggregate metric on matched daily model/baseline scores at F${lead}. At least ${Math.ceil(rollingDays/2)} matched dates are required per plotted point. Windows overlap; trends are descriptive, not significance tests.`;
}
export function renderHorizon(ds,{region,models,period,startDate,endDate}){
 const host=$('home-skill-horizon');if(!host)return;
 if(!ds.isRegionLoaded(region)||!ds.hasMetricData(region,'H500_ACC')){host.innerHTML=noData('H500 ACC verification is not available in this region.');return}
 const window=period==='custom'&&startDate&&endDate?{startDate,endDate}:{days:Number(period)||30};
 const values=skillHorizon(ds,{region,models,threshold:.8,...window});
 const html=values.map(item=>{const color=CONFIG.modelMeta[item.model].color;const readable=color==='#000000'&&document.documentElement.dataset.theme==='dark'?'#f7fbff':color;
   const label=item.status==='crossed'?`Day ${(item.hour/24).toFixed(1)}`:item.status==='before-first'?'Below at first lead':item.status==='beyond-last'?`ACC ≥0.80 at D${item.last/24}`:item.status==='gap'?'Lead gap':'N/A';
   const detail={kind:'horizon',model:item.model,region,status:item.status,n:item.n,hour:item.hour,last:item.last};
   const info=`${item.model} · H500 ACC 0.80 horizon · ${item.status} · ${label} · ${item.n} daily summaries at boundary`;
   return `<div class="horizon-tile" tabindex="0" role="img" aria-label="${esc(info)}" data-info="${esc(info)}" data-detail="${esc(JSON.stringify(detail))}"><div class="horizon-model"><i style="background:${color}"></i>${item.model}</div><strong style="color:${readable}">${esc(label)}</strong><span>${item.status==='crossed'?`ACC 0.80 · ≥${item.n} daily values`:item.status==='beyond-last'?'No observed crossing; not extrapolated':'Horizon not estimated'}</span></div>`;
 }).join('');
 host.innerHTML=html;bindInfo('home-skill-horizon',{floating:true,structured:'pattern'});
}
// Draw the complete Skill Explorer SVG with the Canvas 2D API. SVG-to-Image blob/data URLs
// can be blocked by site Content-Security-Policy (img-src), leaving Save PNG broken.
// These charts deliberately only use rect, line, circle, text and g elements.
function paintExplorerSvg(ctx,element){
 const tag=element.tagName?.toLowerCase();if(!tag||tag==='title')return;
 ctx.save();
 const attr=(key,fallback)=>element.hasAttribute(key)?element.getAttribute(key):fallback;
 const num=(key,fallback=0)=>{const v=Number(attr(key,fallback));return Number.isFinite(v)?v:fallback};
 // Skill Explorer uses SVG text transforms for rotated, full-length Y-axis titles.
 // Apply these same transforms during direct-canvas PNG export (no blob/data-image requirement).
 const transform=attr('transform','');
 if(transform){
   for(const part of transform.matchAll(/(translate|rotate)\(([^)]*)\)/g)){
     const values=part[2].trim().split(/[\s,]+/).map(Number);
     if(part[1]==='translate'&&Number.isFinite(values[0]))ctx.translate(values[0],Number.isFinite(values[1])?values[1]:0);
     else if(part[1]==='rotate'&&Number.isFinite(values[0]))ctx.rotate(values[0]*Math.PI/180);
   }
 }
 const opacity=num('opacity',1);ctx.globalAlpha*=opacity;
 const stroke=attr('stroke',null),fill=attr('fill',null);
 if(element.hasAttribute('stroke-dasharray'))ctx.setLineDash(attr('stroke-dasharray','').split(/[ ,]+/).map(Number).filter(x=>Number.isFinite(x)&&x>=0));
 ctx.lineWidth=num('stroke-width',1);
 if(tag==='rect'){
   const x=num('x'),y=num('y'),w=num('width'),h=num('height'),r=Math.max(0,num('rx'));
   if(w>0&&h>0){
     ctx.beginPath();
     if(r&&typeof ctx.roundRect==='function')ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2));
     else ctx.rect(x,y,w,h);
     if(fill&&fill!=='none'){ctx.fillStyle=fill;ctx.globalAlpha*=num('fill-opacity',1);ctx.fill();ctx.globalAlpha/=Math.max(.00001,num('fill-opacity',1))}
     if(stroke&&stroke!=='none'){ctx.strokeStyle=stroke;ctx.globalAlpha*=num('stroke-opacity',1);ctx.stroke()}
   }
 }else if(tag==='line'){
   if(stroke&&stroke!=='none'){ctx.strokeStyle=stroke;ctx.beginPath();ctx.moveTo(num('x1'),num('y1'));ctx.lineTo(num('x2'),num('y2'));ctx.globalAlpha*=num('stroke-opacity',1);ctx.stroke()}
 }else if(tag==='circle'){
   const r=num('r');if(r>0){ctx.beginPath();ctx.arc(num('cx'),num('cy'),r,0,Math.PI*2);
     if(fill&&fill!=='none'){ctx.fillStyle=fill;ctx.globalAlpha*=num('fill-opacity',1);ctx.fill();ctx.globalAlpha/=Math.max(.00001,num('fill-opacity',1))}
     if(stroke&&stroke!=='none'){ctx.strokeStyle=stroke;ctx.globalAlpha*=num('stroke-opacity',1);ctx.stroke()}
   }
 }else if(tag==='text'){
   const fontSize=num('font-size',12),weight=attr('font-weight','400');
   ctx.font=`${weight} ${fontSize}px Inter, Segoe UI, Arial, sans-serif`;
   const anchor=attr('text-anchor','start');ctx.textAlign=anchor==='middle'?'center':anchor==='end'?'right':'left';
   ctx.textBaseline='alphabetic';ctx.fillStyle=fill&&fill!=='none'?fill:theme().fg;
   ctx.globalAlpha*=num('fill-opacity',1);
   ctx.fillText(element.textContent||'',num('x'),num('y'));
 }
 if(tag==='svg'||tag==='g')for(const child of element.children)paintExplorerSvg(ctx,child);
 ctx.restore();
}
// Canvas path avoids CSP restrictions on SVG blob images and exports all rows even
// when the on-screen SVG is inside a horizontally/vertically scrolling container.
export async function exportExplorerSvg(id,filename,title,subtitle){
 const svg=$(id)?.querySelector('svg');if(!svg)throw new Error('No chart SVG available');
 const w=Number(svg.getAttribute('width')),h=Number(svg.getAttribute('height'));
 if(!(w>0&&h>0))throw new Error('SVG size unavailable');
 const pad=26,header=93,scale=2,canvas=document.createElement('canvas');
 canvas.width=Math.ceil((w+pad*2)*scale);canvas.height=Math.ceil((h+header+pad)*scale);
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D unavailable');
 ctx.scale(scale,scale);const c=theme();ctx.fillStyle=c.bg;ctx.fillRect(0,0,w+pad*2,h+header+pad);
 ctx.fillStyle=c.fg;ctx.font='bold 21px Inter, Segoe UI, Arial, sans-serif';ctx.fillText(title.slice(0,100),pad,39);
 ctx.fillStyle=c.muted;ctx.font='13px Inter, Segoe UI, Arial, sans-serif';ctx.fillText(subtitle.slice(0,148),pad,64);
 ctx.save();ctx.translate(pad,header);paintExplorerSvg(ctx,svg);ctx.restore();
 const link=document.createElement('a');link.href=canvas.toDataURL('image/png');link.download=filename;
 document.body.appendChild(link);link.click();link.remove();
}
