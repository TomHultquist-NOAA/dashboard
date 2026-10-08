import { CONFIG, metricKeys, variableKeys, metricsForVariable } from './config.js';
import { DataService } from './data-service.js';
import { renderLineChart } from './charts.js';

const data=new DataService();
const $=id=>document.getElementById(id);
const MODELS=Object.keys(CONFIG.modelMeta);
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmtPct=v=>Number.isFinite(v)?`${v>0?'+':''}${v.toFixed(1)}%`:'—';
const leadLabel=h=>`D${Number(h)/24}`;
const dateShort=ms=>new Date(ms).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
const dateFull=ms=>new Date(ms).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const iso=d=>new Date(d).toISOString().slice(0,10);

const state={
  route:'home',
  home:{modelGroup:'Global',region:CONFIG.defaultRegion,period:'30',customStart:null,customEnd:null,baseline:'GFS',primaryMetric:'H500_ACC',forecastLead:'all'},
  skill:{variable:'H500',metric:'H500_ACC',region:CONFIG.defaultRegion,baseline:'GFS',period:'30',customStart:null,customEnd:null,models:[...MODELS]},
  score:{region:CONFIG.defaultRegion,baseline:'GFS',period:'30',customStart:null,customEnd:null},
  ts:{variable:'H500',metric:'H500_ACC',region:CONFIG.defaultRegion,lead:120,period:'30',customStart:null,customEnd:null,models:[...MODELS]}
};

function currentTheme(){return document.documentElement.dataset.theme==='light'?'light':'dark'}
function modelColor(model){const m=CONFIG.modelMeta[model];return currentTheme()==='light'?(m.lightColor||m.color):m.color}
function metricFmt(metricKey,value){const m=CONFIG.metrics[metricKey];return Number.isFinite(value)?`${value.toFixed(m.decimals)}${m.unit}`:'—'}
function metricAxisLabel(metricKey){
  const m=CONFIG.metrics[metricKey],unit=(m.unit||'').trim();
  return unit?`${m.metricType} (${unit})`:m.metricType;
}
function tone(v){return v>1.5?'good':v<-1.5?'bad':'neutral'}
function metricDirectionText(m){return m.direction==='lower'?'Lower is better.':m.direction==='higher'?'Higher is better.':'Values closer to zero are better.'}
function variableForMetric(k){return CONFIG.variables[CONFIG.metrics[k].variable]}
function options(el,values,label=v=>v,value=v=>v){el.innerHTML=values.map(v=>`<option value="${value(v)}">${label(v)}</option>`).join('')}

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
  $(`${prefix}-start-wrap`)?.classList.toggle('hidden',s.period!=='custom');
  $(`${prefix}-end-wrap`)?.classList.toggle('hidden',s.period!=='custom');
}
function syncDateLimits(){
  if(!data.latestDate||!data.earliestDate)return;
  const min=iso(data.earliestDate),max=iso(data.latestDate);
  for(const prefix of ['home','skill','score','ts']){
    const s=state[prefix==='score'?'score':prefix];
    const start=$(`${prefix}-start-date`),end=$(`${prefix}-end-date`);if(!start||!end)continue;
    start.min=min;start.max=max;end.min=min;end.max=max;
    if(!s.customEnd)s.customEnd=max;
    if(!s.customStart){const d=new Date(data.latestDate);d.setUTCDate(d.getUTCDate()-29);s.customStart=iso(d)}
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
  if(!data.latestDate)return;
  $('data-status').textContent=`Data through ${dateFull(data.latestDate.getTime())} · ${data.loadedRegions.size} region${data.loadedRegions.size===1?'':'s'} loaded`;
}
function ensureRegionReady(region,callback){
  if(data.isRegionLoaded(region))return true;
  $('data-status').textContent=`Loading ${region} verification data…`;
  data.ensureRegion(region).then(()=>{syncDateLimits();updateDataStatus();callback()}).catch(err=>{console.error(err);document.querySelector('.status-dot').className='status-dot error';$('data-status').textContent=`Unable to load ${region}`});
  return false;
}

function initTheme(){
  const apply=()=>{$('theme-toggle-label').textContent=currentTheme()==='dark'?'Light':'Dark';$('theme-toggle').title=`Switch to ${currentTheme()==='dark'?'light':'dark'} mode`};
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


function renderChips(id,available,selected,onChange){
  const box=$(id);box.innerHTML='';for(const model of available){const b=document.createElement('button');b.type='button';b.className=`chip ${selected.includes(model)?'active':''}`;b.style.setProperty('--chip-color',modelColor(model));b.innerHTML=`<span class="chip-dot" style="background:${modelColor(model)}"></span>${model}`;b.onclick=()=>{const next=selected.includes(model)?selected.filter(x=>x!==model):[...selected,model];onChange(next)};box.appendChild(b)}
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
  const vars=variableKeys();options($(variableId),vars,v=>CONFIG.variables[v].label);if(!vars.includes(stateObj.variable))stateObj.variable=vars[0];$(variableId).value=stateObj.variable;
  const mets=metricsForVariable(stateObj.variable);options($(metricId),mets,k=>CONFIG.metrics[k].label);if(!mets.includes(stateObj.metric))stateObj.metric=mets[0];$(metricId).value=stateObj.metric;
}

function initHomeControls(){
  options($('home-model-group-filter'),['Global']);
  options($('home-region-filter'),CONFIG.regions);periodOptions($('home-period-filter'));options($('home-baseline-filter'),MODELS);options($('home-primary-metric-filter'),metricKeys(),k=>CONFIG.metrics[k].label);options($('home-lead-filter'),['all',...CONFIG.leads],v=>v==='all'?'All':`${leadLabel(v)} (${v} h)`);
  const bind=()=>{const s=state.home;$('home-model-group-filter').value='Global';$('home-region-filter').value=s.region;$('home-period-filter').value=s.period;$('home-baseline-filter').value=s.baseline;$('home-primary-metric-filter').value=s.primaryMetric;$('home-lead-filter').value=s.forecastLead;setCustomVisible('home',s)};bind();
  $('home-model-group-filter').onchange=()=>{state.home.modelGroup='Global';renderHome()};
  $('home-region-filter').onchange=e=>{state.home.region=e.target.value;renderHome()};$('home-period-filter').onchange=e=>{state.home.period=e.target.value;setCustomVisible('home',state.home);renderHome()};$('home-baseline-filter').onchange=e=>{state.home.baseline=e.target.value;renderHome()};$('home-primary-metric-filter').onchange=e=>{state.home.primaryMetric=e.target.value;renderHome()};$('home-lead-filter').onchange=e=>{state.home.forecastLead=e.target.value==='all'?'all':Number(e.target.value);renderHome()};handleCustomDates('home',state.home,renderHome);
  $('reset-btn').onclick=()=>{Object.assign(state.home,{modelGroup:'Global',region:CONFIG.defaultRegion,period:'30',baseline:'GFS',primaryMetric:'H500_ACC',forecastLead:'all'});bind();renderHome()};
}

function initDetailControls(){
  // Skill
  populateVariableMetric('skill-variable-filter','skill-metric-filter',state.skill);options($('skill-region-filter'),CONFIG.regions);options($('skill-baseline-filter'),MODELS);periodOptions($('skill-period-filter'));
  $('skill-region-filter').value=state.skill.region;$('skill-baseline-filter').value=state.skill.baseline;$('skill-period-filter').value=state.skill.period;
  $('skill-variable-filter').onchange=e=>{state.skill.variable=e.target.value;state.skill.metric=metricsForVariable(state.skill.variable)[0];renderSkill()};$('skill-metric-filter').onchange=e=>{state.skill.metric=e.target.value;renderSkill()};$('skill-region-filter').onchange=e=>{state.skill.region=e.target.value;renderSkill()};$('skill-baseline-filter').onchange=e=>{state.skill.baseline=e.target.value;renderSkill()};$('skill-period-filter').onchange=e=>{state.skill.period=e.target.value;setCustomVisible('skill',state.skill);renderSkill()};handleCustomDates('skill',state.skill,renderSkill);$('skill-select-all').onclick=()=>{state.skill.models=[...MODELS];renderSkill()};$('skill-clear-all').onclick=()=>{state.skill.models=[];renderSkill()};
  // Scorecard
  options($('score-region-filter'),CONFIG.regions);options($('score-baseline-filter'),MODELS);periodOptions($('score-period-filter'));$('score-region-filter').value=state.score.region;$('score-baseline-filter').value=state.score.baseline;$('score-period-filter').value=state.score.period;$('score-region-filter').onchange=e=>{state.score.region=e.target.value;renderScorecardPage()};$('score-baseline-filter').onchange=e=>{state.score.baseline=e.target.value;renderScorecardPage()};$('score-period-filter').onchange=e=>{state.score.period=e.target.value;setCustomVisible('score',state.score);renderScorecardPage()};handleCustomDates('score',state.score,renderScorecardPage);
  // Time series
  populateVariableMetric('ts-variable-filter','ts-metric-filter',state.ts);options($('ts-region-filter'),CONFIG.regions);options($('ts-lead-filter'),['all',...CONFIG.leads],v=>v==='all'?'All Forecast Leads':`${leadLabel(v)} (${v} h)`);periodOptions($('ts-period-filter'));$('ts-region-filter').value=state.ts.region;$('ts-lead-filter').value=state.ts.lead;$('ts-period-filter').value=state.ts.period;
  $('ts-variable-filter').onchange=e=>{state.ts.variable=e.target.value;state.ts.metric=metricsForVariable(state.ts.variable)[0];renderTimeSeries()};$('ts-metric-filter').onchange=e=>{state.ts.metric=e.target.value;renderTimeSeries()};$('ts-region-filter').onchange=e=>{state.ts.region=e.target.value;renderTimeSeries()};$('ts-lead-filter').onchange=e=>{state.ts.lead=e.target.value==='all'?'all':Number(e.target.value);renderTimeSeries()};$('ts-period-filter').onchange=e=>{state.ts.period=e.target.value;setCustomVisible('ts',state.ts);renderTimeSeries()};handleCustomDates('ts',state.ts,renderTimeSeries);$('ts-select-all').onclick=()=>{state.ts.models=[...MODELS];renderTimeSeries()};$('ts-clear-all').onclick=()=>{state.ts.models=[];renderTimeSeries()};
}

function homeCoreMetrics(){return CONFIG.homeMetrics}
function metricRankValue(value,metricKey){
  const m=CONFIG.metrics[metricKey];if(!Number.isFinite(value))return Infinity;
  if(m.direction==='higher')return -value;
  if(m.direction==='lower')return value;
  return Math.abs(value-(m.target??0));
}
function renderHome(){
  const s=state.home;if(!ensureRegionReady(s.region,renderHome))return;const w=rangeArgs(s),vis=MODELS;
  renderHomePerformance(vis,w);renderHomeScorecard(vis,w);renderSignals(vis);renderCategorySummary(vis,w);
}
function renderHomePerformance(vis,w){
  const s=state.home,metric=s.primaryMetric,m=CONFIG.metrics[metric],v=variableForMetric(metric),lead=s.forecastLead==='all'?null:s.forecastLead;
  // Overall ranking uses the aggregate verification score across the selected period/lead.
  const rank=vis.map(model=>({model,value:data.aggregateValue({...w,region:s.region,models:[model],metrics:[metric],leads:lead==null?null:[lead]})})).sort((a,b)=>metricRankValue(a.value,metric)-metricRankValue(b.value,metric));
  const leadText=lead==null?'all forecast leads':`${leadLabel(lead)} (${lead} h)`;
  $('home-performance-title').textContent=`${v.label} — ${m.metricType} Rank History`;
  $('home-performance-subtitle').textContent=`Daily model rank for ${s.region} · ${rangeLabel(s)} · ${leadText} · verified against ${v.obsSource}. Rank 1 is best; the left list is the overall period ranking.`;
  $('home-ranking-metric').textContent=`Overall ${m.metricType}`;
  const list=$('home-ranking-list');
  list.innerHTML=rank.map((r,i)=>`<button class="home-rank-row" type="button" data-model="${r.model}" style="--rank-color:${modelColor(r.model)}"><span class="rank-number">${i+1}</span><span class="rank-model"><i style="background:${modelColor(r.model)}"></i>${r.model}</span><strong>${metricFmt(metric,r.value)}</strong></button>`).join('');

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
    entries.forEach((entry,index)=>rankSeries.get(entry.model).push({x,y:index+1,label:dateFull(x)}));
  }
  const series=vis.map(model=>({name:model,color:modelColor(model),data:rankSeries.get(model)}));
  const chart=$('home-performance-chart');
  const setRankHighlight=name=>{list.querySelectorAll('.home-rank-row').forEach(row=>row.classList.toggle('highlighted',!!name&&row.dataset.model===name));list.classList.toggle('has-highlight',!!name)};
  renderLineChart(chart,series,{formatX:dateShort,formatY:y=>String(Math.round(y)),formatTooltipY:y=>`Rank ${Math.round(y)}`,ySuffix:'',zeroLine:false,tooltipTitle:`${m.short} rank`,emptyMessage:'No ranking data for this selection.',onSeriesHover:setRankHighlight,showLegend:false,xAxisLabel:'Date',yAxisLabel:'Model Rank (1 = Best)',yDomain:[1,vis.length],yTickValues:vis.map((_,i)=>i+1),reverseY:true,interactive:true,exportName:`model-rank-history_${metric}_${s.region}.png`,exportTitle:`Model Rank History — ${v.label} ${m.metricType}`,exportSubtitle:`${s.region} · ${rangeLabel(s)} · ${leadText}`});
  list.querySelectorAll('.home-rank-row').forEach(row=>{row.addEventListener('mouseenter',()=>{setRankHighlight(row.dataset.model);chart._chartSetHighlight?.(row.dataset.model)});row.addEventListener('mouseleave',()=>{setRankHighlight(null);chart._chartSetHighlight?.(null)});row.addEventListener('focus',()=>{setRankHighlight(row.dataset.model);chart._chartSetHighlight?.(row.dataset.model)});row.addEventListener('blur',()=>{setRankHighlight(null);chart._chartSetHighlight?.(null)})});
}

function renderHomeScorecard(vis,w){
  const lead=state.home.forecastLead==='all'?null:state.home.forecastLead;
  const rows=homeCoreMetrics().map(k=>{
    const m=CONFIG.metrics[k],v=variableForMetric(k);
    const cells=vis.map(model=>{
      const skill=data.skillFor({...w,model,baseline:state.home.baseline,metric:k,region:state.home.region,leads:lead==null?null:[lead]});
      const g=skillGrade(skill);
      return `<td><span class="heat" style="background:${heatColor(g)};color:${heatText(g)}" title="${m.label} · relative to ${state.home.baseline}">${fmtPct(skill)}</span></td>`;
    }).join('');
    return `<tr><td><span class="metric-name">${m.short}</span><span class="metric-meta">vs ${state.home.baseline} · ${v.obsSource}</span></td>${cells}</tr>`;
  }).join('');
  $('home-scorecard-table').innerHTML=`<thead><tr><th>Metric</th>${vis.map(m=>`<th>${m}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>`;
}
function renderSignals(vis){
  const candidates=[];for(const model of vis)for(const metric of homeCoreMetrics()){const change=data.periodChange({model,metric,region:state.home.region,days:15});if(Number.isFinite(change)){const raw=data.aggregateValue({days:15,region:state.home.region,models:[model],metrics:[metric]});candidates.push({model,metric,change,raw})}}
  candidates.sort((a,b)=>Math.abs(b.change)-Math.abs(a.change));$('signals-list').innerHTML=candidates.slice(0,6).map(s=>{const good=s.change>=0,m=CONFIG.metrics[s.metric];return `<div class="signal"><div class="signal-icon ${good?'good':'bad'}">${good?'▲':'▼'}</div><div><div class="signal-title">${s.model} · ${m.short}</div><div class="signal-desc">${good?'Improved':'Degraded'} ${Math.abs(s.change).toFixed(1)}% versus the preceding 15-day window.</div></div><div class="raw-value">${metricFmt(s.metric,s.raw)}</div></div>`}).join('');
}
function renderCategorySummary(vis,w){
  const cats=['Surface','Upper Air','Precipitation'];$('category-summary').innerHTML=cats.map(cat=>{const mets=homeCoreMetrics().filter(k=>variableForMetric(k).category===cat),scores=[];for(const model of vis)for(const metric of mets){const s=data.skillFor({...w,model,baseline:state.home.baseline,metric,region:state.home.region});if(Number.isFinite(s))scores.push(s)}const leader=vis.map(model=>({model,s:avg(mets.map(metric=>data.skillFor({...w,model,baseline:state.home.baseline,metric,region:state.home.region})).filter(Number.isFinite))})).sort((a,b)=>b.s-a.s)[0];return `<div class="category-card"><div class="category-title">${cat}</div><div class="category-value">${fmtPct(avg(scores))}</div><div class="category-detail">Leader: ${leader?.model||'—'} · ${fmtPct(leader?.s)}</div></div>`}).join('');
}
function renderSkill(){
  const s=state.skill;if(!ensureRegionReady(s.region,renderSkill))return;populateVariableMetric('skill-variable-filter','skill-metric-filter',s);$('skill-region-filter').value=s.region;$('skill-baseline-filter').value=s.baseline;$('skill-period-filter').value=s.period;setCustomVisible('skill',s);renderChips('skill-model-chips',MODELS,s.models,next=>{s.models=next;renderSkill()});
  const m=CONFIG.metrics[s.metric],v=variableForMetric(s.metric),w=rangeArgs(s);$('skill-chart-title').textContent=`${v.label} — ${m.metricType}`;$('skill-chart-subtitle').textContent=`${s.region} · percent improvement versus ${s.baseline} · ${rangeLabel(s)}`;
  const series=s.models.map(model=>({name:model,color:modelColor(model),data:data.skillByLead({...w,model,baseline:s.baseline,metric:s.metric,region:s.region}).map(d=>({x:d.lead/24,y:d.value,label:`Day ${Number(d.lead/24).toFixed(Number.isInteger(d.lead/24)?0:1)} · ${d.lead} h`}))}));
  renderLineChart($('skill-chart'),series,{formatX:x=>String(Math.round(x)),xDomain:[0,15],xTickValues:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],xAxisLabel:'Forecast Lead Time (Days)',yAxisLabel:`Skill vs ${s.baseline} (%)`,ySuffix:'%',zeroLine:true,tooltipTitle:m.short,emptyMessage:'No models selected. Choose any number of models above.',interactive:true,exportName:`skill-vs-lead_${s.metric}_${s.region}.png`,exportTitle:`Skill vs Forecast Lead — ${v.label} ${m.metricType}`,exportSubtitle:`${s.region} · ${rangeLabel(s)} · Baseline: ${s.baseline}`});
  $('skill-verification-note').innerHTML=`<strong>Verification:</strong> ${v.obsSource} · ${v.level}. ${metricDirectionText(m)} Skill is expressed relative to ${s.baseline}.`;
}

function renderScorecardPage(){
  const s=state.score;if(!ensureRegionReady(s.region,renderScorecardPage))return;
  $('score-region-filter').value=s.region;$('score-baseline-filter').value=s.baseline;$('score-period-filter').value=s.period;setCustomVisible('score',s);
  const w=rangeArgs(s);$('scorecard-context').textContent=`${s.region} · ${rangeLabel(s)} · relative to ${s.baseline}`;
  $('scorecard-sections').innerHTML=CONFIG.scorecardGroups.map(group=>{
    const metricBlocks=group.metrics.map(k=>{
      const m=CONFIG.metrics[k],v=variableForMetric(k);
      const rows=MODELS.map(model=>{
        const cells=CONFIG.scorecardLeads.map(lead=>{
          const skill=data.skillFor({...w,model,baseline:s.baseline,metric:k,region:s.region,leads:[lead]});
          const g=skillGrade(skill);
          return `<td><span class="scorecell" style="background:${heatColor(g)};color:${heatText(g)}" title="${m.label} · ${leadLabel(lead)} · relative to ${s.baseline}">${fmtPct(skill)}</span></td>`;
        }).join('');
        return `<tr><th class="mini-model"><span class="chip-dot" style="background:${modelColor(model)}"></span>${model}</th>${cells}</tr>`;
      }).join('');
      return `<section class="metric-block"><div class="metric-block-head"><div><strong>${m.metricType}</strong><span>${v.obsSource}</span></div><small>Percent improvement vs ${s.baseline}</small></div><div class="mini-score-wrap"><table class="mini-score-table"><thead><tr><th>Model</th>${CONFIG.scorecardLeads.map(h=>`<th>${leadLabel(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
    }).join('');
    return `<article class="card scorecard-panel"><header><div><h3>${group.title}</h3><p>${variableForMetric(group.metrics[0]).level}</p></div></header>${metricBlocks}</article>`;
  }).join('');
}

function renderTimeSeries(){
  const s=state.ts;if(!ensureRegionReady(s.region,renderTimeSeries))return;populateVariableMetric('ts-variable-filter','ts-metric-filter',s);$('ts-region-filter').value=s.region;$('ts-lead-filter').value=s.lead;$('ts-period-filter').value=s.period;setCustomVisible('ts',s);renderChips('ts-model-chips',MODELS,s.models,next=>{s.models=next;renderTimeSeries()});
  const m=CONFIG.metrics[s.metric],v=variableForMetric(s.metric),lead=s.lead==='all'?null:s.lead,w=rangeArgs(s),leadText=lead==null?'All forecast leads':`${leadLabel(lead)} · ${lead} h`;
  $('ts-chart-title').textContent=`${v.label} — ${m.metricType}`;$('ts-chart-subtitle').textContent=`${s.region} · ${leadText} · ${rangeLabel(s)}`;
  const series=s.models.map(model=>({name:model,color:modelColor(model),data:data.dailyValueSeries({...w,model,metric:s.metric,region:s.region,lead}).map(d=>({x:d.date.getTime(),y:d.value,label:dateFull(d.date.getTime())}))}));
  renderLineChart($('ts-chart'),series,{formatX:dateShort,formatY:y=>metricFmt(s.metric,y),formatTooltipY:y=>metricFmt(s.metric,y),ySuffix:'',zeroLine:m.direction==='target',tooltipTitle:m.short,emptyMessage:'No models selected. Choose any number of models above.',interactive:true,xAxisLabel:'Date',yAxisLabel:metricAxisLabel(s.metric),exportName:`time-series_${s.metric}_${s.region}_${s.lead}.png`,exportTitle:`Performance Time Series — ${v.label} ${m.metricType}`,exportSubtitle:`${s.region} · ${leadText} · ${rangeLabel(s)}`});
  $('ts-verification-note').innerHTML=`<strong>Verification:</strong> ${v.obsSource} · ${v.level}. ${metricDirectionText(m)} ${lead==null?'Each date aggregates all available forecast leads.':'Each point uses the selected forecast lead.'}`;
}

function renderCurrent(){if(!data.rows.length)return;if(state.route==='home')renderHome();else if(state.route==='skill')renderSkill();else if(state.route==='scorecard')renderScorecardPage();else if(state.route==='timeseries')renderTimeSeries()}

async function start(){
  initTheme();initNavigation();initHomeControls();initDetailControls();
  try{await data.load(CONFIG.defaultRegion);syncDateLimits();updateDataStatus();const initial=location.hash.replace('#/','');setRoute(['home','skill','scorecard','timeseries','methodology','changelog'].includes(initial)?initial:'home',!initial)}
  catch(err){console.error(err);document.querySelector('.status-dot').className='status-dot error';$('data-status').textContent='Data load failed';document.querySelector('.main-content').innerHTML=`<section class="card"><div class="empty">Unable to load the demonstration CSV. Serve this directory through HTTP rather than opening index.html directly.</div></section>`}
}
start();
