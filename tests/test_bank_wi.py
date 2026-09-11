import copy
import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_bank_wi', ROOT / 'scripts/build_bank_wi.py')
wi = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wi)
RAW = ROOT / 'data/raw/wi'
TODAY = '2026-09-11'


class WiValidationTests(unittest.TestCase):
    def test_check_dates_rejects_bad_input(self):
        wi.check_dates([['2026-01-01', 1.0], ['2026-02-01', None]], TODAY, 'ok')
        for bad in ([['2026-01-01', 1], ['2026-01-01', 2]], [['2027-01-01', 1]], [['x', 1]], [['2026-01-01', 'a']]):
            with self.subTest(bad=bad), self.assertRaises(wi.RawError):
                wi.check_dates(bad, TODAY, 'bad')

    def test_rows_width_mismatch(self):
        with self.assertRaises(wi.RawError):
            wi.rows_to_dicts(['a', 'b'], [[1, 2], [3]])

    def test_all_blocks_build_from_archived_raw(self):
        for block_id, fn in wi.BUILDERS.items():
            with self.subTest(block=block_id):
                b = fn(TODAY)
                self.assertTrue(b['source_ids'] and b['latest_observation'] and b['data'])
                self.assertNotIn('wi:', ' '.join(b['source_ids']))

    def test_ratios_are_provider_values_not_recomputed(self):
        b = wi.block_bank_ratios(TODAY)
        raw = json.loads((RAW / 'ratio_bank_ttm_2026q2.json').read_text())
        vcb = next(r for r in raw['data'] if r['symbol'] == 'VCB')
        out = next(r for r in b['data']['banks'] if r['symbol'] == 'VCB')
        self.assertEqual(out['nim'], vcb['nim'])
        self.assertEqual(out['npl'], vcb['npl_ratio'])
        sector = b['data']['sector_ttm'][-1]
        self.assertAlmostEqual(sector['nim'], 0.030056649074842328)  # sector_ratio_bank TTM, not a bank average
        self.assertEqual(sector['period'], '2026Q2')

    def test_funding_gap_same_month_and_adjusted_tables(self):
        b = wi.block_funding(TODAY)
        gap = dict(b['data']['credit_minus_deposit_yoy_pp']['points'])
        cr = dict(b['data']['credit_total_yoy']['points']); dp = dict(b['data']['deposits_total_yoy']['points'])
        self.assertAlmostEqual(gap['2026-06-01'], cr['2026-06-01'] - dp['2026-06-01'], places=4)
        self.assertNotIn('2026-07-01', gap)  # deposits lag credit; no cross-month subtraction
        self.assertIn('macro:302:265969', b['source_ids'])  # adjusted table, not raw 18

    def test_property_proxy_sample_and_no_extrapolation(self):
        b = wi.block_credit_sectors(TODAY)
        p = b['property_proxy']
        self.assertEqual(p['sample_banks'] + len(p['undisclosed']), p['universe_banks'])
        self.assertIsNone(p['extrapolation'])
        self.assertTrue(0 < p['sample_share'] < 1)

    def test_bonds_monthly_sums(self):
        b = wi.block_bonds(TODAY)
        raw = json.loads((RAW / 'cbond_bank_issuances_2026.json').read_text())
        aug = sum(r[3] for r in raw['rows'] if r[2].startswith('2026-08')) / 1e9
        m = next(x for x in b['data']['months'] if x['month'] == '2026-08')
        self.assertAlmostEqual(m['issued_bn'], round(aug, 1))
        self.assertEqual(m['net_bn'], round(m['issued_bn'] - m['buyback_bn'], 1))

    def test_valuation_uses_completed_session(self):
        b = wi.block_valuation(TODAY)
        self.assertEqual(b['price_date'], '2026-09-10')
        self.assertEqual(len(b['data']['banks']), 27)

    def test_forecast_targets_flagged(self):
        b = wi.block_forecast(TODAY)
        rows = b['data']['by_indicator']['CREDIT_GROWTH_YOY']
        self.assertTrue(any(r['is_target'] for r in rows if r['provider'] == 'NHNN'))
        self.assertFalse(any(r['is_target'] for r in rows if r['provider'] == 'Vietcap'))

    def test_missing_raw_keeps_last_good_and_reports_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp); rawdir = tmp / 'raw'; shutil.copytree(RAW, rawdir)
            out = tmp / 'out'; out.mkdir()
            import subprocess, sys
            cmd = [sys.executable, str(ROOT / 'scripts/build_bank_wi.py'), '--raw-dir', str(rawdir), '--output-dir', str(out), '--today', TODAY]
            self.assertEqual(subprocess.run(cmd, capture_output=True).returncode, 0)
            first = json.loads((out / 'bank-wi-data.js').read_text()[len(wi.PREFIX):].strip().rstrip(';'))
            (rawdir / 'macro_fx_daily.json').unlink()
            self.assertEqual(subprocess.run(cmd, capture_output=True).returncode, 1)
            second = json.loads((out / 'bank-wi-data.js').read_text()[len(wi.PREFIX):].strip().rstrip(';'))
            status = json.loads((out / 'bank-wi-status.json').read_text())
            self.assertEqual(status['blocks']['fx']['status'], 'error')
            self.assertTrue(status['blocks']['fx']['kept_last_good'])
            self.assertEqual(second['blocks']['fx']['data'], first['blocks']['fx']['data'])
            self.assertEqual(second['blocks']['fx']['status'], 'error')
            self.assertEqual(second['blocks']['fx']['last_success_at'], first['blocks']['fx']['last_success_at'])
            self.assertEqual(second['blocks']['omo']['status'], 'loaded')


if __name__ == '__main__':
    unittest.main()
