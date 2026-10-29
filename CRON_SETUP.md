# Daily verification updates — cron setup (1.0.2)

The dashboard is static: its browser pages **read** `data/regions/*.csv`; they do not download NOAA `.stat` files themselves. Schedule the importer on a system that can access `https://emc.ncep.noaa.gov/gmb/mpr/dashboard_stats/`, **then publish** the resulting CSVs to the directory served by the dashboard. Merely running the importer on a processing host does not update a separate web server or GitHub Pages site.

## 1. Install the complete package and test the importer

Use **Python 3.6.8 or later**; no pip packages are needed. Extract the dashboard ZIP with files directly at its root. **Preserve or copy your already-populated `data/` directory first**, because this distribution contains header-only CSV placeholders. This package does not contain the actual 88 days of ingested data from your server.

```bash
cd /absolute/path/to/dashboard
python3 tools/ingest_evs_stat.py --fetch --days 90
```

This command defaults to 90 days ending **yesterday in the local timezone** when run directly. The provided scheduled wrapper explicitly uses **UTC** to avoid date-boundary issues. Inspect `data/ingest_report.json` and check `data/regions/*.csv` before enabling cron.

## 2. Decide where to publish

Edit a **private** `tools/dashboard_cron.conf` created from `tools/dashboard_cron.conf.example` (the real config is excluded by `.gitignore`). At a minimum, set an absolute `DASHBOARD_DIR` and `PYTHON_BIN` if cron does not find the correct Python.

**A. Same machine as the web files (local publication):**

```bash
DASHBOARD_DIR=/absolute/path/to/dashboard
PYTHON_BIN=/usr/bin/python3
PUBLISH_MODE=local
PUBLISH_DIR=/absolute/path/to/webroot/dashboard/data
```

The default `PUBLISH_DIR` is `$DASHBOARD_DIR/data`. If the dashboard root is itself the webroot, you can omit `PUBLISH_DIR`.

**B. Separate processing and web servers (SSH publication):**

```bash
DASHBOARD_DIR=/absolute/path/to/dashboard
PYTHON_BIN=/usr/bin/python3
PUBLISH_MODE=scp
REMOTE_HOST=web_account@web_server
REMOTE_DATA_DIR=/absolute/path/to/webroot/dashboard/data
```

The account running cron must be able to use `ssh` and `scp` to that host **without an interactive password prompt**, using an approved SSH authentication method. The wrapper stages the source data locally, copies verified CSVs to a temporary folder on the web host, and then moves them into the published `data/regions/` directory. Confirm your organization's rules allow this transfer. Remote paths must not contain spaces.

**C. GitHub Pages or another site deployed on Git push (Git publication):**

```bash
DASHBOARD_DIR=/absolute/path/to/dashboard-git-checkout
PYTHON_BIN=/usr/bin/python3
PUBLISH_MODE=git
GIT_REPO_DIR=/absolute/path/to/dashboard-git-checkout
```

The checkout must have a configured upstream branch and **noninteractive push authentication** already working, and the GitHub Pages/deployment configuration must publish that branch/directory. The wrapper stages the verified CSVs and `data/ingest_report.json`, commits changes limited to those paths, and pushes. It does not commit unrelated modifications. GitHub itself will **not** update from a cron job that only changes local files; a successful push or explicit deployment is necessary.

Do not store tokens, passwords, or SSH private keys in the repository. `tools/dashboard_cron.conf` is ignored by Git; protect its permissions (`chmod 600`).

## 3. Test the scheduled command manually

```bash
cd /absolute/path/to/dashboard
bash tools/run_scheduled_update.sh
```

It downloads files from the rolling 90-day window, validates the four output CSVs and freshness of their latest verification date, then publishes in the configured mode. Existing cached `.stat` files are reused; days that previously returned HTTP 404 are retried. The source files for a given day may arrive later than the cron run, so late data will be collected on a subsequent run.

For a completely offline test, first use the importer with `--input-dir` manually; the supplied scheduled wrapper is designed for internet fetching.

## 4. Add the cron entry

After you have confirmed the manual test and publication, use `crontab -e` for the account that has source access and web/Git permissions. Example using **18:30 UTC daily** (verify the server's cron timezone first):

```cron
30 18 * * * /usr/bin/flock -n /home/USER/.omd_dashboard.lock /bin/bash /absolute/path/to/dashboard/tools/run_scheduled_update.sh >> /home/USER/omd_dashboard_update.log 2>&1
```

Replace `USER`, the script path, and the log path with actual absolute paths. Verify `command -v flock` returns `/usr/bin/flock` or update it accordingly. `flock -n` prevents two scheduled imports from overlapping. If the server cron timezone is not UTC, set `CRON_TZ=UTC` where supported, or choose the equivalent local schedule. **18:30 UTC is a suggested time, not a claim about when NOAA files become available.** Adjust after observing actual source publication times. You can run the job twice per day if needed, but use the same lock file.

A minimal cron entry that runs only ingestion, for a dashboard and importer installed in the webroot on the *same* server, is possible, but the wrapped method above is safer because it validates before publication.

## 5. Check that updates really reached the website

- Review the log for `PASS:` and `Dashboard data refresh succeeded.`
- Confirm `data/ingest_report.json` has a new `generated_utc` and suitable `latest_valid_date`.
- Reload the live dashboard; Home shows the latest **verification date** from the loaded CSVs, not the script execution timestamp.
- If the browser shows older data, clear its cache and check whether your web host/CDN caches `.csv` files. When using Git, confirm that the push succeeded **and** your Pages/deployment completed.

The default quality gate rejects publication if no values were found, fewer than seven valid dates are present, the latest available verification date is more than seven days behind the requested end date, or the importer reports errors. Adjust `MAX_DATA_LAG_DAYS` and `MIN_DATA_DATES` in the private config if warranted. HTTP 404 files (such as the October 20–21 gaps observed during backfill) are recorded, not fabricated and not automatically treated as total job failure.

**Note on source corrections:** cached successful `.stat` downloads are reused. If an upstream file is revised, run the importer manually with `--refresh` to retrieve cached dates again; then run the scheduled wrapper to validate and publish those refreshed files.
