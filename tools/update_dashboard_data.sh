#!/usr/bin/env bash
# Daily NOAA EVS dashboard refresh. Requires bash, Python 3.6.8+, and network access.
# Configure by environment variables or source a private config file in cron.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD_DIR="${DASHBOARD_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
PUBLISH_MODE="${PUBLISH_MODE:-local}" # local, scp, or git
PUBLISH_DIR="${PUBLISH_DIR:-$DASHBOARD_DIR/data}"
GIT_REPO_DIR="${GIT_REPO_DIR:-$DASHBOARD_DIR}"
WORK_DIR="${WORK_DIR:-$DASHBOARD_DIR/.cron-work}"
CACHE_DIR="${CACHE_DIR:-$DASHBOARD_DIR/raw_stat_cache}"
MAX_DATA_LAG_DAYS="${MAX_DATA_LAG_DAYS:-7}"
MIN_DATA_DATES="${MIN_DATA_DATES:-7}"
DAYS="${DAYS:-90}"
END_LAG_DAYS="${END_LAG_DAYS:-1}"

if [[ "$PUBLISH_MODE" != local && "$PUBLISH_MODE" != git && "$PUBLISH_MODE" != scp ]]; then
  echo "Unknown PUBLISH_MODE: $PUBLISH_MODE (expected local, git, or scp)" >&2
  exit 2
fi
if [[ "$PUBLISH_MODE" == scp && ( -z "${REMOTE_HOST:-}" || -z "${REMOTE_DATA_DIR:-}" ) ]]; then
  echo 'Set REMOTE_HOST and REMOTE_DATA_DIR for PUBLISH_MODE=scp' >&2
  exit 2
fi
# Avoid ambiguities with the ssh/scp destination path; use a simple absolute path.
if [[ "$PUBLISH_MODE" == scp && ! "${REMOTE_DATA_DIR}" =~ ^/[a-zA-Z0-9_./-]+$ ]]; then
  echo 'REMOTE_DATA_DIR must be an absolute path with no spaces or shell metacharacters.' >&2
  exit 2
fi

mkdir -p "$WORK_DIR" "$CACHE_DIR"
STAGE="$(mktemp -d "$WORK_DIR/ingest.XXXXXXXX")"
trap 'rm -rf -- "$STAGE"' EXIT

# Always calculate the target verification date in UTC, regardless of server timezone.
END_DATE="$($PYTHON_BIN -c 'from datetime import datetime,timedelta,timezone; import sys; print((datetime.now(timezone.utc).date()-timedelta(days=int(sys.argv[1]))).isoformat())' "$END_LAG_DAYS")"

echo "[$(date -u +%FT%TZ)] Ingesting $DAYS days ending $END_DATE (UTC); mode=$PUBLISH_MODE"
"$PYTHON_BIN" "$SCRIPT_DIR/ingest_evs_stat.py" --fetch --end "$END_DATE" --days "$DAYS" \
  --cache-dir "$CACHE_DIR" --out-dir "$STAGE/data"
"$PYTHON_BIN" "$SCRIPT_DIR/check_ingest_output.py" --data-dir "$STAGE/data" \
  --max-lag-days "$MAX_DATA_LAG_DAYS" --min-dates "$MIN_DATA_DATES"

install_local() {
  local destination="$1" file name temp
  mkdir -p "$destination/regions"
  for file in "$STAGE/data/regions/"*.csv; do
    name="$(basename "$file")"
    temp="$destination/regions/.${name}.$$.tmp"
    cp -- "$file" "$temp"
    mv -f -- "$temp" "$destination/regions/$name"
  done
  temp="$destination/.ingest_report.$$.tmp"
  cp -- "$STAGE/data/ingest_report.json" "$temp"
  mv -f -- "$temp" "$destination/ingest_report.json"
}

if [[ "$PUBLISH_MODE" == local ]]; then
  install_local "$PUBLISH_DIR"
  echo "Published verified CSVs to $PUBLISH_DIR"
elif [[ "$PUBLISH_MODE" == git ]]; then
  if ! git -C "$GIT_REPO_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Not a Git checkout: $GIT_REPO_DIR" >&2; exit 1
  fi
  install_local "$GIT_REPO_DIR/data"
  git -C "$GIT_REPO_DIR" add -- data/regions/ data/ingest_report.json
  if ! git -C "$GIT_REPO_DIR" diff --cached --quiet -- data/regions/ data/ingest_report.json; then
    git -C "$GIT_REPO_DIR" commit -m "Update EVS dashboard verification data ($END_DATE UTC)" -- data/regions/ data/ingest_report.json
  else
    echo 'No data changes to commit.'
  fi
  # Push even if no new commit: a previous scheduled push may have failed.
  git -C "$GIT_REPO_DIR" push
  echo 'GitHub publishing push complete (subject to hosting/deployment configuration).'
else
  # Requires unattended SSH authentication and scp/ssh on this host.
  REMOTE_INCOMING="$REMOTE_DATA_DIR/.incoming"
  ssh "$REMOTE_HOST" "mkdir -p '$REMOTE_DATA_DIR/regions' '$REMOTE_INCOMING'"
  scp -q "$STAGE/data/regions/"*.csv "$STAGE/data/ingest_report.json" "$REMOTE_HOST:$REMOTE_INCOMING/"
  # Move each file after transfer; local cron never publishes partial downloads.
  ssh "$REMOTE_HOST" "mv '$REMOTE_INCOMING/Global.csv' '$REMOTE_DATA_DIR/regions/Global.csv' && \
    mv '$REMOTE_INCOMING/Northern Hemisphere.csv' '$REMOTE_DATA_DIR/regions/Northern Hemisphere.csv' && \
    mv '$REMOTE_INCOMING/Southern Hemisphere.csv' '$REMOTE_DATA_DIR/regions/Southern Hemisphere.csv' && \
    mv '$REMOTE_INCOMING/Tropics.csv' '$REMOTE_DATA_DIR/regions/Tropics.csv' && \
    mv '$REMOTE_INCOMING/ingest_report.json' '$REMOTE_DATA_DIR/ingest_report.json'"
  echo "Published verified CSVs to $REMOTE_HOST:$REMOTE_DATA_DIR"
fi

echo "[$(date -u +%FT%TZ)] Dashboard data refresh succeeded."
