import datetime as dt
import importlib.util,json,math,tempfile,unittest
from pathlib import Path
from unittest import mock
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('updater',ROOT/'scripts/update_daily.py');u=importlib.util.module_from_spec(spec);spec.loader.exec_module(u)
class ValidationTests(unittest.TestCase):
 def test_duplicate_future_nonfinite(self):
  today=dt.date(2026,9,10)
  for rs in [[{'date':'2026-09-11','value':1}], [{'date':'2026-09-01','value':1}]*2,[{'date':'2026-09-01','value':math.nan}]]:
   with self.assertRaises(ValueError):u.normalize(rs,['value'],today)
 def test_null_transit_is_not_zero(self):
  row={'attributes':{'date':'2026-09-01','portid':'chokepoint6','n_tanker':None,'n_total':1}}
  with self.assertRaises(ValueError):u.parse_portwatch([row])
  row['attributes']['n_tanker']=0
  self.assertEqual(u.parse_portwatch([row])[0]['tanker'],0)
  row['attributes']['n_tanker']=2
  with self.assertRaises(ValueError):u.parse_portwatch([row])
 def test_regression_and_truncation_keep_old(self):
  old={'latest_observation':'2026-09-06','records':[{'date':'2026-09-06','value':2}]*100}
  saved=json.dumps(old)
  for fresh in [{'records':[{'date':'2026-09-05','value':3}]},{'records':[{'date':'2026-09-07','value':3}]}]:
   with self.assertRaises(ValueError):u.merge_good(old,fresh,'2026-09-01')
  self.assertEqual(json.dumps(old),saved)
 def test_curve_common_completed_day(self):
  cs=[{'maturity':'2026-10','symbol':'CLV26.NYM','closes':{'2026-09-08':90,'2026-09-09':92,'2026-09-10':94}}, {'maturity':'2026-11','symbol':'CLX26.NYM','closes':{'2026-09-08':88,'2026-09-10':90}}]
  rows=u.align_curve(cs,dt.date(2026,9,10))
  self.assertEqual({r['date'] for r in rows},{'2026-09-08'})
  self.assertEqual([r['value'] for r in rows],[90,88])
  cs[1]['closes']={'2026-08-01':70}
  with self.assertRaises(ValueError):u.align_curve(cs,dt.date(2026,9,10))
 def test_failed_run_retains_last_good_bundle(self):
  with tempfile.TemporaryDirectory() as folder:
   out=Path(folder);old={'records':[{'date':'2026-09-01','value':96.02}],'latest_observation':'2026-09-01','last_success_at':'2026-09-02T00:00:00Z','status':'ok'}
   (out/'daily.json').write_text(json.dumps({'schema_version':1,'sources':{'brent':old}}))
   with mock.patch.object(u,'load_eia',side_effect=RuntimeError('Simulated provider outage')),mock.patch.object(u.sys,'argv',['update_daily.py','--output-dir',folder,'--sources','brent']):
    self.assertEqual(u.main(),1)
   result=json.loads((out/'daily.json').read_text())['sources']['brent']
   self.assertEqual(result['records'],old['records']);self.assertEqual(result['last_success_at'],old['last_success_at']);self.assertEqual(result['status'],'error')
   self.assertIn('window.SECTOR_DAILY = ',(out/'daily-data.js').read_text())
 def test_futures_units_and_completed_sessions(self):
  today=dt.date(2026,9,10)
  stamps=[int(dt.datetime(2026,5,1,tzinfo=dt.timezone.utc).timestamp())+i*86400+18*3600 for i in range(133)]
  result={'meta':{'symbol':'SB=F','currency':'USX','instrumentType':'FUTURE','exchangeTimezoneName':'America/New_York'},'timestamp':stamps,'indicators':{'quote':[{'close':[18.4]*len(stamps)}]}}
  rows=u.parse_daily_futures(result,'SB=F',today)
  self.assertEqual(rows[-1]['date'],'2026-09-09');self.assertEqual(rows[-1]['value'],18.4)
  result['meta']['currency']='USD'
  with self.assertRaises(ValueError):u.parse_daily_futures(result,'SB=F',today)
  result['meta']['currency']='USX';result['meta']['instrumentType']='EQUITY'
  with self.assertRaises(ValueError):u.parse_daily_futures(result,'SB=F',today)
 def test_atomic_bundle_is_valid(self):
  with tempfile.TemporaryDirectory() as folder:
   p=Path(folder)/'daily.json';u.atomic(p,'{"ok":true}');self.assertTrue(json.loads(p.read_text())['ok']);self.assertEqual(len(list(Path(folder).iterdir())),1)
if __name__=='__main__':unittest.main()
