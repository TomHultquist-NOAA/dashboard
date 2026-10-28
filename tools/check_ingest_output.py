#!/usr/bin/env python3
"""Validate a staged EVS dashboard ingest before publication (Python >= 3.6)."""
import argparse
import csv
from datetime import datetime
import json
from pathlib import Path
import sys

REGIONS = ('Global', 'Northern Hemisphere', 'Southern Hemisphere', 'Tropics')
COLUMNS = ('valid_date', 'model', 'region', 'metric', 'forecast_hour', 'value',
           'sample_count', 'completeness', 'verification_source')


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--data-dir', type=Path, required=True)
    p.add_argument('--max-lag-days', type=int, default=7,
                   help='Maximum days between requested end and last available verification date')
    p.add_argument('--min-dates', type=int, default=7)
    a = p.parse_args()
    try:
        with (a.data_dir / 'ingest_report.json').open(encoding='utf-8') as f:
            report = json.load(f)
        latest = report.get('latest_valid_date')
        end = report.get('requested_end')
        if not latest or not end:
            raise ValueError('No actual verification dates were ingested')
        age = (datetime.strptime(end, '%Y-%m-%d') -
               datetime.strptime(latest, '%Y-%m-%d')).days
        if age > a.max_lag_days or age < 0:
            raise ValueError('Latest verification date {} is {} days from requested end {} '
                             '(maximum {} days)'.format(latest, age, end, a.max_lag_days))
        if int(report.get('date_count_with_data', 0)) < a.min_dates:
            raise ValueError('Insufficient days with data: {}'.format(report.get('date_count_with_data')))
        if report.get('errors'):
            raise ValueError('Importer reported {} errors; refusing to publish'.format(len(report['errors'])))
        if report.get('normalized_rows', 0) <= 0:
            raise ValueError('No verification values were ingested')
        for region in REGIONS:
            source = a.data_dir / 'regions' / (region + '.csv')
            with source.open(newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                if reader.fieldnames != list(COLUMNS):
                    raise ValueError('Unexpected CSV header in {}'.format(source))
                count = sum(1 for _ in reader)
            if count <= 0:
                raise ValueError('No CSV rows for {}'.format(region))
            expected = report.get('regional_rows', {}).get(region)
            if expected != count:
                raise ValueError('Count mismatch for {}: {} versus report {}'.format(region, count, expected))
        print('PASS: {} rows across {} days; latest valid date {}; lag {} day(s).'.format(
            report['normalized_rows'], report['date_count_with_data'], latest, age))
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print('FAIL: ingest validation: {}'.format(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
