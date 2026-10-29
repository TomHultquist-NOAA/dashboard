import { CONFIG, metricKeys, variableKeys, metricsForVariable } from './config.js';
import { DataService } from './data-service.js';
import { renderLineChart } from './charts.js';
import { buildSignificanceBoxes } from './significance.js';

const data=new DataService();
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
  home:{modelGroup:'Global',region:CONFIG.defaultRegion,period:'30',customStart:null,customEnd:null,baseline:'GFS',primaryMetric:'H500_ACC',forecastLead:120,comparisonMode:'date_lead'},
  skill:{variable:'H500',metric:'H500_ACC',region:CONFIG.defaultRegion,baseline:'GFS',period:'30',customStart:null,customEnd:null,comparisonMode:'date_lead',models:[...MODELS]},
  score:{region:CONFIG.defaultRegion,baseline:'GFS',period:'30',customStart:null,customEnd:null,comparisonMode:'date_lead'},
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

// Keep unavailable metrics visible but greyed out in native dropdown menus.
// The archive for the selected region decides availability, not a hardcoded
// metric list or the current date/lead selection.
function isMetricAvailable(metric,region){
  return data.isRegionLoaded(region)
    ? data.hasMetricData(region,metric)
    : CONFIG.sourceMetrics.includes(metric); // temporary while the region loads
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
    k=>CONFIG.metrics[k].label,k=>isMetricAvailable(k,s.region),s.primaryMetric);
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
  for(const prefix of ['home','skill','score','ts']){
    const s=state[prefix==='score'?'score':prefix];
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
  document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>setRoute(b.dataset.route));
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>setRoute(b.dataset.go));
  $('menu-toggle').onclick=()=>{$('sidebar').classList.add('open');$('sidebar-backdrop').classList.add('visible')};
  $('sidebar-backdrop').onclick=()=>{$('sidebar').classList.remove('open');$('sidebar-backdrop').classList.remove('visible')};
  document.querySelectorAll('[data-scroll-to]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();document.getElementById(link.dataset.scrollTo)?.scrollIntoView({behavior:'smooth',block:'start'})}));
  window.addEventListener('hashchange',()=>{const r=location.hash.replace('#/','');if(['home','skill','scorecard','timeseries','methodology','changelog'].includes(r))setRoute(r,true)});
}
function setRoute(route,fromHash=false){
  const changed=state.route!==route;
  state.route=route;document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===route));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.route===route));
  const titles={home:['OMD Model Performance Dashboard','Rapid model-performance situational awareness using EVS verification statistics'],skill:['Skill vs Forecast Lead','Compare model skill across forecast lead against a selectable baseline'],scorecard:['Verification Scorecard','Compact baseline-relative verification panels across models and forecast leads'],timeseries:['Performance Time Series','Examine daily verification behavior over the previous 90 days'],methodology:['Methodology','Metric definitions, score aggregation, rankings, and data caveats'],changelog:['Changelog','Dashboard feature and implementation history']};
  $('page-title').textContent=titles[route][0];$('page-subtitle').textContent=titles[route][1];document.body.classList.toggle('home-route',route==='home');
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
    k=>CONFIG.metrics[k].label,available,stateObj.metric);
  if(selectedMetric)stateObj.metric=selectedMetric;
}

function initHomeControls(){
  options($('home-model-group-filter'),['Global']);
  options($('home-region-filter'),CONFIG.regions);periodOptions($('home-period-filter'));options($('home-baseline-filter'),MODELS);populateHomeMetric();options($('home-lead-filter'),['all',...CONFIG.leads],v=>v==='all'?'All':`${leadLabel(v)} (${v} h)`);
  const bind=()=>{const s=state.home;$('home-model-group-filter').value='Global';$('home-region-filter').value=s.region;$('home-period-filter').value=s.period;$('home-baseline-filter').value=s.baseline;$('home-primary-metric-filter').value=s.primaryMetric;$('home-lead-filter').value=s.forecastLead;setCustomVisible('home',s)};bind();
  $('home-model-group-filter').onchange=()=>{state.home.modelGroup='Global';renderHome()};
  $('home-region-filter').onchange=e=>{state.home.region=e.target.value;renderHome()};$('home-period-filter').onchange=e=>{state.home.period=e.target.value;setCustomVisible('home',state.home);renderHome()};$('home-baseline-filter').onchange=e=>{state.home.baseline=e.target.value;renderHome()};$('home-primary-metric-filter').onchange=e=>{state.home.primaryMetric=e.target.value;renderHome()};$('home-lead-filter').onchange=e=>{state.home.forecastLead=e.target.value==='all'?'all':Number(e.target.value);renderHome()};handleCustomDates('home',state.home,renderHome);
  $('reset-btn').onclick=()=>{Object.assign(state.home,{modelGroup:'Global',region:CONFIG.defaultRegion,period:'30',baseline:'GFS',primaryMetric:'H500_ACC',forecastLead:120,comparisonMode:'date_lead'});bind();renderHome()};
}

function initDetailControls(){
  // Skill
  populateVariableMetric('skill-variable-filter','skill-metric-filter',state.skill);options($('skill-region-filter'),CONFIG.regions);options($('skill-baseline-filter'),MODELS);initComparisonOptions('skill');periodOptions($('skill-period-filter'));
  $('skill-region-filter').value=state.skill.region;$('skill-baseline-filter').value=state.skill.baseline;$('skill-comparison-filter').value=state.skill.comparisonMode;$('skill-period-filter').value=state.skill.period;
  $('skill-variable-filter').onchange=e=>{state.skill.variable=e.target.value;state.skill.metric=metricsForVariable(state.skill.variable).find(k=>isMetricAvailable(k,state.skill.region))||metricsForVariable(state.skill.variable)[0];renderSkill()};$('skill-metric-filter').onchange=e=>{state.skill.metric=e.target.value;renderSkill()};$('skill-region-filter').onchange=e=>{state.skill.region=e.target.value;renderSkill()};$('skill-baseline-filter').onchange=e=>{state.skill.baseline=e.target.value;renderSkill()};$('skill-comparison-filter').onchange=e=>{state.skill.comparisonMode=e.target.value;renderSkill()};$('skill-period-filter').onchange=e=>{state.skill.period=e.target.value;setCustomVisible('skill',state.skill);renderSkill()};handleCustomDates('skill',state.skill,renderSkill);$('skill-select-all').onclick=()=>{state.skill.models=[...MODELS];renderSkill()};$('skill-clear-all').onclick=()=>{state.skill.models=[];renderSkill()};
  // Scorecard
  options($('score-region-filter'),CONFIG.regions);options($('score-baseline-filter'),MODELS);initComparisonOptions('score');periodOptions($('score-period-filter'));$('score-region-filter').value=state.score.region;$('score-baseline-filter').value=state.score.baseline;$('score-comparison-filter').value=state.score.comparisonMode;$('score-period-filter').value=state.score.period;$('score-region-filter').onchange=e=>{state.score.region=e.target.value;renderScorecardPage()};$('score-baseline-filter').onchange=e=>{state.score.baseline=e.target.value;renderScorecardPage()};$('score-comparison-filter').onchange=e=>{state.score.comparisonMode=e.target.value;renderScorecardPage()};$('score-period-filter').onchange=e=>{state.score.period=e.target.value;setCustomVisible('score',state.score);renderScorecardPage()};handleCustomDates('score',state.score,renderScorecardPage);
  // Time series
  populateVariableMetric('ts-variable-filter','ts-metric-filter',state.ts);options($('ts-region-filter'),CONFIG.regions);options($('ts-lead-filter'),['all',...CONFIG.leads],v=>v==='all'?'All Forecast Leads':`${leadLabel(v)} (${v} h)`);periodOptions($('ts-period-filter'));$('ts-region-filter').value=state.ts.region;$('ts-lead-filter').value=state.ts.lead;$('ts-period-filter').value=state.ts.period;
  $('ts-variable-filter').onchange=e=>{state.ts.variable=e.target.value;state.ts.metric=metricsForVariable(state.ts.variable).find(k=>isMetricAvailable(k,state.ts.region))||metricsForVariable(state.ts.variable)[0];renderTimeSeries()};$('ts-metric-filter').onchange=e=>{state.ts.metric=e.target.value;renderTimeSeries()};$('ts-region-filter').onchange=e=>{state.ts.region=e.target.value;renderTimeSeries()};$('ts-lead-filter').onchange=e=>{state.ts.lead=e.target.value==='all'?'all':Number(e.target.value);renderTimeSeries()};$('ts-period-filter').onchange=e=>{state.ts.period=e.target.value;setCustomVisible('ts',state.ts);renderTimeSeries()};handleCustomDates('ts',state.ts,renderTimeSeries);$('ts-select-all').onclick=()=>{state.ts.models=[...MODELS];renderTimeSeries()};$('ts-clear-all').onclick=()=>{state.ts.models=[];renderTimeSeries()};
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
  const s=state.home;if(!ensureRegionReady(s.region,renderHome))return;populateHomeMetric();const w=rangeArgs(s),vis=MODELS;
  renderHomePerformance(vis,w);renderHomeScorecard(vis,w);renderSignals(vis);renderCategorySummary(vis,w);
}
function renderHomePerformance(vis,w){
  const s=state.home,metric=s.primaryMetric,m=CONFIG.metrics[metric],v=variableForMetric(metric),lead=s.forecastLead==='all'?null:s.forecastLead;
  // Overall ranking uses the aggregate verification score across the selected period/lead.
  const rank=vis.map(model=>({model,value:data.aggregateValue({...w,region:s.region,models:[model],metrics:[metric],leads:lead==null?null:[lead]})})).sort((a,b)=>metricRankValue(a.value,metric)-metricRankValue(b.value,metric));
  const rankableCount=rank.filter(r=>Number.isFinite(r.value)).length;
  const leadText=lead==null?'all forecast leads':`${leadLabel(lead)} (${lead} h)`;
  $('home-performance-title').textContent=`${v.label} — ${m.metricType} Rank History`;
  $('home-performance-subtitle').textContent=`Daily model rank for ${s.region} · ${rangeLabel(s)} · ${leadText}. Rank 1 is best; the left list is the overall period ranking. Baseline does not affect ranks.`;
  $('home-ranking-metric').textContent=`Overall ${m.metricType}`;
  const list=$('home-ranking-list');
  let rankPosition=0;
  list.innerHTML=rank.map(r=>`<button class="home-rank-row" type="button" data-model="${r.model}" style="--rank-color:${modelColor(r.model)}"><span class="rank-number">${Number.isFinite(r.value)&&rankableCount>1?++rankPosition:'N/A'}</span><span class="rank-model"><i style="background:${modelColor(r.model)}"></i>${r.model}</span><strong>${metricFmt(metric,r.value)}</strong></button>`).join('');

  // Build one absolute daily series per model, then rank models independently at each valid date.
  const valuesByModel=new Map(),dateSet=new Set();
  for(const model of vis){
    const daily=data.dailyValueSeries({...w,model,metric,region:s.region,lead});
    const map=new Map(daily.map(d=>[d.date.getTime(),d.value]));
    valuesByModel.set(model,map);for(const x of map.keys())dateSet.add(x);
  }
  const rankSeries=new Map(vis.map(model=>[model,[]]));
  const dates=[...dateSet].sort((a,b)=>a-b);
  for(const x of dates){
    const entries=vis.map(model=>({model,value:valuesByModel.get(model)?.get(x)})).filter(d=>Number.isFinite(d.value));
    entries.sort((a,b)=>metricRankValue(a.value,metric)-metricRankValue(b.value,metric));
    if(entries.length<2)continue; // do not claim a rank when only one model has data
    entries.forEach((entry,index)=>rankSeries.get(entry.model).push({x,y:index+1,label:dateFull(x)}));
  }
  const series=vis.map(model=>({name:model,color:modelColor(model),...chartModelStyle(model),data:rankSeries.get(model)}));
  const chart=$('home-performance-chart');
  const setRankHighlight=name=>{list.querySelectorAll('.home-rank-row').forEach(row=>row.classList.toggle('highlighted',!!name&&row.dataset.model===name));list.classList.toggle('has-highlight',!!name)};
  renderLineChart(chart,series,{formatX:dateShort,formatY:y=>String(Math.round(y)),formatTooltipY:y=>`Rank ${Math.round(y)}`,ySuffix:'',zeroLine:false,tooltipTitle:`${m.short} rank`,emptyMessage:'N/A — no verification data for the selected metric, region, dates and forecast lead.',onSeriesHover:setRankHighlight,showLegend:false,maxSegmentGap:1.5*86400000,xAxisLabel:'Date',yAxisLabel:'Model Rank (1 = Best)',yDomain:[1,vis.length],yTickValues:vis.map((_,i)=>i+1),reverseY:true,interactive:true,exportName:`model-rank-history_${metric}_${s.region}.png`,exportTitle:`Model Rank History — ${v.label} ${m.metricType}`,exportSubtitle:`${s.region} · ${rangeLabel(s)} · ${leadText}`});
  list.querySelectorAll('.home-rank-row').forEach(row=>{row.addEventListener('mouseenter',()=>{setRankHighlight(row.dataset.model);chart._chartSetHighlight?.(row.dataset.model)});row.addEventListener('mouseleave',()=>{setRankHighlight(null);chart._chartSetHighlight?.(null)});row.addEventListener('focus',()=>{setRankHighlight(row.dataset.model);chart._chartSetHighlight?.(row.dataset.model)});row.addEventListener('blur',()=>{setRankHighlight(null);chart._chartSetHighlight?.(null)})});
}

function renderHomeScorecard(vis,w){
  const lead=state.home.forecastLead==='all'?null:state.home.forecastLead;
  const rows=homeCoreMetrics().map(k=>{
    const m=CONFIG.metrics[k],v=variableForMetric(k);
    const cells=vis.map(model=>{
      const skill=data.skillFor({...w,model,baseline:state.home.baseline,metric:k,region:state.home.region,leads:lead==null?null:[lead],comparisonMode:state.home.comparisonMode});
      const g=skillGrade(skill);
      return Number.isFinite(skill)?`<td><span class="heat" style="background:${heatColor(g)};color:${heatText(g)}" title="${m.label} · relative to ${state.home.baseline}">${fmtPct(skill)}</span></td>`:`<td><span class="heat missing-score" title="No available matched verification data">N/A</span></td>`;
    }).join('');
    return `<tr><td><span class="metric-name">${m.short}</span><span class="metric-meta">${CONFIG.sourceMetrics.includes(k)?`vs ${state.home.baseline}`:'Not yet available · N/A'}</span></td>${cells}</tr>`;
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
  const cats=['Surface','Upper Air','Precipitation'];$('category-summary').innerHTML=cats.map(cat=>{const mets=homeCoreMetrics().filter(k=>variableForMetric(k).category===cat),scores=[];for(const model of vis)for(const metric of mets){const s=data.skillFor({...w,model,baseline:state.home.baseline,metric,region:state.home.region,comparisonMode:state.home.comparisonMode});if(Number.isFinite(s))scores.push(s)}const leader=vis.map(model=>({model,s:avg(mets.map(metric=>data.skillFor({...w,model,baseline:state.home.baseline,metric,region:state.home.region,comparisonMode:state.home.comparisonMode})).filter(Number.isFinite))})).filter(x=>Number.isFinite(x.s)).sort((a,b)=>b.s-a.s)[0];return `<div class="category-card"><div class="category-title">${cat}</div><div class="category-value">${fmtPct(avg(scores))}</div><div class="category-detail">Leader: ${leader?.model||'N/A'} · ${fmtPct(leader?.s)}</div></div>`}).join('');
}
// Keep the optional significance display local to Skill vs Lead.
let showSkillSignificance=true;
function renderSkill(){
  const s=state.skill;if(!ensureRegionReady(s.region,renderSkill))return;populateVariableMetric('skill-variable-filter','skill-metric-filter',s);$('skill-region-filter').value=s.region;$('skill-baseline-filter').value=s.baseline;$('skill-comparison-filter').value=s.comparisonMode;$('skill-period-filter').value=s.period;setCustomVisible('skill',s);renderChips('skill-model-chips',MODELS,s.models,next=>{s.models=next;renderSkill()},name=>$('skill-chart')._chartSetHighlight?.(name));
  const m=CONFIG.metrics[s.metric],v=variableForMetric(s.metric),w=rangeArgs(s);$('skill-chart-title').textContent=`${v.label} — ${m.metricType}`;$('skill-chart-subtitle').textContent=`${s.region} · percent improvement versus ${s.baseline} · ${rangeLabel(s)}`;
  const series=s.models.map(model=>({name:model,color:modelColor(model),...chartModelStyle(model),data:data.skillByLead({...w,model,baseline:s.baseline,metric:s.metric,region:s.region,comparisonMode:s.comparisonMode}).map(d=>({x:d.lead/24,y:d.value,label:`Day ${Number(d.lead/24).toFixed(Number.isInteger(d.lead/24)?0:1)} · ${d.lead} h`}))}));
  const significance=showSkillSignificance?buildSignificanceBoxes(data,{...w,models:s.models,baseline:s.baseline,metric:s.metric,region:s.region,comparisonMode:s.comparisonMode}):{boxes:[],comparisons:0};
  $('skill-significance-toggle').checked=showSkillSignificance;
  const sigText=$('skill-significance-status');
  sigText.textContent=!showSkillSignificance?'':significance.boxes.length
    ?`${significance.boxes.length} lead${significance.boxes.length!==1?'s':''} with estimates · ≥20 matched dates required`
    :'No estimate available (requires ≥20 matched dates at a lead)';
  renderLineChart($('skill-chart'),series,{formatX:x=>String(Math.round(x)),xDomain:[0,15],xTickValues:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],xAxisLabel:'Forecast Lead Time (Days)',yAxisLabel:`Skill vs ${s.baseline} (%)`,ySuffix:'%',zeroLine:true,forceZeroTick:true,significanceBoxes:significance.boxes,tooltipTitle:m.short,emptyMessage:'N/A — choose models or select a metric with available verification data.',interactive:true,onSeriesHover:name=>highlightModelChip('skill-model-chips',name),exportName:`skill-vs-lead_${s.metric}_${s.region}.png`,exportTitle:`Skill vs Forecast Lead — ${v.label} ${m.metricType}`,exportSubtitle:`${s.region} · ${rangeLabel(s)} · Baseline: ${s.baseline}`});
  $('skill-verification-note').textContent=`${metricDirectionText(m)} Positive skill means improvement relative to ${s.baseline}. `+
    (!showSkillSignificance?'Estimated significance thresholds are hidden.':significance.boxes.length?'Gray boxes show conservative, exploratory pointwise 95% thresholds around zero. A trace beyond a box exceeds its estimated threshold; these are not official EVS significance tests.':'Significance estimates require at least 20 paired daily observations at each lead.');
  renderComparisonCoverage('skill',{...w,region:s.region,metric:s.metric,baseline:s.baseline,comparisonMode:s.comparisonMode});
}

function renderScorecardPage(){
  const s=state.score;if(!ensureRegionReady(s.region,renderScorecardPage))return;
  $('score-region-filter').value=s.region;$('score-baseline-filter').value=s.baseline;$('score-comparison-filter').value=s.comparisonMode;$('score-period-filter').value=s.period;setCustomVisible('score',s);
  const w=rangeArgs(s);$('scorecard-context').textContent=`${s.region} · ${rangeLabel(s)} · relative to ${s.baseline}`;
  $('score-comparison-note').textContent=s.comparisonMode==='same_source'?'Strict comparison: only scores verified against the same dataset are included.':'Standard comparison: scores are matched by verification date and forecast lead.';
  $('scorecard-sections').innerHTML=CONFIG.scorecardGroups.map(group=>{
    const metricBlocks=group.metrics.map(k=>{
      const m=CONFIG.metrics[k],v=variableForMetric(k);
      const rows=MODELS.map(model=>{
        const cells=CONFIG.scorecardLeads.map(lead=>{
          const skill=data.skillFor({...w,model,baseline:s.baseline,metric:k,region:s.region,leads:[lead],comparisonMode:s.comparisonMode});
          const g=skillGrade(skill);
          return Number.isFinite(skill)?`<td><span class="scorecell" style="background:${heatColor(g)};color:${heatText(g)}" title="${m.label} · ${leadLabel(lead)} · relative to ${s.baseline}">${fmtPct(skill)}</span></td>`:`<td><span class="scorecell missing-score" title="No available matched verification data">N/A</span></td>`;
        }).join('');
        return `<tr><th class="mini-model"><span class="chip-dot" style="background:${modelColor(model)}"></span>${model}</th>${cells}</tr>`;
      }).join('');
      return `<section class="metric-block"><div class="metric-block-head"><div><strong>${m.metricType}</strong><span>${CONFIG.sourceMetrics.includes(k)?'Available verification scores':'N/A — metric not yet available'}</span></div><small>Percent improvement vs ${s.baseline}</small></div><div class="mini-score-wrap"><table class="mini-score-table"><thead><tr><th>Model</th>${CONFIG.scorecardLeads.map(h=>`<th>${leadLabel(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
    }).join('');
    return `<article class="card scorecard-panel"><header><div><h3>${group.title}</h3><p>${variableForMetric(group.metrics[0]).level}</p></div></header>${metricBlocks}</article>`;
  }).join('');
}

function renderTimeSeries(){
  const s=state.ts;if(!ensureRegionReady(s.region,renderTimeSeries))return;populateVariableMetric('ts-variable-filter','ts-metric-filter',s);$('ts-region-filter').value=s.region;$('ts-lead-filter').value=s.lead;$('ts-period-filter').value=s.period;setCustomVisible('ts',s);renderChips('ts-model-chips',MODELS,s.models,next=>{s.models=next;renderTimeSeries()},name=>$('ts-chart')._chartSetHighlight?.(name));
  const m=CONFIG.metrics[s.metric],v=variableForMetric(s.metric),lead=s.lead==='all'?null:s.lead,w=rangeArgs(s),leadText=lead==null?'All forecast leads':`${leadLabel(lead)} · ${lead} h`;
  $('ts-chart-title').textContent=`${v.label} — ${m.metricType}`;$('ts-chart-subtitle').textContent=`${s.region} · ${leadText} · ${rangeLabel(s)}`;
  const series=s.models.map(model=>({name:model,color:modelColor(model),...chartModelStyle(model),data:data.dailyValueSeries({...w,model,metric:s.metric,region:s.region,lead}).map(d=>({x:d.date.getTime(),y:d.value,label:dateFull(d.date.getTime())}))}));
  renderLineChart($('ts-chart'),series,{formatX:dateShort,formatY:y=>metricFmt(s.metric,y),formatTooltipY:y=>metricFmt(s.metric,y),ySuffix:'',zeroLine:m.direction==='target',tooltipTitle:m.short,emptyMessage:'N/A — choose models or select a metric with available verification data.',interactive:true,onSeriesHover:name=>highlightModelChip('ts-model-chips',name),maxSegmentGap:1.5*86400000,xAxisLabel:'Date',yAxisLabel:metricAxisLabel(s.metric),exportName:`time-series_${s.metric}_${s.region}_${s.lead}.png`,exportTitle:`Performance Time Series — ${v.label} ${m.metricType}`,exportSubtitle:`${s.region} · ${leadText} · ${rangeLabel(s)}`});
  $('ts-verification-note').textContent=`${metricDirectionText(m)} ${lead==null?'Each date aggregates all available forecast leads.':'Each point uses the selected forecast lead.'}`;
}

function renderCurrent(){if(state.route==='home')renderHome();else if(state.route==='skill')renderSkill();else if(state.route==='scorecard')renderScorecardPage();else if(state.route==='timeseries')renderTimeSeries()}

async function start(){
  initTheme();initNavigation();initHomeControls();initDetailControls();
  $('skill-significance-toggle').addEventListener('change',event=>{showSkillSignificance=event.target.checked;renderSkill()});
  try{await data.load(CONFIG.defaultRegion);syncDateLimits();updateDataStatus();const initial=location.hash.replace('#/','');setRoute(['home','skill','scorecard','timeseries','methodology','changelog'].includes(initial)?initial:'home',!initial)}
  catch(err){console.error(err);document.querySelector('.status-dot').className='status-dot error';$('data-status').textContent='Data load failed';document.querySelector('.main-content').innerHTML=`<section class="card"><div class="empty">Unable to load the EVS data files. Check deployment and use HTTP(S).</div></section>`}
}
start();
