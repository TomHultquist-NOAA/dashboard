#!/usr/bin/env bash
# Cron entrypoint: optionally load private settings and run the guarded refresh.
set -euo pipefail
TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$TOOLS_DIR/dashboard_cron.conf" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$TOOLS_DIR/dashboard_cron.conf"
  set +a
fi
exec "$TOOLS_DIR/update_dashboard_data.sh"
