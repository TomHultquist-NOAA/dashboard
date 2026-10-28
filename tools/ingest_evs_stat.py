#!/usr/bin/env python3
"""Download or read dated NOAA/MET Stat-Analysis .stat summary files and publish dashboard CSVs.

No third-party packages. Missing URLs and missing records are *never* synthesized.

Examples:
  python3 tools/ingest_evs_stat.py --fetch --end 2026-10-25 --days 90
  python3 tools/ingest_evs_stat.py --input-dir /path/to/downloaded/stats --end 2026-10-25 --days 90

Outputs: data/regions/{Global,Northern Hemisphere,Southern Hemisphere,Tropics}.csv
         data/ingest_report.json
Raw downloads cached under raw_stat_cache/ outside the public data directory.
Run from a machine with access to the NOAA-hosted source, then deploy data/regions/ to your web host.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import csv
from datetime import date, timedelta, datetime, timezone
import json
import math
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

MODELS=('gfs','aigfs','cfs','cmc','ecmwf','fnmoc','ukmet')
METRICS={'MSLP_RMSE':('MSLP_RMSE',('RMSE',),'PRMSL'),
         'H500_ACC':('H500_ACC',('ANOM_CORR','ACC'),None),
         'T850_RMSE':('T850_RMSE',('RMSE',),None)}
MASKS={'GLOBAL':'Global','NHEM':'Northern Hemisphere','SHEM':'Southern Hemisphere','TROPICS':'Tropics'}
HEADER=['valid_date','model','region','metric','forecast_hour','value','sample_count','completeness','verification_source']
DEFAULT_BASE='https://emc.ncep.noaa.gov/gmb/mpr/dashboard_stats'


def parse_iso_date(value):
    """Parse an ISO date using the Python 3.6-compatible stdlib API."""
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except (TypeError, ValueError):
        raise argparse.ArgumentTypeError('Date must be in YYYY-MM-DD format: {!r}'.format(value))


def parse_lead(value):
    """MET HHMMSS, e.g. '240000' = 24 hours; '1200000' = 120 hours."""
    value=value.strip()
    if not value.isdigit() or len(value)<6: raise ValueError('Invalid FCST_LEAD '+repr(value))
    hrs, minutes,seconds=int(value[:-4]),int(value[-4:-2]),int(value[-2:])
    if minutes>=60 or seconds>=60: raise ValueError('Invalid MET time '+value)
    return hrs, minutes, seconds


def parse_stat(content, expected_model, expected_metric, source_name='', lead_step=24):
    """Read whitespace-aligned COL_NAME and SUMMARY records. Return normalized data rows + diagnostics."""
    columns=None; rows=[]; source_name_metadata=""; diagnostics={'warnings':[], 'summary_rows':0, 'accepted_rows':0}
    for lineno,line in enumerate(content.splitlines(),1):
        fields=line.split()
        if not fields: continue
        kind=fields[0].rstrip(':').upper()
        if kind=='JOB_LIST':
            match=re.search(r'\-obtype\s+(\S+)',line)
            if match:source_name_metadata=match.group(1)
        if kind=='COL_NAME':
            columns=fields[1:]
            missing={'FCST_LEAD','FCST_VALID_BEG','VX_MASK','COLUMN','MEAN'}-set(columns)
            if missing: raise ValueError(f'{source_name}: required MET columns missing: {sorted(missing)}')
        if kind!='SUMMARY':continue
        diagnostics['summary_rows']+=1
        if columns is None: raise ValueError(f'{source_name}:{lineno}: SUMMARY before COL_NAME')
        if len(fields)-1!=len(columns):
            diagnostics['warnings'].append(f'line {lineno}: {len(fields)-1} fields, expected {len(columns)}')
            continue
        row=dict(zip(columns,fields[1:]))
        if row['COLUMN'].upper() not in METRICS[expected_metric][1]:continue
        if expected_metric=='MSLP_RMSE' and row.get('FCST_VAR')!='PRMSL':continue
        region=MASKS.get(row['VX_MASK'].upper())
        if not region:continue
        try:
            lead,mm,ss=parse_lead(row['FCST_LEAD'])
        except ValueError: continue
        if mm!=0 or ss!=0 or lead>360 or lead%lead_step:continue
        valid=row['FCST_VALID_BEG'][:8]
        if not re.fullmatch(r'\d{8}',valid):continue
        try: valid_iso=date(int(valid[:4]),int(valid[4:6]),int(valid[6:8])).isoformat()
        except ValueError: continue
        # MET WMO-adjusted summary honors the statistic's nonlinear pooling rule.
        # For TOTAL=1, observed sample values have MEAN == WMO_WEIGHTED_MEAN.
        preferred=row.get('WMO_WEIGHTED_MEAN','')
        if preferred in ('','NA','N/A'): preferred=row['MEAN']
        try: value=float(preferred)
        except ValueError:continue
        if not math.isfinite(value):continue
        # These are already verified MET SUMMARY statistics: do not derive or rescale.
        # TOTAL=1 in inspected files refers to contributing summary records, NOT gridpoints.
        rows.append({'valid_date':valid_iso,'model':expected_model.upper(),
                     'region':region,'metric':METRICS[expected_metric][0],
                     'forecast_hour':lead,'value':format(value,'.9g'),
                     'sample_count':'','completeness':'','verification_source':source_name_metadata})
        diagnostics['accepted_rows']+=1
    if columns is None: raise ValueError(f'{source_name}: COL_NAME header not found')
    if not rows:diagnostics['warnings'].append('No supported daily-lead verification values found; check COLUMN/lead/region settings')
    return rows,diagnostics


def urls_for_day(day,base):
    compact=day.strftime('%Y%m%d')
    for model in MODELS:
        for source_metric in METRICS:
            filename=f'{model}_{source_metric}_{compact}.stat'
            url=f'{base.rstrip("/")}/{compact}/{model}/{filename}'
            yield (compact,model,source_metric,filename,url)


def read_url(url,timeout=15):
    req=Request(url,headers={'User-Agent':'OMD-EVS-dashboard-ingest/1.0'})
    with urlopen(req,timeout=timeout) as response:
        return response.read().decode('utf-8')


def process_one(job,input_dir,cache_dir,fetch,refresh,base,timeout,lead_step):
    d,model,metric,filename,url=job
    cached=cache_dir / d / model / filename
    local_file=input_dir/d/model/filename if input_dir else None
    try:
        if local_file and local_file.is_file():
            content=local_file.read_text(encoding='utf-8')
        elif cached.is_file() and not refresh:
            content=cached.read_text(encoding='utf-8')
        elif fetch:
            content=read_url(url,timeout)
            cached.parent.mkdir(parents=True,exist_ok=True)
            temp=cached.with_suffix('.tmp');temp.write_text(content,encoding='utf-8');temp.replace(cached)
        else:
            return filename,[],{'status':'missing','url':url}
        rows,diag=parse_stat(content,model,metric,filename,lead_step)
        # Guard misfiled data; date key in file is authoritative for plotted valid date.
        bad=[r for r in rows if r['valid_date'].replace('-','')!=d]
        if bad:diag['warnings'].append(f'{len(bad)} rows have valid dates different from filename date')
        return filename,rows,{'status':'parsed','url':url,**diag}
    except HTTPError as e:
        return filename,[],{'status':'not_found' if e.code==404 else ('access_denied' if e.code==403 else 'http_error'), 'http_code':e.code,'url':url}
    except (OSError,URLError,ValueError,UnicodeError) as e:
        return filename,[],{'status':'error','message':str(e),'url':url}


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--fetch',action='store_true',help='Download source files from the specified NOAA URL')
    p.add_argument('--input-dir',type=Path,help='Read existing YYYYMMDD/model/model_METRIC_YYYYMMDD.stat files')
    p.add_argument('--end',type=parse_iso_date,default=date.today()-timedelta(days=1),help='Last requested valid date (YYYY-MM-DD; default yesterday)')
    p.add_argument('--days',type=int,default=90,help='Rolling history length, 1–90 (default 90)')
    p.add_argument('--out-dir',type=Path,default=Path(__file__).resolve().parents[1]/'data')
    p.add_argument('--cache-dir',type=Path,help='Optional raw .stat download cache directory')
    p.add_argument('--base-url',default=DEFAULT_BASE)
    p.add_argument('--workers',type=int,default=6)
    p.add_argument('--timeout',type=int,default=15)
    p.add_argument('--lead-step',type=int,choices=(6,12,24),default=24,help='Keep daily forecast leads for current UI')
    p.add_argument('--refresh',action='store_true',help='Re-download even if source is in cache')
    args=p.parse_args(argv)
    if not 1<=args.days<=90:p.error('--days must be between 1 and 90')
    if not 1<=args.workers<=16:p.error('--workers must be between 1 and 16')
    if not args.input_dir and not args.fetch:p.error('Supply --fetch and/or --input-dir')
    outdir=args.out_dir;cache=args.cache_dir or outdir.parent/'raw_stat_cache'
    begin=args.end-timedelta(days=args.days-1)
    jobs=[j for i in range(args.days) for j in urls_for_day(begin+timedelta(days=i),args.base_url)]
    result_rows=[];status={};failures=[];totals={};missing_files=[]
    print(f'Looking for {len(jobs)} source files, {begin} through {args.end}...',flush=True)
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures={pool.submit(process_one,j,args.input_dir,cache,args.fetch,args.refresh,args.base_url,args.timeout,args.lead_step):j for j in jobs}
        for fut in as_completed(futures):
            filename,rows,info=fut.result()
            result_rows.extend(rows);status[info['status']]=status.get(info['status'],0)+1
            if info['status'] in ('error','access_denied'):failures.append({'file':filename,**info})
            if info['status'] in ('missing','not_found','http_error','access_denied'):
                missing_files.append({'file':filename,'status':info['status'],'http_code':info.get('http_code')})
            if info['status']=='parsed' and info.get('accepted_rows',0)==0:
                failures.append({'file':filename,'message':'No usable scores; inspect COLUMN, mask and lead definitions','warnings':info.get('warnings',[])})
            if rows:
                for row in rows:
                    key=f"{row['model']}:{row['metric']}";totals[key]=totals.get(key,0)+1
    dedup={}
    duplicate_count=0
    for row in result_rows:
        k=(row['valid_date'],row['model'],row['region'],row['metric'],row['forecast_hour'])
        if k in dedup:
            duplicate_count+=1
            # Identical duplicate records are harmless, conflicting records are logged.
            if dedup[k]['value']!=row['value']:
                failures.append({'file':'duplicate rows','message':f'Conflicting values for {k}: {dedup[k]["value"]} vs {row["value"]}'})
        else:dedup[k]=row
    region_dir=outdir/'regions';region_dir.mkdir(parents=True,exist_ok=True)
    regional_counts={}
    for region in MASKS.values():
        target=region_dir/f'{region}.csv'
        relevant=sorted((r for r in dedup.values() if r['region']==region),key=lambda r:(r['valid_date'],r['metric'],r['model'],r['forecast_hour']))
        temp=target.with_suffix('.csv.tmp')
        with temp.open('w',encoding='utf-8',newline='') as f:
            writer=csv.DictWriter(f,HEADER);writer.writeheader();writer.writerows(relevant)
        temp.replace(target);regional_counts[region]=len(relevant)
    dates=sorted({r['valid_date'] for r in dedup.values()})
    report={'generated_utc':datetime.now(timezone.utc).isoformat(),
       'source_base_url':args.base_url,'requested_start':begin.isoformat(),'requested_end':args.end.isoformat(),
       'files_requested':len(jobs),'files_by_status':status,'source_metrics_available':list(METRICS),
       'models':list(MODELS),'date_count_with_data':len(dates),
       'earliest_valid_date':dates[0] if dates else None,'latest_valid_date':dates[-1] if dates else None,
       'normalized_rows':len(dedup),'duplicates':duplicate_count,'regional_rows':regional_counts,
       'model_metric_row_counts':totals,'missing_files':sorted(missing_files,key=lambda x:x['file']),'errors':failures[:200],
       'note':'No synthetic data or inferred values are added. Missing combinations must display N/A.'}
    report_path=outdir/'ingest_report.json';temp=outdir/'ingest_report.json.tmp'
    temp.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');temp.replace(report_path)
    print(json.dumps({k:v for k,v in report.items() if k not in ('errors','models','source_base_url')},indent=2))
    print('Finished. Publish the data/regions files with the web dashboard. Missing values remain N/A.')
    return 0 if not failures else 1

if __name__=='__main__':sys.exit(main())
