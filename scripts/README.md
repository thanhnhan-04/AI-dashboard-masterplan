# Daily data refresh

Run from the repository root:

```sh
python3 -m pip install -r scripts/requirements.txt
python3 scripts/update_daily.py
```

Requires Python 3.10+ and system `curl` with working TLS trust. The installed local cron calls `scripts/run_daily.sh` at 06:15 Asia/Ho_Chi_Minh daily. That wrapper uses the Python path provided in `DASHBOARD_PYTHON`; set it explicitly on another machine. The computer must be awake and connected. Local changes are not published to GitHub Pages.

```sh
python3 scripts/install_daily_schedule.py --preview
python3 scripts/install_daily_schedule.py
python3 scripts/update_daily.py --sources hormuz wti_curve
python3 scripts/update_daily.py --output-dir /private/tmp/sector-data-check
python3 -m unittest discover -s tests
node tests/data-math.test.cjs
```

Outputs: `data/daily-data.js` is the browser bundle; `data/update-status.json` reports each source independently. `data/daily.json` and `data/raw/` are ignored local cache/audit artifacts. `.logs/daily-update.log` captures scheduled job output. A nonzero exit means at least one source failed; valid sources still refresh, failed sources retain their previous data and original last-success date. No source credentials or model calls are used.

To remove the schedule, edit crontab and remove only the block between `FIN_SUCCESS_SECTOR_DASHBOARDS_START` and `FIN_SUCCESS_SECTOR_DASHBOARDS_END`. Do not remove other jobs. The OS advisory lock is released automatically on process exit/crash; `data/.update.lock` may remain on disk and should not be deleted while jobs run.

The source observation date is independent of fetch date. Daily observations from EIA/PortWatch may only be published weekly. The WTI adapter uses unadjusted daily closes on the most recent completed exchange-calendar date available for every requested maturity, not settlement prices. It fails closed for missing/stale contracts. See `DASHBOARD_WORKFLOW.md` for cadence evidence and interpretation ownership.


Added feeds (10 September 2026): `brent_futures` (Yahoo BZ=F, USD/barrel), `sugar_futures` (Yahoo SB=F, USX/cents per lb), `sugar_monthly` (World Bank Pink Sheet XLSX) and `sugar_producers` (USDA PSD sugar CSV ZIP; Brazil/India/Thailand/EU production). The existing daily job includes these automatically. Both sector pages load the shared data bundle. Futures use completed sessions and remain separate from spot/crack calculations. World Bank observations are monthly; USDA market-year keys are not publication dates. Local Vietnam observations are not automatically refreshed by these new adapters.

## Bank public sources (11 September 2026)

`python3 scripts/update_bank.py` fetches Eximbank's 2026 monthly lending-rate disclosures. It uses Python standard library and curl (no new dependencies). `run_daily.sh` now runs the existing sector updater and then this independent bank updater, returning nonzero if either fails. Existing cron and Stock monitor entries were inspected and not modified. Wi remains intentionally disconnected for Claude to implement.

Output: `data/bank-public-data.js` (atomic data + status bundle); raw HTML under ignored `data/raw/bank-eib-*.html`. Dates, units, raw numeric strings and hashes are retained. Parser rejects missing fields, duplicate/future dates, dates inconsistent with report headings and history truncation. Failure preserves previous points/hash/last_success_at and sets an error. Corrections of existing observations are allowed. The dashboard flags AI analysis for review whenever the underlying data hash differs from the dated baseline.

For reproducible parser replay, use `--input-html PATH --output-dir /private/tmp/bank-replay`. Replay is explicitly labelled and does not constitute a fresh source check. To test failure without touching production data, replay invalid HTML against a copy in a temporary output directory.

The bank source page is specific to 2026. A new year requires a separately validated URL/adapter and deliberate history merge. Its monthly observations do not prove a fixed monthly publication day. Public IFC and policy cards are dated snapshots, not automated feeds. SBV currently returns a Request Rejected page; source links are kept with visible limitations.

## Bank · MCP Wi (11 September 2026)

MCP Wi (WiGroup) is only reachable through a Claude session with the `claude.ai MCP Wi` connector; there is no API key on this machine, so **no cron job fetches Wi**. The flow is:

1. In a Claude session, call the tools/endpoints/indicator IDs listed in `data/bank-wi-contract.json` (real IDs verified 11/09/2026; the old `wi:<block_id>` strings were placeholders) and save each response under `data/raw/wi/<raw_file>` keeping the existing structure (`request`, `fetched_at`, `columns/rows` or `series`). Raw Wi files are tracked in git because they are the only rebuild source.
2. `python3 scripts/build_bank_wi.py --checked-at <ISO of the Wi session>` validates dates/units/duplicates/row widths, derives rule-based aggregates (YoY gap, bond monthly sums, sector loan-group shares, property proxy), and writes `data/bank-wi-data.js` + `data/bank-wi-status.json` atomically. A block whose raw file is missing or invalid keeps the previous block (`status: error`, last_success_at retained) and the script exits 1.
3. `python3 -m unittest tests/test_bank_wi.py` (10 tests: validation, provider ratios not recomputed, same-month YoY gap, proxy sample/no extrapolation, bond sums, completed-session valuation, forecast target flags, last-good on missing raw).

`assets/bank-wi.js` renders the 20 blocks into the existing cards (charts, tables, range selectors, tooltips), fills the comparison table, KPI tiles, rule-based "Đọc nhanh" and monitor statuses, and rewrites the source table rows. Known Wi gaps: `car` empty for all banks, `interest_rate_gap` missing for NVB/SHB/SSB, `period_type=t` on `sector_ratio_bank`/`sector_fs_bank` returns 500 when growth/estimate columns are requested, no market-wide turnover endpoint, bond principal/interest payments not yet fetched.

## Publish one consistent dashboard release

After changing dashboard pages, shared assets or browser data bundles, run:

```sh
python3 scripts/prepare_release.py --version YYYYMMDD-rN
PLAYWRIGHT_MODULE=/path/to/playwright node tests/site-navigation.cjs
```

Use a new release ID for every publication. The preparer hashes local JS/CSS references in the hub and three industry pages (including JS data bundles), applies the same navigation version, and writes `data/site-release.json` for byte-level verification. It does not update observations or publish. Commit the prepared HTML, assets/data and manifest together, then push to the existing Pages branch (`main`, repository root). Check the Pages build and rerun the navigation test with `SITE_BASE=https://thanhnhan-04.github.io/AI-dashboard-masterplan/` after deployment. `CHROME_PATH` can override the test browser executable.

All hub/sector navigation uses `assets/site-navigation.js`. Historical hub hashes `#ngan-hang`, `#dau-khi`, `#duong` redirect to their canonical versioned dashboard; section hashes inside a sector stay local. The release label refers to site files, not financial observation or analysis dates. Daily local updates still require preparation and publication to appear publicly.
