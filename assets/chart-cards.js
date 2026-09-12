/* Compact presentation only. Original provenance nodes are retained in details;
   material data-gap/gap-row nodes are never moved or rewritten. */
(() => {
  'use strict';
  const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n};
  const date=value=>/^\d{4}-\d{2}-\d{2}/.test(value||'')?value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4):value;
  const number=(value,digits=1)=>value.toLocaleString('vi-VN',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const cadence={daily:'ngày giao dịch',weekly:'tuần',monthly:'tháng',quarterly:'quý',annual:'năm',semiannual:'T5 & T11',event:'theo sự kiện',irregular:'không cố định',unverified:'chưa xác minh'};
  const wiCadence={funding:'không cố định · trễ 1–3 tháng',credit:'không cố định · trễ 1–3 tháng','credit-sectors':'vĩ mô không cố định / BCTC quý',bonds:'theo CBTT','other-funding':'BCTC quý','services-demand':'phiên giao dịch / XNK tháng','deposit-rates':'ngày','money-market':'ngày / quyết định','bank-ratios':'BCTC quý','yield-funding':'BCTC quý',income:'BCTC quý',omo:'ngày',fx:'ngày','bonds-macro':'ngày / phiên đấu thầu',macro:'theo từng chuỗi',forecast:'theo báo cáo',news:'theo sự kiện','asset-quality':'BCTC quý',repricing:'BCTC quý',valuation:'phiên giao dịch'};
  function period(value,frequency){
    if(/marketing year/.test(frequency||''))return 'Niên vụ bắt đầu '+value?.slice(0,4);
    if(/^monthly/.test(frequency||'')&&/^\d{4}-\d{2}/.test(value||''))return 'T'+Number(value.slice(5,7))+'/'+value.slice(0,4);
    return date(value);
  }
  // Explicitly reviewed qualifiers, not guesses from titles or data values.
  const flags={
    chCrudeStock:'Mỹ, không đại diện tồn kho toàn cầu · Số tuần cuối có dữ liệu mỗi tháng.',
    chProdStock:'Mỹ · Số tuần cuối có dữ liệu mỗi tháng; khác bình quân tháng.',
    chDistYear:'Mỹ · Bình quân các tuần tháng 8; khác số cuối tháng.',
    chUsProd:'Mỹ · Bình quân số tuần, không phải điều tra sản lượng tháng riêng.',
    chCushing:'Điểm giao nhận WTI tại Mỹ, không đại diện toàn cầu · Số tuần cuối mỗi tháng.',
    chCurve:'Nguồn không chính thức · Giá close cùng phiên, không phải settlement.',
    chFastPrice:'Nguồn không chính thức · Close, không phải settlement; chuyển hợp đồng có thể tạo bước nhảy.',
    chSpare:'Công suất dự phòng và gián đoạn là ước tính, không phải số đo trực tiếp.',
    chWorldSD:'Các năm mang E là dự báo; không phải số thực hiện.',
    chWorldBalance:'Các năm mang E là dự báo; không phải số thực hiện.',
    chGasCustomer:'Bốn tỷ trọng có mẫu số khác nhau; không cộng thành 100%.',
    chCrack:'Proxy USGC, không phải biên nhà máy Việt Nam · Tháng chưa đủ kỳ được đánh dấu *.',
    chMoit:'Proxy USGC, không phải rổ giá điều hành Bộ Công Thương · Tháng chưa đủ kỳ: *.',
    chBrent24:'Tháng chưa đủ kỳ được đánh dấu *; chỉ bình quân các phiên đã có dữ liệu.',
    chBrentYear:'Năm hiện tại là YTD, không so trực tiếp với năm đủ 12 tháng.',
    chBrentWti:'Tháng chưa đủ kỳ được đánh dấu *; dùng các ngày chung có dữ liệu.',
    chHormuzM:'Lượt tàu AIS, không phải thùng dầu; dữ liệu có thể có nhiễu hoặc thiếu.',
    chSupplyDemand:'Có sản lượng từ đường thô nhập tái chế, không chỉ từ mía trong nước.',
    chStocks:'Niên vụ 2025/26 là ước tính, chưa phải số chốt vụ.',
    chSugarProducers:'Năm bắt đầu niên vụ từng nước; kỳ mới có ước tính/dự báo. EU không cộng thêm các nước thành viên.',
    chSmuggled:'Ước tính, không phải số liệu hải quan chính thức.',
    chHfcs:'2023*: suy từ lũy kế 9 tháng · 2025 (7T)*: chưa đủ năm; không so trực tiếp với cả năm.',
    chPolicyQuota:'Hạn ngạch phân giao, không phải nhập khẩu thực tế.',
    chPolicyTax:'Mốc thuế lịch sử 2021; không khẳng định mức đang áp dụng.',
  };
  // These original notes contain qualification that must remain verbatim/visible.
  const keepNotes=new Set(['chVnPrice','chCaneCrush','chCaneArea','chCanePrice','chMargin','chBsrMargin','chGasVol']);
  function own(block,selector){return [...block.querySelectorAll(selector)].filter(n=>n.closest('.card,.viz-block')===block)}
  function metadata(block,notes){
    const ids=(block.dataset.sourceIds||'').split(',');
    const feeds=ids.map(id=>window.SECTOR_DAILY?.sources?.[id]).filter(Boolean);
    const wiId=block.id.replace(/^bank-/,'');
    const wi=window.BANK_WI_DATA?.blocks?.[wiId];
    if(wi)return {observed:period(wi.latest_observation,wi.observation_frequency),checked:date(window.BANK_WI_DATA.checked_at),frequency:wiCadence[wiId]||'theo từng chuỗi',name:'MCP Wi',error:wi.status==='error'};
    if(feeds.length){
      const dates=feeds.map(s=>s.latest_observation).filter(Boolean).sort();
      return {observed:period(dates[0],feeds[0].observation_frequency),checked:date(feeds.map(s=>s.last_checked_at).filter(Boolean).sort()[0]),frequency:cadence[block.dataset.cadence],error:feeds.some(s=>s.status==='error'),stale:notes.some(n=>n.classList.contains('is-stale'))};
    }
    // Extract labelled display metadata only; no new dates or schedules inferred.
    const text=notes.filter(n=>n.classList.contains('cadence-note')).map(n=>n.textContent).join(' · ');
    return {observed:text.match(/Quan sát(?: mới nhất)?:\s*([^·]+)/)?.[1]?.trim(),checked:text.match(/Kiểm tra(?: Wi)?:\s*([^·]+)/)?.[1]?.trim(),frequency:cadence[block.dataset.cadence]};
  }
  function compact(){
    [...document.querySelectorAll('.card,.viz-block')].reverse().forEach((block,index)=>{
      const heading=own(block,'.chart-title')[0];if(!heading||block.classList.contains('value-chain-card'))return;
      const host=own(block,'[id^="ch"]')[0],id=host?.id;
      const notes=own(block,'.source-note,.cadence-note,.refresh-note,.srcrow,.source-links').filter(n=>!n.closest('.data-gap,.gap-row')&&!n.querySelector('.data-gap,.gap-row'));
      if(!notes.length)return;
      const meta=metadata(block,notes);
      const candidates=notes.slice().sort((a,b)=>Number(b.matches('.cadence-note,.source-links'))-Number(a.matches('.cadence-note,.source-links'))).flatMap(n=>[...n.querySelectorAll('a[href]')]);
      const first=candidates[0];
      const footer=make('div','chart-footer');
      const row=make('div','chart-source-line');
      if(first){const a=first.cloneNode(true);a.className='chart-primary-source';a.textContent=meta.name||first.textContent.trim().split(' · ')[0];row.append(a)}
      else {const label=make('span','', 'Nguồn: xem chi tiết');row.append(label)}
      if(meta.observed)row.append(make('span','', 'Kỳ '+meta.observed));
      if(meta.checked)row.append(make('span','', 'Kiểm '+meta.checked));
      if(meta.frequency)row.append(make('span','','Công bố: '+meta.frequency));
      footer.append(row);
      const actions=make('div','chart-card-actions');
      const ai=heading.querySelector('.chart-info-button');if(ai){ai.textContent='ⓘ Insight';ai.classList.add('chart-insight-action');actions.append(ai)}
      const details=make('details','chart-source-details');
      const summary=make('summary','', 'Chi tiết dữ liệu');details.append(summary);
      const body=make('div','source-details-body source-info-panel');body.id='source-detail-'+index;
      summary.setAttribute('aria-controls',body.id);body.setAttribute('role','region');body.setAttribute('aria-label','Nguồn và phương pháp: '+heading.textContent.trim());
      const protectedNotes=keepNotes.has(id)?notes.filter(n=>n.classList.contains('source-note')&&!n.classList.contains('cadence-note')&&!n.classList.contains('refresh-note')):[];
      notes.filter(n=>!protectedNotes.includes(n)).forEach(n=>body.append(n));
      // Data tables remain the same nodes, now under the same source disclosure.
      own(block,'details').filter(d=>d.querySelector('table')&&!d.querySelector('.data-gap,.gap-row')).forEach(d=>body.append(d));
      details.append(body);actions.append(details);footer.append(actions);
      if(flags[id])footer.prepend(make('p','chart-caveat',flags[id]));
      if(meta.error||meta.stale)footer.prepend(make('p','chart-freshness',meta.error?'Lần tải mới lỗi · Giữ dữ liệu tốt gần nhất.':'Nguồn có độ trễ / đang chờ dữ liệu mới.'));
      block.append(footer);block.classList.add('compact-chart-card');
      const badge=own(block,'.update-badge')[0];
      const kinds={public:'Dữ liệu công khai',periodic:'Dữ liệu định kỳ',document:'AI đọc tài liệu',static:'Nội dung tĩnh',event:'Theo sự kiện',ai:'AI phân tích'};
      if(badge&&kinds[block.dataset.updateKind])badge.textContent=kinds[block.dataset.updateKind]+(block.dataset.transform==='derived'?' · Tính toán':'');
      details.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();details.open=false;summary.focus()}});
    });
    // Keep the classification key available without repeating a wide legend on every visit.
    const legend=document.querySelector('.update-legend');
    if(legend){const d=make('details','classification-key');d.append(make('summary','','Chú giải loại nội dung'));legend.before(d);d.append(legend)}
    groupInventories();
  }
  function groupInventories(){
    const specs=[['chCrudeStock','Dầu thô'],['chProdStock','Sản phẩm'],['chDistYear','Mùa vụ diesel'],['chCushing','Cushing']];
    const cards=specs.map(([id])=>document.getElementById(id)?.closest('.card'));
    if(cards.some(c=>!c)||new Set(cards).size!==4)return;
    const group=make('section','inventory-group');group.setAttribute('aria-label','Tồn kho dầu và sản phẩm tại Mỹ');
    group.append(make('h3','','Tồn kho Mỹ'));
    const tabs=make('div','inventory-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Chọn nhóm tồn kho');group.append(tabs);
    cards[0].before(group);
    function select(i){cards.forEach((c,j)=>{c.hidden=i!==j;const b=tabs.children[j];b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1})}
    cards.forEach((c,i)=>{
      const button=make('button','',specs[i][1]);button.type='button';button.id='inventory-tab-'+i;button.setAttribute('role','tab');
      c.id=c.id||'inventory-panel-'+i;c.setAttribute('role','tabpanel');c.setAttribute('aria-labelledby',button.id);button.setAttribute('aria-controls',c.id);
      tabs.append(button);group.append(c);button.addEventListener('click',()=>select(i));
      button.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowRight'?1:3))%4;select(j);tabs.children[j].focus()});
    });
    // Pair the two remaining high-frequency charts instead of leaving empty grid cells.
    const production=document.getElementById('chUsProd')?.closest('.card');
    const curve=document.getElementById('chCurve')?.closest('.card');
    if(production&&curve&&production.parentElement!==curve.parentElement){const old=curve.parentElement;production.parentElement.append(curve);if(!old.children.length)old.remove()}
    // Make the most recent plotted values visible without inventing a market-wide aggregate.
    const strip=make('div','inventory-overview');
    for(const [id,label] of specs.filter(([id])=>id!=='chDistYear')){
      const readings=document.getElementById(id)?.chartReadings||[];
      for(const r of readings){
        const n=make('div','');n.append(make('span','',id==='chProdStock'?r.name:label),make('strong','',number(r.value)+' triệu thùng'),make('small','',r.period));
        if(Number.isFinite(r.previous)){const delta=r.value-r.previous;n.append(make('small','',(delta>0?'+':'')+number(delta)+' triệu thùng so '+r.previousPeriod))}
        strip.append(n);
      }
    }
    if(strip.children.length)tabs.before(strip);
    select(0);
  }
  window.ChartCards={compact};
})();
