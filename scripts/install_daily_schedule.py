#!/usr/bin/env python3
"""Idempotently add only this project's cron block. Preserve all other jobs."""
from pathlib import Path
import subprocess, sys, re, datetime
ROOT=Path(__file__).resolve().parents[1]
START='# FIN_SUCCESS_SECTOR_DASHBOARDS_START'
END='# FIN_SUCCESS_SECTOR_DASHBOARDS_END'
quote=lambda s:"'"+str(s).replace("'", "'\\''")+"'"
if datetime.datetime.now().astimezone().utcoffset()!=datetime.timedelta(hours=7):
    raise SystemExit('System timezone is not UTC+7; schedule not installed. Configure desired local time first.')
result=subprocess.run(['crontab','-l'],capture_output=True,text=True)
if result.returncode and 'no crontab' not in result.stderr.lower():raise SystemExit(result.stderr)
existing=result.stdout
if existing.count(START)!=existing.count(END) or existing.count(START)>1:raise SystemExit('Malformed existing dashboard cron block')
base=re.sub(re.escape(START)+r'.*?'+re.escape(END)+r'\n?', '',existing,flags=re.S).rstrip()
(ROOT/'.logs').mkdir(exist_ok=True)
block=START+'\n# 06:15 daily, system timezone Asia/Ho_Chi_Minh. Local files only.\n'
block+='15 6 * * * DASHBOARD_PYTHON='+quote(sys.executable)+' /bin/sh '+quote(ROOT/'scripts/run_daily.sh')+' >> '+quote(ROOT/'.logs/daily-update.log')+' 2>&1\n'+END+'\n'
expected=(base+'\n\n' if base else '')+block
if '--preview' in sys.argv:print(expected,end='');sys.exit()
subprocess.run(['crontab','-'],input=expected,text=True,check=True)
actual=subprocess.check_output(['crontab','-l'],text=True)
if actual!=expected:raise SystemExit('Installed schedule differs from expected')
print('Installed and verified: daily at 06:15 Asia/Ho_Chi_Minh; other cron jobs preserved.')
