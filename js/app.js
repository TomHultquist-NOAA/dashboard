import { CONFIG, metricKeys, variableKeys, metricsForVariable } from './config.js?v=1.3.2';
import { DataService } from './data-service.js?v=1.3.2';
import { renderLineChart, cleanAxisTickLabel } from './charts.js?v=1.3.8';
import { buildTimeSeriesPeriodSummary } from './time-series-summary.js?v=1.3.8';
import { buildSkillSignificanceBoxes } from './significance.js?v=1.3.2';
import { effectiveLeadSeries } from './effective-lead.js?v=1.3.2';
import { exportTablesPng, exportTablesCsv } from './table-export.js?v=1.3.2';
import {renderFingerprint,renderMatrix,renderAtlas,renderDistribution,renderRolling,renderHorizon,exportExplorerSvg} from './explorer-view.js?v=1.3.9';
import {renderAdvantageEnvelope,renderWinFrequency,renderMetricTradeoffs,renderBootstrap} from './explorer-advanced-view.js?v=1.3.9';
import {renderLeadership,renderCases,renderScatter,renderBiasEvolution,renderPortrait,renderRobustness,renderCoverage} from './explorer-diagnostic-view.js?v=1.3.11';

const data=new DataService();
// Diagnostic information is available through the browser console without
// adding implementation-only details to the public-facing interface.
window.omdDashboardDiagnostics=()=>({
  version:'1.3.11',
  loadedRegions:[...data.loadedRegions],
  regions:Object.fromEntries([...data.regionDiagnostics.entries()])
});
const $=id=>document.getElementById(id);
const MODELS=Object.keys(CONFIG.modelMeta);
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmtPct=v=>Number.isFinite(v)?`${v>0?'+':''}${v.toFixed(1)}%`:'N/A';
const leadLabel=h=>`D${Number(h)/24}`;
const dateShort=ms=>new Date(ms).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
const dateFull=ms=>new Date(ms).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const iso=d=>new Date(d).toISOString().slice(0,10);

const state={
  route:'home',
  home:{modelGroup:'Global',region:CONFIG.defaultRegion,period:'30',customStart:null,customEnd:null,baseline:'GFS',primaryMetric:'H500_ACC',forecastLead:120,comparisonMode:'date_lead',models:[...MODELS]},
  skill:{variable:'H500',metric:'H500_ACC',region:CONFIG.defaultRegion,baseline:'GFS',period:'30',customStart:null,customEnd:null,models:[...MODELS]},
  score:{region:CONFIG.defaultRegion,baseline:'GFS',period:'30',customStart:null,customEnd:null,comparisonMode:'date_lead'},
  explorer:{region:CONFIG.defaultRegion,metric:'H500_ACC',model:'AIGFS',baseline:'GFS',lead:120,period:'30',rollingDays:7,customStart:null,customEnd:null,models:[...MODELS]},
  ts:{variable:'H500',metric:'H500_ACC',region:CONFIG.defaultRegion,lead:120,period:'30',customStart:null,customEnd:null,models:[...MODELS]}
};

function currentTheme(){return document.documentElement.dataset.theme==='light'?'light':'dark'}
function modelColor(model){return CONFIG.modelMeta[model].color}
function chartModelStyle(model){const {marker,markerSize,lineWidth}=CONFIG.modelMeta[model];return {marker,markerSize,lineWidth}}
function metricFmt(metricKey,value){const m=CONFIG.metrics[metricKey];return Number.isFinite(value)?`${value.toFixed(m.decimals)}${m.unit}`:'N/A'}
function metricAxisLabel(metricKey){
  const m=CONFIG.metrics[metricKey],unit=(m.unit||'').trim();
  return unit?`${m.metricType} (${unit})`:m.metricType;
}
function tone(v){return v>1.5?'good':v<-1.5?'bad':'neutral'}
function metricDirectionText(m){return m.direction==='lower'?'Lower is better.':m.direction==='higher'?'Higher is better.':'Values closer to zero are better.'}
function variableForMetric(k){return CONFIG.variables[CONFIG.metrics[k].variable]}
function options(el,values,label=v=>v,value=v=>v){el.innerHTML=values.map(v=>`<option value="${value(v)}">${label(v)}</option>`).join('')}

// The menu includes any metric with actual verification in a supported domain.
// Each chart displays only one real domain; choosing a cross-domain metric
// switches its region, while the scorecards can label domains per metric.
function regionForMetric(metric,selectedRegion){
  if(data.hasMetricData(selectedRegion,metric))return selectedRegion;
  for(const fallback of ['CONUS','Global']){
    if(fallback!==selectedRegion&&data.hasMetricData(fallback,metric))return fallback;
  }
  return selectedRegion;  // N/A is preserved if no region has that product.
}
function isMetricAvailable(metric,region){
  return data.hasMetricData(region,metric)||data.hasMetricData('CONUS',metric)||data.hasMetricData('Global',metric);
}
function metricRegionLabel(metric,selectedRegion){
  const actual=regionForMetric(metric,selectedRegion);
  if(!data.hasMetricData(actual,metric))return 'N/A — no verification data';
  return actual===selectedRegion?`${actual} (selected region)`:actual==='CONUS'?`CONUS only · selected: ${selectedRegion}`:`${actual} (used; selected: ${selectedRegion})`;
}
function metricOptionLabel(metric,region){
  const actual=regionForMetric(metric,region);
  return CONFIG.metrics[metric].label+(actual!==region&&data.hasMetricData(actual,metric)?` (${actual})`:'');
}
function chooseMetricForRegion(s){
  if(data.hasMetricData(s.region,s.primaryMetric||s.metric))return;
  const choice=(s.variable?metricsForVariable(s.variable):metricKeys()).find(k=>data.hasMetricData(s.region,k))
      ||metricKeys().find(k=>data.hasMetricData(s.region,k));
  if(choice){if('primaryMetric' in s)s.primaryMetric=choice;else{s.metric=choice;s.variable=CONFIG.metrics[choice].variable}}
}
// A single region selection is shared by every page. In earlier releases,
// Home, Skill vs Lead, Scorecard, and Time Series each kept a separate region:
// a metric-driven switch to CONUS consequently left the Scorecard on an old
// domain. Keep the selection synchronized, while scorecards continue to select
// the actual available domain independently for each metric.
const REGION_PAGES=['home','skill','score','ts','explorer'];
let regionSelectionId=0;
function selectDashboardRegion(nextRegion,{origin,fromMetric=false}={}){
  if(!CONFIG.regions.includes(nextRegion))return;
  const requestId=++regionSelectionId;
  for(const page of REGION_PAGES){
    state[page].region=nextRegion;
    const control=$(`${page}-region-filter`);
    if(control)control.value=nextRegion;
  }
  const finish=()=>{
    // An older asynchronous region fetch must not override a more recent choice.
    if(requestId!==regionSelectionId)return;
    for(const page of ['home','skill','ts']){
      // Preserve the metric that CAUSED an automatic region change. On other
      // pages (and on a manual region change), select a real metric in the new
      // region rather than leaving an unavailable plot behind.
      if(fromMetric&&page===origin)continue;
      chooseMetricForRegion(state[page]);
    }
    syncDateLimits();updateDataStatus();renderCurrent();
  };
  if(data.isRegionLoaded(nextRegion)){finish();return}
  $('data-status').textContent=`Loading ${nextRegion} verification data…`;
  // Do not continue to display a stale scorecard as if it represented the
  // newly selected domain while its regional CSV is still loading.
  if(state.route==='home'){
    $('home-scorecard-region-note').textContent=`Loading ${nextRegion} verification data…`;
    $('home-scorecard-table').replaceChildren();
  }else if(state.route==='scorecard'){
    $('scorecard-context').textContent=`Loading ${nextRegion} verification data…`;
    $('scorecard-sections').replaceChildren();
  }
  data.ensureRegion(nextRegion).then(finish).catch(err=>{
    if(requestId!==regionSelectionId)return;
    console.error(err);
    document.querySelector('.status-dot')?.classList.add('error');
    $('data-status').textContent=`Unable to load ${nextRegion}`;
  });
}
function useActualMetricRegion(s,metric,origin){
  const actual=regionForMetric(metric,s.region);
  if(actual!==s.region&&data.hasMetricData(actual,metric)){
    selectDashboardRegion(actual,{origin,fromMetric:true});
    return;
  }
  renderCurrent();
}
function availableOptions(el,values,label,isEnabled,selection){
  el.replaceChildren();
  const available=values.filter(isEnabled);
  if(!available.length){
    const placeholder=document.createElement('option');
    placeholder.value='';placeholder.textContent='No data available — N/A';
    placeholder.disabled=true;el.appendChild(placeholder);
  }
  for(const value of values){
    const option=document.createElement('option');
    option.value=value;
    option.textContent=label(value)+(isEnabled(value)?'':' — N/A');
    option.disabled=!isEnabled(value);
    if(option.disabled)option.title='Verification data not yet available';
    el.appendChild(option);
  }
  el.value=available.length?(available.includes(selection)?selection:available[0]):'';
  return available.length?el.value:null;
}
function populateHomeMetric(){
  const s=state.home;
  const selected=availableOptions($('home-primary-metric-filter'),metricKeys(),
    k=>metricOptionLabel(k,s.region),k=>isMetricAvailable(k,s.region),s.primaryMetric);
  if(selected)s.primaryMetric=selected;
}
function periodOptions(el){
  el.innerHTML=CONFIG.periods.map(d=>`<option value="${d}">Last ${d} Days</option>`).join('')+`<option value="custom">Custom Range…</option>`;
}
function rangeArgs(s){
  if(s.period==='custom'&&s.customStart&&s.customEnd)return {startDate:s.customStart,endDate:s.customEnd};
  return {days:Number(s.period)||CONFIG.defaultPeriodDays};
}
function rangeLabel(s){
  if(s.period==='custom'&&s.customStart&&s.customEnd)return `${dateFull(new Date(`${s.customStart}T00:00:00Z`).getTime())} – ${dateFull(new Date(`${s.customEnd}T00:00:00Z`).getTime())}`;
  return `last ${s.period} days`;
}
function setCustomVisible(prefix,s){
  const active=s.period==='custom';
  const startWrap=$(`${prefix}-start-wrap`),endWrap=$(`${prefix}-end-wrap`);
  startWrap?.classList.toggle('hidden',!active);
  endWrap?.classList.toggle('hidden',!active);
  startWrap?.closest('.custom-date-pair')?.classList.toggle('hidden',!active);
  // Only Custom Range needs compact date fields; presets keep their usual grid.
  startWrap?.closest('.selector-fields')?.classList.toggle('custom-range-active',active);
}
function syncDateLimits(){
  const yesterday=new Date();yesterday.setUTCHours(0,0,0,0);yesterday.setUTCDate(yesterday.getUTCDate()-1);
  const latest=data.latestDate||yesterday,earliest=data.earliestDate||new Date(latest.getTime()-89*86400000);
  const min=iso(earliest),max=iso(latest);
  for(const prefix of ['home','skill','score','ts','explore']){
    const s=state[prefix==='score'?'score':prefix==='explore'?'explorer':prefix];
    const start=$(`${prefix}-start-date`),end=$(`${prefix}-end-date`);if(!start||!end)continue;
    start.min=min;start.max=max;end.min=min;end.max=max;
    if(!s.customEnd || s.customEnd>max)s.customEnd=max;
    if(!s.customStart){const d=new Date(latest);d.setUTCDate(d.getUTCDate()-29);s.customStart=iso(d)}
    start.value=s.customStart;end.value=s.customEnd;
  }
}
function handleCustomDates(prefix,s,callback){
  const start=$(`${prefix}-start-date`),end=$(`${prefix}-end-date`);if(!start||!end)return;
  const update=()=>{
    if(!start.value||!end.value)return;
    let a=start.value,b=end.value;if(a>b){[a,b]=[b,a];start.value=a;end.value=b}
    const min=start.min,max=start.max;if(a<min){a=min;start.value=a}if(b>max){b=max;end.value=b}
    s.customStart=a;s.customEnd=b;callback();
  };
  start.addEventListener('change',update);end.addEventListener('change',update);
}

function updateDataStatus(){
  if(!data.latestDate){$('data-status').textContent='EVS data unavailable — N/A';document.querySelector('.status-dot')?.classList.remove('ok');return;}
  $('data-status').textContent=`Data through ${dateFull(data.latestDate.getTime())} · ${data.loadedRegions.size} region${data.loadedRegions.size===1?'':'s'} loaded`;
  const footerDate=$('footer-verification-date');if(footerDate){footerDate.textContent=dateFull(data.latestDate.getTime());footerDate.dateTime=iso(data.latestDate)}
}
function ensureRegionReady(region,callback){
  if(data.isRegionLoaded(region))return true;
  $('data-status').textContent=`Loading ${region} verification data…`;
  data.ensureRegion(region).then(()=>{syncDateLimits();updateDataStatus();callback()}).catch(err=>{console.error(err);document.querySelector('.status-dot').className='status-dot error';$('data-status').textContent=`Unable to load ${region}`});
  return false;
}

function initTheme(){
  const apply=()=>{const target=currentTheme()==='dark'?'light':'dark';$('theme-toggle').title=`Switch to ${target} mode`;$('theme-toggle').setAttribute('aria-label',`Switch to ${target} mode`)};
  apply();$('theme-toggle').onclick=()=>{document.documentElement.dataset.theme=currentTheme()==='dark'?'light':'dark';localStorage.setItem('omd-dashboard-theme',currentTheme());apply();renderCurrent()};
}
function initNavigation(){
  document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{if(b.dataset.route==='timeseries')state.ts.referenceDate=null;setRoute(b.dataset.route)});
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>setRoute(b.dataset.go));
  $('menu-toggle').onclick=()=>{$('sidebar').classList.add('open');$('sidebar-backdrop').classList.add('visible')};
  $('sidebar-backdrop').onclick=()=>{$('sidebar').classList.remove('open');$('sidebar-backdrop').classList.remove('visible')};
  document.querySelectorAll('[data-scroll-to]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();document.getElementById(link.dataset.scrollTo)?.scrollIntoView({behavior:'smooth',block:'start'})}));
  window.addEventListener('hashchange',()=>{const r=location.hash.replace('#/','');if(['home','skill','explorer','scorecard','timeseries','methodology','changelog'].includes(r))setRoute(r,true)});
}
function setRoute(route,fromHash=false){
  const changed=state.route!==route;
  state.route=route;document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===route));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.route===route));
  const titles={home:['OMD Model Performance Dashboard','Rapid model-performance situational awareness using EVS verification statistics'],skill:['Skill vs Forecast Lead','Compare model skill across forecast lead against a selectable baseline'],explorer:['Skill Explorer','Advanced analysis of matched daily verification summaries by model, lead, and region'],scorecard:['Verification Scorecard','Compact baseline-relative verification panels across models and forecast leads'],timeseries:['Performance Time Series','Examine daily verification behavior over the previous 90 days'],methodology:['Methodology','Metric definitions, score aggregation, rankings, and data caveats'],changelog:['Changelog','Dashboard feature and implementation history']};
  $('page-title').textContent=titles[route][0];$('page-subtitle').textContent=titles[route][1];$('page-beta').classList.toggle('hidden',route!=='explorer');document.body.classList.toggle('home-route',route==='home');
  $('sidebar').classList.remove('open');$('sidebar-backdrop').classList.remove('visible');if(!fromHash)history.replaceState(null,'',`#/${route}`);if(changed)window.scrollTo(0,0);renderCurrent();
}


// Selection and temporary hover highlighting are independent: hovering a model
// never changes which traces are enabled. The chart uses the same highlight API
// as the ranking graph on Home.
function highlightModelChip(id,model){
  const box=$(id);
  if(!box)return;
  const active=!!model&&[...box.querySelectorAll('.chip.active')].some(b=>b.dataset.model===model);
  box.classList.toggle('model-hover',active);
  box.querySelectorAll('.chip').forEach(b=>b.classList.toggle('hovered',active&&b.dataset.model===model));
}
function renderChips(id,available,selected,onChange,onHover=null){
  const box=$(id);box.innerHTML='';
  for(const model of available){
    const b=document.createElement('button');b.type='button';
    b.className=`chip ${selected.includes(model)?'active':''}`;
    b.dataset.model=model;
    b.setAttribute('aria-pressed',String(selected.includes(model)));
    b.style.setProperty('--chip-color',modelColor(model));
    b.innerHTML=`<span class="chip-dot" style="background:${modelColor(model)}"></span>${model}`;
    b.onclick=()=>{const next=selected.includes(model)?selected.filter(x=>x!==model):[...selected,model];onChange(next)};
    if(onHover){
      const show=()=>{const name=selected.includes(model)?model:null;highlightModelChip(id,name);onHover(name)};
      const clear=()=>{highlightModelChip(id,null);onHover(null)};
      b.addEventListener('mouseenter',show);
      b.addEventListener('mouseleave',clear);
      b.addEventListener('focus',show);
      b.addEventListener('blur',clear);
    }
    box.appendChild(b);
  }
}

function skillGrade(skill){
  if(!Number.isFinite(skill))return 0;
  const magnitude=Math.sqrt(clamp(Math.abs(skill)/10,0,1));
  return Math.sign(skill)*magnitude;
}
function mix(a,b,t){return a.map((v,i)=>Math.round(v+(b[i]-v)*t))}
function heatColor(grade){
  // Opaque, colorblind-aware diverging scale inspired by Brightband: red -> neutral gray -> blue.
  const deepRed=[178,24,43],midRed=[214,72,63],lightRed=[244,165,130];
  const gray=currentTheme()==='light'?[224,228,233]:[82,92,106];
  const lightBlue=[146,197,222],midBlue=[67,147,195],deepBlue=[33,102,172];
  const g=clamp(grade,-1,1);let rgb;
  if(g<=-.66)rgb=mix(deepRed,midRed,(g+1)/.34);
  else if(g<=-.33)rgb=mix(midRed,lightRed,(g+.66)/.33);
  else if(g<0)rgb=mix(lightRed,gray,(g+.33)/.33);
  else if(g<.33)rgb=mix(gray,lightBlue,g/.33);
  else if(g<.66)rgb=mix(lightBlue,midBlue,(g-.33)/.33);
  else rgb=mix(midBlue,deepBlue,(g-.66)/.34);
  return `rgb(${rgb.join(',')})`;
}
function heatText(grade){return Math.abs(grade)>.58?'#fff':currentTheme()==='light'?'#142033':'#f3f7fd'}

// The effective lead-time table uses the same red/gray/blue scorecard palette,
// with a fixed hourly scale so identical gains have identical colors as
// models, date windows, and the selected baseline change. +/-48h saturates.
function effectiveLeadGrade(hours){
  if(!Number.isFinite(hours))return 0;
  return Math.sign(hours)*Math.sqrt(clamp(Math.abs(hours)/48,0,1));
}
// Use high-contrast text for intermediate palette shades in either theme.
// Black/white selection keeps small table labels legible even at mid blues.
function effectiveLeadTextColor(color){
  const linear=color.match(/\d+/g).map(Number).map(v=>v/255)
    .map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));
  const luminance=0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
  return luminance>0.179?'#000000':'#ffffff';
}
// A plotted zero is a real same-hour fitted quality match. An unplotted
// value must NEVER be silently replaced by zero: the source data can exist
// without the mathematical equivalent being inside the sampled lead range.
function effectiveLeadStatusText(row){
  if(!row)return 'N/A';
  if(row.status==='matched')return 'Matched';
  if(row.status==='below-range')return `Before F${row.boundaryHour}`;
  if(row.status==='beyond-range')return `Beyond F${row.boundaryHour}`;
  if(row.status==='gap')return `Gap F${row.gapStart}–F${row.gapEnd}`;
  if(row.status==='no-baseline-data')return 'No baseline data';
  if(row.status==='no-model-data')return 'No model data';
  if(row.status==='insufficient')return 'Insufficient leads';
  return 'N/A';
}
function effectiveLeadExplanation(row,model,baseline){
  if(!row)return 'No equivalent-hour result is available; this is not 0 h.';
  if(row.status==='no-baseline-data')return `No available daily ${baseline} verification mean at F${row.baselineHour} for this metric, region, and date window. A baseline quality target cannot be defined; this is not 0 h.`;
  if(row.status==='no-model-data')return `No daily ${model} verification means are available at any configured forecast lead for this metric, region, and date window. This is not 0 h.`;
  const range=Number.isFinite(row.firstModelHour)?`Available ${model} lead range: F${row.firstModelHour}–F${row.lastModelHour}. `:'';
  const prefix=`${baseline} F${row.baselineHour} uses ${row.baselineN} available daily scores; the ${model} curve uses its own available daily samples (not necessarily the same dates). ${range}`;
  if(row.status==='matched')return `${prefix}Equivalent ${model} lead: F${row.modelHour.toFixed(1)}. ${Math.abs(row.gain)<0.05?'0.0 h, no estimated lead-time difference.':`${row.gain>=0?'+':''}${row.gain.toFixed(1)} h estimated difference.`}${row.sameLead?' Fitted model and baseline quality are equal at the same forecast hour.':''}`;
  if(row.status==='below-range')return `${prefix}${model} does not reach ${baseline}'s quality at this lead even at its first available forecast hour (F${row.boundaryHour}). The equivalent would require an earlier lead; no extrapolation or invented zero.`;
  if(row.status==='beyond-range')return `${prefix}${model} still exceeds ${baseline}'s target quality at its last available forecast hour (F${row.boundaryHour}). The equivalent would be later; no extrapolation or invented zero.`;
  if(row.status==='gap')return `${prefix}Equivalent quality falls between model F${row.gapStart} and F${row.gapEnd}, but an intermediate model forecast-hour mean is missing. No interpolation across missing 24-hour steps.`;
  return `${prefix}There are too few distinct model forecast-hour means to invert the curve at this target; this is not 0 h.`;
}
function effectiveLeadCell(row){
  if(!row || row.status!=='matched')return `<span class="effective-lead-unavailable">${effectiveLeadStatusText(row)}</span>`;
  if(!Number.isFinite(row.gain)||!Number.isFinite(row.modelHour))return 'N/A';
  const color=heatColor(effectiveLeadGrade(row.gain));
  const gain=Math.abs(row.gain)<0.05?0:row.gain;
  const label=`${gain>0?'+':''}${gain.toFixed(1)} h (F${row.modelHour.toFixed(1)})`;
  return `<span class="heat effective-lead-heat" style="background:${color};color:${effectiveLeadTextColor(color)}">${label}</span>`;
}
function effectiveLeadCoverageMatrix(curves,baseline){
  const statusIcon=row=>!row||row.status==='no-baseline-data'?'–':row.status==='no-model-data'?'∅':row.status==='matched'?(Math.abs(row.gain)<0.05?'0':'●'):
    row.status==='below-range'?'‹':row.status==='beyond-range'?'›':row.status==='gap'?'×':'?';
  const statusClass=row=>!row?'no-baseline-data':row.status;
  const headings=CONFIG.leads.map(h=>`<th scope="col" title="Baseline F${h}">D${h/24}</th>`).join('');
  const body=curves.map(curve=>{
    const lookup=new Map(curve.rows.map(row=>[row.baselineHour,row]));
    const cells=CONFIG.leads.map(hour=>{
      const row=lookup.get(hour),reason=effectiveLeadExplanation(row,curve.model,baseline);
      return `<td><span tabindex="0" title="${reason.replaceAll('"','&quot;')}" class="lead-status-chip ${statusClass(row)}" aria-label="${reason.replaceAll('"','&quot;')}">${statusIcon(row)}</span></td>`;
    }).join('');
    return `<tr><th scope="row"><span class="effective-model-label"><i style="background:${modelColor(curve.model)}"></i>${curve.model}</span></th>${cells}</tr>`;
  }).join('');
  return `<thead><tr><th scope="col">Model</th>${headings}</tr></thead><tbody>${body}</tbody>`;
}

function populateVariableMetric(variableId,metricId,stateObj){
  const available=k=>isMetricAvailable(k,stateObj.region);
  const vars=variableKeys();
  const selectedVariable=availableOptions($(variableId),vars,
    v=>CONFIG.variables[v].label,v=>metricsForVariable(v).some(available),stateObj.variable);
  if(selectedVariable)stateObj.variable=selectedVariable;
  // With an empty data archive, retain a valid internal metric for N/A chart
  // rendering while presenting a disabled "No data available" placeholder.
  const metrics=metricsForVariable(stateObj.variable);
  const selectedMetric=availableOptions($(metricId),metrics,
    k=>metricOptionLabel(k,stateObj.region),available,stateObj.metric);
  if(selectedMetric)stateObj.metric=selectedMetric;
}

function initHomeControls(){
  options($('home-model-group-filter'),['Global']);
  options($('home-region-filter'),CONFIG.regions);periodOptions($('home-period-filter'));options($('home-baseline-filter'),MODELS);populateHomeMetric();options($('home-lead-filter'),['all',...CONFIG.leads],v=>v==='all'?'All':`${leadLabel(v)} (${v} h)`);
  const bind=()=>{const s=state.home;$('home-model-group-filter').value='Global';$('home-region-filter').value=s.region;$('home-period-filter').value=s.period;$('home-baseline-filter').value=s.baseline;$('home-primary-metric-filter').value=s.primaryMetric;$('home-lead-filter').value=s.forecastLead;setCustomVisible('home',s)};bind();
  $('home-model-group-filter').onchange=()=>{state.home.modelGroup='Global';renderHome()};
  $('home-region-filter').onchange=e=>selectDashboardRegion(e.target.value,{origin:'home'});$('home-period-filter').onchange=e=>{state.home.period=e.target.value;setCustomVisible('home',state.home);renderHome()};$('home-baseline-filter').onchange=e=>{state.home.baseline=e.target.value;renderHome()};$('home-primary-metric-filter').onchange=e=>{state.home.primaryMetric=e.target.value;useActualMetricRegion(state.home,state.home.primaryMetric,'home')};$('home-lead-filter').onchange=e=>{state.home.forecastLead=e.target.value==='all'?'all':Number(e.target.value);renderHome()};$('home-select-all').onclick=()=>{state.home.models=[...MODELS];renderHome()};$('home-clear-all').onclick=()=>{state.home.models=[];renderHome()};handleCustomDates('home',state.home,renderHome);
  $('reset-btn').onclick=()=>{Object.assign(state.home,{modelGroup:'Global',period:'30',baseline:'GFS',primaryMetric:'H500_ACC',forecastLead:120,comparisonMode:'date_lead',models:[...MODELS]});bind();selectDashboardRegion(CONFIG.defaultRegion,{origin:'home'})};
}

function initDetailControls(){
  // Skill
  populateVariableMetric('skill-variable-filter','skill-metric-filter',state.skill);options($('skill-region-filter'),CONFIG.regions);options($('skill-baseline-filter'),MODELS);periodOptions($('skill-period-filter'));
  $('skill-region-filter').value=state.skill.region;$('skill-baseline-filter').value=state.skill.baseline;$('skill-period-filter').value=state.skill.period;
  $('skill-variable-filter').onchange=e=>{state.skill.variable=e.target.value;state.skill.metric=metricsForVariable(state.skill.variable).find(k=>isMetricAvailable(k,state.skill.region))||metricsForVariable(state.skill.variable)[0];useActualMetricRegion(state.skill,state.skill.metric,'skill')};$('skill-metric-filter').onchange=e=>{state.skill.metric=e.target.value;useActualMetricRegion(state.skill,state.skill.metric,'skill')};$('skill-region-filter').onchange=e=>selectDashboardRegion(e.target.value,{origin:'skill'});$('skill-baseline-filter').onchange=e=>{state.skill.baseline=e.target.value;renderSkill()};$('skill-period-filter').onchange=e=>{state.skill.period=e.target.value;setCustomVisible('skill',state.skill);renderSkill()};handleCustomDates('skill',state.skill,renderSkill);$('skill-select-all').onclick=()=>{state.skill.models=[...MODELS];renderSkill()};$('skill-clear-all').onclick=()=>{state.skill.models=[];renderSkill()};
  // Scorecard
  options($('score-region-filter'),CONFIG.regions);options($('score-baseline-filter'),MODELS);initComparisonOptions('score');periodOptions($('score-period-filter'));$('score-region-filter').value=state.score.region;$('score-baseline-filter').value=state.score.baseline;$('score-comparison-filter').value=state.score.comparisonMode;$('score-period-filter').value=state.score.period;$('score-region-filter').onchange=e=>selectDashboardRegion(e.target.value,{origin:'score'});$('score-baseline-filter').onchange=e=>{state.score.baseline=e.target.value;renderScorecardPage()};$('score-comparison-filter').onchange=e=>{state.score.comparisonMode=e.target.value;renderScorecardPage()};$('score-period-filter').onchange=e=>{state.score.period=e.target.value;setCustomVisible('score',state.score);renderScorecardPage()};handleCustomDates('score',state.score,renderScorecardPage);
  // Time series
  populateVariableMetric('ts-variable-filter','ts-metric-filter',state.ts);options($('ts-region-filter'),CONFIG.regions);options($('ts-lead-filter'),['all',...CONFIG.leads],v=>v==='all'?'All Forecast Leads':`${leadLabel(v)} (${v} h)`);periodOptions($('ts-period-filter'));$('ts-region-filter').value=state.ts.region;$('ts-lead-filter').value=state.ts.lead;$('ts-period-filter').value=state.ts.period;
  $('ts-variable-filter').onchange=e=>{state.ts.variable=e.target.value;state.ts.metric=metricsForVariable(state.ts.variable).find(k=>isMetricAvailable(k,state.ts.region))||metricsForVariable(state.ts.variable)[0];useActualMetricRegion(state.ts,state.ts.metric,'ts')};$('ts-metric-filter').onchange=e=>{state.ts.metric=e.target.value;useActualMetricRegion(state.ts,state.ts.metric,'ts')};$('ts-region-filter').onchange=e=>selectDashboardRegion(e.target.value,{origin:'ts'});$('ts-lead-filter').onchange=e=>{state.ts.lead=e.target.value==='all'?'all':Number(e.target.value);renderTimeSeries()};$('ts-period-filter').onchange=e=>{state.ts.period=e.target.value;setCustomVisible('ts',state.ts);renderTimeSeries()};handleCustomDates('ts',state.ts,renderTimeSeries);$('ts-select-all').onclick=()=>{state.ts.models=[...MODELS];renderTimeSeries()};$('ts-clear-all').onclick=()=>{state.ts.models=[];renderTimeSeries()};
}

let explorerRegionLoading=false,explorerRegionsRequested=false;
let explorerTab='patterns',explorerErrorVariable='H500',tradeoffX='H500_ACC',tradeoffY='H500_RMSE';
const explorerSectionInfo={
 patterns:{title:'Performance Patterns',description:'Date-by-lead fingerprints, lead-time advantage envelopes, regional patterns, rolling shifts and daily consistency.',
  lead:'Forecast Lead affects Rolling Skill Shifts and Performance Consistency. Fingerprint, Advantage Envelope and Regional Atlas show all available leads.',
  models:'Used by Rolling Skill Shifts and Performance Consistency; the Fingerprint and Envelope use Focus Model versus Baseline.'},
 comparisons:{title:'Model Comparisons',description:'Examine head-to-head wins, magnitude-versus-frequency trade-offs and two-metric Pareto frontiers on common samples.',
  lead:'Forecast Lead controls all three Model Comparisons graphics.',
  models:'Used in all Model Comparisons; metric trade-offs use common dates across selected eligible models.'},
 cases:{title:'Diagnostic Cases',description:'Find interesting verification dates and forecast leads. The Leadership Mosaic adapts to available models; case table and scatterplot compare focus versus baseline.',
  lead:'Forecast Lead affects Verification Case Finder and Paired Scatterplot; the Leadership Mosaic shows all D0–D15.',
  models:'Used by the Leadership Mosaic.'},
 errors:{title:'Error Diagnostics',description:'Inspect signed bias evolution and the relationship between absolute mean bias and RMSE.',
  lead:'Forecast Lead is not used in Error Diagnostics: both graphics show all available D0–D15 leads.',
  models:'Used by the Bias–RMSE Portrait; signed Bias Evolution uses the focus model.'},
 robustness:{title:'Comparison Robustness',description:'Explore block-bootstrap variability and sensitivity to individual verification weeks.',
  lead:'Forecast Lead affects the bootstrap, Leave-One-Week-Out and the experimental comparison.',
  models:'The bootstrap and weekly robustness use Focus Model versus Baseline.'}
};
function refreshExplorerSectionGuide(){
 const guide=explorerSectionInfo[explorerTab],s=state.explorer;
 $('explore-section-help-title').textContent=guide.title;
 $('explore-section-help').textContent=guide.description;
 $('explore-active-section-caption').textContent='Change selections below; relevant charts update automatically.';
 $('explore-lead-impact-note').textContent=guide.lead;
 $('explore-lead-filter-wrap').hidden=explorerTab==='errors';
 $('explore-model-count').textContent=`${s.models.length} of ${MODELS.length} selected`;
 $('explore-model-uses').textContent=guide.models;
 $('explore-quality').hidden=explorerTab==='errors';
}
function initExplorerControls(){
  const s=state.explorer;
  options($('explore-metric-filter'),metricKeys(),k=>CONFIG.metrics[k].label);
  options($('explore-region-filter'),CONFIG.regions);
  options($('explore-model-filter'),MODELS);options($('explore-baseline-filter'),MODELS);
  options($('explore-lead-filter'),CONFIG.leads,h=>`D${h/24} (F${h})`);
  periodOptions($('explore-period-filter'));$('explore-rolling-days').value=String(s.rollingDays);
  $('explore-metric-filter').onchange=e=>{s.metric=e.target.value;useActualMetricRegion(s,s.metric,'explorer')};
  $('explore-region-filter').onchange=e=>selectDashboardRegion(e.target.value,{origin:'explorer'});
  $('explore-model-filter').onchange=e=>{s.model=e.target.value;if(s.model===s.baseline)s.baseline=MODELS.find(m=>m!==s.model);renderExplorer()};
  $('explore-baseline-filter').onchange=e=>{s.baseline=e.target.value;if(s.model===s.baseline)s.model=MODELS.find(m=>m!==s.baseline);renderExplorer()};
  $('explore-lead-filter').onchange=e=>{s.lead=Number(e.target.value);renderExplorer()};
  $('explore-period-filter').onchange=e=>{s.period=e.target.value;setCustomVisible('explore',s);renderExplorer()};
  $('explore-rolling-days').onchange=e=>{s.rollingDays=Number(e.target.value);renderExplorer()};
  options($('explore-tradeoff-x'),metricKeys(),k=>CONFIG.metrics[k].label);
  options($('explore-tradeoff-y'),metricKeys(),k=>CONFIG.metrics[k].label);
  $('explore-tradeoff-x').value=tradeoffX;$('explore-tradeoff-y').value=tradeoffY;
  $('explore-tradeoff-x').onchange=e=>{tradeoffX=e.target.value;renderExplorer()};
  $('explore-tradeoff-y').onchange=e=>{tradeoffY=e.target.value;renderExplorer()};
  $('explore-select-all').onclick=()=>{s.models=[...MODELS];renderExplorer()};
  $('explore-clear-all').onclick=()=>{s.models=[];renderExplorer()};
  handleCustomDates('explore',s,renderExplorer);
  document.querySelectorAll('[data-explorer-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    explorerTab=btn.dataset.explorerTab;
    document.querySelectorAll('[data-explorer-tab]').forEach(b=>{
      const selected=b.dataset.explorerTab===explorerTab;b.classList.toggle('active',selected);
      b.setAttribute('aria-pressed',String(selected));
    });
    document.querySelectorAll('[data-explorer-section]').forEach(group=>group.hidden=group.dataset.explorerSection!==explorerTab);
    renderExplorer();
  }));
  $('explore-case-mode').addEventListener('change',renderExplorer);
  $('explore-error-variable').addEventListener('change',e=>{explorerErrorVariable=e.target.value;renderExplorer()});
  $('explore-open-selected').onclick=()=>{if(s.selectedDate)openExplorerTimeseries(s.selectedDate,s.lead)};
  $('explore-clear-selected').onclick=clearExplorerCase;
  document.querySelectorAll('.explorer-svg-export').forEach(btn=>btn.onclick=async()=>{
    if(btn.disabled)return;
    const name=btn.dataset.svgKey,format=state.explorer;
    const metric=format.metric,reg=format.region;
    const title={fingerprint:'Daily Skill Fingerprint',matrix:'Head-to-Head Win Matrix',atlas:'Regional Skill Atlas',distribution:'Performance Consistency',envelope:'Lead-Time Advantage Envelope',winrate:'Advantage vs Win Frequency',tradeoff:'Two-Metric Trade-off and Pareto Frontier',bootstrap:'Paired Block-Bootstrap Uncertainty',leadership:'Model Leadership Mosaic',scatter:'Paired Model Performance Scatterplot',bias:'Signed Bias Evolution',portrait:'Bias–RMSE Portrait',robustness:'Skill Robustness'}[name]||'Verification Diagnostic';
    const allLead=['fingerprint','envelope','atlas','leadership','bias','portrait'].includes(name);
    const leadContext=allLead?'All forecast leads (D0–D15)':`F${format.lead}`;
    const errVariable=CONFIG.variables[explorerErrorVariable].label;
    const errBias=`${explorerErrorVariable}_BIAS`,errRMSE=`${explorerErrorVariable}_RMSE`;
    const filenameMetric=name==='tradeoff'?`${tradeoffX}_${tradeoffY}`:['bias','portrait'].includes(name)?`${errBias}${name==='portrait'?'_RMSE':''}`:metric;
    let subtitle;
    if(name==='bias')subtitle=`${errVariable} signed Bias · ${reg} · ${format.model} · ${leadContext} · ${rangeLabel(format)}`;
    else if(name==='portrait')subtitle=`${errVariable} Bias + RMSE · ${reg} · ${format.models.length} selected models · ${leadContext} · ${rangeLabel(format)}`;
    else if(name==='tradeoff')subtitle=`${CONFIG.metrics[tradeoffX].label} vs ${CONFIG.metrics[tradeoffY].label} · ${reg} · ${leadContext} · baseline ${format.baseline} · common samples · ${rangeLabel(format)}`;
    else if(name==='bootstrap')subtitle=`${CONFIG.metrics[metric].label} · ${reg} · ${leadContext} · ${format.model} vs ${format.baseline} · 7-day blocks · ${rangeLabel(format)}`;
    else if(name==='leadership')subtitle=`${CONFIG.metrics[metric].label} · ${reg} · ${leadContext} · ${format.models.length} selected models · ${rangeLabel(format)}`;
    else subtitle=`${CONFIG.metrics[metric].label} · ${reg} · ${leadContext} · vs ${format.baseline} · ${rangeLabel(format)}`;
    btn.disabled=true;
    try{await exportExplorerSvg(btn.dataset.svgId,`omd-${name}_${filenameMetric}_${reg.replace(/[^a-zA-Z0-9]+/g,'-')}.png`,title,subtitle)}
    catch(err){console.error('Explorer export failed',err);alert('Could not export this graphic. Please try again.')}
    finally{btn.disabled=false}
  });
}
function refreshSelectedDateBar(){
  const s=state.explorer;
  const hasSelection=Boolean(s.selectedDate);
  $('explore-selected-date').textContent=hasSelection?
    `Selected verification date: ${s.selectedDate} · F${s.lead} · ${s.model} vs ${s.baseline}. Click the highlighted cell, row, or point again to deselect.`:
    'Click a Mosaic cell, Case Finder row, or scatterplot point to highlight its date. Click again to deselect.';
  $('explore-open-selected').disabled=!hasSelection;
  $('explore-clear-selected').disabled=!hasSelection;
  $('explore-clear-selected').setAttribute('aria-label','Clear selected verification date');
  $('explore-selected-date').closest('.diagnostic-case-bar')?.classList.toggle('has-selection',hasSelection);
}
function clearExplorerCase(){
  if(!state.explorer.selectedDate)return;
  state.explorer.selectedDate=null;
  refreshSelectedDateBar();renderExplorer();
}
function selectExplorerCase(date,lead){
  const s=state.explorer;
  const nextLead=CONFIG.leads.includes(Number(lead))?Number(lead):s.lead;
  // Selecting the same date AND lead a second time is a reversible toggle;
  // choosing a different lead on the same date updates the linked selection.
  if(s.selectedDate===date && s.lead===nextLead){clearExplorerCase();return;}
  s.selectedDate=date;s.lead=nextLead;
  refreshSelectedDateBar();renderExplorer();
}
function openExplorerTimeseries(date,lead){
  const s=state.explorer,t=state.ts;
  t.metric=s.metric;t.variable=CONFIG.metrics[s.metric].variable;t.region=s.region;t.lead=lead;t.models=[s.baseline,s.model];
  t.period=s.period;t.customStart=s.customStart;t.customEnd=s.customEnd;t.referenceDate=date;
  setRoute('timeseries');
  const note=$('ts-verification-note');
  if(note)note.textContent+=` · Selected diagnostic verification date ${date} (F${lead}).`;
}
function renderExplorer(){
  if(state.route!=='explorer')return;
  const s=state.explorer;if(!ensureRegionReady(s.region,renderExplorer))return;
  const selected=availableOptions($('explore-metric-filter'),metricKeys(),k=>metricOptionLabel(k,s.region),k=>isMetricAvailable(k,s.region),s.metric);
  if(selected)s.metric=selected;
  $('explore-region-filter').value=s.region;
  $('explore-model-filter').value=s.model;$('explore-baseline-filter').value=s.baseline;
  $('explore-lead-filter').value=String(s.lead);$('explore-period-filter').value=s.period;
  $('explore-rolling-days').value=String(s.rollingDays);setCustomVisible('explore',s);
  $('explore-error-variable').value=explorerErrorVariable;
  renderChips('explore-model-chips',MODELS,s.models,next=>{s.models=next;renderExplorer()});
  refreshExplorerSectionGuide();
  refreshSelectedDateBar();
  const w=rangeArgs(s),core={...w,metric:s.metric,region:s.region,baseline:s.baseline,model:s.model};
  const detailed={...core,models:s.models,lead:s.lead};
  renderCoverage(data,detailed);
  if(explorerTab==='patterns'){
    renderFingerprint(data,core,({date,lead,model,baseline,metric,region})=>{
      openExplorerTimeseries(date,lead);
    });
    renderAdvantageEnvelope(data,core);
    renderAtlas(data,{...w,model:s.model,baseline:s.baseline,metric:s.metric,regions:CONFIG.regions});
    renderRolling(data,{...w,models:s.models,baseline:s.baseline,metric:s.metric,region:s.region,lead:s.lead,rollingDays:s.rollingDays});
    renderDistribution(data,{...w,models:s.models,baseline:s.baseline,metric:s.metric,region:s.region,lead:s.lead});
    const loaded=CONFIG.regions.filter(r=>data.isRegionLoaded(r)).length;
    $('explore-regions-status').textContent=`${loaded}/${CONFIG.regions.length} regions loaded${explorerRegionLoading?' · loading remaining regions…':''}. Only records from the actual region are used.`;
    if(!explorerRegionsRequested){
      explorerRegionsRequested=true;explorerRegionLoading=true;
      Promise.allSettled(CONFIG.regions.filter(r=>!data.isRegionLoaded(r)).map(r=>data.ensureRegion(r))).then(results=>{
        explorerRegionLoading=false;syncDateLimits();updateDataStatus();
        const failed=results.filter(r=>r.status==='rejected');if(failed.length)console.warn('Explorer region load incomplete',failed);
        if(state.route==='explorer'&&explorerTab==='patterns')renderExplorer();
      });
    }
  }else if(explorerTab==='comparisons'){
    renderMatrix(data,{...w,models:s.models,metric:s.metric,region:s.region,lead:s.lead});
    renderWinFrequency(data,detailed);
    $('explore-tradeoff-x').value=tradeoffX;$('explore-tradeoff-y').value=tradeoffY;
    renderMetricTradeoffs(data,{...w,models:s.models,baseline:s.baseline,region:s.region,lead:s.lead,metricX:tradeoffX,metricY:tradeoffY});
  }else if(explorerTab==='cases'){
    renderLeadership(data,{...w,models:s.models,metric:s.metric,region:s.region},s.selectedDate,selectExplorerCase);
    renderCases(data,detailed,s.selectedDate,selectExplorerCase,openExplorerTimeseries);
    renderScatter(data,detailed,s.selectedDate,selectExplorerCase);
  }else if(explorerTab==='errors'){
    const errorOpts={...w,model:s.model,models:s.models,region:s.region,variable:explorerErrorVariable};
    renderBiasEvolution(data,errorOpts);
    renderPortrait(data,errorOpts);
  }else if(explorerTab==='robustness'){
    renderBootstrap(data,detailed);
    renderRobustness(data,detailed);
  }
}

function initComparisonOptions(prefix){
  const select=$(`${prefix}-comparison-filter`);
  options(select,['date_lead','same_source'],v=>v==='date_lead'?'Standard — matched dates & leads':'Strict — same verification dataset');
}
function comparisonCoverageHtml(rows,mode,baseline,lead){
  const available=rows.filter(r=>r.records>0).length;
  const rowHtml=rows.map(r=>{
    const matched=(r.model===baseline?r.records:r.matchedPairs);
    return `<tr><th><span class="coverage-model-dot" style="background:${modelColor(r.model)}"></span>${r.model}</th><td>${r.dates}</td><td>${r.records}</td><td>${r.maxLead==null?'N/A':`D${r.maxLead/24}`}</td><td>${matched||'N/A'}</td></tr>`;
  }).join('');
  const leadInfo=lead==null?'Maximum forecast lead varies by model.':`Selected forecast lead: D${lead/24}.`;
  return {summary:`${available} of ${rows.length} models have data`,
    html:`<p class="coverage-description">${leadInfo} Only existing observations are shown.</p><div class="coverage-scroll"><table class="coverage-table"><thead><tr><th>Model</th><th>Dates</th><th>Values</th><th>Max lead</th><th>Compared values</th></tr></thead><tbody>${rowHtml}</tbody></table></div><p class="coverage-description muted">N/A indicates that verification data or a matching baseline value is unavailable.</p>`};
}
function renderComparisonCoverage(prefix,{metric,region,baseline,lead=null,comparisonMode='date_lead',...window}){
  const rows=data.coverageByModel({metric,region,baseline,lead,comparisonMode,models:MODELS,...window});
  const panel=comparisonCoverageHtml(rows,comparisonMode,baseline,lead);
  $(`${prefix}-coverage-summary`).textContent=panel.summary;
  $(`${prefix}-coverage-table`).innerHTML=panel.html;
  const status=$(`${prefix}-comparison-warning`);
  if(!status)return;
  const differs=rows.some(r=>r.differingSources||r.unknownSources);
  status.textContent=comparisonMode==='same_source'
    ?'Strict comparison: only scores verified against the same dataset are included.'
    :differs?'Standard comparison: scores are matched by date and lead. Verifying datasets may differ between models.'
    :'Standard comparison: scores are matched by date and lead.';
  status.classList.toggle('comparison-warning',comparisonMode==='date_lead'&&differs);
}
function homeCoreMetrics(){return CONFIG.homeMetrics}
function metricRankValue(value,metricKey){
  const m=CONFIG.metrics[metricKey];if(!Number.isFinite(value))return Infinity;
  if(m.direction==='higher')return -value;
  if(m.direction==='lower')return value;
  return Math.abs(value-(m.target??0));
}
function renderHome(){
  const s=state.home;if(!ensureRegionReady(s.region,renderHome))return;populateHomeMetric();$('home-region-filter').value=s.region;const w=rangeArgs(s),vis=MODELS;
  renderHomePerformance(s.models,w);renderHomeScorecard(vis,w);renderHorizon(data,{region:s.region,models:MODELS,period:s.period,startDate:s.customStart,endDate:s.customEnd});renderSignals(vis);renderCategorySummary(vis,w);
}
function renderHomePerformance(vis,w){
  const s=state.home,metric=s.primaryMetric,m=CONFIG.metrics[metric],v=variableForMetric(metric),lead=s.forecastLead==='all'?null:s.forecastLead;
  const isAll=lead==null;
  const allCoverage=data.modelLeadAvailability({...w,region:s.region,metric,models:MODELS,lead});
  const coverageByName=new Map(allCoverage.map(c=>[c.model,c]));
  renderChips('home-model-chips',MODELS,vis,next=>{s.models=next;renderHome()},name=>{
    $('home-performance-chart')?._chartSetHighlight?.(name);
    $('home-ranking-list').querySelectorAll('.home-rank-row').forEach(row=>row.classList.toggle('highlighted',!!name&&row.dataset.model===name));
  });
  $('home-model-chips').querySelectorAll('.chip').forEach(button=>{
    const availability=coverageByName.get(button.dataset.model);
    const count=availability?.leads.length||0;
    button.title=`${button.dataset.model}: ${count} forecast hours, ${availability?.dates||0} dates, ${availability?.records||0} values in the selected filters`;
  });
  const common=isAll?data.comparableAllLeadRows({...w,region:s.region,metric,models:vis}):null;
  const recordsByModel=common?.byModel||new Map();
  const availableRankValue=model=>isAll
    ?data.aggregateMetricValues((recordsByModel.get(model)||[]).map(r=>r.value),metric)
    :data.aggregateValue({...w,region:s.region,models:[model],metrics:[metric],leads:[lead]});
  const rank=vis.map(model=>({model,value:availableRankValue(model)}))
    .sort((a,b)=>metricRankValue(a.value,metric)-metricRankValue(b.value,metric));
  const rankableCount=rank.filter(r=>Number.isFinite(r.value)).length;
  const leadText=isAll?'shared forecast hours':`${leadLabel(lead)} (${lead} h)`;
  $('home-performance-title').textContent=`${v.label} — ${m.metricType} Rank History`;
  $('home-performance-subtitle').textContent=`Daily model rank for ${s.region} · ${rangeLabel(s)} · ${leadText}. Rank 1 is best; the left list is the overall period ranking. Baseline does not affect ranks.`;
  $('home-ranking-metric').textContent=`Overall ${m.metricType}`;
  const list=$('home-ranking-list');let rankPosition=0;
  list.innerHTML=rank.map(r=>`<button class="home-rank-row" type="button" data-model="${r.model}" style="--rank-color:${modelColor(r.model)}"><span class="rank-number">${Number.isFinite(r.value)&&rankableCount>1?++rankPosition:'N/A'}</span><span class="rank-model"><i style="background:${modelColor(r.model)}"></i>${r.model}</span><strong>${metricFmt(metric,r.value)}</strong></button>`).join('');
  const note=$('home-lead-comparison-note'),panel=$('home-lead-coverage');
  panel.hidden=!isAll;
  if(isAll){
    const overlap=common.keys.length,sharedLeads=common.leads;
    note.textContent=vis.length<2?'Select at least two models for a comparable ranking.':
      overlap?`Comparable “All”: ${overlap} shared date/hour samples across ${sharedLeads.length} forecast hours (${sharedLeads.map(h=>`F${h}`).join(', ')}). Every enabled model is ranked using exactly these same samples.`:
        'No shared date/hour samples for every selected model. Turn off models with limited or missing coverage to compare the remaining models.';
    $('home-lead-coverage-summary').textContent=`${sharedLeads.length} shared hours · ${overlap} matched samples`;
    const tableRows=allCoverage.map(c=>`<tr><th><span class="coverage-model-dot" style="background:${modelColor(c.model)}"></span>${c.model}${vis.includes(c.model)?' ✓':''}</th><td>${c.leads.length?c.leads.map(h=>`F${h}`).join(', '):'N/A'}</td><td>${c.dates}</td><td>${c.records}</td></tr>`).join('');
    $('home-lead-coverage-table').innerHTML=`<div class="coverage-scroll"><table class="coverage-table"><thead><tr><th>Model (✓ selected)</th><th>Available forecast hours</th><th>Dates</th><th>Values</th></tr></thead><tbody>${tableRows}</tbody></table></div><p class="coverage-description muted">Coverage is based on the selected metric, region and date window. For “All,” samples must have the same verification date and forecast hour in every enabled model. Turning a model off recomputes this intersection.</p>`;
  }else{
    note.textContent=`At F${lead}, toggle models to show or hide their rankings. The “All” option uses a shared-date/forecast-hour comparison instead of combining unequal model ranges.`;
  }
  // The All-lead chart uses exactly the same shared raw rows as the overall ranking;
  // no model may benefit from extra early or missing late forecast hours.
  const valuesByModel=new Map(),dateSet=new Set();
  for(const model of vis){
    let daily;
    if(isAll){
      const groups=new Map();
      for(const r of recordsByModel.get(model)||[]){const key=r.valid_date.getTime();if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r.value)}
      daily=[...groups].map(([key,values])=>({date:new Date(key),value:data.aggregateMetricValues(values,metric)}));
    }else daily=data.dailyValueSeries({...w,model,metric,region:s.region,lead});
    const map=new Map(daily.filter(d=>Number.isFinite(d.value)).map(d=>[d.date.getTime(),d.value]));
    valuesByModel.set(model,map);for(const x of map.keys())dateSet.add(x);
  }
  const rankSeries=new Map(vis.map(model=>[model,[]]));
  const dates=[...dateSet].sort((a,b)=>a-b);
  for(const x of dates){
    const entries=vis.map(model=>({model,value:valuesByModel.get(model)?.get(x)})).filter(d=>Number.isFinite(d.value));
    entries.sort((a,b)=>metricRankValue(a.value,metric)-metricRankValue(b.value,metric));
    if(entries.length<2)continue;
    entries.forEach((entry,index)=>rankSeries.get(entry.model).push({x,y:index+1,rawValue:entry.value,label:dateFull(x)}));
  }
  const series=vis.map(model=>({name:model,color:modelColor(model),...chartModelStyle(model),data:rankSeries.get(model)}));
  const chart=$('home-performance-chart');
  const setRankHighlight=name=>{list.querySelectorAll('.home-rank-row').forEach(row=>row.classList.toggle('highlighted',!!name&&row.dataset.model===name));list.classList.toggle('has-highlight',!!name)};
  renderLineChart(chart,series,{formatX:dateShort,formatY:y=>String(Math.round(y)),formatTooltipY:y=>`Rank ${Math.round(y)}`,formatTooltipExtra:point=>metricFmt(metric,point.rawValue),tooltipExtraLabel:'Value',tooltipSort:(a,b)=>a.point.y-b.point.y,ySuffix:'',zeroLine:false,tooltipTitle:`${m.short} rank`,emptyMessage:isAll?'N/A — no identical verification date/lead samples for all enabled models. Toggle models to find overlapping coverage.':'N/A — no verification data for the selected metric, region, dates and forecast lead.',onSeriesHover:name=>{setRankHighlight(name);highlightModelChip('home-model-chips',name)},showLegend:false,maxSegmentGap:1.5*86400000,xAxisLabel:'Date',yAxisLabel:'Model Rank (1 = Best)',yDomain:[1,Math.max(2,vis.length)],yTickValues:Array.from({length:Math.max(2,vis.length)},(_,i)=>i+1),reverseY:true,interactive:true,exportName:`model-rank-history_${metric}_${s.region}.png`,exportTitle:`Model Rank History — ${v.label} ${m.metricType}`,exportSubtitle:`${s.region} · ${rangeLabel(s)} · ${leadText}${isAll?` · ${common.keys.length} common samples`:''}`});
  list.querySelectorAll('.home-rank-row').forEach(row=>{row.addEventListener('mouseenter',()=>{setRankHighlight(row.dataset.model);chart._chartSetHighlight?.(row.dataset.model)});row.addEventListener('mouseleave',()=>{setRankHighlight(null);chart._chartSetHighlight?.(null)});row.addEventListener('focus',()=>{setRankHighlight(row.dataset.model);chart._chartSetHighlight?.(row.dataset.model)});row.addEventListener('blur',()=>{setRankHighlight(null);chart._chartSetHighlight?.(null)})});
}

function renderHomeScorecard(vis,w){
  const lead=state.home.forecastLead==='all'?null:state.home.forecastLead;
  const chosenRegion=state.home.region;
  $('home-scorecard-region-note').textContent=`Selected region: ${chosenRegion}. Each metric uses that region when available, otherwise its labeled CONUS or Global domain. The Primary Metric changes the ranking plot; this scorecard always shows all six metrics. Scores from different domains are not directly equivalent.`+
    (state.home.forecastLead==='all'?' Note: this scorecard uses model-to-baseline matched pairs separately for each model, so different pairs can span different lead ranges; only the Home rank-history chart applies the common-sample intersection across enabled models.':'');
  const rows=homeCoreMetrics().map(k=>{
    const m=CONFIG.metrics[k],v=variableForMetric(k),actualRegion=regionForMetric(k,chosenRegion);
    const cells=vis.map(model=>{
      const skill=data.skillFor({...w,model,baseline:state.home.baseline,metric:k,region:actualRegion,leads:lead==null?null:[lead],comparisonMode:state.home.comparisonMode});
      const g=skillGrade(skill);
      return Number.isFinite(skill)?`<td><span class="heat" style="background:${heatColor(g)};color:${heatText(g)}" title="${m.label} · ${actualRegion} · relative to ${state.home.baseline}">${fmtPct(skill)}</span></td>`:`<td><span class="heat missing-score" title="No available matched verification data">N/A</span></td>`;
    }).join('');
    return `<tr><td><span class="metric-name">${m.short}</span><span class="metric-meta">${metricRegionLabel(k,chosenRegion)} · vs ${state.home.baseline}</span></td>${cells}</tr>`;
  }).join('');
  $('home-scorecard-table').innerHTML=`<thead><tr><th>Metric</th>${vis.map(m=>`<th>${m}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>`;
}
// Show the largest absolute changes, but never fill the entire list with one
// direction when a meaningful change in the opposite direction also exists.
// Unlike the prior 3/3 quota, a 5/1 or 1/5 split is allowed.
function chooseNotableSignals(candidates,limit=6){
  const ordered=candidates.filter(s=>Number.isFinite(s.change)&&Math.abs(s.change)>1e-9)
    .sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)||a.model.localeCompare(b.model)||a.metric.localeCompare(b.metric));
  const chosen=ordered.slice(0,limit);
  if(!chosen.length||limit<2)return chosen;
  const hasPositive=ordered.some(s=>s.change>0),hasNegative=ordered.some(s=>s.change<0);
  if(!hasPositive||!hasNegative)return chosen;
  if(!chosen.some(s=>s.change>0)){
    chosen[chosen.length-1]=ordered.find(s=>s.change>0);
  }else if(!chosen.some(s=>s.change<0)){
    chosen[chosen.length-1]=ordered.find(s=>s.change<0);
  }
  return chosen.sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)||a.model.localeCompare(b.model)||a.metric.localeCompare(b.metric));
}
function signalGrade(change,maxMagnitude){
  // Same diverging color stops as the scorecards, with magnitude scaled to
  // the strongest displayed signal and a small color floor for weak changes.
  const magnitude=clamp(Math.abs(change)/Math.max(10,maxMagnitude),0,1);
  return Math.sign(change)*(.34+.66*Math.sqrt(magnitude));
}
function signalForeground(color){
  const nums=color.match(/\d+/g).map(Number),c=nums.map(v=>v/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
  const luminance=.2126*c[0]+.7152*c[1]+.0722*c[2];
  return luminance>.18?'#152236':'#ffffff';
}
function renderSignals(vis){
  const candidates=[];
  for(const model of vis)for(const metric of homeCoreMetrics()){
    const change=data.periodChange({model,metric,region:state.home.region,days:15});
    if(Number.isFinite(change)){
      const raw=data.aggregateValue({days:15,region:state.home.region,models:[model],metrics:[metric]});
      candidates.push({model,metric,change,raw});
    }
  }
  const signals=chooseNotableSignals(candidates);
  const maxMagnitude=Math.max(0,...signals.map(s=>Math.abs(s.change)));
  $('signals-list').innerHTML=signals.length?signals.map(s=>{
    const good=s.change>0,m=CONFIG.metrics[s.metric],shade=heatColor(signalGrade(s.change,maxMagnitude));
    // Keep every decline arrow white, even when two nearby red shades straddle
    // the automatic luminance threshold (which made one arrow look black).
    const arrowColor=good?signalForeground(shade):'#ffffff';
    return `<div class="signal"><div class="signal-icon ${good?'good':'bad'}" style="background:${shade};color:${arrowColor};border-color:${shade}" title="${good?'Improvement':'Decline'} of ${Math.abs(s.change).toFixed(1)}%">${good?'▲':'▼'}</div><div><div class="signal-title">${s.model} · ${m.short}</div><div class="signal-desc">${good?'Improved':'Degraded'} ${Math.abs(s.change).toFixed(1)}% versus the preceding 15-day window.</div></div><div class="raw-value">${metricFmt(s.metric,s.raw)}</div></div>`;
  }).join(''):'<div class="empty">N/A — insufficient recent observations to assess changes.</div>';
}
function renderCategorySummary(vis,w){
  const selectedRegion=state.home.region;
  const cats=['Surface','Upper Air','Precipitation'];
  $('category-summary').innerHTML=cats.map(cat=>{
    const mets=homeCoreMetrics().filter(k=>variableForMetric(k).category===cat);
    const scores=[],byModel=new Map();
    for(const model of vis){
      const values=mets.map(metric=>data.skillFor({...w,model,baseline:state.home.baseline,metric,
        region:regionForMetric(metric,selectedRegion),comparisonMode:state.home.comparisonMode})).filter(Number.isFinite);
      scores.push(...values);byModel.set(model,avg(values));
    }
    const leader=[...byModel.entries()].filter(x=>Number.isFinite(x[1])).sort((a,b)=>b[1]-a[1])[0];
    const domains=[...new Set(mets.filter(k=>data.hasMetricData(regionForMetric(k,selectedRegion),k))
      .map(k=>regionForMetric(k,selectedRegion)))];
    const note=domains.length?` · ${domains.join(' + ')}`:' · N/A';
    return `<div class="category-card"><div class="category-title">${cat}</div><div class="category-value">${fmtPct(avg(scores))}</div><div class="category-detail">Leader: ${leader?.[0]||'N/A'} · ${fmtPct(leader?.[1])}${note}</div></div>`;
  }).join('');
}
// The lower Skill chart remains in percent; EVS's only pointwise
// significance test operates on matched native-unit daily score differences.
// We rescale the EVS interval for visual placement, not for re-testing skill.
let showSkillSignificance=true;
function highlightSkillCharts(model){
  for(const id of ['skill-chart','skill-mean-chart','skill-effective-chart'])$(id)?._chartSetHighlight?.(model);
  highlightModelChip('skill-model-chips',model);
}
function renderSkill(){
  const s=state.skill;if(!ensureRegionReady(s.region,renderSkill))return;
  populateVariableMetric('skill-variable-filter','skill-metric-filter',s);
  $('skill-region-filter').value=s.region;$('skill-baseline-filter').value=s.baseline;
  $('skill-period-filter').value=s.period;
  setCustomVisible('skill',s);
  renderChips('skill-model-chips',MODELS,s.models,next=>{s.models=next;renderSkill()},highlightSkillCharts);
  const m=CONFIG.metrics[s.metric],v=variableForMetric(s.metric),w=rangeArgs(s);
  const unit=m.unit?.trim()||'',metricAxis=`${m.metricType}${unit?` (${unit})`:''}`;
  const fmtValue=value=>`${value.toFixed(m.decimals??2)}${m.unit||''}`;
  $('skill-chart-title').textContent=`Difference from ${s.baseline} — ${v.label} — ${m.metricType}`;
  $('skill-chart-subtitle').textContent=`${s.region} · percentage skill relative to ${s.baseline} · ${rangeLabel(s)}`;
  const skillSeries=s.models.map(model=>({name:model,color:modelColor(model),...chartModelStyle(model),
    data:data.skillByLead({...w,model,baseline:s.baseline,metric:s.metric,region:s.region,comparisonMode:'date_lead'})
      .map(d=>({x:d.lead/24,y:d.value,label:`Day ${d.lead/24} · ${d.lead} h`}))}));
  const onHover=highlightSkillCharts;
  $('skill-significance-toggle').checked=showSkillSignificance;
  const significance=showSkillSignificance
    ?buildSkillSignificanceBoxes(data,{...w,models:s.models,baseline:s.baseline,
        metric:s.metric,region:s.region,comparisonMode:'date_lead'})
    :null;
  const boxes=significance?.boxes.map(box=>({...box,color:modelColor(box.model)}))||[];
  $('skill-significance-status').textContent=showSkillSignificance
    ?`${significance.comparisons} EVS-style 95% intervals · ≥2 paired dates`
    :'Confidence intervals hidden';
  renderLineChart($('skill-chart'),skillSeries,{formatX:x=>String(Math.round(x)),xDomain:[0,15],
    xTickValues:CONFIG.leads.map(h=>h/24),xAxisLabel:'Forecast Lead Time (Days)',
    yAxisLabel:`Skill vs ${s.baseline} (%)`,ySuffix:'%',zeroLine:true,forceZeroTick:true,
    significanceBoxes:boxes,
    tooltipTitle:m.short,emptyMessage:'N/A — choose models or select a metric with available verification data.',
    interactive:true,onSeriesHover:onHover,exportName:`skill-vs-lead_${s.metric}_${s.region}.png`,
    exportTitle:`Difference from ${s.baseline} — ${v.label} — ${m.metricType}`,
    exportSubtitle:`${s.region} · ${rangeLabel(s)} · Baseline: ${s.baseline}${showSkillSignificance?' · 95% significance intervals':''}`});
  $('skill-verification-note').textContent=`${metricDirectionText(m)} Positive percentages indicate improvement relative to ${s.baseline}. `+
    (showSkillSignificance
      ?`The thin outlined boxes use only EVS-style 95% intervals based on matched daily raw model-minus-baseline score differences. ${significance.significant} of ${significance.comparisons} paired raw-score means exclude zero. Each box is rescaled for display on the percent axis; it is not a confidence interval for percentage skill, especially for nonlinear RMSE, ACC, and Bias aggregation. Signed Bias differences do not by themselves establish improved skill.`
      :'Enable Significance to display approximate 95% thresholds on this chart.');

  // New absolute-statistic die-off curve: daily arithmetic mean per hour, not
  // paired or baseline-relative. Missing hours and models remain gaps/N/A.
  $('skill-mean-title').textContent=`Forecast Hour Mean — ${v.label} ${m.metricType}`;
  $('skill-mean-subtitle').textContent=`${s.region} · ${rangeLabel(s)} · mean verification value by forecast hour`;
  const meanSeries=s.models.map(model=>({name:model,color:modelColor(model),...chartModelStyle(model),
    data:data.meanValueByLead({...w,model,metric:s.metric,region:s.region}).map(d=>({x:d.lead,y:d.value,
      label:`Forecast hour ${d.lead} · ${d.n} daily value${d.n===1?'':'s'}`}))}));
  renderLineChart($('skill-mean-chart'),meanSeries,{formatX:x=>String(Math.round(x)),xDomain:[0,360],
    xTickValues:CONFIG.leads,xAxisLabel:'Forecast Hour',yAxisLabel:metricAxis,
    ySuffix:m.unit||'',formatY:(y,step)=>`${cleanAxisTickLabel(y,step,m.decimals??2)}${m.unit||''}`,
    formatTooltipY:fmtValue,tooltipTitle:m.short,zeroLine:false,maxSegmentGap:24,
    emptyMessage:'N/A — no verification values for the selected models, metric and dates.',
    interactive:true,onSeriesHover:onHover,exportName:`forecast-hour-mean_${s.metric}_${s.region}.png`,
    exportTitle:`Forecast Hour Mean — ${v.label} ${m.metricType}`,
    exportSubtitle:`${s.region} · ${rangeLabel(s)} · Arithmetic mean of available daily scores`});
  $('skill-mean-note').textContent='Each point is the arithmetic mean of available daily verification values for that model and forecast hour. This is an absolute statistic, not baseline-relative skill. Only observed values are used; different models may have different sample counts.';

  // Effective lead-time gain: independent available-sample per-lead means
  // for model and baseline; retain the relative-skill chart's paired method.
  const effectiveModels=s.models.filter(model=>model!==s.baseline);
  const effectiveCurves=effectiveModels.map(model=>effectiveLeadSeries(data,{...w,
    model,baseline:s.baseline,metric:s.metric,region:s.region}));
  const effectiveSeries=effectiveCurves.map(curve=>({name:curve.model,color:modelColor(curve.model),
    ...chartModelStyle(curve.model),data:curve.points}));
  $('skill-effective-title').textContent=`Effective Lead-Time Gain vs ${s.baseline} — ${v.label} — ${m.metricType}`;
  $('skill-effective-subtitle').textContent=`${s.region} · ${rangeLabel(s)} · baseline ${s.baseline} F0–F360 · independently available forecast-hour means`;
  renderLineChart($('skill-effective-chart'),effectiveSeries,{formatX:x=>String(Math.round(x)),
    xDomain:[0,15],xTickValues:CONFIG.leads.map(h=>h/24),xAxisLabel:`${s.baseline} Forecast Lead (Days)`,
    yAxisLabel:'Equivalent Lead-Time Gain (hours)',ySuffix:' h',zeroLine:true,forceZeroTick:true,
    formatTooltipY:y=>`${Math.abs(y)<0.05?'0.0':`${y>0?'+':''}${y.toFixed(1)}`} h`,formatY:(y,step)=>cleanAxisTickLabel(y,step),
    maxSegmentGap:1,tooltipTitle:'Lead-time gain',
    emptyMessage:'No equivalent hours calculable from available forecast-hour means. See coverage below for explanations; missing is not zero.',
    interactive:true,onSeriesHover:onHover,exportName:`effective-lead-time_${s.metric}_${s.region}.png`,
    exportTitle:`Effective Lead-Time Gain vs ${s.baseline} — ${v.label} — ${m.metricType}`,
    exportSubtitle:`${s.region} · ${rangeLabel(s)} · Independent daily means; unplotted leads are not zero`});
  const counts={matched:0,'below-range':0,'beyond-range':0,gap:0,'no-baseline-data':0,'no-model-data':0,insufficient:0,missing:0};
  for(const curve of effectiveCurves)for(const r of curve.rows){counts[r.status]=(counts[r.status]||0)+1;}
  const unmatched=effectiveCurves.length*CONFIG.leads.length-counts.matched;
  $('skill-effective-coverage-summary').textContent=`${counts.matched} plotted · ${unmatched} unresolved`;
  $('skill-effective-coverage-table').innerHTML=effectiveLeadCoverageMatrix(effectiveCurves,s.baseline);
  $('skill-effective-note').textContent=`Gain = equivalent ${s.baseline}-quality forecast hour for a model minus ${s.baseline}'s forecast hour. Positive hours mean the model retains quality longer; negative hours mean it loses quality sooner. A genuine same-hour fitted-quality match is plotted as 0.0 h. Missing portions of lines do NOT mean zero lead-time difference or necessarily missing model forecasts. The coverage key distinguishes missing baseline/model means, targets requiring leads earlier/later than the model's full available range, and missing lead steps. Both curves use independent arithmetic means of each model's available daily scores (as in Forecast Hour Mean); dates and sample counts may differ. The means are sample-count-weighted when fitting non-increasing quality, followed by interpolation only between adjacent available leads. Bias/SPEED_ERR use distance from zero. No extrapolation or confidence testing of gains.`;
  const curveMap=new Map(effectiveCurves.map(c=>[c.model,new Map(c.rows.map(r=>[r.baselineHour,r]))]));
  $('skill-effective-table-summary').textContent=`${effectiveModels.length} model${effectiveModels.length===1?'':'s'} · ${counts.matched} computed equivalents`;
  $('skill-effective-table').innerHTML=`<thead><tr><th>${s.baseline} lead</th>${effectiveModels.map(model=>`<th>${model}</th>`).join('')}</tr></thead><tbody>${CONFIG.leads.map(hour=>`<tr><th>F${hour} (D${hour/24})</th>${effectiveModels.map(model=>{const r=curveMap.get(model)?.get(hour);return `<td title="${effectiveLeadExplanation(r,model,s.baseline).replaceAll('"','&quot;')}">${effectiveLeadCell(r)}</td>`}).join('')}</tr>`).join('')}</tbody>`;
  renderComparisonCoverage('skill',{...w,region:s.region,metric:s.metric,baseline:s.baseline,comparisonMode:'date_lead'});
}

function renderScorecardPage(){
  const s=state.score;if(!ensureRegionReady(s.region,renderScorecardPage))return;
  $('score-region-filter').value=s.region;$('score-baseline-filter').value=s.baseline;$('score-comparison-filter').value=s.comparisonMode;$('score-period-filter').value=s.period;setCustomVisible('score',s);
  const w=rangeArgs(s);$('scorecard-context').textContent=`Selected region: ${s.region} · ${rangeLabel(s)} · relative to ${s.baseline}`;
  $('score-comparison-note').textContent=(s.comparisonMode==='same_source'?'Strict comparison: only scores verified against the same dataset are included.':'Standard comparison: scores are matched by verification date and forecast lead.')+
    ` Each metric uses ${s.region} when available; CONUS-only products and metrics unavailable in the selected domain use their actual available verification region, labeled on each card. Cross-domain scores are not directly equivalent.`;
  $('scorecard-sections').innerHTML=CONFIG.scorecardGroups.map((group,groupIndex)=>{
    const metricBlocks=group.metrics.map(k=>{
      const m=CONFIG.metrics[k],actualRegion=regionForMetric(k,s.region);
      const rows=MODELS.map(model=>{
        const cells=CONFIG.scorecardLeads.map(lead=>{
          const skill=data.skillFor({...w,model,baseline:s.baseline,metric:k,region:actualRegion,leads:[lead],comparisonMode:s.comparisonMode});
          const g=skillGrade(skill);
          return Number.isFinite(skill)?`<td><span class="scorecell" style="background:${heatColor(g)};color:${heatText(g)}" title="${m.label} · ${actualRegion} · ${leadLabel(lead)} · relative to ${s.baseline}">${fmtPct(skill)}</span></td>`:`<td><span class="scorecell missing-score" title="No available matched verification data">N/A</span></td>`;
        }).join('');
        return `<tr><th class="mini-model"><span class="chip-dot" style="background:${modelColor(model)}"></span>${model}</th>${cells}</tr>`;
      }).join('');
      return `<section class="metric-block"><div class="metric-block-head"><div><strong>${m.metricType}</strong><span class="metric-region-note">${metricRegionLabel(k,s.region)}</span></div><small>Percent improvement vs ${s.baseline}</small></div><div class="mini-score-wrap"><table class="mini-score-table"><thead><tr><th>Model</th>${CONFIG.scorecardLeads.map(h=>`<th>${leadLabel(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
    }).join('');
    return `<article class="card scorecard-panel"><header><div><h3>${group.title}</h3><p>${variableForMetric(group.metrics[0]).level}</p></div><div class="table-export-actions compact-export" role="group" aria-label="Export category scorecard"><span class="export-label">Export</span><button class="small-button table-export-btn" type="button" data-export-table="scorecard-group-${groupIndex}" data-export-format="png">PNG</button><button class="small-button table-export-btn" type="button" data-export-table="scorecard-group-${groupIndex}" data-export-format="csv">CSV</button></div></header>${metricBlocks}</article>`;
  }).join('');
}

function renderTimeSeries(){
  const s=state.ts;if(!ensureRegionReady(s.region,renderTimeSeries))return;populateVariableMetric('ts-variable-filter','ts-metric-filter',s);$('ts-region-filter').value=s.region;$('ts-lead-filter').value=s.lead;$('ts-period-filter').value=s.period;setCustomVisible('ts',s);renderChips('ts-model-chips',MODELS,s.models,next=>{s.models=next;renderTimeSeries()},name=>$('ts-chart')._chartSetHighlight?.(name));
  const m=CONFIG.metrics[s.metric],v=variableForMetric(s.metric),lead=s.lead==='all'?null:s.lead,w=rangeArgs(s),leadText=lead==null?'All forecast leads':`${leadLabel(lead)} · ${lead} h`;
  $('ts-chart-title').textContent=`${v.label} — ${m.metricType}`;$('ts-chart-subtitle').textContent=`${s.region} · ${leadText} · ${rangeLabel(s)}`;
  const series=s.models.map(model=>({name:model,color:modelColor(model),...chartModelStyle(model),data:data.dailyValueSeries({...w,model,metric:s.metric,region:s.region,lead}).map(d=>({x:d.date.getTime(),y:d.value,label:dateFull(d.date.getTime())}))}));
  const selectedRange=data.resolveWindow(w);
  const totalDays=Math.max(0,Math.round((selectedRange.end-selectedRange.start)/86400000)+1);
  const periodSummary=buildTimeSeriesPeriodSummary(series,{
    aggregate:values=>data.aggregateMetricValues(values,s.metric),
    format:value=>metricFmt(s.metric,value),
    aggregation:m.aggregation,totalDays
  });
  const safeLabel=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  $('ts-period-inset').innerHTML=`<div class="ts-inset-heading"><strong>Period score</strong><span>${safeLabel(rangeLabel(s))}</span></div><div class="ts-inset-method">${safeLabel(periodSummary.method)}</div><div class="ts-inset-columns"><span>Model</span><span>Score</span><span>Days</span></div>${periodSummary.rows.length?periodSummary.rows.map(r=>`<div class="ts-inset-row" title="${safeLabel(`${r.name}: ${r.formatted}, ${r.days} valid day(s) of ${totalDays} selected`)}"><span class="ts-inset-model"><i class="ts-inset-color" style="--model-color:${safeLabel(r.color)}"></i>${safeLabel(r.name)}</span><strong>${safeLabel(r.formatted)}</strong><span class="ts-inset-days">${r.days}/${totalDays}</span></div>`).join(''):'<div class="ts-inset-empty">Select models to see their period scores.</div>'}<div class="ts-inset-foot">Uses the plotted daily values. Missing dates are excluded; coverage can differ by model.${lead==null?' Daily values first combine available leads.':''}</div>`;
  renderLineChart($('ts-chart'),series,{periodSummary,referenceX:s.referenceDate?Date.parse(`${s.referenceDate}T00:00:00Z`):null,referenceLabel:s.referenceDate?`Case ${s.referenceDate}`:'',formatX:dateShort,formatY:(y,step)=>cleanAxisTickLabel(y,step),formatTooltipY:y=>metricFmt(s.metric,y),ySuffix:'',zeroLine:m.direction==='target',tooltipTitle:m.short,emptyMessage:'N/A — choose models or select a metric with available verification data.',interactive:true,onSeriesHover:name=>highlightModelChip('ts-model-chips',name),maxSegmentGap:1.5*86400000,xAxisLabel:'Date',yAxisLabel:metricAxisLabel(s.metric),exportName:`time-series_${s.metric}_${s.region}_${s.lead}.png`,exportTitle:`Performance Time Series — ${v.label} ${m.metricType}`,exportSubtitle:`${s.region} · ${leadText} · ${rangeLabel(s)}`});
  $('ts-verification-note').textContent=`${metricDirectionText(m)} ${lead==null?'Each date aggregates all available forecast leads.':'Each point uses the selected forecast lead.'} The period inset summarizes those plotted daily scores using metric-specific aggregation; model coverage may differ.`;
}

// Build table exports from currently rendered DOM values (rather than
// independently recalculating verification scores). This guarantees each CSV
// and PNG reflects the active region, baseline, date range and N/A cells.
function exportLeadDescription(lead){return lead==='all'?'All forecast leads':`D${Number(lead)/24} (F${lead})`}
function tableExportSpecification(key){
  const home=state.home,skill=state.skill,score=state.score;
  const skillMetric=CONFIG.metrics[skill.metric];
  const section=(title,table,subtitle='')=>({title,table,subtitle});
  const filename=key.replace(/[^a-z0-9-]/gi,'-')+'.png';
  if(key==='home-scorecard')return {filename,title:'Home Verification Scorecard',
    subtitle:`${home.region} selected · ${rangeLabel(home)} · ${exportLeadDescription(home.forecastLead)} · baseline: ${home.baseline}`,
    notes:$('home-scorecard-region-note').textContent+' Blue indicates better performance versus baseline; red indicates worse. N/A means no matched data.',
    sections:[section('Percent improvement relative to baseline',$('home-scorecard-table'))]};
  if(key==='skill-equivalent')return {filename,title:'Equivalent Forecast-Hour Table',
    subtitle:`${skillMetric.label} · ${skill.region} · ${rangeLabel(skill)} · baseline: ${skill.baseline}`,
    notes:'Values are equivalent lead-time gains in hours: positive blue means longer retained skill; negative red means shorter. N/A and unavailable statuses are not zero.',
    sections:[section('Equivalent lead-time gain by model and baseline day',$('skill-effective-table'))]};
  if(key==='scorecard-all'||key.startsWith('scorecard-group-')){
    const groupIndex=key.startsWith('scorecard-group-')?Number(key.slice('scorecard-group-'.length)):null;
    const panels=[...document.querySelectorAll('#scorecard-sections .scorecard-panel')];
    const selectedPanels=groupIndex===null?panels:panels.slice(groupIndex,groupIndex+1);
    const sections=selectedPanels.flatMap(panel=>[...panel.querySelectorAll('.metric-block')].map(block=>section(
      `${panel.querySelector('h3')?.textContent||'Scorecard'} — ${block.querySelector('.metric-block-head strong')?.textContent||'Metric'}`,
      block.querySelector('table'),block.querySelector('.metric-region-note')?.textContent||''
    )));
    return {filename,title:groupIndex===null?'Verification Scorecard':`Verification Scorecard — ${selectedPanels[0]?.querySelector('h3')?.textContent||'Category'}`,
      subtitle:`${score.region} selected · ${rangeLabel(score)} · baseline: ${score.baseline} · ${score.comparisonMode==='same_source'?'Strict source matching':'Standard matched dates and leads'}`,
      notes:'Entries are percentage improvement versus baseline; positive/blue is better and negative/red is worse. N/A means no comparable data. Each metric specifies the actual verification region used; cross-region scores are not directly equivalent.',
      sections};
  }
  throw new Error('Unknown table export.');
}
function initTableExports(){
  document.addEventListener('click',event=>{
    const button=event.target.closest('button[data-export-table][data-export-format]');
    if(!button)return;
    try{
      const spec=tableExportSpecification(button.dataset.exportTable);
      if(button.dataset.exportFormat==='png')exportTablesPng(spec);
      else exportTablesCsv(spec);
    }catch(error){console.error('Table export failed',error);window.alert('Unable to export this table: '+error.message)}
  });
}

function renderCurrent(){if(state.route==='home')renderHome();else if(state.route==='skill')renderSkill();else if(state.route==='scorecard')renderScorecardPage();else if(state.route==='timeseries')renderTimeSeries();else if(state.route==='explorer')renderExplorer()}

async function start(){
  initTheme();initNavigation();initHomeControls();initDetailControls();initExplorerControls();initTableExports();
  $('skill-significance-toggle').addEventListener('change',event=>{showSkillSignificance=event.target.checked;renderSkill()});
  try{await data.load(CONFIG.defaultRegion);
    if(CONFIG.defaultRegion!=='CONUS'){try{await data.ensureRegion('CONUS')}catch(error){console.warn('CONUS data unavailable',error)}}
    syncDateLimits();updateDataStatus();const initial=location.hash.replace('#/','');setRoute(['home','skill','explorer','scorecard','timeseries','methodology','changelog'].includes(initial)?initial:'home',!initial)}
  catch(err){console.error(err);document.querySelector('.status-dot').className='status-dot error';$('data-status').textContent='Data load failed';document.querySelector('.main-content').innerHTML=`<section class="card"><div class="empty">Unable to load the EVS data files. Check deployment and use HTTP(S).</div></section>`}
}
start();
