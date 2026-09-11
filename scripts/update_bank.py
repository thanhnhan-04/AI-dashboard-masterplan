#!/usr/bin/env python3
"""Public bank observations; Wi remains a separate, intentionally empty feed.
Single atomic browser bundle retains last-good observations on source errors.
"""
import argparse
import calendar
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://eximbank.com.vn/tin-tuc/lai-suat-binh-quan-thang-trong-nam-2026'
PREFIX = 'window.BANK_PUBLIC_DATA = '

class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'): self.skip += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style'): self.skip = max(0, self.skip - 1)
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)

def parse_eib(raw, today=None):
    parser = Text()
    parser.feed(raw)
    content = re.sub(r'\s+', ' ', ' '.join(parser.parts))
    pattern = r'LÃI SUẤT CHO VAY BÌNH QUÂN THÁNG\s+(\d{1,2})\s+NĂM\s+(\d{4})\s*\(Số liệu kỳ báo cáo:\s*(\d{2}/\d{2}/\d{4})\)'
    markers = list(re.finditer(pattern, content, re.I))
    fields = {
        'lending': r'Lãi suất cho vay bình quân\s+([0-9]+[.,][0-9]+)',
        'retail': r'khách hàng cá nhân\s+([0-9]+[.,][0-9]+)',
        'corporate': r'khách hàng doanh nghiệp\s+([0-9]+[.,][0-9]+)',
        'spread': r'Chênh lệch lãi suất tiền gửi và cho vay bình quân\s+([0-9]+[.,][0-9]+)',
    }
    points = []
    for i, mark in enumerate(markers):
        month, year = map(int, mark.group(1, 2))
        date = dt.date(year, month, calendar.monthrange(year, month)[1])
        if dt.datetime.strptime(mark.group(3), '%d/%m/%Y').date() != date:
            raise ValueError('Report heading/date mismatch')
        if date > (today or dt.date.today()): raise ValueError('Future actual observation')
        body = content[mark.end():markers[i+1].start() if i+1 < len(markers) else len(content)]
        point = {'date': date.isoformat(), 'measure': 'actual', 'raw': {}}
        for key, pattern in fields.items():
            match = re.search(pattern, body, re.I)
            if not match: raise ValueError(f'Missing {key} at {date}')
            value = float(match.group(1).replace(',', '.'))
            if not 0 <= value <= 40: raise ValueError('Invalid interest rate')
            point[key] = value
            point['raw'][key] = match.group(1)
        points.append(point)
    if not points: raise ValueError('No dated rate tables found')
    dates = [p['date'] for p in points]
    if len(set(dates)) != len(dates): raise ValueError('Duplicate observation')
    return sorted(points, key=lambda p:p['date'])

def preserve_history(old, new):
    if not {p['date'] for p in old}.issubset({p['date'] for p in new}):
        raise ValueError('Source history truncated; keeping last-good')
    return new

def atomic(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=path.parent, prefix='.bank-')
    try:
        with os.fdopen(fd, 'w') as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp): os.unlink(temp)

def main():
    cli = argparse.ArgumentParser()
    cli.add_argument('--output-dir', type=Path, default=ROOT/'data')
    cli.add_argument('--input-html', type=Path, help='Audit/replay a previously downloaded source; not a fresh source check')
    args = cli.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    with (args.output_dir/'.bank-update.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        path = args.output_dir/'bank-public-data.js'
        previous = json.loads(path.read_text()[len(PREFIX):].strip().removesuffix(';')) if path.exists() else {}
        now = dt.datetime.now(dt.timezone.utc).isoformat()
        bundle = {**previous, 'schema_version': 1, 'source_url': URL, 'last_attempt_at': now,
                  'observation_frequency': 'monthly', 'publication_frequency': 'irregular',
                  'polling_schedule': 'daily 06:15 Asia/Ho_Chi_Minh via run_daily.sh',
                  'source_id': 'eib_lending_2026', 'unit': '%/năm', 'owner': 'public-source',
                  'limitation': 'Chỉ Eximbank; lãi suất công bố, không phải Yield on Loans hoặc NIM. Trang năm 2026; cần nối năm mới riêng.'}
        try:
            raw = args.input_html.read_bytes() if args.input_html else subprocess.run(
                ['curl','--fail','--silent','--show-error','--location','--retry','2','--max-time','40',URL],
                capture_output=True, check=True).stdout
            digest = hashlib.sha256(raw).hexdigest()
            rawdir = args.output_dir/'raw'
            rawdir.mkdir(exist_ok=True)
            (rawdir/f'bank-eib-{digest[:16]}.html').write_bytes(raw)
            points = preserve_history(previous.get('points', []), parse_eib(raw.decode('utf-8')))
            bundle.update(points=points, status='replay' if args.input_html else 'loaded', error=None,
                          last_success_at=now, latest_observation=points[-1]['date'],
                          raw_archive=f'raw/bank-eib-{digest[:16]}.html', raw_hash=digest,
                          data_hash=hashlib.sha256(json.dumps(points, sort_keys=True).encode()).hexdigest())
            if not args.input_html: bundle['last_checked_at'] = now
        except Exception as exc:
            bundle.update(status='error', error=str(exc), last_checked_at=now if not args.input_html else previous.get('last_checked_at'))
        atomic(path, PREFIX + json.dumps(bundle, ensure_ascii=False, indent=2) + ';\n')
        print(json.dumps({k:bundle.get(k) for k in ('source_id','status','latest_observation','error')}, ensure_ascii=False))
        return 1 if bundle['status'] == 'error' else 0

if __name__ == '__main__':
    raise SystemExit(main())
