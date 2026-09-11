/* Wi block renderer for Bank/index.html. Runs after bank-dashboard.js (cards exist) and
   before dashboard-ui.js (which moves .chart-insight into info panels).
   Reads window.BANK_WI_DATA (built by scripts/build_bank_wi.py). Every visible number keeps
   its Wi period; derived values are labelled rule-based. Analyst notes are never touched. */
(() => {
  'use strict';
  const W = window.BANK_WI_DATA;
  const content = window.BANK_CONTENT;
  if (!W || !W.blocks) return;
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const vi = (v, d = 2) => Number.isFinite(v) ? v.toLocaleString('vi-VN', {minimumFractionDigits: d, maximumFractionDigits: d}) : '—';
  const pct = (v, d = 2) => Number.isFinite(v) ? vi(v * 100, d) + '%' : '—';
  const int = v => Number.isFinite(v) ? Math.round(v).toLocaleString('vi-VN') : '—';
  const dmy = s => s ? (s.length === 7 ? 'T' + Number(s.slice(5, 7)) + '/' + s.slice(0, 4) : /^\d{4}Q\d$/.test(s) ? 'Q' + s[5] + '/' + s.slice(0, 4) : new Date(s.slice(0, 10)).toLocaleDateString('vi-VN')) : '—';
  const checked = dmy(W.checked_at?.slice(0, 10));
  const WI = 'https://wifeed.vn/';
  const C = ['#167b79', '#426cba', '#ad724d', '#7862a4', '#c2565b', '#5f8f3e', '#8a8f99'];
  const AI_DATE = '11/09/2026';

  // ---------- tooltip (shared with bank-dashboard's style) ----------
  const tip = document.createElement('div'); tip.className = 'chart-tooltip'; tip.hidden = true; document.body.append(tip);
  function wireTips(host) {
    host.querySelectorAll('[data-tip]').forEach(el => {
      const show = () => { const r = el.getBoundingClientRect(); tip.textContent = el.dataset.tip; tip.hidden = false; tip.style.left = Math.max(8, Math.min(r.x, innerWidth - tip.offsetWidth - 8)) + 'px'; tip.style.top = Math.max(8, r.y - tip.offsetHeight - 9) + 'px'; };
      const hide = () => tip.hidden = true;
      el.addEventListener('mouseenter', show); el.addEventListener('focus', show); el.addEventListener('click', show); el.addEventListener('mouseleave', hide); el.addEventListener('blur', hide);
    });
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') tip.hidden = true; });
  document.addEventListener('pointerdown', e => { if (!e.target.closest('[data-tip]')) tip.hidden = true; });
  window.addEventListener('scroll', () => tip.hidden = true, true);

  // ---------- generic SVG charts ----------
  // series: [{label,color,points:[[x,y],...]}]; all points share x category order (dates sorted asc).
  function lineChart(opts) {
    const {series, unit = '', fmt = v => vi(v), zero = false, height = 240, labelEvery, monthly = false} = opts;
    const xs = [...new Set(series.flatMap(s => s.points.map(p => p[0])))].sort();
    if (!xs.length) return '<div class="gap-empty">Không có dữ liệu hợp lệ.</div>';
    const Wd = innerWidth < 700 ? 340 : 580, H = height, L = 56, R = 16, T = 18, B = 34;
    const vals = series.flatMap(s => s.points.map(p => p[1])).filter(Number.isFinite);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (zero) { min = Math.min(0, min); max = Math.max(0, max); }
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.08; min -= pad; max += pad;
    const xi = new Map(xs.map((x, i) => [x, i]));
    const X = i => L + (Wd - L - R) * (xs.length === 1 ? .5 : i / (xs.length - 1));
    const Y = v => T + (H - T - B) * (max - v) / (max - min);
    let svg = `<svg viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(opts.aria || 'Biểu đồ')}">`;
    for (let i = 0; i <= 4; i++) { const v = min + (max - min) * i / 4; svg += `<path d="M${L} ${Y(v)}H${Wd - R}" stroke="#d9e1ed"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${fmt(v)}</text>`; }
    if (zero && min < 0 && max > 0) svg += `<path d="M${L} ${Y(0)}H${Wd - R}" stroke="#8a95a3" stroke-dasharray="3 3"/>`;
    const step = labelEvery || Math.max(1, Math.ceil(xs.length / (innerWidth < 700 ? 4 : 7)));
    const lastLbl = xs.length - 1, skipNear = lastLbl % step !== 0 && lastLbl % step < step / 2 ? lastLbl - lastLbl % step : -1;
    xs.forEach((x, i) => { if ((i % step === 0 && i !== skipNear) || i === lastLbl) svg += `<text x="${X(i)}" y="${H - 10}" text-anchor="middle">${esc(shortX(x, monthly))}</text>`; });
    series.forEach(s => {
      let d = '', prev = -2;
      s.points.forEach(p => { if (!Number.isFinite(p[1])) { prev = -2; return; } const i = xi.get(p[0]); d += (i === prev + 1 ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p[1]).toFixed(1); prev = i; });
      svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2"/>`;
      const showDots = s.points.length <= 40;
      s.points.forEach(p => { if (!Number.isFinite(p[1])) return; const i = xi.get(p[0]); const t = `${s.label} · ${monthly ? mo(p[0]) : dmy(p[0])}: ${fmt(p[1])}${unit ? ' ' + unit : ''}`; svg += `<circle cx="${X(i)}" cy="${Y(p[1])}" r="${showDots ? 3.5 : 2.2}" fill="${s.color}" tabindex="0" data-tip="${esc(t)}"><title>${esc(t)}</title></circle>`; });
    });
    return svg + '</svg>';
  }
  function barChart(opts) {
    const {series, unit = '', fmt = v => vi(v), height = 240, stacked = false, monthly = false} = opts; // series[i].points: [[x,y]]
    const xs = [...new Set(series.flatMap(s => s.points.map(p => p[0])))].sort();
    if (!xs.length) return '<div class="gap-empty">Không có dữ liệu hợp lệ.</div>';
    const Wd = innerWidth < 700 ? 340 : 580, H = height, L = 56, R = 16, T = 18, B = 34;
    let tot = xs.map(x => series.reduce((a, s) => a + (dict(s.points)[x] > 0 ? dict(s.points)[x] : 0), 0));
    let neg = xs.map(x => series.reduce((a, s) => a + (dict(s.points)[x] < 0 ? dict(s.points)[x] : 0), 0));
    const vals = stacked ? [...tot, ...neg] : series.flatMap(s => s.points.map(p => p[1])).filter(Number.isFinite);
    let max = Math.max(0, ...vals), min = Math.min(0, ...vals); if (max === min) max = min + 1;
    const X = i => L + (Wd - L - R) * i / xs.length, bw = (Wd - L - R) / xs.length;
    const Y = v => T + (H - T - B) * (max - v) / (max - min);
    let svg = `<svg viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(opts.aria || 'Biểu đồ cột')}">`;
    for (let i = 0; i <= 4; i++) { const v = min + (max - min) * i / 4; svg += `<path d="M${L} ${Y(v)}H${Wd - R}" stroke="#d9e1ed"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${fmt(v)}</text>`; }
    const step = Math.max(1, Math.ceil(xs.length / (innerWidth < 700 ? 4 : 8)));
    const lastLbl = xs.length - 1, skipNear = lastLbl % step !== 0 && lastLbl % step < step / 2 ? lastLbl - lastLbl % step : -1;
    xs.forEach((x, i) => { if ((i % step === 0 && i !== skipNear) || i === lastLbl) svg += `<text x="${X(i) + bw / 2}" y="${H - 10}" text-anchor="middle">${esc(shortX(x, monthly))}</text>`; });
    const n = series.length, gw = bw * 0.8, sw = stacked ? gw : gw / n;
    xs.forEach((x, i) => {
      let up = 0, down = 0;
      series.forEach((s, k) => {
        const v = dict(s.points)[x]; if (!Number.isFinite(v)) return;
        let y0, y1, bx = X(i) + bw * 0.1 + (stacked ? 0 : k * sw);
        if (stacked) { if (v >= 0) { y0 = Y(up + v); y1 = Y(up); up += v; } else { y0 = Y(down); y1 = Y(down + v); down += v; } }
        else { y0 = Y(Math.max(v, 0)); y1 = Y(Math.min(v, 0)); }
        const t = `${s.label} · ${monthly ? mo(x) : dmy(x)}: ${fmt(v)}${unit ? ' ' + unit : ''}`;
        svg += `<rect x="${bx.toFixed(1)}" y="${y0.toFixed(1)}" width="${Math.max(1, sw - 1).toFixed(1)}" height="${Math.max(1, y1 - y0).toFixed(1)}" fill="${s.color}" tabindex="0" data-tip="${esc(t)}"><title>${esc(t)}</title></rect>`;
      });
    });
    svg += `<path d="M${L} ${Y(0)}H${Wd - R}" stroke="#8a95a3"/>`;
    return svg + '</svg>';
  }
  const dict = pts => { if (!pts._d) Object.defineProperty(pts, '_d', {value: Object.fromEntries(pts)}); return pts._d; };
  function shortX(x, monthly) { x = String(x ?? ''); if (/^\d{4}Q\d$/.test(x)) return 'Q' + x[5] + '/' + x.slice(2, 4); if (x.length === 7 || (monthly && x.length >= 10)) return 'T' + Number(x.slice(5, 7)) + '/' + x.slice(2, 4); if (x.length >= 10) return x.slice(8, 10) + '/' + x.slice(5, 7); return x; }
  const mo = s => s ? 'T' + Number(s.slice(5, 7)) + '/' + s.slice(0, 4) : '—';
  const legend = series => `<div class="chart-legend">${series.map(s => `<span style="--series:${s.color}">${esc(s.label)}</span>`).join('')}</div>`;
  const table = (heads, rows, cap) => `<div class="table-scroll wi-table"><table>${cap ? `<caption>${esc(cap)}</caption>` : ''}<thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i ? '' : ' class="sym"'}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const last = pts => pts[pts.length - 1];
  const tail = (pts, n) => pts.slice(-n);
  const rangeControl = (id, ranges, init) => `<div class="wi-range" role="group" aria-label="Khoảng thời gian">${ranges.map(r => `<button type="button" data-range="${r[0]}" data-for="${id}" aria-pressed="${r[0] === init}">${r[1]}</button>`).join('')}</div>`;
  function wireRange(card, render) {
    card.querySelectorAll('.wi-range button').forEach(b => b.addEventListener('click', () => {
      b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      render(b.dataset.range); wireTips(card);
    }));
  }
  function sliceRange(pts, r) { if (r === 'all') return pts; const n = Number(r); return tail(pts, n); }

  // ---------- card scaffolding ----------
  function card(blockId) { return document.getElementById('bank-' + blockId); }
  function mount(blockId, opts) {
    const el = card(blockId); const b = W.blocks[blockId]; if (!el || !b) return null;
    const def = content.blocks.find(x => x.block_id === blockId);
    el.dataset.refreshStatus = b.status === 'loaded' ? 'loaded' : 'snapshot';
    el.dataset.cadence = 'irregular'; el.dataset.wiStatus = b.status;
    if (opts.derived) el.dataset.transform = 'derived';
    const body = el.querySelector('.gap-empty');
    const host = document.createElement('div'); host.className = 'wi-body';
    if (body) body.replaceWith(host); else el.querySelector('.unit')?.after(host);
    el.querySelector('.unit').textContent = `${opts.unit || def.unit} · ${opts.scope || 'Việt Nam'} · kỳ quan sát ${opts.obs || b.observation_frequency}`;
    el.querySelector('.source-links').innerHTML = `Nguồn: <a href="${WI}" target="_blank" rel="noopener">MCP Wi · ${esc(b.source_tables.length > 120 ? b.source_tables.slice(0, 117) + '…' : b.source_tables)}</a>${opts.extraLinks || ''}`;
    el.querySelector('.cadence-note').textContent = `Quan sát mới nhất: ${/^monthly/.test(b.observation_frequency) ? mo(b.latest_observation) : dmy(b.latest_observation)} · Công bố: ${b.publication_frequency} · Kiểm tra Wi: ${checked} · Job: chưa tự động (Wi qua MCP trong phiên; xem data/bank-wi-contract.json)`;
    const sn = el.querySelector('.source-note');
    sn.textContent = `Phương pháp nguồn: ${b.source_tables}. ID/endpoint Wi: ${b.source_ids.join('; ')}. Đơn vị: ${typeof b.unit === 'string' ? b.unit : JSON.stringify(b.unit)}. ${opts.method || ''} ${b.status === 'error' ? 'Lần kiểm gần nhất lỗi (' + b.error + '); đang giữ bản thành công trước.' : ''}`;
    if (b.status === 'error') el.insertAdjacentHTML('beforeend', `<p class="data-gap">Lần kiểm tra Wi gần nhất lỗi: ${esc(b.error)}. Đang giữ dữ liệu thành công trước (${dmy(b.last_success_at?.slice(0, 10))}).</p>`);
    if (opts.gap) el.querySelector('.data-gap').insertAdjacentHTML('afterend', `<p class="data-gap">${opts.gap}</p>`);
    const ins = el.querySelector('.chart-insight');
    if (opts.insight) ins.innerHTML = `<b>AI · ${AI_DATE} · dữ liệu Wi kiểm ${checked}, kỳ ${esc(/^monthly/.test(b.observation_frequency) ? mo(b.latest_observation) : dmy(b.latest_observation))}.</b> ${opts.insight} <span class="wi-framework">Khung cơ chế (AI ${AI_DATE}): ${esc(def.insight)}</span>`;
    return {el, host, b, def, d: b.data};
  }

  // ---------- block renderers ----------
  const R = {};
  R.funding = () => {
    const m = mount('funding', {unit: 'tỷ VND · % YoY', obs: 'tháng (đã điều chỉnh theo NHNN)',
      method: 'Bảng đã điều chỉnh 301/302 dùng để tránh đứt gãy phương pháp luận 10/2025 ở bảng gốc. Chênh lệch tín dụng − tiền gửi là phép trừ YoY cùng tháng của dashboard (rule-based).',
      derived: true,
      gap: 'Đứt gãy phương pháp NHNN 10/2025: bảng gốc 17/18 của Wi cho YoY TCKT −20% và dân cư +46% từ 10/2025 — số giả tạo, dashboard không dùng. M2 (tháng 6/2026) có kỳ trễ hơn tín dụng (tháng 7/2026); không so hai mốc khác nhau.',
      insight: (() => { const d = W.blocks.funding.data; const g = last(d.credit_minus_deposit_yoy_pp.points); const cr = last(d.credit_total_yoy.points), dp = last(d.deposits_total_yoy.points); return `${mo(dp[0])}: tín dụng ${vi(dict(d.credit_total_yoy.points)[dp[0]], 1)}% YoY so tiền gửi ${vi(dp[1], 1)}% — khoảng cách ${vi(g[1], 1)} điểm %, kéo dài từ 2024; tiền gửi TCKT (${vi(last(d.deposits_corporate_yoy.points)[1], 1)}%) tăng nhanh hơn dân cư (${vi(last(d.deposits_households_yoy.points)[1], 1)}%). Chênh lệch bền có thể giữ sức ép giá vốn; kiểm ON, OMO và giấy tờ có giá trước khi kết luận thiếu hụt thanh khoản. Tín dụng tháng 7/2026 ${vi(cr[1], 1)}% YoY.`; })()});
    if (!m) return; const d = m.d;
    const s1 = [{label: 'Tín dụng YoY', color: C[0], points: d.credit_total_yoy.points}, {label: 'Tổng tiền gửi YoY', color: C[1], points: d.deposits_total_yoy.points}, {label: 'M2 YoY', color: C[3], points: d.m2_yoy.points}];
    const s2 = [{label: 'Tiền gửi dân cư', color: C[1], points: d.deposits_households.points.map(p => [p[0], p[1] / 1e6])}, {label: 'Tiền gửi TCKT', color: C[2], points: d.deposits_corporate.points.map(p => [p[0], p[1] / 1e6])}];
    const kpi = `<div class="wi-kpis"><div><span>Tổng tiền gửi ${mo(last(d.deposits_total.points)[0])}</span><b>${vi(last(d.deposits_total.points)[1] / 1e6, 2)} triệu tỷ</b><small>${vi(last(d.deposits_total_yoy.points)[1], 1)}% YoY · YTD ${vi(d.deposits_total_ytd_latest[1], 1)}%</small></div><div><span>M2 ${mo(last(d.m2.points)[0])}</span><b>${vi(last(d.m2.points)[1] / 1e6, 2)} triệu tỷ</b><small>${vi(last(d.m2_yoy.points)[1], 1)}% YoY · không cộng với tiền gửi</small></div><div><span>Tín dụng ${mo(last(d.credit_total.points)[0])}</span><b>${vi(last(d.credit_total.points)[1] / 1e6, 2)} triệu tỷ</b><small>${vi(last(d.credit_total_yoy.points)[1], 1)}% YoY · YTD ${vi(d.credit_total_ytd_latest[1], 1)}%</small></div></div>`;
    m.host.innerHTML = kpi + `<h4>Tăng trưởng YoY (%)</h4>` + lineChart({series: s1, unit: '%', fmt: v => vi(v, 1), monthly: true, aria: 'Tăng trưởng YoY tín dụng, tiền gửi, M2'}) + legend(s1) + `<h4>Tiền gửi theo đối tượng (triệu tỷ VND)</h4>` + lineChart({series: s2, unit: 'triệu tỷ', fmt: v => vi(v, 1), monthly: true, aria: 'Tiền gửi dân cư và TCKT'}) + legend(s2);
  };
  R.credit = () => {
    const m = mount('credit', {unit: 'tỷ VND · % YoY · % YTD', obs: 'tháng', insight: (() => { const d = W.blocks.credit.data; const y = last(d.yoy), t = last(d.ytd_subset); return `Tín dụng ${mo(y[0])} tăng ${vi(y[1], 1)}% YoY và ${vi(t[1], 1)}% so cuối 2025; YoY đã hạ từ đỉnh ${vi(Math.max(...d.yoy.map(p => p[1])), 1)}% (${mo(d.yoy.find(p => p[1] === Math.max(...d.yoy.map(q => q[1])))[0])}). Nếu 7 tháng đã dùng ~${vi(t[1], 1)} điểm của định hướng 15% (khối forecast), dư địa nửa cuối năm phụ thuộc room bổ sung — chưa có thông báo room từng bank để kiểm.`; })()});
    if (!m) return; const d = m.d;
    const s = [{label: 'Tín dụng YoY', color: C[0], points: d.yoy}];
    m.host.innerHTML = `<div class="wi-kpis"><div><span>Dư nợ ${mo(last(d.value)[0])}</span><b>${vi(last(d.value)[1] / 1e6, 3)} triệu tỷ</b><small>${vi(last(d.yoy)[1], 2)}% YoY</small></div><div><span>YTD ${mo(last(d.ytd_subset)[0])}</span><b>${vi(last(d.ytd_subset)[1], 2)}%</b><small>so cuối 2025 (yend Wi)</small></div><div><span>Cuối 2025</span><b>${vi(dict(d.ytd_subset)['2025-12-01'], 2)}%</b><small>tăng trưởng cả năm 2025</small></div></div><h4>Tín dụng nền kinh tế (triệu tỷ VND)</h4>` + lineChart({series: [{label: 'Dư nợ', color: C[0], points: d.value.map(p => [p[0], p[1] / 1e6])}], unit: 'triệu tỷ', fmt: v => vi(v, 1), monthly: true}) + `<h4>Tăng trưởng YoY (%)</h4>` + lineChart({series: s, unit: '%', fmt: v => vi(v, 1), monthly: true});
  };
  R['credit-sectors'] = () => {
    const b = W.blocks['credit-sectors']; const p = b.property_proxy;
    const m = mount('credit-sectors', {unit: 'tỷ VND · % YoY · % tổng dư nợ', obs: 'tháng (vĩ mô) / quý (bank)', derived: true,
      method: 'Tỷ trọng ngành = dư nợ ngành / tổng tín dụng cùng tháng (rule-based). Proxy BĐS: ' + p.method,
      gap: `Proxy BĐS mẫu: ${p.sample_banks}/${p.universe_banks} bank có thuyết minh "xây dựng & kinh doanh BĐS" (thiếu ${p.undisclosed.join(', ')}); mẫu = ${vi(p.sample_coverage_of_universe * 100, 1)}% dư nợ 27 bank, ≈${vi(p.sample_coverage_of_system_credit * 100, 1)}% tín dụng hệ thống (mốc T7 khác T6). Không gồm vay mua nhà → sàn dưới; không ngoại suy hệ thống.`,
      insight: (() => { const s = b.data.sectors; return `${mo(b.latest_observation)}: dịch vụ khác tăng ${vi(last(s.other_services.yoy)[1], 1)}% YoY (tỷ trọng ${vi(s.other_services.latest_share_pct, 1)}%), xây dựng ${vi(last(s.construction.yoy)[1], 1)}%, trong khi thương mại chỉ ${vi(last(s.commerce.yoy)[1], 1)}% và giảm tốc từ ${vi(s.commerce.yoy[0][1], 1)}% một năm trước. Tăng trưởng lệch về dịch vụ/xây dựng làm chu kỳ BĐS thành biến rủi ro chính; proxy mẫu ${p.sample_banks} bank cho tỷ trọng BĐS-xây dựng ${vi(p.sample_share * 100, 1)}% dư nợ (sàn dưới, chưa gồm vay mua nhà).`; })()});
    if (!m) return; const s = m.d.sectors;
    const order = ['agri', 'industry', 'construction', 'commerce', 'transport_telecom', 'other_services'];
    const rows = order.map((k, i) => [esc(s[k].name), vi(last(s[k].points)[1] / 1e6, 2), vi(s[k].latest_share_pct, 1) + '%', vi(last(s[k].yoy)[1], 1) + '%', vi(s[k].yoy[0][1], 1) + '%']);
    const ser = order.map((k, i) => ({label: s[k].name, color: C[i], points: s[k].yoy}));
    const bankRows = m.d.banks.filter(x => x.construction_realestate !== null).sort((a, b2) => b2.construction_realestate - a.construction_realestate).map(x => [x.symbol, pct(x.construction_realestate, 1), pct(x.individuals_households, 1), pct(x.short_term, 1), vi(x.gross_loans_bn / 1000, 0) + ' nghìn tỷ']);
    m.host.innerHTML = `<h4>Tín dụng theo ngành kinh tế · ${mo(m.b.latest_observation)}</h4>` + table(['Ngành (SBV)', 'Dư nợ (triệu tỷ)', 'Tỷ trọng', 'YoY', `YoY ${mo(s.agri.yoy[0][0])}`], rows) + `<h4>YoY theo ngành (%)</h4>` + lineChart({series: ser, unit: '%', fmt: v => vi(v, 0), height: 250, monthly: true}) + legend(ser) +
      `<h4>Cơ cấu dư nợ từng bank · Q2/2026 · ${bankRows.length}/${m.d.bank_sample} bank có thuyết minh BĐS</h4><div class="wi-kpis"><div><span>Proxy BĐS-xây dựng (mẫu ${p.sample_banks} bank)</span><b>${vi(p.sample_share * 100, 1)}%</b><small>${int(p.sample_re_loans_bn / 1000)} / ${int(p.sample_gross_loans_bn / 1000)} nghìn tỷ dư nợ mẫu · ước lượng sàn dưới</small></div></div>` + table(['Mã', '% Xây dựng & KD BĐS', '% Cá nhân, hộ KD', '% Ngắn hạn', 'Cho vay KH gộp'], bankRows, 'Nguồn thuyết minh ngành nghề theo Wi ratio_bank; null = không tách, không phải 0');
  };
  R.bonds = () => {
    const m = mount('bonds', {unit: 'tỷ VND · %/năm', obs: 'theo đợt phát hành / sự kiện mua lại', derived: true,
      method: W.blocks.bonds.derived,
      gap: 'Chưa nối bảng thanh toán gốc/lãi và giao dịch thứ cấp của Wi; "ròng" chỉ trừ mua lại trước hạn. Mua lại lọc theo mã bank phía Wi nhưng mã từng dòng nằm trong mảng lồng chưa lấy nên không tách theo bank.',
      insight: (() => { const d = W.blocks.bonds.data; const tot = d.months.reduce((a, x) => a + x.issued_bn, 0), bb = d.months.reduce((a, x) => a + x.buyback_bn, 0); const m8 = d.months.find(x => x.month === '2026-08'); return `Từ đầu 2026 các bank niêm yết phát hành ${vi(tot / 1000, 1)} nghìn tỷ (${d.issuance_count} đợt) và mua lại trước hạn ${vi(bb / 1000, 1)} nghìn tỷ (${d.buyback_count} sự kiện); tháng 8/2026 phát hành ${vi(m8?.issued_bn / 1000, 1)} nghìn tỷ với coupon bình quân ${vi(m8?.avg_coupon_w, 2)}%/năm, cao hơn lãi suất 12 tháng niêm yết ~5,9–6,0%. Kênh GTCG đang bù cho tiền gửi tăng chậm hơn tín dụng nhưng với giá vốn cao hơn; theo dõi coupon và tỷ lệ phát hành thành công so kế hoạch.`; })()});
    if (!m) return; const d = m.d;
    const ser = [{label: 'Phát hành thực', color: C[0], points: d.months.map(x => [x.month, x.issued_bn / 1000])}, {label: 'Mua lại trước hạn', color: C[4], points: d.months.map(x => [x.month, -x.buyback_bn / 1000])}];
    m.host.innerHTML = `<h4>Phát hành và mua lại theo tháng (nghìn tỷ VND)</h4>` + barChart({series: ser, unit: 'nghìn tỷ', fmt: v => vi(v, 0), stacked: true}) + legend(ser) + table(['Tháng', 'Phát hành', 'Số đợt', 'Coupon BQ', 'Mua lại', 'Ròng'], d.months.map(x => [dmy(x.month), vi(x.issued_bn / 1000, 1), x.issue_count, x.avg_coupon_w ? vi(x.avg_coupon_w, 2) + '%' : '—', vi(x.buyback_bn / 1000, 1), vi(x.net_bn / 1000, 1)]), 'nghìn tỷ VND; coupon bình quân gia quyền') + `<h4>Theo bank · 2026 YTD</h4>` + table(['Mã', 'Phát hành (nghìn tỷ)', 'Đợt', 'Coupon BQ'], d.banks.map(x => [x.symbol, vi(x.issued_bn / 1000, 1), x.count, x.avg_coupon_w ? vi(x.avg_coupon_w, 2) + '%' : '—']));
  };
  R['other-funding'] = () => {
    const m = mount('other-funding', {unit: 'tỷ VND', obs: 'quý (điểm cuối kỳ)', insight: (() => { const q = W.blocks['other-funding'].data.sector_quarters; const a = q[q.length - 1], b0 = q[q.length - 5]; return `Giấy tờ có giá toàn ngành đạt ${vi(a.valuable_papers_bn / 1e6, 2)} triệu tỷ cuối Q2/2026, tăng ${vi((a.valuable_papers_bn / b0.valuable_papers_bn - 1) * 100, 1)}% so cùng kỳ; tiền gửi KBNN ${vi(a.kbnn_deposits_bn / 1000, 0)} nghìn tỷ, tập trung ở BID/CTG/VCB và biến động mạnh theo quý (${vi(q[q.length - 3].kbnn_deposits_bn / 1000, 0)} → ${vi(a.kbnn_deposits_bn / 1000, 0)} nghìn tỷ). Nguồn KBNN rẻ nhưng không ổn định; GTCG kéo dài kỳ hạn với chi phí cao hơn tiền gửi.`; })()});
    if (!m) return; const d = m.d;
    const ser = [{label: 'Giấy tờ có giá (triệu tỷ)', color: C[0], points: d.sector_quarters.map(x => [x.period, x.valuable_papers_bn / 1e6])}, {label: 'Tiền gửi KBNN (triệu tỷ)', color: C[2], points: d.sector_quarters.map(x => [x.period, x.kbnn_deposits_bn / 1e6])}];
    const rows = d.banks.filter(x => x.valuable_papers_bn).sort((a, b2) => b2.valuable_papers_bn - a.valuable_papers_bn).map(x => [x.symbol, vi(x.valuable_papers_bn / 1000, 1), x.kbnn_disclosed ? vi(x.kbnn_deposits_bn / 1000, 1) : 'không thuyết minh']);
    m.host.innerHTML = `<h4>Toàn ngành theo quý (triệu tỷ VND)</h4>` + lineChart({series: ser, fmt: v => vi(v, 2), unit: 'triệu tỷ'}) + legend(ser) + `<h4>Từng bank · Q2/2026 (nghìn tỷ VND)</h4>` + table(['Mã', 'Giấy tờ có giá', 'Tiền gửi KBNN'], rows);
  };
  R['services-demand'] = () => {
    const m = mount('services-demand', {unit: 'lần · triệu USD', obs: 'ngày (VNINDEX) / tháng (XNK)', scope: 'Việt Nam',
      gap: 'Wi (MCP) không có giá trị giao dịch toàn thị trường và khối ngoại toàn thị trường theo ngày (chỉ có theo mã), và chưa nối phát hành vốn cổ phần → thanh khoản chứng khoán chưa có chuỗi. XNK chỉ là proxy cho LC/tài trợ thương mại.',
      insight: (() => { const d = W.blocks['services-demand'].data; const v = last(d.vnindex); const ex = last(d.exports_m), im = last(d.imports_m), tb = last(d.trade_balance_m); return `VNINDEX P/E ${vi(v.pe, 1)}x, P/B ${vi(v.pb, 2)}x tại ${dmy(v.trading_date)} với vốn hóa ${vi(v.market_cap / 1e15, 2)} triệu tỷ. Xuất khẩu ${mo(ex[0])} ${vi(ex[1] / 1000, 1)} tỷ USD (+${vi(dict(d.exports_m_yoy)[ex[0]], 1)}% YoY), nhập khẩu ${vi(im[1] / 1000, 1)} tỷ USD (+${vi(dict(d.imports_m_yoy)[im[0]], 1)}%): thương mại hai chiều tăng mạnh, ủng hộ nhu cầu LC/thanh toán quốc tế, nhưng cán cân chuyển sang thâm hụt YTD — cần xác nhận bằng thu phí thực tế của bank.`; })()});
    if (!m) return; const d = m.d;
    const s1 = [{label: 'VNINDEX P/E', color: C[0], points: d.vnindex.map(x => [x.trading_date, x.pe])}];
    const s2 = [{label: 'Xuất khẩu', color: C[0], points: d.exports_m.map(p => [p[0], p[1] / 1000])}, {label: 'Nhập khẩu', color: C[2], points: d.imports_m.map(p => [p[0], p[1] / 1000])}];
    m.host.innerHTML = `<h4>Định giá rổ VNINDEX (P/E trailing)</h4>` + lineChart({series: s1, unit: 'x', fmt: v => vi(v, 1)}) + `<h4>Xuất nhập khẩu hàng hóa (tỷ USD/tháng)</h4>` + lineChart({series: s2, unit: 'tỷ USD', fmt: v => vi(v, 0), monthly: true}) + legend(s2) + `<p class="note">Cán cân thương mại ${mo(last(d.trade_balance_m)[0])}: ${vi(last(d.trade_balance_m)[1] / 1000, 2)} tỷ USD (tháng).</p>`;
  };
  R['deposit-rates'] = () => {
    const m = mount('deposit-rates', {unit: '%/năm', obs: 'ngày (niêm yết) · bình quân tháng', method: 'Nhóm theo định nghĩa Wi: ' + W.blocks['deposit-rates'].group_def + '. Lãi suất 12 tháng từng bank cùng ngày chốt.',
      gap: 'Wi chưa ghi rõ kênh (online/tại quầy) và trọng số bình quân nhóm; Agribank, SCB, MBV, GPBank… có trong bảng 46 nhưng không thuộc universe niêm yết.',
      insight: (() => { const d = W.blocks['deposit-rates'].data; const mth = d.monthly; const l = last(mth.m12_other.points), s = last(mth.m12_sobs.points); const s0 = mth.m12_sobs.points.find(p => p[0] === '2025-09-01'); return `Lãi suất 12 tháng nhóm SOBs tăng từ ${vi(s0[1], 2)}% (T9/2025) lên ${vi(s[1], 2)}% (T7/2026) và giữ ${vi(d.daily_12m_latest.sobs_202886[0], 2)}% đến ${dmy(d.daily_12m_latest.dates[0])}; NHTM khác ${vi(d.daily_12m_latest.other_202880[0], 2)}%. Mức tăng ~120 bps trong 10 tháng đi thẳng vào COF khi tiền gửi tái định giá — khớp với COF TTM ngành lên ${pct(last(W.blocks['bank-ratios'].data.sector_ttm).cof)}. Kỳ hạn 1–3 tháng SOBs 2,375% thấp hơn nhiều so kỳ hạn dài, cho thấy đường cong huy động dốc.`; })()});
    if (!m) return; const d = m.d, mth = d.monthly;
    const ser = [{label: 'SOBs 12T', color: C[0], points: mth.m12_sobs.points}, {label: 'Lớn 12T', color: C[1], points: mth.m12_large.points}, {label: 'Khác 12T', color: C[2], points: mth.m12_other.points}, {label: 'SOBs 6-9T', color: C[3], points: mth.m6_9_sobs.points}, {label: 'Khác 6-9T', color: C[4], points: mth.m6_9_other.points}];
    const banks = d.banks_12m.filter(x => W.universe.includes(x.symbol) || x.symbol === 'AGRIBANK').sort((a, b2) => b2.rate_12m - a.rate_12m);
    m.host.innerHTML = `<div class="wi-kpis"><div><span>12T · SOBs · ${dmy(d.daily_12m_latest.dates[0])}</span><b>${vi(d.daily_12m_latest.sobs_202886[0], 2)}%</b></div><div><span>12T · MBB/ACB/TCB/VPB</span><b>${vi(d.daily_12m_latest.large_202874[0], 3)}%</b></div><div><span>12T · NHTM khác</span><b>${vi(d.daily_12m_latest.other_202880[0], 2)}%</b></div></div><h4>Bình quân tháng theo nhóm (%/năm) · đến ${mo(d.monthly_latest_full_month)}</h4>` + lineChart({series: ser, unit: '%', fmt: v => vi(v, 1), monthly: true}) + legend(ser) + `<h4>Lãi suất 12 tháng niêm yết từng bank · ${dmy(d.daily_12m_latest.dates[0])}</h4>` + table(['Mã', 'Ngân hàng', '12 tháng'], banks.map(x => [x.symbol === 'AGRIBANK' ? 'Agribank' : x.symbol, esc(x.name), vi(x.rate_12m, 2) + '%']));
  };
  R['money-market'] = () => {
    const m = mount('money-market', {unit: '%/năm', obs: 'ngày giao dịch', insight: (() => { const d = W.blocks['money-market'].data; const on = last(d.ib_on.points), w = last(d.ib_1w.points), m1 = last(d.ib_1m.points); const avg5 = tail(d.ib_on.points, 5).reduce((a, p) => a + p[1], 0) / 5; return `ON ${vi(on[1], 2)}% ngày ${dmy(on[0])} (BQ 5 phiên ${vi(avg5, 2)}%), 1 tuần ${vi(w[1], 2)}%, 1 tháng ${vi(m1[1], 2)}% — đường cong liên ngân hàng dốc: vốn qua đêm rẻ nhưng kỳ hạn 1 tháng vẫn gần trần cho vay qua đêm NHNN (${d.policy_rates.overnight_lending_81498}%). ON dao động rất mạnh trong quý (0,75%–12,49%) nên đọc bình quân 5 phiên; lãi suất điều hành giữ 4,5% từ Q2/2023.`; })()});
    if (!m) return; const d = m.d; const id = 'mm';
    const draw = r => { const ser = ['ib_on', 'ib_1w', 'ib_2w', 'ib_1m'].map((k, i) => ({label: {ib_on: 'ON', ib_1w: '1 tuần', ib_2w: '2 tuần', ib_1m: '1 tháng'}[k], color: C[i], points: sliceRange(d[k].points, r)})); m.host.querySelector('.wi-chart').innerHTML = lineChart({series: ser, unit: '%', fmt: v => vi(v, 1)}) + legend(ser); };
    m.host.innerHTML = `<div class="wi-kpis"><div><span>Tái cấp vốn</span><b>${vi(d.policy_rates.refinancing_81497, 2)}%</b><small>đổi lần cuối Q2/2023</small></div><div><span>Tái chiết khấu</span><b>${vi(d.policy_rates.rediscount_81496, 2)}%</b></div><div><span>Cho vay qua đêm NHNN</span><b>${vi(d.policy_rates.overnight_lending_81498, 2)}%</b></div><div><span>Trần huy động &lt;6T</span><b>${vi(d.policy_rates.cap_deposit_1_6m_81501, 2)}%</b></div></div>` + rangeControl(id, [['30', '30 phiên'], ['60', '60 phiên'], ['all', 'Từ 06/2026']], '60') + `<div class="wi-chart"></div>`;
    draw('60'); wireRange(m.el, draw);
  };
  R['bank-ratios'] = () => {
    const b = W.blocks['bank-ratios'];
    const m = mount('bank-ratios', {unit: '% (TTM, hợp nhất)', obs: 'quý (TTM 4 quý)', method: b.annualization_note + ' Chỉ số ngành = sector_ratio_bank của Wi (tổng hợp), không bình quân đơn giản.',
      insight: (() => { const s = b.data.sector_ttm; const a = s[s.length - 1], y = s[s.length - 5]; return `Ngành TTM Q2/2026: NIM ${pct(a.nim)} (cùng kỳ ${pct(y.nim)}), COF ${pct(a.cof)} tăng từ ${pct(y.cof)} trong khi YEA ${pct(a.yea)} tăng ít hơn — biên bị nén ~${vi((y.nim - a.nim) * 10000, 0)} bps do giá vốn; CIR cải thiện còn ${pct(a.cir, 1)} và ROE giữ ${pct(a.roe, 1)} nhờ quy mô và chi phí. Phân hóa lớn: VPB/HDB/MBB NIM trên 4%, BID/SHB/VCB dưới 3%; CASA cao (TCB, MBB, VCB >32%) là nhóm giữ COF thấp nhất.`; })()});
    if (!m) return; const d = m.d;
    const s = d.sector_ttm; const ser = [{label: 'NIM TTM', color: C[0], points: s.map(x => [x.period, x.nim * 100])}, {label: 'COF TTM', color: C[4], points: s.map(x => [x.period, x.cof * 100])}, {label: 'YEA TTM', color: C[1], points: s.map(x => [x.period, x.yea * 100])}];
    const ser2 = [{label: 'ROE TTM', color: C[3], points: s.map(x => [x.period, x.roe * 100])}, {label: 'CIR TTM', color: C[2], points: s.map(x => [x.period, x.cir * 100])}, {label: 'CASA', color: C[5], points: s.map(x => [x.period, x.casa_ratio * 100])}];
    const a = s[s.length - 1];
    m.host.innerHTML = `<div class="wi-kpis"><div><span>NIM ngành TTM</span><b>${pct(a.nim)}</b></div><div><span>CIR</span><b>${pct(a.cir, 1)}</b></div><div><span>CASA</span><b>${pct(a.casa_ratio, 1)}</b></div><div><span>ROE / ROA</span><b>${pct(a.roe, 1)} / ${pct(a.roa)}</b></div></div><h4>Ngành · TTM theo quý (%)</h4>` + lineChart({series: ser, unit: '%', fmt: v => vi(v, 1)}) + legend(ser) + lineChart({series: ser2, unit: '%', fmt: v => vi(v, 0), height: 220}) + legend(ser2) + `<h4>Từng bank · TTM Q2/2026 (27 bank niêm yết)</h4>` + table(['Mã', 'NIM', 'COF', 'CIR', 'CASA', 'ROE', 'ROA', 'LDR'], d.banks.sort((x, y) => y.nim - x.nim).map(x => [x.symbol, pct(x.nim), pct(x.cof), pct(x.cir, 1), pct(x.casa, 1), pct(x.roe, 1), pct(x.roa), pct(x.ldr, 1)]), 'ratio_bank_ttm + ratio_common_ttm; LDR theo Wi là LDR kế toán, không phải LDR pháp lý');
  };
  R['yield-funding'] = () => {
    const b = W.blocks['yield-funding'];
    const m = mount('yield-funding', {unit: '%/năm (TTM)', obs: 'quý (TTM)', method: b.definition_note,
      gap: 'Wi không có Yield on Loans theo dư nợ cho vay riêng; YEA dùng tài sản sinh lãi bình quân. Không dùng YEA−COF thay NIM.',
      insight: (() => { const s = b.data.sector_ttm; const a = s[s.length - 1], y = s[s.length - 5]; return `YEA ngành TTM ${pct(a.yea)} (+${vi((a.yea - y.yea) * 10000, 0)} bps YoY) so COF ${pct(a.cof)} (+${vi((a.cof - y.cof) * 10000, 0)} bps): giá vốn tái định giá nhanh gấp gần hai lần lợi suất tài sản, khớp với đợt tăng lãi suất huy động từ T11/2025. Bank có COF thấp (VCB ${pct(d0('VCB').cof)}, CTG ${pct(d0('CTG').cof)}) chịu ít áp lực hơn nhóm phụ thuộc tiền gửi kỳ hạn (SHB ${pct(d0('SHB').cof)}, HDB ${pct(d0('HDB').cof)}).`; function d0(s0) { return b.data.banks.find(x => x.symbol === s0); } })()});
    if (!m) return; const d = m.d;
    const core = d.core11; const ser = ['VCB', 'TCB', 'MBB', 'VPB', 'HDB', 'BID'].map((k, i) => ({label: k + ' COF', color: C[i], points: core[k].map(x => [x.period, x.cof * 100])}));
    m.host.innerHTML = `<h4>Chênh lệch YEA − COF từng bank · TTM Q2/2026 (điểm %)</h4>` + barChart({series: [{label: 'YEA − COF', color: C[0], points: d.banks.sort((x, y) => y.spread - x.spread).map(x => [x.symbol, x.spread * 100])}], unit: 'điểm %', fmt: v => vi(v, 1)}) + `<h4>COF TTM 6 bank lớn theo quý (%)</h4>` + lineChart({series: ser, unit: '%', fmt: v => vi(v, 1)}) + legend(ser) + table(['Mã', 'YEA', 'COF', 'YEA−COF', 'NIM'], d.banks.map(x => [x.symbol, pct(x.yea), pct(x.cof), vi(x.spread * 100, 2) + ' đ%', pct(x.nim)]));
  };
  R.income = () => {
    const b = W.blocks.income;
    const m = mount('income', {unit: '% tổng thu nhập hoạt động (quý)', obs: 'quý', method: b.definition_note,
      gap: 'Bóc tách thanh toán/bảo hiểm/chứng khoán chỉ có ở bank thuyết minh (null = không tách); % là của riêng quý 2/2026, chưa loại yếu tố một lần.',
      insight: (() => { const d = b.data.banks; const f = s => d.find(x => x.symbol === s); const hi = [...d].sort((x, y) => y.pct_net_service_income - x.pct_net_service_income)[0]; return `Thu nhập lãi thuần vẫn chiếm 63–95% TOI quý 2/2026; lãi thuần dịch vụ cao nhất ở STB ${pct(f('STB').pct_net_service_income, 1)}, LPB ${pct(f('LPB').pct_net_service_income, 1)}, SHB ${pct(f('SHB').pct_net_service_income, 1)} (phần lớn từ thanh toán ${pct(f('SHB').pct_payment_services_income, 1)}), TCB ${pct(f('TCB').pct_net_service_income, 1)}. Ngược lại VCB/CTG/BID có "thu khác" 9–15% TOI (thu hồi nợ đã xử lý) — không phải phí bền vững. Dự phòng ăn ${pct(f('STB').pct_provision_expense, 0)} TOI ở STB và ${pct(f('SHB').pct_provision_expense, 0)} ở SHB so ${pct(f('VCB').pct_provision_expense, 0)} ở VCB.`; })()});
    if (!m) return; const d = m.d.banks;
    const rows = [...d].sort((x, y) => y.pct_net_service_income - x.pct_net_service_income);
    const ser = [{label: 'Lãi thuần', color: C[0], points: rows.map(x => [x.symbol, x.pct_net_interest_income * 100])}, {label: 'Dịch vụ', color: C[1], points: rows.map(x => [x.symbol, x.pct_net_service_income * 100])}, {label: 'FX + CK + góp vốn', color: C[3], points: rows.map(x => [x.symbol, (x.pct_fx_gold_income + x.pct_investment_securities_income + x.pct_trading_securities_income + x.pct_equity_investment_income) * 100])}, {label: 'Khác', color: C[6], points: rows.map(x => [x.symbol, x.pct_other_income * 100])}];
    m.host.innerHTML = `<h4>Cơ cấu TOI quý 2/2026 (%) · 27 bank, xếp theo tỷ trọng dịch vụ</h4>` + barChart({series: ser, unit: '%', fmt: v => vi(v, 0), stacked: true, height: 260}) + legend(ser) + table(['Mã', 'TOI Q2 (tỷ)', 'Lãi thuần', 'Dịch vụ', 'Thanh toán', 'Bảo hiểm', 'CK', 'FX', 'Khác', 'Dự phòng/TOI'], rows.map(x => [x.symbol, int(x.toi_bn), pct(x.pct_net_interest_income, 1), pct(x.pct_net_service_income, 1), x.pct_payment_services_income == null ? 'không tách' : pct(x.pct_payment_services_income, 1), x.pct_insurance_income == null ? 'không tách' : pct(x.pct_insurance_income, 1), x.pct_securities_services_income == null ? 'không tách' : pct(x.pct_securities_services_income, 1), pct(x.pct_fx_gold_income, 1), pct(x.pct_other_income, 1), pct(x.pct_provision_expense, 1)]));
  };
  R['asset-quality'] = () => {
    const b = W.blocks['asset-quality'];
    const m = mount('asset-quality', {unit: 'tỷ VND · %', obs: 'quý', derived: true, method: b.derived_note,
      gap: 'Chưa có: thu hồi nợ đã xử lý, xóa nợ và hoàn nhập tách riêng (Wi chỉ có chi phí dự phòng ròng theo quý); dự phòng TP VAMC cấp ngành lỗi 500 phía Wi. Credit cost chưa tính vì cần dư nợ bình quân cùng kỳ.',
      insight: (() => { const q = b.data.sector_quarters; const a = q[q.length - 1], p = q[q.length - 2], y = q[q.length - 5]; const st = W.blocks['bank-ratios'].data.sector_ttm; const r = st[st.length - 1]; return `Cuối Q2/2026 nợ nhóm 2 toàn ngành ${vi(a.g2_bn / 1000, 0)} nghìn tỷ, tăng ${vi((a.g2_bn / p.g2_bn - 1) * 100, 1)}% so Q1 và ${vi((a.g2_bn / y.g2_bn - 1) * 100, 1)}% YoY — nhanh hơn nhiều so dư nợ; nợ xấu nhóm 3–5 ${vi(a.npl_bn / 1000, 0)} nghìn tỷ (+${vi((a.npl_bn / y.npl_bn - 1) * 100, 1)}% YoY). Tỷ lệ NPL ngành theo Wi ${pct(r.npl_ratio)} và bao phủ ${pct(r.npl_coverage_ratio, 0)} — bao phủ giảm từ ${pct(st[st.length - 5].npl_coverage_ratio, 0)} một năm trước trong khi chi phí dự phòng quý ${vi(a.provision_expense_bn / 1000, 1)} nghìn tỷ. Tín hiệu nợ sớm tăng + bao phủ mỏng hơn là điểm cần theo dõi ở monitor; phân hóa mạnh: VCB bao phủ ${pct(b.data.banks.find(x => x.symbol === 'VCB').coverage, 0)} so NVB/SGB dưới 40%.`; })()});
    if (!m) return; const d = m.d; const q = d.sector_quarters;
    const ser = [{label: 'Nhóm 2', color: C[2], points: q.map(x => [x.period, x.g2_bn / 1000])}, {label: 'Nhóm 3–5 (NPL)', color: C[4], points: q.map(x => [x.period, x.npl_bn / 1000])}, {label: 'Chi phí dự phòng quý', color: C[3], points: q.map(x => [x.period, x.provision_expense_bn / 1000])}];
    const banks = [...d.banks].sort((x, y) => y.npl_ratio - x.npl_ratio);
    m.host.innerHTML = `<h4>Toàn ngành (nghìn tỷ VND) · tổng cùng mẫu Wi</h4>` + lineChart({series: ser, unit: 'nghìn tỷ', fmt: v => vi(v, 0)}) + legend(ser) + table(['Quý', 'Nhóm 2', 'Nhóm 3–5', 'Nhóm 5', 'TP VAMC', 'Dự phòng quý', 'Nhóm 2 / nợ phân loại', 'NPL / nợ phân loại'], q.slice(-6).map(x => [dmy(x.period), int(x.g2_bn / 1000), int(x.npl_bn / 1000), int(x.g5_bn / 1000), vi(x.vamc_bn / 1000, 1), vi(x.provision_expense_bn / 1000, 1), pct(x.g2_share_of_classified), pct(x.npl_share_of_classified)]), 'nghìn tỷ VND; hai cột cuối là phép chia của dashboard, tỷ lệ NPL chính thức ở block NIM·CIR·CASA') + `<h4>Từng bank · Q2/2026</h4>` + table(['Mã', 'NPL (Wi)', 'Nhóm 2', 'Bao phủ', 'NPL hình thành mới', 'Nhóm 5 (tỷ)', 'TP VAMC (tỷ)', 'Dự phòng Q2 (tỷ)', 'Lãi dự thu/TTS'], banks.map(x => [x.symbol, pct(x.npl_ratio), pct(x.group2_ratio), pct(x.coverage, 0), pct(x.new_npl_formation_ratio), int(x.g5_bn), x.vamc_bn == null ? '—' : int(x.vamc_bn), int(x.provision_expense_q_bn), pct(x.accrued_interest_to_assets)]));
  };
  R.repricing = () => {
    const b = W.blocks.repricing;
    const m = mount('repricing', {unit: 'tỷ VND · % tổng tài sản', obs: 'quý', derived: true, method: 'gap/EA = khe hở lãi suất / tài sản sinh lãi (phép chia của dashboard).', gap: b.limitation,
      insight: (() => { const d = b.data.banks; const f = s => d.find(x => x.symbol === s); return `Khe hở lãi suất tổng (RSA−RSL) dương lớn ở VCB (${vi(f('VCB').gap_bn / 1000, 0)} nghìn tỷ, ${pct(f('VCB').gap_to_earning_assets, 1)} EA), MBB, VPB — hưởng lợi nếu lãi suất tài sản tăng nhanh hơn vốn; âm ở HDB (${vi(f('HDB').gap_bn / 1000, 0)} nghìn tỷ), MSB, TPB. Đây là gap tổng, chưa theo bucket nên không suy trực tiếp ra độ nhạy NII; MSB/ABB/OCB/VAB giữ 17–22% tài sản ở chứng khoán AFS — nhạy định giá khi lợi suất TPCP tăng.`; })()});
    if (!m) return; const d = m.d.banks.filter(x => x.gap_bn !== null).sort((x, y) => y.gap_to_earning_assets - x.gap_to_earning_assets);
    m.host.innerHTML = `<h4>Khe hở lãi suất / tài sản sinh lãi · Q2/2026 (%)</h4>` + barChart({series: [{label: 'Gap/EA', color: C[3], points: d.map(x => [x.symbol, x.gap_to_earning_assets * 100])}], unit: '%', fmt: v => vi(v, 0)}) + table(['Mã', 'Gap (nghìn tỷ)', 'RSA', 'RSL', 'Gap/EA', 'HTM', 'AFS', 'CK kinh doanh', 'Cho vay ròng'], m.d.banks.map(x => [x.symbol, x.gap_bn == null ? 'không có' : vi(x.gap_bn / 1000, 0), x.rsa_bn == null ? '—' : int(x.rsa_bn / 1000), x.rsl_bn == null ? '—' : int(x.rsl_bn / 1000), pct(x.gap_to_earning_assets, 1), pct(x.htm_pct, 1), pct(x.afs_pct, 1), pct(x.trading_pct, 1), pct(x.net_loans_pct, 1)]), 'nghìn tỷ VND; tỷ trọng % tổng tài sản');
  };
  R.omo = () => {
    const b = W.blocks.omo;
    const m = mount('omo', {unit: 'tỷ VND', obs: 'ngày', derived: true, method: b.sign_note + ' Tổng 5 phiên là phép cộng của dashboard.',
      insight: (() => { const d = b.data; const n = last(d.net), o = last(d.outstanding), r5 = last(d.net_5d_sum); const aug = d.net.filter(p => p[0] >= '2026-08-01' && p[0] < '2026-09-01').reduce((a, p) => a + p[1], 0); return `Phiên ${dmy(n[0])} NHNN ${n[1] >= 0 ? 'bơm' : 'hút'} ròng ${vi(Math.abs(n[1]) / 1000, 1)} nghìn tỷ; 5 phiên gần nhất ${r5[1] >= 0 ? 'bơm' : 'hút'} ròng ${vi(Math.abs(r5[1]) / 1000, 1)} nghìn tỷ, tháng 8 bơm ròng ${vi(aug / 1000, 0)} nghìn tỷ. Lưu hành OMO ${vi(o[1] / 1000, 0)} nghìn tỷ, dưới đỉnh ~300 nghìn tỷ hồi tháng 6 nhưng vẫn rất cao — hệ thống dựa vào cửa sổ NHNN, khớp với chênh lệch tín dụng − tiền gửi. ON hạ trong khi OMO lưu hành tăng lại là điều hòa thanh khoản, chưa phải nới lỏng bền.`; })()});
    if (!m) return; const d = m.d;
    const draw = r => { const ser = [{label: 'Bơm/hút ròng', color: C[0], points: sliceRange(d.net, r).map(p => [p[0], p[1] / 1000])}]; const s2 = [{label: 'Lưu hành OMO', color: C[3], points: sliceRange(d.outstanding, r).map(p => [p[0], p[1] / 1000])}]; m.host.querySelector('.wi-chart').innerHTML = `<h4>Bơm/hút ròng theo phiên (nghìn tỷ VND)</h4>` + barChart({series: ser, unit: 'nghìn tỷ', fmt: v => vi(v, 0)}) + `<h4>Tổng lưu hành OMO (nghìn tỷ VND)</h4>` + lineChart({series: s2, unit: 'nghìn tỷ', fmt: v => vi(v, 0), height: 200}); };
    m.host.innerHTML = rangeControl('omo', [['30', '30 phiên'], ['60', '60 phiên'], ['all', 'Từ 06/2026']], '60') + '<div class="wi-chart"></div>'; draw('60'); wireRange(m.el, draw);
  };
  R.fx = () => {
    const b = W.blocks.fx;
    const m = mount('fx', {unit: 'VND/USD · chỉ số · JPY/USD', obs: 'ngày', derived: true, method: b.timestamp_note + ' JPYUSD = 1/USDJPY là phép đảo của dashboard.',
      gap: 'Dòng ngày 11/09/2026 là quan sát trong phiên tại giờ lấy; DXY là hợp đồng futures (Wi), không phải chỉ số spot ICE.',
      insight: (() => { const d = b.data; const s = last(d.vcb_sell.points), c = last(d.sbv_central.points), f = last(d.free_sell.points), x = last(d.dxy.points), j = last(d.usdjpy.points); const s0 = d.vcb_sell.points.find(p => p[0] === '2026-07-28'); return `VCB bán ${vi(s[1], 0)} VND/USD ngày ${dmy(s[0])}, giảm ${vi(s0[1] - s[1], 0)} đồng từ đỉnh 26.525 (28/07) dù tỷ giá trung tâm lên ${vi(c[1], 0)}; tự do ${vi(f[1], 0)} thấp hơn NHTM — áp lực VND đã dịu khi DXY về ${vi(x[1], 1)} và USD/JPY ${vi(j[1], 1)}. Điều này tạo dư địa để NHNN bơm OMO và ON hạ mà không đánh đổi tỷ giá; rủi ro đảo chiều nếu DXY quay lại vùng 101.`; })()});
    if (!m) return; const d = m.d;
    const draw = r => { const s1 = [{label: 'VCB bán', color: C[0], points: sliceRange(d.vcb_sell.points, r)}, {label: 'VCB mua', color: C[1], points: sliceRange(d.vcb_buy.points, r)}, {label: 'Tự do bán', color: C[4], points: sliceRange(d.free_sell.points, r)}, {label: 'Trung tâm NHNN', color: C[6], points: sliceRange(d.sbv_central.points, r)}]; const s2 = [{label: 'DXY futures', color: C[3], points: sliceRange(d.dxy.points, r)}]; const s3 = [{label: 'USD/JPY', color: C[2], points: sliceRange(d.usdjpy.points, r)}]; m.host.querySelector('.wi-chart').innerHTML = `<h4>USD/VND (VND cho 1 USD)</h4>` + lineChart({series: s1, unit: 'VND', fmt: v => vi(v, 0)}) + legend(s1) + `<div class="grid two wi-two"><div><h4>DXY futures</h4>${lineChart({series: s2, fmt: v => vi(v, 1), height: 190})}</div><div><h4>USD/JPY (JPY cho 1 USD)</h4>${lineChart({series: s3, fmt: v => vi(v, 0), height: 190})}</div></div>`; };
    const s = last(d.vcb_sell.points), c = last(d.sbv_central.points), f = last(d.free_sell.points), sp = last(d.vcb_bid_ask_spread.points);
    m.host.innerHTML = `<div class="wi-kpis"><div><span>VCB mua/bán ${dmy(s[0])}</span><b>${vi(last(d.vcb_buy.points)[1], 0)} / ${vi(s[1], 0)}</b><small>chênh mua–bán ${vi(sp[1], 0)} đ</small></div><div><span>Trung tâm NHNN</span><b>${vi(c[1], 0)}</b></div><div><span>Tự do mua/bán</span><b>${vi(last(d.free_buy.points)[1], 0)} / ${vi(f[1], 0)}</b></div><div><span>DXY · USD/JPY · JPYUSD</span><b>${vi(last(d.dxy.points)[1], 2)} · ${vi(last(d.usdjpy.points)[1], 2)}</b><small>JPYUSD = ${last(d.jpyusd_derived.points)[1].toFixed(5)} (1/USDJPY)</small></div></div>` + rangeControl('fx', [['30', '30 ngày'], ['60', '60 ngày'], ['all', 'Từ 06/2026']], 'all') + '<div class="wi-chart"></div>'; draw('all'); wireRange(m.el, draw);
  };
  R['bonds-macro'] = () => {
    const b = W.blocks['bonds-macro'];
    const m = mount('bonds-macro', {unit: '%/năm · tỷ VND', obs: 'ngày (lợi suất) / phiên (đấu thầu)', derived: true, method: b.derived + ' Lợi suất kỳ hạn cố định của WiGroup khác lợi suất giao dịch HNX.',
      gap: 'Chỉ nối 5 kỳ hạn VN và 2 kỳ hạn Mỹ; 15 nước còn lại có ID trong contract nhưng chưa tải. VN 20Y thiếu ngày 11/09.',
      insight: (() => { const d = b.data; const v10 = last(d.vn_10y.points), v1 = last(d.vn_1y.points), u10 = last(d.us_10y.points); const v10_0 = d.vn_10y.points[0]; const ss = d.sessions; const l = ss[ss.length - 1]; return `TPCP 10Y ${vi(v10[1], 2)}% (${dmy(v10[0])}), tăng ${vi((v10[1] - v10_0[1]) * 100, 0)} bps từ đầu tháng 6; 1Y ${vi(v1[1], 2)}%. Lợi suất Mỹ 10Y ${vi(u10[1], 2)}% cao hơn VN — chênh lệch âm giữ áp lực lên tỷ giá và giới hạn dư địa hạ lãi suất. Đấu thầu KBNN phiên ${dmy(l.date)}: trúng ${vi(l.award_ratio, 0)}% lượng gọi thầu, lợi suất trúng 10Y 4,43% nhích lên mỗi tuần từ 4,35% (7/2026) — chi phí vốn dài hạn của hệ thống đang tăng dần.`; })()});
    if (!m) return; const d = m.d;
    const ser = [{label: 'VN 1Y', color: C[5], points: d.vn_1y.points}, {label: 'VN 3Y', color: C[1], points: d.vn_3y.points}, {label: 'VN 5Y', color: C[2], points: d.vn_5y.points}, {label: 'VN 10Y', color: C[0], points: d.vn_10y.points}, {label: 'VN 20Y', color: C[3], points: d.vn_20y.points}, {label: 'US 10Y', color: C[4], points: d.us_10y.points}];
    const sess = d.sessions.slice(-8);
    m.host.innerHTML = `<h4>Lợi suất TPCP kỳ hạn cố định (%/năm)</h4>` + lineChart({series: ser, unit: '%', fmt: v => vi(v, 1)}) + legend(ser) + `<h4>Đấu thầu KBNN theo phiên (tỷ VND)</h4>` + barChart({series: [{label: 'Gọi thầu', color: C[6], points: sess.map(x => [x.date, x.offered])}, {label: 'Trúng thầu', color: C[0], points: sess.map(x => [x.date, x.won])}], unit: 'tỷ', fmt: v => vi(v, 0), height: 200}) + table(['Phiên', 'Kỳ hạn', 'Gọi thầu', 'Đặt thầu', 'Trúng thầu', 'LS trúng'], d.auctions.slice(0, 10).map(a => [dmy(a.auction_date), esc(a.maturity), int(a.bid_invitation_value), int(a.total_bid_value), int(a.winning_bid_value), a.winning_yield ? vi(a.winning_yield, 2) + '%' : 'không trúng']), '10 dòng gần nhất; tỷ VND');
  };
  R.macro = () => {
    const b = W.blocks.macro;
    const m = mount('macro', {unit: '% · triệu USD · tỷ VND', obs: 'quý / tháng / YTD (giữ nguyên từng chuỗi)', method: 'Mỗi chuỗi giữ đúng loại kỳ của Wi: GDP quý; FDI, XNK tháng và YTD; ngân sách chỉ có YTD theo quý. Không so YTD với năm.',
      insight: (() => { const d = b.data; const g = last(d.gdp_real_yoy_q.points), fy = last(d.fdi_realized_ytd.points), fyy = last(d.fdi_realized_ytd_yoy.points), pi = last(d.public_inv_ytd_yoy.points), rv = last(d.budget_revenue_ytd_yoy.points), tb = last(d.trade_balance_ytd.points); return `GDP thực Q2/2026 tăng ${vi(g[1], 2)}% YoY (6T: ${vi(last(d.gdp_real_yoy_ytd.points)[1], 2)}%); FDI thực hiện 8T ${vi(fy[1] / 1000, 2)} tỷ USD (+${vi(fyy[1], 1)}%), đầu tư công 8T +${vi(pi[1], 1)}% YoY, thu ngân sách 6T +${vi(rv[1], 1)}%. Cầu tín dụng và tiền gửi KBNN được hỗ trợ bởi giải ngân công, nhưng cán cân thương mại YTD âm ${vi(-tb[1] / 1000, 1)} tỷ USD (đến ${mo(tb[0])}) là nguồn áp lực tỷ giá ngược chiều với năm 2025 (thặng dư 20 tỷ USD).`; })()});
    if (!m) return; const d = m.d;
    m.host.innerHTML = `<div class="wi-kpis"><div><span>GDP thực Q2/2026</span><b>${vi(last(d.gdp_real_yoy_q.points)[1], 2)}%</b><small>YoY · 6T ${vi(last(d.gdp_real_yoy_ytd.points)[1], 2)}%</small></div><div><span>FDI thực hiện 8T/2026</span><b>${vi(last(d.fdi_realized_ytd.points)[1] / 1000, 2)} tỷ USD</b><small>+${vi(last(d.fdi_realized_ytd_yoy.points)[1], 1)}% YoY</small></div><div><span>Đầu tư NSNN 8T/2026</span><b>${vi(last(d.public_inv_ytd.points)[1] / 1000, 0)} nghìn tỷ</b><small>+${vi(last(d.public_inv_ytd_yoy.points)[1], 1)}% YoY</small></div><div><span>Thu / chi NSNN 6T/2026</span><b>${vi(last(d.budget_revenue_ytd.points)[1] / 1000, 0)} / ${vi(last(d.budget_expenditure_ytd.points)[1] / 1000, 0)}</b><small>nghìn tỷ · thu +${vi(last(d.budget_revenue_ytd_yoy.points)[1], 1)}%, chi +${vi(last(d.budget_expenditure_ytd_yoy.points)[1], 1)}%</small></div></div><h4>GDP thực theo quý (% YoY)</h4>` + barChart({series: [{label: 'GDP quý', color: C[0], points: d.gdp_real_yoy_q.points.map(p => [p[0].slice(0, 4) + 'Q' + Math.ceil(Number(p[0].slice(5, 7)) / 3), p[1]])}], unit: '%', fmt: v => vi(v, 1), height: 200}) + `<h4>FDI thực hiện & đầu tư NSNN theo tháng (% YoY)</h4>` + lineChart({series: [{label: 'FDI thực hiện YoY', color: C[1], points: d.fdi_realized_m_yoy.points}, {label: 'Đầu tư NSNN YoY', color: C[2], points: d.public_inv_m_yoy.points}], unit: '%', fmt: v => vi(v, 0), height: 210, monthly: true}) + legend([{label: 'FDI thực hiện YoY', color: C[1]}, {label: 'Đầu tư NSNN YoY', color: C[2]}]) + `<h4>Cán cân thương mại YTD (tỷ USD)</h4>` + barChart({series: [{label: 'Cán cân YTD', color: C[3], points: d.trade_balance_ytd.points.map(p => [p[0], p[1] / 1000])}], unit: 'tỷ USD', fmt: v => vi(v, 0), height: 190, monthly: true});
  };
  R.forecast = () => {
    const b = W.blocks.forecast;
    const m = mount('forecast', {unit: 'theo từng dòng', obs: 'theo ngày phát hành báo cáo', method: b.target_note + ' ' + b.data.page_note,
      gap: 'Dự báo là ý kiến của tổ chức tại ngày phát hành, không phải xác suất; chưa nối FedWatch. Dòng "Mục tiêu/Định hướng/Yêu cầu" được tách khỏi dự báo.',
      insight: (() => { const g = b.data.by_indicator; const dep = g.RATE_DEPOSIT_12M.filter(r => !r.is_target && r.period_year === 2026); const cr = g.CREDIT_GROWTH_YOY.filter(r => !r.is_target && r.period_year === 2026); const fx = g.FX_USDVND.filter(r => !r.is_target); const rng = a => `${vi(Math.min(...a.map(r => r.value)), 2)}–${vi(Math.max(...a.map(r => r.value)), 2)}`; return `Dự báo lãi suất tiền gửi 12T cuối 2026 trải rộng ${rng(dep)}% (MBS nâng lên 8,3% ngày 17/07, GTJA 7% ngày 17/08) so mức niêm yết SOBs 5,9% — thị trường phân hóa mạnh về mức tăng giá vốn; tín dụng 2026 dự báo ${rng(cr)}% so định hướng NHNN 15%; USD/VND cuối năm ${rng(fx)} so VCB bán 26.120 hiện tại. Đồng thuận tái cấp vốn giữ 4,5% (Bloomberg 4,375–4,5%), 2027 nhích 4,75%.`; })()});
    if (!m) return; const g = m.d.by_indicator;
    const names = {RATE_DEPOSIT_12M: 'Lãi suất tiền gửi 12T', RATE_REFINANCE: 'Lãi suất tái cấp vốn', RATE_POLICY: 'Lãi suất điều hành', CREDIT_GROWTH_YOY: 'Tăng trưởng tín dụng', GDP_REAL_YOY: 'GDP thực', FX_USDVND: 'USD/VND'};
    let html = '';
    for (const k of ['RATE_DEPOSIT_12M', 'RATE_REFINANCE', 'CREDIT_GROWTH_YOY', 'FX_USDVND', 'GDP_REAL_YOY', 'RATE_POLICY']) {
      const rows = (g[k] || []).slice(0, 12);
      html += `<h4>${names[k]} · ${g[k]?.length || 0} dòng</h4>` + table(['Tổ chức', 'Kịch bản', 'Kỳ', 'Giá trị', 'Phát hành'], rows.map(r => [esc(r.provider), r.is_target ? `<span class="wi-target">${esc(r.scenario)}</span>` : esc(r.scenario || 'Cơ sở'), r.period_year, vi(r.value, k === 'FX_USDVND' ? 0 : 2) + (k === 'FX_USDVND' ? '' : '%'), dmy(r.release_date)]));
    }
    m.host.innerHTML = html;
  };
  R.news = () => {
    const b = W.blocks.news;
    const m = mount('news', {unit: 'sự kiện', obs: 'theo CBTT', method: b.note, gap: `Chỉ hiển thị ${b.data.exchange_news.length}/${b.data.exchange_total_count} CBTT của 16 mã lớn trong 01–11/09/2026; ngày sự kiện (ĐKCC, hiệu lực) đọc trong PDF gốc, publish_time là ngày công bố.`,
      insight: 'Cụm CBTT 08–10/09/2026 xoay quanh vốn và trái phiếu: TCB thông qua tăng vốn điều lệ 2026, MSB hoàn tất phát hành tăng vốn từ VCSH, HDB phát hành trái phiếu quốc tế, LPB hai gói trái phiếu (công chúng và cấp 2), ACB duyệt hồ sơ phát hành. Cùng dữ liệu phát hành 8/2026 ở block trái phiếu, các bank đang chủ động nâng vốn cấp 2 và kỳ hạn nguồn — nhất quán với NIM bị nén và TT14 (CAR). Chưa có CBTT về room tín dụng trong kỳ này.'});
    if (!m) return; const d = m.d;
    m.host.innerHTML = `<h4>CBTT HOSE · ${d.exchange_news.length} tin mới nhất</h4><ul class="wi-news">${d.exchange_news.map(n => `<li><span>${dmy(n.published)} · <b>${n.symbol}</b> · ${esc(n.category)}</span><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a></li>`).join('')}</ul><h4>News alert Wi · vĩ mô tiền tệ</h4><ul class="wi-news">${d.ai_news.slice(0, 6).map(n => `<li><span>${dmy(n.date)}</span><b>${esc(n.title)}</b><small>${esc(n.summary)}</small></li>`).join('')}</ul>`;
  };
  R.valuation = () => {
    const b = W.blocks.valuation;
    const m = mount('valuation', {unit: 'lần · %', obs: 'ngày giao dịch hoàn tất', method: b.date_note + ' P/E, P/B theo EPS/BVPS trailing của Wi; ROE TTM Q2/2026 để đối chiếu.',
      insight: (() => { const d = b.data; const s = last(d.sector_daily); const s0 = d.sector_daily[0]; const banks = d.banks; const f = x => banks.find(y => y.symbol === x); return `P/B ngành ${vi(s[2], 2)}x và P/E ${vi(s[1], 2)}x ngày ${dmy(s[0])}, thấp hơn ${dmy(s0[0])} (${vi(s0[2], 2)}x) dù ROE TTM ngành giữ ~17,5%: thị trường đang chiết khấu biên nén và nợ sớm tăng. Phân tán lớn: LPB P/B ${vi(f('LPB').pb, 2)}x với ROE ${pct(f('LPB').roe_ttm, 0)}; VCB ${vi(f('VCB').pb, 2)}x; nhóm TPB/SHB/OCB/VAB dưới 0,9x với ROE 13–17% — P/B thấp có thể phản ánh bao phủ mỏng và cơ cấu tài sản, không tự động là rẻ.`; })()});
    if (!m) return; const d = m.d;
    const rows = [...d.banks].sort((x, y) => y.pb - x.pb);
    m.host.innerHTML = `<h4>P/B và P/E ngành Ngân hàng theo ngày (Wi sector 107)</h4>` + lineChart({series: [{label: 'P/B ngành', color: C[0], points: d.sector_daily.map(p => [p[0], p[2]])}], unit: 'x', fmt: v => vi(v, 2), height: 200}) + lineChart({series: [{label: 'P/E ngành', color: C[1], points: d.sector_daily.map(p => [p[0], p[1]])}], unit: 'x', fmt: v => vi(v, 1), height: 200}) + `<h4>P/B so ROE TTM từng bank · giá ${dmy(b.price_date)}</h4>` + barChart({series: [{label: 'P/B', color: C[0], points: rows.map(x => [x.symbol, x.pb])}], unit: 'x', fmt: v => vi(v, 1), height: 220}) + table(['Mã', 'P/B', 'P/E', 'ROE TTM', 'BVPS', 'EPS', 'Vốn hóa (nghìn tỷ)'], rows.map(x => [x.symbol, vi(x.pb, 2), vi(x.pe, 1), pct(x.roe_ttm, 1), int(x.bvps), int(x.eps), vi(x.market_cap / 1e12, 1)]));
  };

  for (const k of Object.keys(R)) { try { R[k](); } catch (e) { console.error('wi block', k, e); const c = card(k); if (c) c.insertAdjacentHTML('beforeend', `<p class="data-gap">Lỗi hiển thị block ${k}: ${esc(e.message)}</p>`); } }
  document.querySelectorAll('[id^="bank-"] .wi-body').forEach(wireTips);

  // ---------- comparison table (tab 7) ----------
  const ratios = W.blocks['bank-ratios']?.data.banks || [], val = W.blocks.valuation?.data.banks || [];
  const byR = Object.fromEntries(ratios.map(x => [x.symbol, x])), byV = Object.fromEntries(val.map(x => [x.symbol, x]));
  const comparisonBody = $('#bank-rows');
  function fillComparison() {
    comparisonBody.querySelectorAll('tr').forEach(tr => {
      const sym = tr.firstElementChild.textContent.trim().toUpperCase().replace('AGRIBANK', 'AGRIBANK');
      const r = byR[sym], v = byV[sym], tds = tr.children;
      if (sym === 'AGRIBANK') { tds[7].textContent = 'Không niêm yết; Wi không có ratio_bank'; return; }
      if (!r) return;
      tds[2].textContent = pct(r.nim); tds[3].textContent = pct(r.casa, 1); tds[4].textContent = pct(r.npl); tds[5].textContent = pct(r.roe, 1); tds[6].textContent = v ? vi(v.pb, 2) + 'x' : '—';
      tds[7].textContent = `TTM Q2/2026 · P/B ${W.blocks.valuation ? dmy(W.blocks.valuation.price_date) : '—'} · Wi`;
    });
  }
  fillComparison();
  new MutationObserver(fillComparison).observe(comparisonBody, {childList: true});
  const cap = document.querySelector('#bank-rows')?.closest('table')?.querySelector('caption'); if (cap) cap.textContent = 'Chỉ số so sánh từng bank · NIM/CASA/NPL/ROE TTM Q2/2026 (Wi ratio_bank_ttm, ratio_common_ttm), P/B giá 10/09/2026 (Wi ratio_daily) · bộ lọc áp dụng bảng này và góc nhìn analyst';

  // ---------- KPI tiles, hero, global gap, Đọc nhanh ----------
  const F = W.blocks.funding?.data, BR = W.blocks['bank-ratios']?.data, AQ = W.blocks['asset-quality']?.data, ST = BR?.sector_ttm, sT = ST?.[ST.length - 1], sY = ST?.[ST.length - 5];
  const kpis = document.querySelectorAll('.kpis article p');
  if (F && kpis[0]) kpis[0].innerHTML = `Tín dụng ${vi(last(F.credit_total_yoy.points)[1], 1)}% vs tiền gửi ${vi(last(F.deposits_total_yoy.points)[1], 1)}% YoY · ${mo(last(F.deposits_total_yoy.points)[0])} (Wi/SBV)`;
  if (sT && kpis[1]) kpis[1].innerHTML = `NIM ngành ${pct(sT.nim)} · COF ${pct(sT.cof)} · TTM Q2/2026 (Wi)`;
  if (sT && kpis[2]) kpis[2].innerHTML = `NPL ${pct(sT.npl_ratio)} · bao phủ ${pct(sT.npl_coverage_ratio, 0)} · nhóm 2 ${pct(sT.group2_loan_ratio)} · Q2/2026`;
  if (kpis[3]) kpis[3].innerHTML = `CAR Wi rỗng toàn bộ; room chưa có thông báo; LDR kế toán ngành ${pct(sT?.ldr, 1)} (không phải LDR pháp lý)`;
  const hero = document.querySelector('.hero-aside p'); if (hero) hero.innerHTML = `Dữ liệu ngoài Wi có nguồn xác minh.<br>Wi: 20/20 nhóm đã nối, kiểm ${checked}.`;
  const gg = document.querySelector('.global-gap');
  if (gg) gg.innerHTML = `<b>Data limitation · còn thiếu sau khi nối Wi (${checked}).</b> Đã nối 20 nhóm Wi với kỳ quan sát riêng từng card. Vẫn chưa có: CAR/LCR/LDR pháp lý theo bank (Wi trả rỗng), room tín dụng từng bank, tái cấp vốn, tiền mặt/M2 SBV, GTGD toàn thị trường, thanh toán gốc/lãi TPDN, khe hở lãi suất theo bucket; proxy BĐS là sàn dưới từ 23/27 bank. Đứt gãy phương pháp NHNN 10/2025 được xử lý bằng bảng đã điều chỉnh.`;
  const quick = document.querySelector('#pane-mt1 .card[data-update-kind="ai"]');
  if (quick && F && sT && AQ) {
    const q = AQ.sector_quarters, a = q[q.length - 1], y = q[q.length - 5];
    const g = last(F.credit_minus_deposit_yoy_pp.points);
    quick.querySelector('.analysis-date').textContent = `AI viết ${AI_DATE} trên dữ liệu Wi kiểm ${checked} · Đọc theo quy tắc dữ liệu, cần phân tích lại khi hash dữ liệu đổi`;
    quick.querySelectorAll('p:not(.analysis-date)').forEach(p => p.remove());
    quick.insertAdjacentHTML('beforeend', `<p><b>Quy mô:</b> tín dụng tăng ${vi(last(F.credit_total_yoy.points)[1], 1)}% YoY (T7/2026) nhưng tiền gửi chỉ ${vi(last(F.deposits_total_yoy.points)[1], 1)}% (T6/2026), khoảng cách ${vi(g[1], 1)} điểm % kéo dài — hệ thống bù bằng GTCG (coupon 8–9,7%) và cửa sổ OMO (${vi(last(W.blocks.omo.data.outstanding)[1] / 1000, 0)} nghìn tỷ lưu hành).</p><p><b>Biên:</b> NIM ngành TTM ${pct(sT.nim)} so ${pct(sY.nim)} cùng kỳ; COF tăng ${vi((sT.cof - sY.cof) * 10000, 0)} bps trong khi YEA chỉ +${vi((sT.yea - sY.yea) * 10000, 0)} bps. Lãi suất 12T SOBs 5,9% (+~120 bps từ T9/2025) chưa phản ánh hết vào COF; dự báo 12T cuối 2026 dao động 6,0–8,3%.</p><p><b>Rủi ro:</b> nợ nhóm 2 ngành ${vi(a.g2_bn / 1000, 0)} nghìn tỷ (+${vi((a.g2_bn / y.g2_bn - 1) * 100, 0)}% YoY), NPL ${pct(sT.npl_ratio)}, bao phủ ${pct(sT.npl_coverage_ratio, 0)} (giảm từ ${pct(sY.npl_coverage_ratio, 0)}). ROE ngành vẫn ${pct(sT.roe, 1)} nhờ CIR hạ; P/B ngành ${vi(last(W.blocks.valuation.data.sector_daily)[2], 2)}x đang chiết khấu biên nén và nợ sớm.</p><p class="data-gap">Trạng thái ngành theo quy tắc: quy mô tăng nhanh nhưng giá vốn và nợ sớm xấu đi → "tăng trưởng có điều kiện", chưa đủ để kết luận tích cực; thiếu CAR/room để chấm dư địa.</p>`);
  }

  // ---------- watch monitors: compute rule-based status ----------
  function monitorStatus() {
    const out = {};
    if (F) { const gaps = tail(F.credit_minus_deposit_yoy_pp.points, 3).map(p => p[1]); const rising = gaps[2] > gaps[1] && gaps[1] > gaps[0]; out.funding = {status: rising ? 'Kích hoạt · khoảng cách tăng 3 tháng' : 'Theo dõi · khoảng cách ' + vi(gaps[2], 1) + ' đ%, không tăng liên tục', latest: `${vi(gaps[2], 1)} điểm %`, period: mo(last(F.credit_minus_deposit_yoy_pp.points)[0]), on: rising}; }
    if (ST) { const n = ST.map(x => x.nim); const dep = W.blocks['deposit-rates'].data.monthly.m12_sobs.points; const depUp = last(dep)[1] > dep[dep.length - 4][1]; const nimDown2 = n[n.length - 1] < n[n.length - 2] && n[n.length - 2] < n[n.length - 3]; out['bank-ratios'] = {status: depUp && nimDown2 ? 'Kích hoạt · LS huy động tăng, NIM giảm 2 quý' : `Theo dõi · NIM TTM ${pct(n[n.length - 1])}, quý trước ${pct(n[n.length - 2])}`, latest: pct(n[n.length - 1]), period: 'TTM Q2/2026', on: depUp && nimDown2}; }
    if (AQ && ST) { const q = AQ.sector_quarters; const g2up = q[q.length - 1].g2_share_of_classified > q[q.length - 2].g2_share_of_classified && q[q.length - 2].g2_share_of_classified > q[q.length - 3].g2_share_of_classified; const covDown = ST[ST.length - 1].npl_coverage_ratio < ST[ST.length - 2].npl_coverage_ratio; out['asset-quality'] = {status: g2up && covDown ? 'Kích hoạt · nhóm 2 tăng 2 quý, bao phủ giảm' : g2up ? 'Cảnh báo · nhóm 2 tăng 2 quý' : 'Theo dõi', latest: `nhóm 2 ${pct(ST[ST.length - 1].group2_loan_ratio)} · bao phủ ${pct(ST[ST.length - 1].npl_coverage_ratio, 0)}`, period: 'Q2/2026', on: g2up && covDown}; }
    if (W.blocks.omo) { const on = W.blocks['money-market'].data.ib_on.points; const avg5 = tail(on, 5).reduce((a, p) => a + p[1], 0) / 5, avg20 = tail(on, 20).reduce((a, p) => a + p[1], 0) / 20; const net5 = last(W.blocks.omo.data.net_5d_sum)[1]; const hot = avg5 > avg20 && net5 > 0; out.omo = {status: hot ? 'Kích hoạt · ON cao hơn nền 20 phiên và OMO bơm ròng' : `Theo dõi · ON BQ5 ${vi(avg5, 2)}% < BQ20 ${vi(avg20, 2)}%; OMO 5 phiên ${net5 >= 0 ? 'bơm' : 'hút'} ${vi(Math.abs(net5) / 1000, 1)} nghìn tỷ`, latest: `ON ${vi(last(on)[1], 2)}% · VCB bán ${vi(last(W.blocks.fx.data.vcb_sell.points)[1], 0)}`, period: dmy(last(on)[0]), on: hot}; }
    out.safety = {status: 'Chưa đánh giá · CAR Wi rỗng, room chưa có', latest: '—', period: 'chưa có', on: null};
    return out;
  }
  const ms = monitorStatus();
  document.querySelectorAll('.monitor-item').forEach(item => {
    const href = item.querySelector('a')?.getAttribute('href') || ''; const title = item.querySelector('strong').textContent;
    const key = {'Huy động vs tín dụng': 'funding', 'Giá vốn & NIM': 'bank-ratios', 'Nợ sớm & dự phòng': 'asset-quality', 'Thanh khoản & tỷ giá': 'omo', 'Room & an toàn vốn': 'safety'}[title];
    const s = ms[key]; if (!s) return;
    const st = item.querySelector('.status'); st.textContent = s.status; st.dataset.state = s.on === null ? 'na' : s.on ? 'on' : 'watch';
    item.querySelector('.cadence-note').textContent = `Mới nhất: ${s.latest} · Kỳ: ${s.period} · Kiểm tra Wi: ${checked} · Tính theo quy tắc, ngưỡng do AI đề xuất`;
  });

  // ---------- source table (tab 7) ----------
  document.querySelectorAll('#source-rows tr.gap-row').forEach(tr => {
    const id = tr.querySelector('small')?.textContent.trim(); const b = W.blocks[id]; if (!b) return;
    tr.classList.remove('gap-row'); tr.classList.add('wi-row');
    const tds = tr.children;
    tds[1].innerHTML = `<a href="${WI}" target="_blank" rel="noopener">MCP Wi</a><small>${esc(b.source_ids.join('; ').slice(0, 160))}</small>`;
    tds[2].innerHTML = `${esc(b.observation_frequency)}<small>${esc(b.publication_frequency)}</small>`;
    tds[3].innerHTML = `${checked}<small>${b.status === 'loaded' ? 'Đã nối · ' : 'Lỗi, giữ last-good · '}${/^monthly/.test(b.observation_frequency) ? mo(b.latest_observation) : dmy(b.latest_observation)}</small>`;
  });
  const cc = $('#coverage-count'); if (cc) { const err = Object.values(W.blocks).filter(b => b.status !== 'loaded').length; cc.textContent = `${Object.keys(W.blocks).length - err}/20 block Wi đã nối${err ? ` · ${err} lỗi` : ''} · 5 nguồn ngoài Wi còn thiếu`; }
  const note = document.querySelector('#pane-mt7 .note:last-of-type'); if (note) note.innerHTML = `Đã nối bộ tải công khai Eximbank năm 2026 và 20 nhóm MCP Wi (kiểm ${checked}; lấy trong phiên, chưa có job mạng tự động — xem <code>data/bank-wi-contract.json</code>). IFC và pháp lý là snapshot có ngày kiểm tra. Chưa cấu hình job gọi mô hình AI.`;
})();
