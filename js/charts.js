function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const SVG_NS='http://www.w3.org/2000/svg';
let chartClipSeq=0;

function icon(type){
  const paths={
    plus:'<circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6M16.5 16.5 21 21"/>',
    minus:'<circle cx="11" cy="11" r="7"/><path d="M8 11h6M16.5 16.5 21 21"/>',
    reset:'<path d="M4 9a8 8 0 1 1 1 8"/><path d="M4 4v5h5"/>',
    save:'<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5"/><path d="M5 20h14"/>'
  };
  return `<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[type]}</svg>`;
}

function cssVar(name,fallback){
  const value=getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value||fallback;
}

function createDownload(dataUrl,filename){
  const a=document.createElement('a');
  a.href=dataUrl;
  a.download=filename||'omd-chart.png';
  a.style.display='none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function tickValues(view,explicit,count=6,sourceX=[]){
  if(Array.isArray(explicit)&&explicit.length){
    return explicit.filter(v=>v>=view.x0-1e-9&&v<=view.x1+1e-9);
  }
  const visible=[...new Set(sourceX.filter(Number.isFinite).filter(v=>v>=view.x0-1e-9&&v<=view.x1+1e-9))].sort((a,b)=>a-b);
  if(!visible.length)return [];
  if(visible.length<=count+1)return visible;
  const out=[];
  for(let i=0;i<=count;i++){
    const idx=Math.round(i*(visible.length-1)/count);
    const v=visible[idx];
    if(out[out.length-1]!==v)out.push(v);
  }
  return out;
}

function exportCanvasPng({series,view,original,width,height,p,formatX,yAxis,xTickValues,yTickValues,xAxisLabel,yAxisLabel,reverseY=false,filename,allX,exportTitle='',exportSubtitle=''}){
  const scale=2;
  const headerH=exportTitle?58:0;
  const canvas=document.createElement('canvas');
  canvas.width=width*scale;canvas.height=(height+headerH)*scale;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas is unavailable');
  ctx.scale(scale,scale);

  const colors={
    bg:cssVar('--chart-bg','#ffffff'),grid:cssVar('--chart-grid','rgba(0,0,0,.12)'),gridSoft:cssVar('--chart-grid-soft','rgba(0,0,0,.07)'),
    axis:cssVar('--chart-axis','rgba(0,0,0,.3)'),axisText:cssVar('--chart-axis-text','#55657a'),zero:cssVar('--chart-zero','rgba(0,0,0,.3)'),
    insetBg:cssVar('--chart-inset-bg','rgba(255,255,255,.95)'),insetLine:cssVar('--chart-inset-line','rgba(0,0,0,.18)'),legendText:cssVar('--chart-legend-text','#26364a')
  };
  const sx=x=>p.l+(x-view.x0)/(view.x1-view.x0)*(width-p.l-p.r);
  const sy=y=>reverseY?p.t+(y-view.y0)/(view.y1-view.y0)*(height-p.t-p.b):height-p.b-(y-view.y0)/(view.y1-view.y0)*(height-p.t-p.b);
  ctx.fillStyle=colors.bg;ctx.fillRect(0,0,width,height+headerH);
  if(exportTitle){
    ctx.fillStyle=colors.legendText;ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='700 17px Inter, Segoe UI, Arial, sans-serif';ctx.fillText(exportTitle,p.l,24);
    if(exportSubtitle){ctx.fillStyle=colors.axisText;ctx.font='11px Inter, Segoe UI, Arial, sans-serif';ctx.fillText(exportSubtitle,p.l,43)}
    ctx.save();ctx.translate(0,headerH);
  }
  ctx.lineWidth=1;ctx.font='11px Inter, Segoe UI, Arial, sans-serif';ctx.textBaseline='middle';

  const exportYTicks=Array.isArray(yTickValues)&&yTickValues.length?yTickValues.filter(y=>y>=view.y0-1e-9&&y<=view.y1+1e-9):Array.from({length:6},(_,i)=>view.y0+i*(view.y1-view.y0)/5);
  for(const y of exportYTicks){
    const py=sy(y);
    ctx.strokeStyle=colors.grid;ctx.beginPath();ctx.moveTo(p.l,py);ctx.lineTo(width-p.r,py);ctx.stroke();
    ctx.fillStyle=colors.axisText;ctx.textAlign='right';ctx.fillText(String(yAxis(y)),p.l-9,py);
  }
  for(const x of tickValues(view,xTickValues,6,allX)){
    const px=sx(x);ctx.strokeStyle=colors.gridSoft;ctx.beginPath();ctx.moveTo(px,p.t);ctx.lineTo(px,height-p.b);ctx.stroke();
    ctx.fillStyle=colors.axisText;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(String(formatX(x)),px,height-(xAxisLabel?30:17));ctx.textBaseline='middle';
  }
  if(view.y0<=0&&view.y1>=0){ctx.strokeStyle=colors.zero;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(p.l,sy(0));ctx.lineTo(width-p.r,sy(0));ctx.stroke();ctx.setLineDash([])}
  ctx.strokeStyle=colors.axis;ctx.beginPath();ctx.moveTo(p.l,p.t);ctx.lineTo(p.l,height-p.b);ctx.lineTo(width-p.r,height-p.b);ctx.stroke();

  ctx.save();
  ctx.beginPath();ctx.rect(p.l,p.t,width-p.l-p.r,height-p.t-p.b);ctx.clip();
  for(const s of series){
    const pts=s.data.filter(d=>Number.isFinite(d.x)&&Number.isFinite(d.y));if(!pts.length)continue;
    ctx.strokeStyle=s.color;ctx.lineWidth=3;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();pts.forEach((d,i)=>{const x=sx(d.x),y=sy(d.y);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();
    ctx.fillStyle=s.color;for(const d of pts){ctx.beginPath();ctx.arc(sx(d.x),sy(d.y),2.5,0,Math.PI*2);ctx.fill()}
  }
  ctx.restore();

  if(xAxisLabel){ctx.fillStyle=colors.axisText;ctx.font='700 11px Inter, Segoe UI, Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(xAxisLabel,(p.l+width-p.r)/2,height-6)}
  if(yAxisLabel){ctx.save();ctx.fillStyle=colors.axisText;ctx.font='700 11px Inter, Segoe UI, Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.translate(17,(p.t+height-p.b)/2);ctx.rotate(-Math.PI/2);ctx.fillText(yAxisLabel,0,0);ctx.restore()}
  if(exportTitle)ctx.restore();
  createDownload(canvas.toDataURL('image/png'),filename);
}

export function renderLineChart(container,series,{
  formatX=x=>String(x),formatY=null,ySuffix='%',zeroLine=true,
  tooltipTitle=null,formatTooltipY=null,emptyMessage='No data for this selection.',
  interactive=false,exportName='omd-chart.png',interactionHint='Drag a box to zoom · wheel to zoom horizontally · Shift+drag to pan',onSeriesHover=null,showLegend=false,
  xDomain=null,xTickValues=null,yDomain=null,yTickValues=null,reverseY=false,xAxisLabel='',yAxisLabel='',exportTitle='',exportSubtitle=''
}={}){
  if(container._chartCleanup){container._chartCleanup();container._chartCleanup=null}
  if(!series.length||!series.some(s=>s.data.length)){container.innerHTML=`<div class="empty">${esc(emptyMessage)}</div>`;return}

  const width=820,height=410,p={l:yAxisLabel?92:72,r:20,t:25,b:xAxisLabel?68:52};
  const allX=series.flatMap(s=>s.data.map(d=>d.x)).filter(Number.isFinite),allY=series.flatMap(s=>s.data.map(d=>d.y)).filter(Number.isFinite);
  let ox0=xDomain?.[0]??Math.min(...allX),ox1=xDomain?.[1]??Math.max(...allX),oy0=yDomain?.[0]??Math.min(...allY),oy1=yDomain?.[1]??Math.max(...allY);
  if(ox0===ox1){ox0-=1;ox1+=1}if(oy0===oy1){oy0-=1;oy1+=1}
  if(!yDomain){const yp=(oy1-oy0)*.13||1;oy0-=yp;oy1+=yp;if(zeroLine){oy0=Math.min(oy0,0);oy1=Math.max(oy1,0)}}
  const original={x0:ox0,x1:ox1,y0:oy0,y1:oy1},view={...original};
  let dragMode=null,dragStart=null,dragCurrent=null;
  const yAxis=formatY||(y=>`${y.toFixed(1)}${ySuffix}`),tooltipY=formatTooltipY||(y=>`${y>0?'+':''}${y.toFixed(1)}${ySuffix}`);
  const sortedX=[...new Set(allX)].sort((a,b)=>a-b);
  const deltas=sortedX.slice(1).map((v,i)=>v-sortedX[i]).filter(v=>v>0);
  const minStep=deltas.length?Math.min(...deltas):(original.x1-original.x0);
  const minXSpan=Math.min(original.x1-original.x0,Math.max(minStep,(original.x1-original.x0)*.025));
  const minYSpan=Math.max((original.y1-original.y0)*.025,Number.EPSILON);

  const clampView=()=>{
    const fullX=original.x1-original.x0,fullY=original.y1-original.y0;
    let spanX=Math.max(minXSpan,Math.min(fullX,view.x1-view.x0));
    let spanY=Math.max(minYSpan,Math.min(fullY,view.y1-view.y0));
    const cx=(view.x0+view.x1)/2,cy=(view.y0+view.y1)/2;
    view.x0=cx-spanX/2;view.x1=cx+spanX/2;view.y0=cy-spanY/2;view.y1=cy+spanY/2;
    if(view.x0<original.x0){view.x1+=original.x0-view.x0;view.x0=original.x0}
    if(view.x1>original.x1){view.x0-=view.x1-original.x1;view.x1=original.x1}
    if(view.y0<original.y0){view.y1+=original.y0-view.y0;view.y0=original.y0}
    if(view.y1>original.y1){view.y0-=view.y1-original.y1;view.y1=original.y1}
  };
  const zoomX=(factor,cx=(view.x0+view.x1)/2)=>{view.x0=cx+(view.x0-cx)*factor;view.x1=cx+(view.x1-cx)*factor;clampView();draw()};
  const reset=()=>{Object.assign(view,original);draw()};
  const nearestActualX=x=>sortedX.reduce((best,c)=>Math.abs(c-x)<Math.abs(best-x)?c:best,sortedX[0]);

  const clipId=`plot-clip-${++chartClipSeq}`;
  function draw(){
    const sx=x=>p.l+(x-view.x0)/(view.x1-view.x0)*(width-p.l-p.r),sy=y=>reverseY?p.t+(y-view.y0)/(view.y1-view.y0)*(height-p.t-p.b):height-p.b-(y-view.y0)/(view.y1-view.y0)*(height-p.t-p.b);
    let grid='';
    const yTicks=Array.isArray(yTickValues)&&yTickValues.length?yTickValues.filter(y=>y>=view.y0-1e-9&&y<=view.y1+1e-9):Array.from({length:6},(_,i)=>view.y0+i*(view.y1-view.y0)/5);
    for(const y of yTicks){const py=sy(y);grid+=`<line x1="${p.l}" y1="${py}" x2="${width-p.r}" y2="${py}" stroke="var(--chart-grid)"/><text class="chart-label" x="${p.l-9}" y="${py+4}" text-anchor="end" fill="var(--chart-axis-text)" stroke="none" font-size="11">${esc(yAxis(y))}</text>`}
    const xLabelY=height-(xAxisLabel?30:17);
    for(const x of tickValues(view,xTickValues,6,allX)){const px=sx(x);grid+=`<line x1="${px}" y1="${p.t}" x2="${px}" y2="${height-p.b}" stroke="var(--chart-grid-soft)"/><text class="chart-label" x="${px}" y="${xLabelY}" text-anchor="middle" fill="var(--chart-axis-text)" stroke="none" font-size="11">${esc(formatX(x))}</text>`}
    const axisTitle=xAxisLabel?`<text class="chart-axis-title" x="${(p.l+width-p.r)/2}" y="${height-7}" text-anchor="middle" fill="var(--chart-axis-text)" stroke="none" font-size="11" font-weight="700">${esc(xAxisLabel)}</text>`:'';
    const yTitle=yAxisLabel?`<text class="chart-axis-title" transform="translate(18 ${(p.t+height-p.b)/2}) rotate(-90)" text-anchor="middle" fill="var(--chart-axis-text)" stroke="none" font-size="11" font-weight="700">${esc(yAxisLabel)}</text>`:'';
    const zero=zeroLine&&view.y0<=0&&view.y1>=0?`<line x1="${p.l}" y1="${sy(0)}" x2="${width-p.r}" y2="${sy(0)}" stroke="var(--chart-zero)" stroke-dasharray="5 5"/>`:'';
    const paths=series.map(s=>{const visiblePts=s.data.filter(d=>Number.isFinite(d.x)&&Number.isFinite(d.y));const pts=visiblePts.map(d=>`${sx(d.x)},${sy(d.y)}`).join(' '),markers=visiblePts.map(d=>`<circle class="series-marker" cx="${sx(d.x)}" cy="${sy(d.y)}" r="2.5" fill="${s.color}" stroke="none"/>`).join('');if(!pts)return'';return `<g class="chart-series" data-series="${esc(s.name)}" clip-path="url(#${clipId})"><polyline class="series-line" fill="none" stroke="${s.color}" stroke-width="3" points="${pts}" stroke-linecap="round" stroke-linejoin="round"/>${markers}</g>`}).join('');
    container.innerHTML=`${interactive?`<div class="chart-controls-row"><div class="chart-interaction-hint">${esc(interactionHint)}</div><div class="chart-tools" role="toolbar" aria-label="Chart controls"><button class="chart-tool zoom-in" title="Zoom in horizontally" aria-label="Zoom in horizontally">${icon('plus')}</button><button class="chart-tool zoom-out" title="Zoom out horizontally" aria-label="Zoom out horizontally">${icon('minus')}</button><button class="chart-tool chart-reset" title="Reset chart view" aria-label="Reset chart view">${icon('reset')}</button><button class="chart-tool chart-save" title="Download PNG" aria-label="Download PNG">${icon('save')}</button></div></div>`:''}<svg class="data-chart-svg" viewBox="0 0 ${width} ${height}" role="img"><defs><clipPath id="${clipId}"><rect x="${p.l}" y="${p.t}" width="${width-p.l-p.r}" height="${height-p.t-p.b}"/></clipPath></defs><rect x="0" y="0" width="${width}" height="${height}" fill="var(--chart-bg)" stroke="none"/>${grid}${zero}<line x1="${p.l}" y1="${p.t}" x2="${p.l}" y2="${height-p.b}" stroke="var(--chart-axis)"/><line x1="${p.l}" y1="${height-p.b}" x2="${width-p.r}" y2="${height-p.b}" stroke="var(--chart-axis)"/>${paths}${axisTitle}${yTitle}<g class="chart-hover-layer" pointer-events="none" style="display:none" clip-path="url(#${clipId})"><line class="chart-hover-line" x1="0" y1="${p.t}" x2="0" y2="${height-p.b}" stroke="var(--chart-hover-line)" stroke-width="1.2" stroke-dasharray="4 4"/><g class="chart-hover-points"></g></g><rect class="chart-zoom-box" x="0" y="0" width="0" height="0" rx="2" fill="var(--chart-selection-fill)" stroke="var(--chart-selection-stroke)" stroke-width="1.2" pointer-events="none" style="display:none" clip-path="url(#${clipId})"/><rect class="chart-hover-capture" x="${p.l}" y="${p.t}" width="${width-p.l-p.r}" height="${height-p.t-p.b}" fill="transparent" stroke="none" pointer-events="all" style="touch-action:pan-y"/></svg><div class="chart-tooltip"></div>`;

    const svg=container.querySelector('.data-chart-svg'),capture=container.querySelector('.chart-hover-capture'),hoverLayer=container.querySelector('.chart-hover-layer'),hoverLine=container.querySelector('.chart-hover-line'),hoverPoints=container.querySelector('.chart-hover-points'),tooltip=container.querySelector('.chart-tooltip');
    const setHighlight=name=>{container.querySelectorAll('.chart-series').forEach(g=>{const active=!name||g.dataset.series===name;g.style.opacity=active?'1':'.14';const line=g.querySelector('.series-line');if(line)line.setAttribute('stroke-width',name&&active?'5':'3');g.querySelectorAll('.series-marker').forEach(c=>c.setAttribute('r',name&&active?'3.6':'2.5'))})};
    container._chartSetHighlight=setHighlight;
    const uniqueX=[...new Set(allX)].filter(x=>x>=view.x0-1e-9&&x<=view.x1+1e-9).sort((a,b)=>a-b),nearestX=x=>uniqueX.reduce((best,c)=>Math.abs(c-x)<Math.abs(best-x)?c:best,uniqueX[0]);
    const hide=()=>{hoverLayer.style.display='none';tooltip.classList.remove('visible')};
    const clientToSvg=(event)=>{const r=svg.getBoundingClientRect();return{px:(event.clientX-r.left)*width/r.width,py:(event.clientY-r.top)*height/r.height}};
    const pixelToData=(px,py)=>({x:view.x0+((px-p.l)/(width-p.l-p.r))*(view.x1-view.x0),y:reverseY?view.y0+((py-p.t)/(height-p.t-p.b))*(view.y1-view.y0):view.y1-((py-p.t)/(height-p.t-p.b))*(view.y1-view.y0)});
    const pointerToData=event=>{const q=clientToSvg(event);return pixelToData(q.px,q.py)};
    capture.addEventListener('pointermove',event=>{if(dragMode||!uniqueX.length)return;const d=pointerToData(event),x=nearestX(d.x),px=sx(x),rows=series.map(s=>{const pt=s.data.find(q=>q.x===x);return pt?{...s,point:pt}:null}).filter(Boolean);if(!rows.length)return hide();const nearest=rows.reduce((best,row)=>Math.abs(row.point.y-d.y)<Math.abs(best.point.y-d.y)?row:best,rows[0]);setHighlight(nearest?.name||null);if(onSeriesHover)onSeriesHover(nearest?.name||null);hoverLine.setAttribute('x1',px);hoverLine.setAttribute('x2',px);hoverPoints.innerHTML='';rows.forEach(row=>{const halo=document.createElementNS(SVG_NS,'circle');halo.setAttribute('cx',px);halo.setAttribute('cy',sy(row.point.y));halo.setAttribute('r','6');halo.setAttribute('fill','var(--chart-marker-halo)');halo.setAttribute('stroke','none');hoverPoints.appendChild(halo);const dot=document.createElementNS(SVG_NS,'circle');dot.setAttribute('cx',px);dot.setAttribute('cy',sy(row.point.y));dot.setAttribute('r','3.6');dot.setAttribute('fill',row.color);dot.setAttribute('stroke','none');hoverPoints.appendChild(dot)});hoverLayer.style.display='';const xLabel=rows[0].point.label||formatX(x),title=tooltipTitle?`${tooltipTitle} · ${xLabel}`:xLabel;tooltip.innerHTML=`<div class="chart-tooltip-title">${esc(title)}</div>${rows.map(row=>`<div class="chart-tooltip-row"><span class="chart-tooltip-series"><i style="background:${row.color}"></i>${esc(row.name)}</span><strong>${esc(tooltipY(row.point.y))}</strong></div>`).join('')}`;const cr=container.getBoundingClientRect(),lx=event.clientX-cr.left,ly=event.clientY-cr.top;tooltip.classList.add('visible');const tw=tooltip.offsetWidth,th=tooltip.offsetHeight;let left=lx+14,top=ly-th/2;if(left+tw>cr.width-8)left=lx-tw-14;top=Math.max(8,Math.min(top,cr.height-th-8));tooltip.style.left=`${left}px`;tooltip.style.top=`${top}px`});
    capture.addEventListener('pointerleave',()=>{if(!dragMode){hide();setHighlight(null);if(onSeriesHover)onSeriesHover(null)}});
    if(interactive){
      capture.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'||event.button!==0)return;const q=clientToSvg(event);dragMode=event.shiftKey?'pan':'zoom';dragStart={clientX:event.clientX,clientY:event.clientY,px:q.px,py:q.py,view:{...view}};dragCurrent={...q};container.classList.add(dragMode==='pan'?'panning':'zoom-selecting');hide();event.preventDefault()});
      capture.addEventListener('wheel',event=>{event.preventDefault();const d=pointerToData(event);zoomX(event.deltaY<0?.82:1.22,d.x)},{passive:false});
      container.querySelector('.zoom-in').onclick=()=>zoomX(.78);container.querySelector('.zoom-out').onclick=()=>zoomX(1.28);container.querySelector('.chart-reset').onclick=reset;
      container.querySelector('.chart-save').onclick=e=>{const btn=e.currentTarget;btn.disabled=true;try{exportCanvasPng({series,view:{...view},original,width,height,p,formatX,yAxis,xTickValues,yTickValues,xAxisLabel,yAxisLabel,reverseY,filename:exportName,allX,exportTitle,exportSubtitle})}catch(err){console.error(err);alert('Unable to save this chart image.')}finally{btn.disabled=false}};
    }
  }

  const globalMove=event=>{
    if(!dragMode||!dragStart)return;
    const svg=container.querySelector('.data-chart-svg');if(!svg)return;
    const r=svg.getBoundingClientRect(),px=Math.max(p.l,Math.min(width-p.r,(event.clientX-r.left)*width/r.width)),py=Math.max(p.t,Math.min(height-p.b,(event.clientY-r.top)*height/r.height));
    dragCurrent={px,py};
    if(dragMode==='zoom'){
      const box=container.querySelector('.chart-zoom-box');if(!box)return;
      const x=Math.min(dragStart.px,px),y=Math.min(dragStart.py,py),w=Math.abs(px-dragStart.px),h=Math.abs(py-dragStart.py);
      box.setAttribute('x',x);box.setAttribute('y',y);box.setAttribute('width',w);box.setAttribute('height',h);box.style.display='';
      return;
    }
    if(dragMode==='pan'){
      const plotPxX=Math.max(r.width*(width-p.l-p.r)/width,1),plotPxY=Math.max(r.height*(height-p.t-p.b)/height,1);
      const dx=(event.clientX-dragStart.clientX)/plotPxX*(dragStart.view.x1-dragStart.view.x0),dy=(event.clientY-dragStart.clientY)/plotPxY*(dragStart.view.y1-dragStart.view.y0);
      view.x0=dragStart.view.x0-dx;view.x1=dragStart.view.x1-dx;view.y0=dragStart.view.y0+dy;view.y1=dragStart.view.y1+dy;clampView();draw();
    }
  };
  const globalEnd=()=>{
    if(!dragMode||!dragStart)return;
    const endingMode=dragMode,start={...dragStart},current=dragCurrent?{...dragCurrent}:null;
    dragMode=null;dragStart=null;dragCurrent=null;container.classList.remove('panning','zoom-selecting');
    if(endingMode==='zoom'&&current){
      const dx=Math.abs(current.px-start.px),dy=Math.abs(current.py-start.py);
      if(dx>=8){
        const d0={x:start.view.x0+((Math.min(start.px,current.px)-p.l)/(width-p.l-p.r))*(start.view.x1-start.view.x0),y:start.view.y1-((Math.max(start.py,current.py)-p.t)/(height-p.t-p.b))*(start.view.y1-start.view.y0)};
        const d1={x:start.view.x0+((Math.max(start.px,current.px)-p.l)/(width-p.l-p.r))*(start.view.x1-start.view.x0),y:start.view.y1-((Math.min(start.py,current.py)-p.t)/(height-p.t-p.b))*(start.view.y1-start.view.y0)};
        let nx0=nearestActualX(d0.x),nx1=nearestActualX(d1.x);if(nx0>nx1)[nx0,nx1]=[nx1,nx0];
        if(nx0===nx1){const idx=sortedX.indexOf(nx0);nx0=sortedX[Math.max(0,idx-1)]??nx0;nx1=sortedX[Math.min(sortedX.length-1,idx+1)]??nx1}
        view.x0=nx0;view.x1=nx1;
        if(dy>=8){view.y0=Math.min(d0.y,d1.y);view.y1=Math.max(d0.y,d1.y)}
        clampView();
      }
      draw();
    }
  };
  if(interactive){window.addEventListener('pointermove',globalMove);window.addEventListener('pointerup',globalEnd);window.addEventListener('pointercancel',globalEnd);container._chartCleanup=()=>{window.removeEventListener('pointermove',globalMove);window.removeEventListener('pointerup',globalEnd);window.removeEventListener('pointercancel',globalEnd)}}
  draw();
}
