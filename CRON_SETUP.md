# Scheduled EVS data updates

**OMD Model Performance Dashboard — version 1.0.8**

This guide covers automated retrieval of EVS STAT files, validation of normalized CSV outputs, and publication to a static dashboard. The browser reads published `data/regions/*.csv`; it does not retrieve STAT files directly.

The update scripts support **Python 3.6.8 or later** with no third-party Python packages. A processing host must be able to reach the source archive and the intended publication destination.

## 1. Initial setup

The distribution is extracted into the dashboard root, without an enclosing directory. **Existing populated `data/` files must be retained when installing a complete package**, because the complete archive contains header-only CSV placeholders.

A manual importer run verifies access to the source files:

```bash
cd /absolute/path/to/dashboard
python3 tools/ingest_evs_stat.py --fetch --days 90
```

Manual ingestion uses a 90-day window ending on the previous local date by default. The scheduled wrapper calculates the requested end date in **UTC**. The importer produces `data/regions/*.csv` and `data/ingest_report.json`; the report records coverage, missing files, and errors.

## 2. Publication configuration

An optional private configuration file, `tools/dashboard_cron.conf`, is based on `tools/dashboard_cron.conf.example`. The private file is excluded by `.gitignore`. Paths, credentials, and publication settings depend on the hosting environment.

### Local web directory

```bash
DASHBOARD_DIR=/absolute/path/to/dashboard
PYTHON_BIN=/usr/bin/python3
PUBLISH_MODE=local
PUBLISH_DIR=/absolute/path/to/webroot/dashboard/data
```

The default `PUBLISH_DIR` is `$DASHBOARD_DIR/data`, suitable when the dashboard checkout also serves the website.

### Separate web server (SSH/SCP)

```bash
DASHBOARD_DIR=/absolute/path/to/dashboard
PYTHON_BIN=/usr/bin/python3
PUBLISH_MODE=scp
REMOTE_HOST=web_account@web_server
REMOTE_DATA_DIR=/absolute/path/to/webroot/dashboard/data
```

The scheduled account requires approved, noninteractive SSH authentication and write permissions on the remote destination. The wrapper stages files before transferring and installing the verified CSVs. Remote publication paths must not contain spaces. Transfers must comply with applicable organizational security requirements.

### GitHub Pages or Git-based deployment

```bash
DASHBOARD_DIR=/absolute/path/to/dashboard-git-checkout
PYTHON_BIN=/usr/bin/python3
PUBLISH_MODE=git
GIT_REPO_DIR=/absolute/path/to/dashboard-git-checkout
```

The repository checkout requires a configured upstream branch and noninteractive Git push authentication. The publishing branch or directory must also be configured for GitHub Pages or the applicable deployment system. The updater commits only the generated regional CSV files and ingestion report. An importer run without a successful push or deployment does not update a remotely hosted website.

Passwords, access tokens, and SSH private keys must not be committed to the repository. The private configuration file can be protected with `chmod 600 tools/dashboard_cron.conf`.

## 3. Manual test of the scheduled workflow

```bash
cd /absolute/path/to/dashboard
bash tools/run_scheduled_update.sh
```

The wrapper requests the rolling 90-day window, stages and validates the output, and publishes using the configured mode. Downloaded source files are cached; dates previously returning HTTP 404 are retried on subsequent runs. Files that arrive after a scheduled run are picked up on later runs.

The scheduled wrapper requires source network access. An offline source-directory test can be performed separately with the importer's `--input-dir` option.

## 4. Cron schedule

Example: **18:30 UTC daily**, on a server whose cron timezone is UTC:

```cron
30 18 * * * /usr/bin/flock -n /home/USER/.omd_dashboard.lock /bin/bash /absolute/path/to/dashboard/tools/run_scheduled_update.sh >> /home/USER/omd_dashboard_update.log 2>&1
```

The placeholders `USER` and `/absolute/path/to/dashboard` must be replaced with the actual account and installation paths. The `flock` executable location may vary; `flock -n` prevents concurrent updater runs. For servers using a different cron timezone, a supported `CRON_TZ=UTC` setting or the corresponding local time is necessary.

**18:30 UTC is an example schedule**, not a guaranteed NOAA source publication time. Update frequency and timing can be adjusted to observed availability, retaining the same lock file for every scheduled entry.

## 5. Verification and troubleshooting

A successful update should produce a cron log containing `PASS:` and `Dashboard data refresh succeeded.` The `generated_utc` value in `data/ingest_report.json` indicates ingestion time, while the Home footer reports the latest verification date represented in the data.

| Symptom | Check |
|---|---|
| Data date does not advance | Upstream STAT file availability, ingestion report, and publication log |
| Dashboard still shows older scores | Browser/CDN caching of CSV files and completion of web deployment |
| Git publication fails | Git remote, upstream branch, and noninteractive authentication |
| SSH publication fails | Remote path, permissions, host connectivity, and key configuration |
| Some model/metric/date combinations are missing | Coverage recorded in `data/ingest_report.json`; missing values remain N/A |

The default validation gate rejects outputs with no values, fewer than seven valid dates, a latest verification date more than seven days behind the requested end date, or reported ingestion errors. `MIN_DATA_DATES` and `MAX_DATA_LAG_DAYS` may be configured where operationally appropriate. Individual HTTP 404s do not automatically fail the entire update.

Cached successful STAT downloads are reused. For revised upstream files, the importer supports `--refresh` to retrieve cached dates again, followed by validation and publication through the scheduled wrapper.
