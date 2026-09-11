import copy
import datetime as dt
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('bank_update', Path(__file__).resolve().parents[1]/'scripts/update_bank.py')
bank = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bank)

def report(month=1, rate='7.16', date='31/01/2026'):
    return f'''<script>fake rate 999</script><p>LÃI SUẤT CHO VAY BÌNH QUÂN THÁNG {month:02} NĂM 2026 (Số liệu kỳ báo cáo: {date})</p>
      <table><tr><td>Lãi suất cho vay bình quân</td><td>{rate}</td></tr>
      <tr><td>khách hàng cá nhân</td><td>7.61</td></tr>
      <tr><td>khách hàng doanh nghiệp</td><td>6.65</td></tr>
      <tr><td>Chênh lệch lãi suất tiền gửi và cho vay bình quân</td><td>1.27</td></tr></table>'''

class BankSourceTests(unittest.TestCase):
    def test_parse_dates_units_and_raw(self):
        points = bank.parse_eib(report(rate='7,16'), dt.date(2026,9,11))
        self.assertEqual(points[0]['date'], '2026-01-31')
        self.assertEqual(points[0]['lending'], 7.16)
        self.assertEqual(points[0]['raw']['lending'], '7,16')
        self.assertEqual(points[0]['measure'], 'actual')

    def test_reject_missing_duplicate_future_invalid(self):
        for raw in ['',report()+report(),report(rate='99.3'),report(date='30/01/2026'),report().replace('khách hàng cá nhân','khác')]:
            with self.subTest(raw=raw[:50]), self.assertRaises(ValueError):
                bank.parse_eib(raw,dt.date(2026,9,11))
        with self.assertRaises(ValueError): bank.parse_eib(report(),dt.date(2026,1,1))

    def test_history_revisions_allowed_truncation_rejected(self):
        old=bank.parse_eib(report(),dt.date(2026,9,11))
        newer=bank.parse_eib(report(rate='7.17')+report(2,date='28/02/2026'),dt.date(2026,9,11))
        self.assertEqual(bank.preserve_history(old,newer)[0]['lending'],7.17)
        original=copy.deepcopy(newer)
        with self.assertRaises(ValueError): bank.preserve_history(newer,old)
        self.assertEqual(newer,original)

    def test_gaps_not_filled_with_zero(self):
        rows=bank.parse_eib(report()+report(3,date='31/03/2026'),dt.date(2026,9,11))
        self.assertEqual([p['date'] for p in rows],['2026-01-31','2026-03-31'])

if __name__=='__main__': unittest.main()
