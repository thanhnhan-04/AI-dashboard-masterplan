#!/bin/sh
# Daily local refresh. No git push and no LLM/API billing.
set -eu
TASK_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
TASK_PYTHON="${DASHBOARD_PYTHON:-/Library/Frameworks/Python.framework/Versions/3.11/bin/python3}"
cd "$TASK_ROOT"
DAILY_RESULT=0
"$TASK_PYTHON" scripts/update_daily.py || DAILY_RESULT=$?
# Public bank source is independent: still check it if an oil/sugar feed fails.
"$TASK_PYTHON" scripts/update_bank.py || DAILY_RESULT=$?
exit "$DAILY_RESULT"
