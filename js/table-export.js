/* Table export renderer for the dashboard. No remote libraries or server calls.
 * Renders the DOM table as data, not a viewport screenshot: horizontal overflow,
 * collapsed sections and responsive clipping never truncate an export. */
const FONT='Inter, Segoe UI, Arial, sans-serif';
const paintColor=(color,fallback)=>color&&color!=='transparent'&&color!=='rgba(0, 0, 0, 0)'?color:fallback;
const titleText=node=>(node?.textContent||'').replace(/\s+/g,' ').trim();

function snapshotTable(table){
  if(!table)return null;
  const trs=[...table.querySelectorAll('tr')];
  const rows=trs.map(tr=>{
    const isHeading=!!tr.closest('thead');
    return {heading:isHeading,cells:[...tr.children].filter(c=>c.matches('th, td')).map(cell=>{
      const metric=cell.querySelector('.metric-name');
      const secondary=cell.querySelector('.metric-meta');
      let value=titleText(cell);
      // Preserve compact metric name + domain/baseline note as separate lines.
      if(metric&&secondary)value=`${titleText(metric)}\n${titleText(secondary)}`;
      const colored=cell.querySelector('.heat, .scorecell, .lead-status-chip');
      const dot=cell.querySelector('.chip-dot, .coverage-model-dot, .rank-model i, .effective-model-label i');
      const chipStyle=colored?getComputedStyle(colored):null;
      const dotStyle=dot?getComputedStyle(dot):null;
      return {
        text:value,
        header:cell.tagName.toLowerCase()==='th'||isHeading,
        chipBg:chipStyle?paintColor(chipStyle.backgroundColor,null):null,
        chipText:chipStyle?.color||null,
        dot:dotStyle?paintColor(dotStyle.backgroundColor,null):null,
        colspan:Math.max(1,cell.colSpan||1)
      };
    })};
  });
  return {rows,columns:Math.max(1,...rows.map(r=>r.cells.reduce((n,c)=>n+c.colspan,0)))};
}

function snapshot(spec){
  const sections=(spec.sections||[]).map(section=>({
    title:section.title||'',
    subtitle:section.subtitle||'',
    table:snapshotTable(section.table)
  })).filter(section=>section.table&&section.table.rows.length);
  if(!sections.length)throw new Error('No table data is available to export.');
  return {title:spec.title||'Dashboard Table',subtitle:spec.subtitle||'',notes:spec.notes||'',sections};
}

function download(blob,filename){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;a.style.display='none';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function csvCell(value){return `"${String(value??'').replace(/"/g,'""')}"`}
export function exportTablesCsv(spec){
  const value=snapshot(spec);const lines=[];
  lines.push([value.title].map(csvCell).join(','));
  if(value.subtitle)lines.push([value.subtitle].map(csvCell).join(','));
  lines.push('');
  for(const section of value.sections){
    if(section.title)lines.push(csvCell(section.title));
    if(section.subtitle)lines.push(csvCell(section.subtitle));
    for(const row of section.table.rows){
      lines.push(row.cells.flatMap(c=>[c.text.replace(/\n/g,' — '),...Array(c.colspan-1).fill('')]).map(csvCell).join(','));
    }
    lines.push('');
  }
  if(value.notes)lines.push(csvCell(value.notes));
  download(new Blob(['\ufeff',lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),spec.filename?.replace(/\.png$/i,'.csv')||'dashboard-table.csv');
}

function textLines(ctx,text,maxWidth,font){
  ctx.font=font;
  const out=[];
  for(const paragraph of String(text||'').split('\n')){
    if(!paragraph){out.push('');continue}
    let line='';
    const words=paragraph.split(/\s+/).filter(Boolean);
    for(let word of words){
      // Break long unspaced identifiers as well as ordinary phrases.
      const pieces=[];
      while(ctx.measureText(word).width>maxWidth&&word.length>1){
        let cut=1;
        while(cut<word.length&&ctx.measureText(word.slice(0,cut+1)).width<=maxWidth)cut++;
        pieces.push(word.slice(0,cut));word=word.slice(cut);
      }
      if(word)pieces.push(word);
      for(const piece of pieces){
        const test=line?`${line} ${piece}`:piece;
        if(line&&ctx.measureText(test).width>maxWidth){out.push(line);line=piece}
        else line=test;
      }
    }
    if(line)out.push(line);
  }
  return out.length?out:[''];
}

function theme(){
  const css=getComputedStyle(document.documentElement);
  const varColor=(key,def)=>paintColor(css.getPropertyValue(key).trim(),def);
  return {bg:varColor('--surface','#101c2e'),surface:varColor('--surface-soft','#0b1727'),
    head:varColor('--surface-soft-2','#0d1a2b'),fg:varColor('--text-strong','#f3f7fd'),
    muted:varColor('--muted-strong','#b7c7da'),line:varColor('--line','rgba(160,180,210,.3)'),
    accent:varColor('--accent','#58a6ff')};
}
function paintLines(ctx,lines,x,centerY,lineHeight,fg,{align='left',font=`12px ${FONT}`}={}){
  ctx.fillStyle=fg;ctx.font=font;ctx.textAlign=align;ctx.textBaseline='middle';
  const first=centerY-(lines.length-1)*lineHeight/2;
  lines.forEach((line,i)=>ctx.fillText(line,x,first+i*lineHeight));
}

export function exportTablesPng(spec){
  const data=snapshot(spec),colors=theme();
  const canvas=document.createElement('canvas');let ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('PNG export unavailable in this browser.');
  const pad=32,cellPad=12,lineH=18,rowMin=37;
  const maximumColumns=Math.max(...data.sections.map(s=>s.table.columns));
  // First column carries labels/domains; remaining columns carry model names
  // or forecast-day values. Size from content but cap verbose coverage labels.
  const columnWidths=[];
  for(let col=0;col<maximumColumns;col++){
    const values=[];
    for(const s of data.sections)for(const row of s.table.rows){
      let index=0;
      for(const cell of row.cells){
        if(col>=index&&col<index+cell.colspan&&cell.colspan===1)values.push(cell.text.split('\n')[0]);
        index+=cell.colspan;
      }
    }
    ctx.font=`700 12px ${FONT}`;
    const measured=Math.max(0,...values.map(t=>ctx.measureText(t).width));
    columnWidths.push(col===0?Math.max(176,Math.min(302,measured+34)):Math.max(85,Math.min(188,measured+26)));
  }
  const fullWidth=Math.max(660,columnWidths.reduce((a,b)=>a+b,0)+pad*2);
  const font=`12px ${FONT}`,boldFont=`700 12px ${FONT}`;
  const sections=data.sections.map(s=>{
    const totalColumns=s.table.columns;
    const widths=columnWidths.slice(0,totalColumns);
    const totalWidth=widths.reduce((a,b)=>a+b,0);
    const rows=s.table.rows.map(row=>{
      let idx=0,maxLines=1;
      const cells=row.cells.map(cell=>{
        const cellWidth=widths.slice(idx,idx+cell.colspan).reduce((a,b)=>a+b,0);
        idx+=cell.colspan;
        const lines=textLines(ctx,cell.text,Math.max(32,cellWidth-2*cellPad-(cell.dot?12:0)),cell.header?boldFont:font);
        maxLines=Math.max(maxLines,lines.length);
        return {...cell,lines,width:cellWidth};
      });
      return {heading:row.heading,cells,height:Math.max(rowMin,maxLines*lineH+18)};
    });
    const headingH=(s.title?46:9)+(s.subtitle?32:0);
    return {...s,rows,headingH,width:totalWidth,height:headingH+rows.reduce((a,r)=>a+r.height,0)+17};
  });
  const titleLines=textLines(ctx,data.title,fullWidth-pad*2,`700 23px ${FONT}`);
  const subtitleLines=data.subtitle?textLines(ctx,data.subtitle,fullWidth-pad*2,`13px ${FONT}`):[];
  const notesLines=data.notes?textLines(ctx,data.notes,fullWidth-pad*2,`12px ${FONT}`):[];
  const headerH=24+titleLines.length*30+subtitleLines.length*21+30;
  const footerH=notesLines.length?26+notesLines.length*17+15:22;
  const fullHeight=headerH+sections.reduce((a,s)=>a+s.height,0)+footerH;
  const scale=2;
  canvas.width=Math.ceil(fullWidth*scale);canvas.height=Math.ceil(fullHeight*scale);
  ctx=canvas.getContext('2d');ctx.scale(scale,scale);
  ctx.fillStyle=colors.bg;ctx.fillRect(0,0,fullWidth,fullHeight);
  let y=25;
  ctx.fillStyle=colors.accent;ctx.fillRect(pad,y,38,3);y+=24;
  paintLines(ctx,titleLines,pad,y+(titleLines.length-1)*15,30,colors.fg,{font:`700 23px ${FONT}`});
  y+=titleLines.length*30+7;
  if(subtitleLines.length){paintLines(ctx,subtitleLines,pad,y+(subtitleLines.length-1)*10.5,21,colors.muted,{font:`13px ${FONT}`});y+=subtitleLines.length*21+8}
  y=headerH;
  for(const s of sections){
    if(s.title){
      ctx.fillStyle=colors.accent;ctx.fillRect(pad,y+11,3,18);
      paintLines(ctx,[s.title],pad+12,y+21,20,colors.fg,{font:`700 15px ${FONT}`});
    }
    if(s.subtitle)paintLines(ctx,textLines(ctx,s.subtitle,fullWidth-pad*2,`11px ${FONT}`),pad,y+(s.title?47:25),17,colors.muted,{font:`11px ${FONT}`});
    y+=s.headingH;
    s.rows.forEach((row,rowIdx)=>{
      let x=pad;
      ctx.fillStyle=row.heading?colors.head:(rowIdx%2?colors.surface:colors.bg);
      ctx.fillRect(x,y,s.width,row.height);
      for(const cell of row.cells){
        // Heatmap cells retain their actual values and exact computed colors.
        if(cell.chipBg){ctx.fillStyle=cell.chipBg;ctx.fillRect(x+4,y+5,cell.width-8,row.height-10)}
        ctx.fillStyle=colors.line;ctx.fillRect(x,y+row.height-1,cell.width,1);
        let tx=x+cellPad;
        if(cell.dot){ctx.fillStyle=cell.dot;ctx.beginPath();ctx.arc(tx+4,y+row.height/2,4,0,Math.PI*2);ctx.fill();tx+=14}
        paintLines(ctx,cell.lines,cell.chipBg?x+cell.width/2:tx,y+row.height/2,lineH,
          cell.chipBg?(cell.chipText||colors.fg):(cell.header?colors.fg:colors.muted),
          {align:cell.chipBg?'center':'left',font:cell.header?boldFont:font});
        x+=cell.width;
      }
      y+=row.height;
    });
    y+=17;
  }
  if(notesLines.length){
    y+=10;ctx.fillStyle=colors.line;ctx.fillRect(pad,y,fullWidth-pad*2,1);y+=19;
    paintLines(ctx,notesLines,pad,y+(notesLines.length-1)*8.5,17,colors.muted,{font:`12px ${FONT}`});
  }
  canvas.toBlob(blob=>{if(blob)download(blob,spec.filename||'dashboard-table.png')},'image/png');
}
