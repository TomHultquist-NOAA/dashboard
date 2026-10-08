#!/usr/bin/env python3
"""Template EVS -> dashboard normalizer.

The exact EVS CSV schema has not yet been supplied, so this script is a mapping
skeleton. Update COLUMN_MAP and METRIC_MAP after reviewing representative EVS
files. Output is the compact dashboard score-row contract documented in
DATA_FORMAT.md; richer metadata live in js/config.js.
"""
from __future__ import annotations
import argparse, csv
from pathlib import Path

COLUMN_MAP = {
    "valid_date": "VALID_DATE",
    "model": "MODEL",
    "region": "VX_MASK",
    "forecast_hour": "FCST_LEAD_HOURS",
    "value": "VALUE",
    "sample_count": "N",
}

METRIC_MAP = {
    "RMSE:TMP:Z2": "T2M_RMSE",
    "BIAS:TMP:Z2": "T2M_BIAS",
    "RMSE:TMP:P850": "T850_RMSE",
    "BIAS:TMP:P850": "T850_BIAS",
    "ACC:HGT:P500": "H500_ACC",
    "RMSE:HGT:P500": "H500_RMSE",
    "BIAS:HGT:P500": "H500_BIAS",
    "RMSE:PRMSL:MSL": "MSLP_RMSE",
    "BIAS:PRMSL:MSL": "MSLP_BIAS",
    "RMSE:WIND:Z10": "WIND10_RMSE",
    "BIAS:WIND:Z10": "WIND10_BIAS",
    "ETS:APCP:A24": "PRECIP24_ETS",
}

OUTPUT_FIELDS = ["valid_date","model","region","metric","forecast_hour","value","sample_count","completeness"]

def get(row, field, default=""):
    col=COLUMN_MAP.get(field); return row.get(col,default) if col else default

def normalize_date(value):
    value=value.strip()
    if len(value)>=8 and value[:8].isdigit():
        v=value[:8]; return f"{v[:4]}-{v[4:6]}-{v[6:8]}"
    return value[:10]

def infer_metric(row):
    direct=row.get("DASHBOARD_METRIC","").strip()
    if direct: return direct
    stat=row.get("STAT_NAME",row.get("METRIC","")); var=row.get("FCST_VAR",""); lev=row.get("FCST_LEV","")
    return METRIC_MAP.get(f"{stat}:{var}:{lev}","")

def normalize(row):
    return {
        "valid_date":normalize_date(get(row,"valid_date")),
        "model":get(row,"model").strip(),
        "region":get(row,"region").strip(),
        "metric":infer_metric(row),
        "forecast_hour":get(row,"forecast_hour").strip(),
        "value":get(row,"value").strip(),
        "sample_count":get(row,"sample_count","0").strip(),
        "completeness":row.get("COMPLETENESS","100").strip(),
    }

def main():
    ap=argparse.ArgumentParser(description="Normalize EVS CSV rows for the OMD dashboard prototype.")
    ap.add_argument("input",type=Path); ap.add_argument("output",type=Path); args=ap.parse_args()
    args.output.parent.mkdir(parents=True,exist_ok=True);n=0
    with args.input.open(newline="",encoding="utf-8-sig") as src,args.output.open("w",newline="",encoding="utf-8") as dst:
        r=csv.DictReader(src);w=csv.DictWriter(dst,fieldnames=OUTPUT_FIELDS);w.writeheader()
        for row in r:
            out=normalize(row)
            if not out["model"] or not out["metric"] or not out["value"]: continue
            w.writerow(out);n+=1
    print(f"Wrote {n:,} rows to {args.output}")

if __name__=="__main__": main()
