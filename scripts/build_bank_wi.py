#!/usr/bin/env python3
"""Build the Bank dashboard Wi bundle from archived MCP Wi responses.

MCP Wi is only reachable through a Claude session (claude.ai connector), so this
script does not call the network. An agent (or a future job holding a Wi API key)
saves each response under data/raw/wi/*.json following data/bank-wi-contract.json,
then this script validates, derives rule-based aggregates and writes one atomic
browser bundle. A block whose raw file is missing or invalid keeps the last-good
block from the previous bundle and is reported in data/bank-wi-status.json.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import tempfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data' / 'raw' / 'wi'
PREFIX = 'window.BANK_WI_DATA = '
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}')
UNIVERSE = ['VCB', 'CTG', 'BID', 'TCB', 'VPB', 'MBB', 'ACB', 'HDB', 'TPB', 'VIB', 'SHB', 'ABB', 'BAB', 'BVB', 'EIB', 'KLB',
            'LPB', 'MSB', 'NAB', 'NVB', 'OCB', 'PGB', 'SGB', 'SSB', 'STB', 'VAB', 'VBB']
CORE11 = ['VCB', 'CTG', 'BID', 'TCB', 'VPB', 'MBB', 'ACB', 'HDB', 'TPB', 'VIB', 'SHB']


class RawError(ValueError):
    pass


def load(name):
    path = RAW / name
    if not path.exists():
        raise RawError(f'missing raw file {name}')
    with path.open() as f:
        return json.load(f)


def check_dates(points, today, label, allow_future=False):
    """points: list of [date, value]. Rejects bad dates, duplicates, future actuals."""
    seen = set()
    for d, v in points:
        if not isinstance(d, str) or not DATE_RE.match(d):
            raise RawError(f'{label}: invalid date {d!r}')
        if d in seen:
            raise RawError(f'{label}: duplicate date {d}')
        seen.add(d)
        if not allow_future and d[:10] > today:
            raise RawError(f'{label}: future observation {d}')
        if v is not None and not isinstance(v, (int, float)):
            raise RawError(f'{label}: non-numeric value at {d}')


def asc(points):
    return sorted(points, key=lambda p: p[0])


def digest(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def rows_to_dicts(cols, rows):
    if any(len(r) != len(cols) for r in rows):
        raise RawError('row width mismatch')
    return [dict(zip(cols, r)) for r in rows]


def q_key(y, q):
    return f'{y}Q{q}'


# ---------------------------------------------------------------- blocks
def block_funding(today):
    raw = load('macro_funding_credit_monthly.json')
    s = raw['series']
    out = {}
    for key in ['deposits_total', 'deposits_corporate', 'deposits_households', 'm2', 'deposits_total_yoy',
                'deposits_corporate_yoy', 'deposits_households_yoy', 'm2_yoy', 'credit_total', 'credit_total_yoy']:
        pts = asc(s[key]['values'])
        check_dates(pts, today, key)
        out[key] = {'id': s[key]['id'], 'points': pts}
    # rule-based: credit YoY minus total deposits YoY, same month only
    dep = dict(out['deposits_total_yoy']['points'])
    gap = [[d, round(v - dep[d], 4)] for d, v in out['credit_total_yoy']['points'] if d in dep]
    out['credit_minus_deposit_yoy_pp'] = {'derived': 'credit_total_yoy − deposits_total_yoy (điểm %), cùng tháng', 'points': gap}
    out['credit_total_ytd_latest'] = s['credit_total_ytd']['values'][0]
    out['deposits_total_ytd_latest'] = s['deposits_total_ytd']['values'][0]
    out['m2_ytd_latest'] = s['m2_ytd']['values'][0]
    return {
        'source_ids': ['macro:302:265969', 'macro:302:265978', 'macro:302:265987', 'macro:301:265960', 'macro:302:265963',
                       'macro:302:265972', 'macro:302:265981', 'macro:301:265954', 'macro:302:265971', 'macro:301:265962'],
        'source_tables': 'Wi bảng 302 Tiền gửi (đã điều chỉnh), 301 Cung tiền (đã điều chỉnh) — nguồn gốc SBV',
        'publication_frequency': 'Độ trễ 1-3 tháng, ngày công bố không cố định (metadata Wi)',
        'observation_frequency': 'monthly',
        'latest_observation': out['deposits_total']['points'][-1][0],
        'unit': {'value': 'tỷ VND', 'yoy': '%', 'gap': 'điểm %'},
        'break_note': raw['break_note'],
        'data': out,
    }


def block_credit(today):
    raw = load('macro_funding_credit_monthly.json')
    s = raw['series']
    val = asc(s['credit_total']['values']); yoy = asc(s['credit_total_yoy']['values']); ytd = asc(s['credit_total_ytd']['values'])
    for p, l in ((val, 'credit'), (yoy, 'credit_yoy'), (ytd, 'credit_ytd')):
        check_dates(p, today, l)
    return {
        'source_ids': ['macro:19:75931', 'macro:19:75847', 'macro:19:241732'],
        'source_tables': 'Wi bảng 19 Cung tiền - Tín dụng : Tín dụng (SBV)',
        'publication_frequency': 'Độ trễ 1-3 tháng, ngày công bố không cố định (metadata Wi)',
        'observation_frequency': 'monthly', 'latest_observation': val[-1][0],
        'unit': {'value': 'tỷ VND', 'yoy': '%', 'ytd': '% so cuối năm trước'},
        'data': {'value': val, 'yoy': yoy, 'ytd_subset': ytd, 'ytd_subset_note': raw.get('subset_note')},
    }


def block_credit_sectors(today):
    raw = load('macro_credit_sectors_monthly.json')
    dates = raw['dates']
    total = dict(load('macro_funding_credit_monthly.json')['series']['credit_total']['values'])
    sectors = {}
    for k, s in raw['series'].items():
        pts = asc(list(zip(dates, s['values']))); yoy = asc(list(zip(dates, s['yoy'])))
        check_dates(pts, today, k)
        latest_d, latest_v = pts[-1]
        share = round(latest_v / total[latest_d] * 100, 2) if latest_d in total else None
        sectors[k] = {'id': s['id'], 'yoy_id': s['yoy_id'], 'name': s['name'], 'level': s['level'], 'points': pts, 'yoy': yoy,
                      'latest_share_pct': share}
    mix = load('ratio_bank_q_2026q2_mix.json')
    banks = rows_to_dicts(mix['columns'], mix['rows'])
    bank_rows = [{'symbol': b['symbol'], 'construction_realestate': b['pct_loans_construction_realestate'],
                  'individuals_households': b['pct_loans_individuals_households'], 'individuals': b['pct_loans_individuals'],
                  'short_term': b['pct_loans_short_term'], 'medium_term': b['pct_loans_medium_term'], 'long_term': b['pct_loans_long_term']}
                 for b in banks]
    fs = load('fs_bank_2026q2_core.json')
    gross = {r['symbol']: r['bs160_1'] for r in rows_to_dicts(fs['columns'], fs['rows'])}
    for b in bank_rows:
        b['gross_loans_bn'] = round(gross[b['symbol']] / 1e9, 1) if b['symbol'] in gross else None
    disclosed = [b for b in bank_rows if b['construction_realestate'] is not None and b['symbol'] in gross]
    sample_loans = sum(gross[b['symbol']] for b in disclosed)
    all_loans = sum(gross.values())
    re_loans = sum(gross[b['symbol']] * b['construction_realestate'] for b in disclosed)
    credit_latest = load('macro_funding_credit_monthly.json')['series']['credit_total']['values'][0]
    proxy = {
        'method': 'Σ(pct_loans_construction_realestate × cho vay KH gộp bs160_1) của các bank có thuyết minh / Σ cho vay KH gộp cùng nhóm bank, cuối Q2/2026. Chỉ gồm "xây dựng và kinh doanh BĐS" theo thuyết minh ngành nghề; KHÔNG gồm vay mua/sửa nhà (không tách được từ Wi) → là sàn dưới của tín dụng liên quan BĐS.',
        'sample_banks': len(disclosed), 'universe_banks': len(bank_rows),
        'undisclosed': [b['symbol'] for b in bank_rows if b['construction_realestate'] is None],
        'sample_gross_loans_bn': round(sample_loans / 1e9), 'universe_gross_loans_bn': round(all_loans / 1e9),
        'sample_coverage_of_universe': round(sample_loans / all_loans, 4),
        'sample_coverage_of_system_credit': round(sample_loans / 1e9 / credit_latest[1], 4),
        'system_credit_ref': {'date': credit_latest[0], 'value_bn': credit_latest[1], 'note': 'Tín dụng hệ thống tháng 7/2026 (T7) khác mốc với BCTC bank cuối T6/2026 — chỉ dùng để nêu độ phủ, không ngoại suy cùng kỳ.'},
        'sample_share': round(re_loans / sample_loans, 5), 'sample_re_loans_bn': round(re_loans / 1e9),
        'extrapolation': None,
        'extrapolation_note': 'Không ngoại suy ra hệ thống vì mốc thời gian khác (T6 vs T7) và giả định đại diện chưa kiểm; analyst có thể tự nhân tỷ trọng mẫu với tín dụng hệ thống cùng mốc khi có số T6.',
    }
    return {
        'property_proxy': proxy,
        'source_ids': ['macro:19:' + str(s['id']) for s in raw['series'].values()] + ['companies:ratio_bank:pct_loans_*'],
        'source_tables': 'Wi bảng 19 (SBV, tháng) + ratio_bank (thuyết minh quý từng bank)',
        'publication_frequency': 'Vĩ mô: trễ 1-3 tháng không cố định; bank: theo kỳ công bố BCTC quý',
        'observation_frequency': 'monthly (vĩ mô) / quarterly (bank)', 'latest_observation': dates[0],
        'bank_period': '2026Q2', 'unit': {'value': 'tỷ VND', 'yoy': '%', 'share': '% tổng tín dụng', 'bank_pct': 'phân số % dư nợ KH'},
        'hierarchy_note': raw['hierarchy_note'],
        'data': {'sectors': sectors, 'banks': bank_rows, 'bank_disclosure_count': len(disclosed), 'bank_sample': len(bank_rows)},
    }


def block_bonds(today):
    iss = load('cbond_bank_issuances_2026.json'); bb = load('cbond_bank_buybacks_2026.json')
    irows = rows_to_dicts(iss['columns'], iss['rows']); brows = rows_to_dicts(bb['columns'], bb['rows'])
    check_dates([[r['issuance_start_date'], r['actual_issuance_value']] for r in irows][:0], today, 'iss')
    for r in irows:
        if r['issuance_start_date'] > today: raise RawError('future issuance')
    for r in brows:
        if r['execute_date'] > today: raise RawError('future buyback')
    monthly = defaultdict(lambda: {'issued': 0.0, 'planned': 0.0, 'count': 0, 'buyback': 0.0, 'buyback_count': 0, 'rate_w': 0.0})
    per_bank = defaultdict(lambda: {'issued': 0.0, 'count': 0, 'rate_w': 0.0})
    for r in irows:
        m = r['issuance_start_date'][:7]
        v = r['actual_issuance_value'] or 0
        monthly[m]['issued'] += v; monthly[m]['planned'] += r['issuance_value'] or 0; monthly[m]['count'] += 1
        if r['issuance_interest_rate']: monthly[m]['rate_w'] += v * r['issuance_interest_rate']
        pb = per_bank[r['symbol']]; pb['issued'] += v; pb['count'] += 1
        if r['issuance_interest_rate']: pb['rate_w'] += v * r['issuance_interest_rate']
    for r in brows:
        m = r['execute_date'][:7]; monthly[m]['buyback'] += r['buyback_value'] or 0; monthly[m]['buyback_count'] += 1
    months = []
    for m in sorted(monthly):
        x = monthly[m]
        months.append({'month': m, 'issued_bn': round(x['issued'] / 1e9, 1), 'planned_bn': round(x['planned'] / 1e9, 1),
                       'issue_count': x['count'], 'buyback_bn': round(x['buyback'] / 1e9, 1), 'buyback_count': x['buyback_count'],
                       'net_bn': round((x['issued'] - x['buyback']) / 1e9, 1),
                       'avg_coupon_w': round(x['rate_w'] / x['issued'], 2) if x['issued'] else None})
    banks = sorted([{'symbol': k, 'issued_bn': round(v['issued'] / 1e9, 1), 'count': v['count'],
                     'avg_coupon_w': round(v['rate_w'] / v['issued'], 2) if v['issued'] else None} for k, v in per_bank.items()],
                   key=lambda r: -r['issued_bn'])
    return {
        'source_ids': ['cbond:bonds_corp_issuances', 'cbond:bonds_corp_early_buyback'],
        'source_tables': 'HNX qua Wi — phát hành và mua lại trước hạn TPDN của bank niêm yết', 'publication_frequency': 'Theo sự kiện (CBTT HNX)',
        'observation_frequency': 'event', 'latest_observation': max(irows[0]['issuance_start_date'], brows[0]['execute_date']),
        'unit': {'value': 'tỷ VND (quy đổi từ VND thô ÷1e9)', 'coupon': '%/năm, bình quân gia quyền theo giá trị phát hành thực'},
        'derived': 'Tổng theo tháng và theo bank do dashboard cộng từ từng đợt (rule-based). Ròng = phát hành thực − mua lại trước hạn; chưa trừ gốc đáo hạn tự nhiên (không có trong hai bảng này).',
        'data': {'months': months, 'banks': banks, 'issuance_count': len(irows), 'buyback_count': len(brows),
                 'latest_issuances': irows[:12]},
    }


def block_other_funding(today):
    sec = load('sector_fs_bank_107_q.json'); notes = load('fs_bank_notes_2026q2_aq.json'); fs = load('fs_bank_2026q2_core.json')
    srows = rows_to_dicts(sec['columns'], sec['rows'])
    nrows = {r['symbol']: r for r in rows_to_dicts(notes['columns'], notes['rows'])}
    frows = {r['symbol']: r for r in rows_to_dicts(fs['columns'], fs['rows'])}
    quarters = [{'period': q_key(r['period_year'], r['period_quarter']), 'valuable_papers_bn': round(r['bs360'] / 1e9, 1),
                 'kbnn_deposits_bn': round(r['fnx107'] / 1e9, 1)} for r in sorted(srows, key=lambda r: (r['period_year'], r['period_quarter']))]
    banks = []
    for s in UNIVERSE:
        f = frows.get(s, {}); n = nrows.get(s, {})
        banks.append({'symbol': s, 'valuable_papers_bn': round(f['bs360'] / 1e9, 1) if f.get('bs360') is not None else None,
                      'kbnn_deposits_bn': round(n['fnx107'] / 1e9, 1) if n.get('fnx107') is not None else None,
                      'kbnn_disclosed': n.get('fnx107') is not None})
    return {
        'source_ids': ['sector:sector_fs_bank:bs360', 'sector:sector_fs_bank:fnx107', 'companies:fs_bank:bs360', 'companies:fs_bank_notes:fnx107'],
        'source_tables': 'Wi sector_fs_bank (tổng ngành) + fs_bank/fs_bank_notes (từng bank), hợp nhất',
        'publication_frequency': 'Theo kỳ công bố BCTC quý', 'observation_frequency': 'quarterly', 'latest_observation': '2026Q2',
        'unit': 'tỷ VND (điểm cuối quý)', 'data': {'sector_quarters': quarters, 'banks': banks},
    }


def block_services(today):
    idx = load('index_ratio_daily_vnindex.json'); act = load('macro_vn_activity.json')
    rows = rows_to_dicts(idx['columns'], idx['rows'])
    pts = asc([[r['trading_date'], r['pe']] for r in rows]); check_dates(pts, today, 'vnindex_pe')
    s = act['series']
    out = {'vnindex': sorted(rows, key=lambda r: r['trading_date']),
           'exports_m': asc(s['exports_m']['values']), 'imports_m': asc(s['imports_m']['values']),
           'exports_m_yoy': asc(s['exports_m_yoy']['values']), 'imports_m_yoy': asc(s['imports_m_yoy']['values']),
           'trade_balance_m': asc(s['trade_balance_m']['values'])}
    return {
        'source_ids': ['stock_market:index_ratio_daily:index_id=10', 'macro:37:83479', 'macro:36:92728', 'macro:35:255693'],
        'source_tables': 'Wi index_ratio_daily (VNINDEX) + Tổng cục Hải quan qua Wi (bảng 35/36/37)',
        'publication_frequency': 'VNINDEX: cuối mỗi phiên; XNK: hai tuần đầu mỗi tháng', 'observation_frequency': 'daily / monthly',
        'latest_observation': out['vnindex'][-1]['trading_date'],
        'unit': {'pe_pb': 'lần', 'market_cap': 'VND', 'trade': 'triệu USD', 'yoy': '%'},
        'gap_note': idx['source'], 'data': out,
    }


def block_deposit_rates(today):
    g = load('macro_deposit_rates_groups.json'); b = load('macro_deposit_rates_banks_12m.json')
    dates = g['dates']
    monthly = {}
    for k, s in g['monthly'].items():
        pts = asc(list(zip(dates, s['values']))); check_dates(pts, today, k); monthly[k] = {'id': s['id'], 'points': pts}
    daily = g['daily_12m_latest']
    banks = [{'symbol': r[0], 'name': r[1], 'indicator_id': r[2], 'rate_12m': r[3]} for r in b['rows']]
    return {
        'source_ids': ['macro:42/43/44 (nhóm, monthly ' + ','.join(str(s['id']) for s in g['monthly'].values()) + ')',
                       'macro:42 daily 202886,202874,202880', 'macro:46 (từng bank 12T, 35 ID)'],
        'source_tables': 'Wi bảng 42/43/44 (nhóm; Các ngân hàng và WiGroup tính toán) + bảng 46 (từng NHTM)',
        'publication_frequency': 'Hằng ngày (metadata Wi); bản tháng = bình quân tháng', 'observation_frequency': 'daily',
        'latest_observation': b['observation_date'], 'unit': '%/năm', 'group_def': g['group_def'],
        'policy_rates': g['policy_rates_latest'],
        'data': {'monthly': monthly, 'daily_12m_latest': daily, 'banks_12m': banks, 'monthly_latest_full_month': dates[0]},
    }


def block_money_market(today):
    raw = load('macro_money_market_daily.json'); g = load('macro_deposit_rates_groups.json')
    out = {}
    for k in ['ib_on', 'ib_1w', 'ib_2w', 'ib_1m']:
        pts = asc(raw['series'][k]['values']); check_dates(pts, today, k); out[k] = {'id': raw['series'][k]['id'], 'points': pts}
    return {
        'source_ids': ['macro:53:82237', 'macro:53:82238', 'macro:53:82239', 'macro:53:82240', 'macro:14:81497', 'macro:11:81496', 'macro:12:81498'],
        'source_tables': 'Wi bảng 53 Liên ngân hàng: Lãi suất (SBV) + bảng 14/11/12 lãi suất điều hành (SBV)',
        'publication_frequency': 'Hằng ngày (metadata Wi); lãi suất điều hành đổi theo quyết định', 'observation_frequency': 'daily',
        'latest_observation': out['ib_on']['points'][-1][0], 'unit': '%/năm',
        'data': {**out, 'policy_rates': g['policy_rates_latest']},
    }


def block_bank_ratios(today):
    ttm = load('ratio_bank_ttm_2026q2.json'); com = load('ratio_common_ttm_2026q2.json'); sec = load('sector_ratio_bank_107.json')
    core = load('ratio_bank_ttm_core11_8q.json')
    roe = {r['symbol']: r for r in com['data']}
    banks = []
    for r in ttm['data']:
        c = roe.get(r['symbol'], {})
        banks.append({'symbol': r['symbol'], 'nim': r['nim'], 'cir': r['cir'], 'casa': r['casa_ratio'], 'npl': r['npl_ratio'],
                      'group2': r['group2_loan_ratio'], 'coverage': r['npl_coverage_ratio'], 'cof': r['cof'], 'yea': r['yea'],
                      'spread': r['earning_spread'], 'ldr': r['ldr'], 'credit_yoy': r['credit_growth_yoy'],
                      'funding_yoy': r['customer_funding_growth_yoy'], 'roe': c.get('roe'), 'roa': c.get('roa')})
    if len(banks) != 27: raise RawError('expected 27 banks')
    sector_ttm = [{**r, 'period': q_key(r['period_year'], r['period_quarter'])} for r in sorted(sec['ttm'], key=lambda r: (r['period_year'], r['period_quarter']))]
    sector_q = [{**r, 'period': q_key(r['period_year'], r['period_quarter'])} for r in sorted(sec['quarterly'], key=lambda r: (r['period_year'], r['period_quarter']))]
    core_rows = rows_to_dicts(core['columns'], core['rows'])
    series = defaultdict(list)
    for r in sorted(core_rows, key=lambda r: (r['year'], r['quarter'])):
        series[r['symbol']].append({'period': q_key(r['year'], r['quarter']), **{k: r[k] for k in core['columns'][3:]}})
    return {
        'source_ids': ['companies:ratio_bank_ttm', 'companies:ratio_common_ttm', 'sector:sector_ratio_bank:sector_id=107'],
        'source_tables': 'Wi ratio_bank_ttm + ratio_common_ttm (từng bank, TTM hợp nhất) và sector_ratio_bank (tổng hợp ngành)',
        'publication_frequency': 'Theo kỳ công bố BCTC quý (Wi cập nhật sau khi bank công bố)', 'observation_frequency': 'quarterly',
        'latest_observation': '2026Q2', 'unit': 'phân số (0.03 = 3%); TTM = 4 quý gần nhất; ngành = tổng hợp Wi, không bình quân đơn giản',
        'annualization_note': 'NIM/ROE/ROA/CIR hiển thị bản TTM. Bản quý (chưa annualize) của ngành: NIM Q2/2026 = 0.77% — không so trực tiếp với TTM.',
        'data': {'banks': banks, 'sector_ttm': sector_ttm, 'sector_quarterly': sector_q, 'core11_ttm_series': series},
    }


def block_yield_funding(today):
    br = block_bank_ratios(today)
    rows = [{'symbol': b['symbol'], 'yea': b['yea'], 'cof': b['cof'], 'spread': b['spread'], 'nim': b['nim']} for b in br['data']['banks']]
    return {
        'source_ids': ['companies:ratio_bank_ttm:yea,cof,earning_spread'], 'source_tables': 'Wi ratio_bank_ttm (YEA = lợi suất tài sản sinh lãi, COF = chi phí vốn; định nghĩa Wi)',
        'publication_frequency': br['publication_frequency'], 'observation_frequency': 'quarterly', 'latest_observation': '2026Q2',
        'unit': 'phân số, TTM', 'definition_note': 'YEA/COF của Wi dùng tài sản sinh lãi và nợ phải trả lãi bình quân — không phải Yield on Loans theo dư nợ cho vay; chênh lệch YEA−COF ≠ NIM vì mẫu số khác nhau.',
        'data': {'banks': rows, 'sector_ttm': [{'period': q_key(r['period_year'], r['period_quarter']), 'yea': r['yea'], 'cof': r['cof'], 'nim': r['nim']} for r in br['data']['sector_ttm']],
                 'core11': {k: [{'period': x['period'], 'yea': x['yea'], 'cof': x['cof'], 'nim': x['nim']} for x in v] for k, v in br['data']['core11_ttm_series'].items()}},
    }


def block_income(today):
    mix = load('ratio_bank_q_2026q2_mix.json'); fs = load('fs_bank_2026q2_core.json')
    rows = rows_to_dicts(mix['columns'], mix['rows']); f = {r['symbol']: r for r in rows_to_dicts(fs['columns'], fs['rows'])}
    keys = ['pct_net_interest_income', 'pct_net_service_income', 'pct_payment_services_income', 'pct_insurance_income', 'pct_securities_services_income',
            'pct_fx_gold_income', 'pct_investment_securities_income', 'pct_trading_securities_income', 'pct_other_income', 'pct_equity_investment_income', 'pct_provision_expense']
    banks = [{'symbol': r['symbol'], **{k: r[k] for k in keys}, 'toi_bn': round(f[r['symbol']]['isx08'] / 1e9, 1), 'nii_bn': round(f[r['symbol']]['is20'] / 1e9, 1)} for r in rows]
    return {
        'source_ids': ['companies:ratio_bank:pct_*_income', 'companies:fs_bank:isx08,is20'],
        'source_tables': 'Wi ratio_bank (cơ cấu % tổng thu nhập hoạt động, quý) + fs_bank (TOI, NII quý)',
        'publication_frequency': 'Theo kỳ công bố BCTC quý', 'observation_frequency': 'quarterly', 'latest_observation': '2026Q2',
        'unit': 'phân số của tổng thu nhập hoạt động quý 2/2026; tỷ VND cho TOI/NII',
        'definition_note': 'pct_net_service_income = lãi thuần dịch vụ / TOI (NFI theo nghĩa net fee). Thanh toán/bảo hiểm/chứng khoán là phần bóc tách trong thuyết minh — null = bank không tách. pct_fx/CKĐT/CKKD/khác là thu ngoài lãi không phải phí.',
        'data': {'banks': banks},
    }


def block_asset_quality(today):
    sec = load('sector_fs_bank_107_q.json'); notes = load('fs_bank_notes_2026q2_aq.json'); st = load('ratio_bank_q_2026q2_structure.json'); ttm = load('ratio_bank_ttm_2026q2.json')
    srows = rows_to_dicts(sec['columns'], sec['rows'])
    quarters = []
    for r in sorted(srows, key=lambda r: (r['period_year'], r['period_quarter'])):
        total = r['fnx26'] + r['fnx27'] + r['fnx28'] + r['fnx29'] + r['fnx30']
        npl = r['fnx28'] + r['fnx29'] + r['fnx30']
        quarters.append({'period': q_key(r['period_year'], r['period_quarter']), 'g1_bn': round(r['fnx26'] / 1e9), 'g2_bn': round(r['fnx27'] / 1e9),
                         'g3_bn': round(r['fnx28'] / 1e9), 'g4_bn': round(r['fnx29'] / 1e9), 'g5_bn': round(r['fnx30'] / 1e9),
                         'npl_bn': round(npl / 1e9), 'vamc_bn': round(r['fnx100'] / 1e9, 1), 'provision_expense_bn': round(-r['fnx206'] / 1e9, 1),
                         'npl_share_of_classified': round(npl / total, 5), 'g2_share_of_classified': round(r['fnx27'] / total, 5)})
    n = {r['symbol']: r for r in rows_to_dicts(notes['columns'], notes['rows'])}
    s = {r['symbol']: r for r in rows_to_dicts(st['columns'], st['rows'])}
    t = {r['symbol']: r for r in ttm['data']}
    banks = []
    for sym in UNIVERSE:
        a, b, c = n[sym], s[sym], t[sym]
        banks.append({'symbol': sym, 'g1_bn': round(a['fnx26'] / 1e9, 1), 'g2_bn': round(a['fnx27'] / 1e9, 1), 'g3_bn': round(a['fnx28'] / 1e9, 1),
                      'g4_bn': round(a['fnx29'] / 1e9, 1), 'g5_bn': round(a['fnx30'] / 1e9, 1), 'vamc_bn': round(a['fnx100'] / 1e9, 1) if a['fnx100'] is not None else None,
                      'provision_expense_q_bn': round(-a['fnx206'] / 1e9, 1), 'npl_ratio': c['npl_ratio'], 'group2_ratio': c['group2_loan_ratio'],
                      'coverage': c['npl_coverage_ratio'], 'new_npl_formation_ratio': b['new_npl_formation_ratio'],
                      'accrued_interest_to_assets': b['accrued_interest_to_total_assets']})
    return {
        'source_ids': ['sector:sector_fs_bank:fnx26-30,fnx100,fnx206', 'companies:fs_bank_notes:fnx26-30,fnx100,fnx206', 'companies:ratio_bank_ttm:npl_ratio,group2,coverage', 'companies:ratio_bank:new_npl_formation_ratio'],
        'source_tables': 'Wi sector_fs_bank (tổng ngành cùng mẫu) + fs_bank_notes (từng bank) + ratio_bank/ratio_bank_ttm (tỷ lệ Wi)',
        'publication_frequency': 'Theo kỳ công bố BCTC quý', 'observation_frequency': 'quarterly', 'latest_observation': '2026Q2',
        'unit': 'tỷ VND (điểm cuối quý; dự phòng = phát sinh trong quý); tỷ lệ = phân số',
        'derived_note': 'npl_share_of_classified và g2_share ngành = tổng nhóm 3–5 (hoặc nhóm 2) / tổng nợ phân loại nhóm 1–5 cùng mẫu Wi (rule-based); tỷ lệ NPL chính thức của ngành lấy ở block bank-ratios (sector_ratio_bank). Dự phòng TP VAMC (fnx213) gây lỗi 500 phía Wi ở cấp ngành, chưa có.',
        'data': {'sector_quarters': quarters, 'banks': banks},
    }


def block_repricing(today):
    st = load('ratio_bank_q_2026q2_structure.json')
    rows = rows_to_dicts(st['columns'], st['rows'])
    banks = []
    for r in rows:
        gap = r['interest_rate_gap']; ea = r['earning_assets']
        banks.append({'symbol': r['symbol'], 'gap_bn': round(gap / 1e9, 1) if gap is not None else None,
                      'rsa_bn': round(r['rate_sensitive_assets'] / 1e9, 1) if r['rate_sensitive_assets'] is not None else None,
                      'rsl_bn': round(r['rate_sensitive_liabilities'] / 1e9, 1) if r['rate_sensitive_liabilities'] is not None else None,
                      'gap_to_earning_assets': round(gap / ea, 5) if gap is not None and ea else None,
                      'htm_pct': r['pct_htm_securities'], 'afs_pct': r['pct_afs_securities'], 'trading_pct': r['pct_net_trading_securities'],
                      'investment_pct': r['pct_investment_securities'], 'net_loans_pct': r['pct_net_customer_loans']})
    return {
        'source_ids': ['companies:ratio_bank:interest_rate_gap,rate_sensitive_assets,rate_sensitive_liabilities,pct_htm/afs/trading'],
        'source_tables': 'Wi ratio_bank (quý, hợp nhất) — khe hở lãi suất tổng (không tách bucket) và tỷ trọng danh mục đầu tư',
        'publication_frequency': 'Theo kỳ công bố BCTC quý', 'observation_frequency': 'quarterly', 'latest_observation': '2026Q2',
        'unit': 'tỷ VND; tỷ trọng = phân số tổng tài sản',
        'limitation': 'Wi chỉ cung cấp IR gap tổng (RSA − RSL), không theo từng bucket tái định giá; NVB, SHB, SSB không có số. gap/EA là phép chia của dashboard.',
        'data': {'banks': banks},
    }


def block_omo(today):
    raw = load('macro_money_market_daily.json')
    net = asc(raw['series']['omo_net']['values']); out = asc(raw['series']['omo_outstanding']['values'])
    check_dates(net, today, 'omo_net'); check_dates(out, today, 'omo_out')
    # rule-based: rolling 5-session net
    roll = [[net[i][0], round(sum(v for _, v in net[max(0, i - 4):i + 1]), 2)] for i in range(len(net))]
    return {
        'source_ids': ['macro:72:82268', 'macro:72:82269'], 'source_tables': 'Wi bảng 72 Thị trường mở: Bơm hút ròng (SBV)',
        'publication_frequency': 'Hằng ngày (metadata Wi)', 'observation_frequency': 'daily', 'latest_observation': net[-1][0],
        'unit': 'tỷ VND', 'sign_note': raw['sign_note'],
        'data': {'net': net, 'outstanding': out, 'net_5d_sum': roll},
    }


def block_fx(today):
    raw = load('macro_fx_daily.json')
    out = {}
    for k, s in raw['series'].items():
        pts = asc(s['values']); check_dates(pts, today, k); out[k] = {'id': s['id'], 'name': s['name'], 'points': pts}
    jpyusd = [[d, round(1 / v, 6)] for d, v in out['usdjpy']['points'] if v]
    out['jpyusd_derived'] = {'derived': 'JPYUSD = 1 / USDJPY (USD cho 1 JPY), tính từ chuỗi 235036', 'points': jpyusd}
    vcb_spread = [[d, v - dict(out['vcb_buy']['points'])[d]] for d, v in out['vcb_sell']['points'] if d in dict(out['vcb_buy']['points'])]
    out['vcb_bid_ask_spread'] = {'derived': 'VCB bán − VCB mua (tiền mặt), cùng ngày', 'points': vcb_spread}
    return {
        'source_ids': ['macro:78:82222', 'macro:78:82223', 'macro:77:82227', 'macro:79:82225', 'macro:79:82226', 'macro:297:235028', 'macro:297:235036'],
        'source_tables': 'Wi bảng 78 (VCB), 77 (NHNN trung tâm), 79 (tự do, WiGroup tổng hợp), 297 (DXY futures, USD/JPY)',
        'publication_frequency': 'Hằng ngày (metadata Wi)', 'observation_frequency': 'daily', 'latest_observation': out['vcb_sell']['points'][-1][0],
        'timestamp_note': raw['timestamp_note'] + ' Cập nhật phía Wi: ' + json.dumps(raw['provider_last_updated'], ensure_ascii=False),
        'unit': raw['unit'], 'data': out,
    }


def block_bonds_macro(today):
    yc = load('gbond_yield_curve_daily.json'); pa = load('gbond_primary_auctions.json')
    out = {}
    for k, s in yc['series'].items():
        pts = asc(s['values']); check_dates(pts, today, k); out[k] = {'id': s['id'], 'points': pts}
    auctions = rows_to_dicts(pa['columns'], pa['rows'])
    by_date = defaultdict(lambda: {'offered': 0, 'bid': 0, 'won': 0})
    for a in auctions:
        x = by_date[a['auction_date']]; x['offered'] += a['bid_invitation_value']; x['bid'] += a['total_bid_value']; x['won'] += a['winning_bid_value']
    sessions = [{'date': d, **v, 'award_ratio': round(v['won'] / v['offered'] * 100, 1) if v['offered'] else None} for d, v in sorted(by_date.items())]
    return {
        'source_ids': ['gbond:bonds_gov_yield_curve:234528,234530,234531,234526,234529,234521,234522', 'gbond:bonds_gov_primary'],
        'source_tables': 'WiGroup tổng hợp lợi suất TPCP kỳ hạn cố định 17 nước + HNX đấu thầu sơ cấp',
        'publication_frequency': 'Lợi suất: hằng ngày; đấu thầu: theo phiên (thường thứ Tư)', 'observation_frequency': 'daily / event',
        'latest_observation': out['vn_10y']['points'][-1][0], 'unit': {'yield': '%/năm', 'auction': 'tỷ VND; award_ratio %'},
        'derived': 'Tổng theo phiên (offered/bid/won) do dashboard cộng các kỳ hạn cùng ngày; award_ratio = trúng/gọi thầu.',
        'data': {**out, 'auctions': auctions, 'sessions': sessions},
    }


def block_macro(today):
    raw = load('macro_vn_activity.json')
    out = {}
    for k, s in raw['series'].items():
        pts = asc(s['values']); check_dates(pts, today, k); out[k] = {'id': s['id'], 'points': pts}
    return {
        'source_ids': ['macro:34:80042,80126', 'macro:30:76951,76887,76903,76911', 'macro:83:76847,76717,76751,76767', 'macro:4:82324,82348', 'macro:3:75494,75520', 'macro:37:83479,82926', 'macro:36:92728,92108', 'macro:35:255693,234275'],
        'source_tables': json.dumps(raw['tables'], ensure_ascii=False), 'publication_frequency': 'Theo bảng: GSO ngày 3/6 tháng sau; MOF trễ 1-2 tháng; Hải quan hai tuần đầu tháng',
        'observation_frequency': 'quarterly / monthly / ytd', 'latest_observation': out['exports_m']['points'][-1][0], 'unit': raw['unit'], 'data': out,
    }


def block_forecast(today):
    a = load('macro_forecast_rates_credit.json'); b = load('macro_forecast_gdp_fx.json')
    rows = rows_to_dicts(a['columns'], a['rows']) + rows_to_dicts(b['columns'], b['rows'])
    for r in rows:
        r['is_target'] = bool(r['scenario']) and any(w in r['scenario'] for w in ('Mục tiêu', 'Định hướng', 'Yêu cầu'))
    latest_release = max(r['release_date'] for r in rows)
    grouped = defaultdict(list)
    for r in sorted(rows, key=lambda r: r['release_date'], reverse=True):
        grouped[r['indicator_code']].append(r)
    return {
        'source_ids': ['macro_forecast:RATE_DEPOSIT_12M,RATE_REFINANCE,RATE_POLICY,CREDIT_GROWTH_YOY,GDP_REAL_YOY,FX_USDVND (geo VNM, measure=forecast)'],
        'source_tables': 'Wi macro_forecast — dự báo của CTCK/ngân hàng/IMF/WB/ADB/OECD; đã lọc measure=forecast',
        'publication_frequency': 'Theo ngày phát hành báo cáo của từng tổ chức', 'observation_frequency': 'event', 'latest_observation': latest_release,
        'unit': 'theo cột unit từng dòng', 'target_note': 'Dòng is_target=true là chỉ tiêu định hướng/mục tiêu/tính ngược, không phải dự báo của tổ chức (Wi cảnh báo).',
        'data': {'by_indicator': grouped, 'count': len(rows), 'page_note': b['meta']['note']},
    }


def block_news(today):
    raw = load('news_bank_20260901_11.json')
    ex = [{'published': r[0], 'symbol': r[1], 'category': r[2], 'title': r[3], 'url': r[4]} for r in raw['exchange_news']]
    ai = [{'date': r[0], 'title': r[1], 'summary': r[2]} for r in raw['ai_news']]
    return {
        'source_ids': ['news:exchange_news (16 mã bank, 01–11/09/2026)', 'news:ai_news (Vĩ mô Việt Nam)'],
        'source_tables': 'Wi wifeed_news: CBTT HOSE (PDF gốc) + news alert tự động của Wi', 'publication_frequency': 'Theo sự kiện',
        'observation_frequency': 'event', 'latest_observation': ex[0]['published'][:10], 'unit': 'sự kiện', 'note': raw['note'],
        'data': {'exchange_news': ex, 'ai_news': ai, 'exchange_total_count': raw['requests'][0]['meta']['total_count']},
    }


def block_valuation(today):
    rd = load('ratio_daily_banks_20260910_11.json'); sec = load('sector_ratio_daily_107.json'); com = load('ratio_common_ttm_2026q2.json')
    completed = '2026-09-10'
    rows = [r for r in rd['data'] if r['trading_date'] == completed]
    if len(rows) != 27: raise RawError('valuation: expected 27 banks on completed session')
    roe = {r['symbol']: r['roe'] for r in com['data']}
    banks = [{'symbol': r['symbol'], 'pe': r['pe'], 'pb': r['pb'], 'eps': r['eps'], 'bvps': r['bvps'], 'market_cap': r['market_cap'], 'roe_ttm': roe.get(r['symbol'])} for r in rows]
    srows = rows_to_dicts(sec['columns'], sec['rows'])
    spts = sorted([[r['trading_date'], r['pe'], r['pb'], r['market_cap']] for r in srows], key=lambda x: x[0])
    check_dates([[p[0], p[1]] for p in spts], today, 'sector_pe')
    return {
        'source_ids': ['companies:ratio_daily (27 bank, trading_date=2026-09-10)', 'sector:sector_ratio_daily:sector_id=107', 'companies:ratio_common_ttm:roe'],
        'source_tables': 'Wi ratio_daily (định giá theo giá đóng cửa ngày) + sector_ratio_daily (ngành 107) + ROE TTM Q2/2026',
        'publication_frequency': 'Cuối mỗi phiên giao dịch', 'observation_frequency': 'daily', 'latest_observation': completed,
        'price_date': completed, 'fs_period': '2026Q2 (EPS/BVPS trailing theo Wi)', 'unit': 'lần; VND',
        'date_note': 'Dòng 2026-09-11 trong raw là trong phiên nên không dùng; dashboard lấy phiên hoàn tất 2026-09-10. Agribank không niêm yết.',
        'data': {'banks': banks, 'sector_daily': spts},
    }


BUILDERS = {
    'funding': block_funding, 'credit': block_credit, 'credit-sectors': block_credit_sectors, 'bonds': block_bonds,
    'other-funding': block_other_funding, 'services-demand': block_services, 'deposit-rates': block_deposit_rates,
    'money-market': block_money_market, 'bank-ratios': block_bank_ratios, 'yield-funding': block_yield_funding,
    'income': block_income, 'asset-quality': block_asset_quality, 'repricing': block_repricing, 'omo': block_omo,
    'fx': block_fx, 'bonds-macro': block_bonds_macro, 'macro': block_macro, 'forecast': block_forecast, 'news': block_news,
    'valuation': block_valuation,
}


def atomic(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=path.parent, prefix='.wi-')
    try:
        with os.fdopen(fd, 'w') as f:
            f.write(text); f.flush(); os.fsync(f.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp): os.unlink(temp)


def main():
    global RAW
    cli = argparse.ArgumentParser()
    cli.add_argument('--output-dir', type=Path, default=ROOT / 'data')
    cli.add_argument('--raw-dir', type=Path, default=RAW)
    cli.add_argument('--today', default=dt.date.today().isoformat())
    cli.add_argument('--checked-at', default=None, help='ISO timestamp of the Wi session that produced the raw files')
    args = cli.parse_args()
    RAW = args.raw_dir
    out_path = args.output_dir / 'bank-wi-data.js'
    previous = {}
    if out_path.exists():
        previous = json.loads(out_path.read_text()[len(PREFIX):].strip().removesuffix(';'))
    checked = args.checked_at or dt.datetime.now(dt.timezone.utc).isoformat()
    blocks, status = {}, {}
    for block_id, fn in BUILDERS.items():
        try:
            b = fn(args.today)
            b['status'] = 'loaded'; b['last_checked_at'] = checked; b['last_success_at'] = checked
            b['data_hash'] = digest(b['data']); b['error'] = None
            blocks[block_id] = b
            status[block_id] = {'status': 'loaded', 'latest_observation': b['latest_observation'], 'data_hash': b['data_hash']}
        except Exception as exc:  # keep last-good, report
            old = (previous.get('blocks') or {}).get(block_id)
            if old:
                old = dict(old); old['status'] = 'error'; old['error'] = str(exc); old['last_checked_at'] = checked
                blocks[block_id] = old
            status[block_id] = {'status': 'error', 'error': str(exc), 'kept_last_good': bool(old)}
    bundle = {'schema_version': 1, 'provider': 'MCP Wi (WiGroup) via claude.ai connector', 'access_note':
              'Dữ liệu do agent lấy qua MCP Wi trong phiên và lưu raw tại data/raw/wi; không có job mạng tự động cho Wi. Chạy lại: python3 scripts/build_bank_wi.py sau khi cập nhật raw theo data/bank-wi-contract.json.',
              'built_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'checked_at': checked, 'blocks': blocks,
              'universe': UNIVERSE, 'core11': CORE11}
    atomic(out_path, PREFIX + json.dumps(bundle, ensure_ascii=False, separators=(',', ':')) + ';\n')
    atomic(args.output_dir / 'bank-wi-status.json', json.dumps({'checked_at': checked, 'blocks': status}, ensure_ascii=False, indent=2))
    errors = [k for k, v in status.items() if v['status'] == 'error']
    print(json.dumps({'loaded': len(blocks) - len(errors), 'errors': errors}, ensure_ascii=False))
    return 1 if errors else 0


if __name__ == '__main__':
    raise SystemExit(main())
