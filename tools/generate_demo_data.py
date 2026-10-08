#!/usr/bin/env python3
"""Generate synthetic daily EVS-style verification statistics for the dashboard.

The data are intentionally realistic-looking but entirely synthetic.  The mock
contract mirrors the planned initial dashboard scope: ACC, RMSE, Bias, and
precipitation ETS for five model systems over the previous 90 verification days.
"""
from datetime import date, timedelta
from pathlib import Path
import csv, hashlib, math, random

OUTDIR = Path(__file__).resolve().parents[1] / 'data' / 'regions'

MODELS = {
    'GFS':    ('Global',   0.000),
    'GEFS':   ('Ensemble', 0.016),
    'AIGFS':  ('AI',       0.055),
    'AIGEFS': ('AI',       0.048),
    'HGEFS':  ('Ensemble', 0.030),
}
REGIONS = {'Global':1.00,'Northern Hemisphere':1.012,'Southern Hemisphere':1.024,'Tropics':0.988}
LEADS = [d*24 for d in range(16)]

# metric: variable, type, base Day 0, growth per forecast day, noise, units, truth
METRICS = {
 'T2M_RMSE':      ('T2M','RMSE',0.82,0.17,0.060,'K','URMA'),
 'T2M_BIAS':      ('T2M','Bias',0.12,0.035,0.085,'K','URMA'),
 'T850_RMSE':     ('T850','RMSE',0.76,0.18,0.055,'K','GDAS Analysis'),
 'T850_BIAS':     ('T850','Bias',-0.08,0.025,0.080,'K','GDAS Analysis'),
 'H500_ACC':      ('H500','ACC',0.993,-0.016,0.0040,'','GDAS Analysis'),
 'H500_RMSE':     ('H500','RMSE',21.0,7.5,2.1,'m','GDAS Analysis'),
 'H500_BIAS':     ('H500','Bias',2.0,0.85,2.4,'m','GDAS Analysis'),
 'MSLP_RMSE':     ('MSLP','RMSE',1.20,0.58,0.18,'hPa','GDAS Analysis'),
 'MSLP_BIAS':     ('MSLP','Bias',0.10,0.055,0.15,'hPa','GDAS Analysis'),
 'WIND10_RMSE':   ('WIND10','RMSE',0.96,0.22,0.085,'m/s','URMA'),
 'WIND10_BIAS':   ('WIND10','Bias',-0.05,0.025,0.070,'m/s','URMA'),
 'PRECIP24_ETS':  ('PRECIP24','ETS',0.47,-0.025,0.020,'','MRMS QPE'),
}

# Metric-specific relative tendencies. Positive means improved verification.
TENDENCY = {
 ('AIGFS','H500_ACC'):.065, ('AIGFS','H500_RMSE'):.070, ('AIGFS','H500_BIAS'):.050,
 ('AIGFS','T850_RMSE'):.050, ('AIGFS','T850_BIAS'):.035, ('AIGFS','T2M_RMSE'):.020,
 ('AIGFS','WIND10_RMSE'):-.025, ('AIGFS','PRECIP24_ETS'):.025,
 ('GEFS','H500_ACC'):.018, ('GEFS','H500_RMSE'):.018, ('GEFS','T2M_RMSE'):-.030,
 ('GEFS','T2M_BIAS'):-.025, ('GEFS','MSLP_RMSE'):.018, ('GEFS','PRECIP24_ETS'):.015,
 ('AIGEFS','H500_ACC'):.050, ('AIGEFS','H500_RMSE'):.045, ('AIGEFS','T850_RMSE'):.040,
 ('AIGEFS','PRECIP24_ETS'):.070, ('AIGEFS','WIND10_BIAS'):.025,
 ('HGEFS','H500_ACC'):.030, ('HGEFS','MSLP_RMSE'):.035, ('HGEFS','T2M_RMSE'):.020,
 ('HGEFS','WIND10_RMSE'):.018, ('HGEFS','PRECIP24_ETS'):-.020,
}

# Stable signed bias offsets by model/field to create realistic, distinct patterns.
BIAS_OFFSET = {
 ('GFS','T2M_BIAS'): 0.05, ('GEFS','T2M_BIAS'): 0.26, ('AIGFS','T2M_BIAS'):-0.08, ('AIGEFS','T2M_BIAS'):-0.04, ('HGEFS','T2M_BIAS'):0.15,
 ('GFS','T850_BIAS'):-0.10, ('GEFS','T850_BIAS'):-0.20, ('AIGFS','T850_BIAS'):0.03, ('AIGEFS','T850_BIAS'):-0.02, ('HGEFS','T850_BIAS'):-0.12,
 ('GFS','H500_BIAS'): 3.5, ('GEFS','H500_BIAS'): 7.0, ('AIGFS','H500_BIAS'):-1.0, ('AIGEFS','H500_BIAS'):1.4, ('HGEFS','H500_BIAS'):4.0,
 ('GFS','MSLP_BIAS'):0.22, ('GEFS','MSLP_BIAS'):0.38, ('AIGFS','MSLP_BIAS'):-0.08, ('AIGEFS','MSLP_BIAS'):0.03, ('HGEFS','MSLP_BIAS'):0.14,
 ('GFS','WIND10_BIAS'):-0.08, ('GEFS','WIND10_BIAS'):-0.24, ('AIGFS','WIND10_BIAS'):0.19, ('AIGEFS','WIND10_BIAS'):0.06, ('HGEFS','WIND10_BIAS'):-0.03,
}

EVENTS = [
 ('AIGFS','H500_ACC',date(2026,9,20),date(2026,10,6),+.010),
 ('GFS','T2M_RMSE',date(2026,9,23),date(2026,10,6),-.035),
 ('AIGEFS','PRECIP24_ETS',date(2026,9,17),date(2026,10,6),+.018),
 ('HGEFS','MSLP_RMSE',date(2026,9,25),date(2026,10,6),+.030),
 ('GEFS','T2M_BIAS',date(2026,9,24),date(2026,10,6),-.055),
]

def rng_for(*parts):
    h=hashlib.sha256('|'.join(map(str,parts)).encode()).digest()
    return random.Random(int.from_bytes(h[:8],'big'))

def event_effect(model,metric,d):
    return sum(v for m,k,s,e,v in EVENTS if model==m and metric==k and s<=d<=e)

def skill(model,metric):
    return MODELS[model][1] + TENDENCY.get((model,metric),0.0)

def value_for(model,region,metric,d,day_idx,lead):
    var,mtype,base,growth,noise,unit,truth = METRICS[metric]
    lead_days=lead/24
    rr=rng_for(d,model,region,metric,lead)
    seasonal=math.sin((day_idx + lead_days*1.35 + list(MODELS).index(model)*.9)/7.0)
    regional=REGIONS[region]-1.0
    sk=skill(model,metric)
    ev=event_effect(model,metric,d)

    if mtype=='ACC':
        raw=base + growth*lead_days
        raw += sk*0.050 + ev
        raw -= regional*0.20
        raw += seasonal*0.0025 + rr.gauss(0,noise)
        return max(0.35,min(0.999,raw))

    if mtype=='ETS':
        raw=base + growth*lead_days
        raw += sk*0.20 + ev
        raw -= regional*0.12
        raw += seasonal*0.010 + rr.gauss(0,noise)
        return max(0.01,min(0.75,raw))

    if mtype=='Bias':
        offset=BIAS_OFFSET[(model,metric)]
        # Lead-dependent drift plus alternating weather-regime variation.
        drift=growth*lead_days
        if offset < 0: drift *= -0.65
        raw=offset + drift + seasonal*noise*1.5 + rr.gauss(0,noise)
        raw += regional * (3.5 if metric=='H500_BIAS' else .6)
        # Better model tendency pulls absolute bias toward zero.
        raw *= max(.55,1-sk*1.6)
        return raw

    # RMSE
    raw=base + growth*lead_days
    raw *= (1-sk-ev)
    raw *= (1+regional*.75)
    raw += raw*seasonal*.012 + rr.gauss(0,noise)
    return max(0.001,raw)

def main():
    end=date(2026,10,6)
    start=end-timedelta(days=89)
    headers=['valid_date','model','region','metric','forecast_hour','value','sample_count','completeness']
    OUTDIR.mkdir(parents=True,exist_ok=True)
    for old in OUTDIR.glob('*.csv'): old.unlink()
    handles={region:(OUTDIR/f'{region}.csv').open('w',newline='',encoding='utf-8') for region in REGIONS}
    writers={region:csv.writer(handles[region]) for region in REGIONS}
    for w in writers.values(): w.writerow(headers)
    counts={region:0 for region in REGIONS}
    try:
        d=start
        while d<=end:
            day_idx=(d-start).days
            for model in MODELS:
                for region in REGIONS:
                    w=writers[region]
                    for metric in METRICS:
                        for lead in LEADS:
                            rr=rng_for('meta',d,model,region,metric,lead)
                            value=value_for(model,region,metric,d,day_idx,lead)
                            base_samples={'Global':32000,'Northern Hemisphere':16500,'Southern Hemisphere':14500,'Tropics':8200}[region]
                            samples=int(base_samples*(.94+.08*rr.random())*(1-.0007*(lead/24)))
                            comp=max(94,min(100,98.8+1.0*rr.random()-.030*(lead/24)))
                            w.writerow([d.isoformat(),model,region,metric,lead,f'{value:.6f}',samples,f'{comp:.2f}'])
                            counts[region]+=1
            d+=timedelta(days=1)
    finally:
        for h in handles.values(): h.close()
    print(f'Synthetic verification period: {start} through {end} (90 days)')
    for region,count in counts.items(): print(f'{region}: {count:,} rows')

if __name__=='__main__': main()
