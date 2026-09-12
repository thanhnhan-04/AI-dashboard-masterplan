/* Progressive Catalyst/Risk layout. Reuses dated monitor outputs and source
   blocks; does not overwrite provider data, original research or analyst notes. */
(() => {
  'use strict';
  const pane=document.querySelector('.majorpane[data-tab="mt5"]');if(!pane)return;
  const bank=document.body.dataset.sector==='bank',oil=!!document.getElementById('chCurve');
  const sector=bank?'bank':oil?'oil':'sugar';
  const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n};
  const num=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('vi-VN',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
  const date=v=>/^\d{4}-\d{2}-\d{2}/.test(v||'')?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):v||'Chưa có kỳ';
  const original=[...pane.children];
  const monitors=[...pane.querySelectorAll('.monitor-item')];
  const oldScenarios=[...pane.querySelectorAll('.scenario')];
  const W=window.BANK_WI_DATA,feeds=window.SECTOR_DAILY?.sources||{};
  const board=make('section','thesis-board');board.id='thesis-board';
  const heading=make('div','thesis-heading');heading.append(make('h2','','Catalyst / Risk'),make('p','','Điều gì cần theo dõi, tác động tới đâu và khi nào cần đổi đánh giá?'));board.append(heading);
  const nav=make('div','thesis-view-tabs');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Góc nhìn Catalyst/Risk');board.append(nav);
  const panels=['signals','evidence','archive'].map(key=>{const n=make('div','thesis-view');n.id='thesis-'+key;n.setAttribute('role','tabpanel');board.append(n);return n});
  const [signals,evidence,archive]=panels;
  function view(i,focus=false){panels.forEach((p,j)=>{p.hidden=i!==j;const b=nav.children[j];b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1});if(focus)nav.children[i].focus()}
  function keys(buttons,select){buttons.forEach((b,i)=>b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:buttons.length-1))%buttons.length;select(j);buttons[j].focus()}))}
  ['Tín hiệu','Dữ liệu & nguồn','Phân tích lưu'].forEach((label,i)=>{const b=make('button','',label);b.type='button';b.id='thesis-view-tab-'+i;b.setAttribute('role','tab');b.setAttribute('aria-controls',panels[i].id);panels[i].setAttribute('aria-labelledby',b.id);b.addEventListener('click',()=>view(i));nav.append(b)});
  keys([...nav.children],view);
  const stamp=bank?'11/09/2026':oil?'03/09/2026':'17/08/2026';
  archive.append(make('p','thesis-notice','Phân tích lưu '+stamp+' · Giữ nguyên để đối chiếu; chưa hiệu chỉnh theo dữ liệu mới. Các câu “hiện tại” và mốc giá trong bản lưu thuộc ngày phân tích này.'));
  evidence.append(make('p','thesis-notice','Dữ liệu và điều kiện theo dõi có kỳ riêng. Cảnh báo và giới hạn nguồn được giữ cùng từng khối bằng chứng.'));
  // Retain complete old DOM (including listeners/IDs) under dated views.
  if(bank){
    original.forEach(n=>{if(n.matches('.analyst-input'))return;(n.matches('[data-blocks="5"],#catalyst-watch')?evidence:archive).append(n)});
  }else{
    const main=original.find(n=>n.matches('.section'));
    if(main)[...main.children].forEach(n=>{if(n.matches('.analyst-input'))return;((n.matches('.monitor-grid,.focus-card,.srcrow')||n.querySelector('.watch-table'))?evidence:archive).append(n)});
    original.filter(n=>n!==main).forEach(n=>archive.append(n));
    if(main){[...main.children].forEach(n=>pane.append(n));main.remove()}
  }
  pane.prepend(board);pane.classList.add('has-thesis-board');
  // Evidence navigation reveals the existing chart in its real scope/tab.
  function reveal(id){
    const target=document.getElementById(id);if(!target)return;
    if(evidence.contains(target)){view(1);target.scrollIntoView({block:'start',behavior:'smooth'});return}
    const major=target.closest('.majorpane');
    if(major){const button=[...document.querySelectorAll('.majortabbtn')].find(b=>b.dataset.tab===major.dataset.tab)||document.querySelectorAll('.majortabbtn')[Number(major.dataset.tab.slice(2))-1];button?.click()}
    const geo=target.closest('.supply-pane');if(geo?.hidden)document.querySelector(`[aria-controls="${geo.id}"]`)?.click();
    const bankGeo=target.closest('#geo-pane-vn,#geo-pane-world');if(bankGeo?.hidden)document.querySelector(`[aria-controls="${bankGeo.id}"]`)?.click();
    const inventory=target.closest('.inventory-group>.card');if(inventory?.hidden)document.querySelector(`[aria-controls="${inventory.id}"]`)?.click();
    requestAnimationFrame(()=>{target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'smooth'})});
  }
  const item=(title,metric,period,status,impact,condition,limit,links,groups)=>({title,metric,period,status,impact,condition,limit,links,groups});
  const fromMonitor=(i)=>{const m=monitors[i];return {value:m?.querySelector('strong')?.textContent||'—',period:m?.querySelector('small')?.textContent.split(' · ')[0]||'Chưa có kỳ'}};
  let rows=[];
  if(oil){
    const cr=fromMonitor(0),stock=fromMonitor(1),hz=fromMonitor(2);
    rows=[
      item('Dòng chảy Hormuz',hz.value,hz.period,'Theo dõi','Nguồn nguyên liệu lọc dầu và chi phí nhập hàng.','BQ7 phục hồi trên 30 lượt/ngày; đối chiếu độ bền của phục hồi.','Lượt tàu AIS, không phải thùng dầu; ngưỡng giả định.',[['chHormuzM','Dòng chảy ngày & BQ7']],['refining','distribution','gas']),
      item('Crack & tồn kho sản phẩm',cr.value+' · '+stock.value,cr.period+' / tồn kho '+stock.period,'Theo dõi','Biên lọc dầu BSR; giá vốn và tồn kho của phân phối.','Crack dưới 60 USD/thùng trong một tháng; distillate trở lại vùng 115–120 triệu thùng.','Proxy USGC; số có kỳ riêng, chưa phải biên nhà máy Việt Nam.',[['chCrack','Crack'],['chProdStock','Tồn kho sản phẩm']],['refining','distribution']),
      item('Cân bằng cung–cầu','Dự báo tháng cần rà soát','Bản phân tích '+stamp,'Chờ cập nhật','Giá bán khai thác, nhu cầu và mặt bằng giá đầu vào.','Các nguồn cùng điều chỉnh triển vọng cầu hoặc tốc độ phục hồi cung.','Forecast, không phải số thực hiện; chưa có revision mới trong tab này.',[['chWorldSD','Cân bằng toàn cầu'],['chWorldBalance','Cung trừ cầu']],['upstream','gas','refining','distribution']),
      item('Dự án & hợp đồng','Chưa có chuỗi FID / backlog mới','Theo CBTT từng doanh nghiệp','Thiếu dữ liệu','Khối lượng công việc PVD/PVS; sản lượng khí và khai thác.','FID, hợp đồng hoặc tiến độ được công bố; kiểm độ trễ ghi nhận.','Chính sách và kế hoạch chưa đồng nghĩa doanh thu.',[['chVnUpstream','Sản lượng Việt Nam'],['chGasVol','Khí & LNG']],['upstream','services','gas'])
    ];
    // Never turn a missing/stale feed into a favourable signal.
    [[0,['hormuz']],[1,['brent','gasoline','diesel','distillate_stock']]].forEach(([i,ids])=>{if(ids.some(k=>!feeds[k]?.records?.length)){rows[i].status='Thiếu dữ liệu';rows[i].metric='—'}else if(ids.some(k=>feeds[k].status!=='ok'||Date.now()-Date.parse(feeds[k].latest_observation)>14*86400000)){rows[i].status='Chờ cập nhật';rows[i].limit+=' Nguồn trễ / giữ kỳ cũ.'}});
  }else if(!bank){
    const wb=feeds.sugar_monthly,last=wb?.records?.at(-1),stock=monitors[1]?.querySelector('strong')?.textContent||'—',hfcs=monitors[2]?.querySelector('strong')?.textContent||'—';
    rows=[
      item('Áp lực tồn kho',stock,'2025/26E · bản lưu '+stamp,'Theo dõi','Khả năng tăng giá bán và tốc độ giải phóng hàng.','Tồn kho/tiêu thụ giảm qua các kỳ công bố cùng niên vụ.','Ước tính cuối niên vụ; chưa có chuỗi tồn kho tháng.',[['chStocks','Tồn kho'],['chSupplyDemand','Cân đối Việt Nam']],['cane','import']),
      item('Giá bán & nguyên liệu',last?num(last.value,2)+' USD/kg':'—',last?'World Bank · '+last.date.slice(0,7):'Chưa có kỳ','Chưa đủ số','Biên phụ thuộc giá bán, giá mía hoặc chi phí đường thô nhập.','Giá bán cải thiện so chi phí đầu vào trên dữ liệu cùng kỳ.','Giá thế giới chưa phải spread của nhà máy; chưa đủ giá bán–mía cùng kỳ.',[['chVnPrice','Giá bán trong nước'],['chCanePrice','Giá mía'],['chWorldRecent','Giá thế giới']],['cane','import']),
      item('Nhập khẩu & chất thay thế',hfcs,'HFCS 2024 · bản lưu '+stamp,'Chờ cập nhật','Áp lực cạnh tranh tại khách hàng công nghiệp.','Có số nhập khẩu mới cùng kỳ và bằng chứng thay đổi giá cạnh tranh.','HFCS 7T không so trực tiếp cả năm; đường lậu là ước tính.',[['chImports','Nhập khẩu'],['chHfcs','HFCS'],['chSmuggled','Ước tính đường lậu']],['cane','import']),
      item('Bảo hộ & thực thi','Cần đối chiếu văn bản hiệu lực','Theo sự kiện','Chưa xác minh','Mức bảo hộ và thực thi ảnh hưởng giá nhập quy đổi.','Xác minh phạm vi, mức thuế và kết quả thực thi trong công bố mới.','Mức thuế lịch sử chưa xác nhận là mức đang áp dụng.',[['chPolicyTax','Mốc thuế & giới hạn'],['chPolicyQuota','Hạn ngạch']],['cane','import'])
    ];
  }else{
    const defs=[
      [0,'Huy động & thanh khoản','Giá vốn và khả năng tài trợ tăng trưởng.',[['bank-funding','Huy động'],['bank-omo','OMO'],['bank-fx','Tỷ giá']]],
      [1,'NIM & giá vốn','Thu nhập lãi và tốc độ điều chỉnh lãi suất.',[['bank-bank-ratios','NIM'],['bank-yield-funding','Yield & giá vốn'],['bank-deposit-rates','Lãi huy động']]],
      [2,'Nợ sớm & dự phòng','Credit cost và chất lượng lợi nhuận.',[['bank-asset-quality','Chất lượng tài sản']]],
      [4,'Room & vốn','Dư địa tăng dư nợ và nhu cầu bổ sung vốn.',[['bank-safety','Tỷ lệ an toàn'],['bank-credit-room','Room tín dụng']]]
    ];
    rows=defs.map(([i,title,impact,links])=>{const m=monitors[i],meta=m?.querySelector('.cadence-note')?.textContent||'',state=m?.querySelector('.status')?.dataset.state;return item(title,meta.match(/Mới nhất:\s*(.*?) · Kỳ:/)?.[1]||'—',meta.match(/ · Kỳ:\s*(.*?) · Kiểm tra/)?.[1]||'Chưa có kỳ',state==='on'?'Cần chú ý':state==='na'?'Thiếu dữ liệu':'Theo dõi',impact,m?.querySelector('p:not(.cadence-note)')?.textContent.replace('Điều kiện theo dõi: ','')||'Cần bổ sung dữ liệu.',state==='na'?'Chưa có CAR/room để chấm dư địa.':'Điều kiện theo quy tắc toàn ngành; không phải đánh giá từng mã.',links,['all'])});
    const v=W?.blocks?.valuation,p=v?.data?.sector_daily?.find(x=>x[0]===v.price_date);
    rows.push(item('Kỳ vọng & định giá',p?'P/B ngành '+num(p[2],2)+'x':'Chưa có P/B đúng phiên',date(v?.price_date),'Chưa kết luận','Định giá cần đặt cạnh ROE, chất lượng tài sản và kỳ vọng lợi nhuận.','ROE bền vững hoặc kỳ vọng lợi nhuận đổi đủ để giải thích P/B.','P/B thấp chưa đủ kết luận rẻ; dự báo vĩ mô không phải consensus lợi nhuận bank.',[['bank-valuation','Định giá'],['bank-forecast','Dự báo'],['bank-news','Tin & CBTT']],['all']));
    rows.forEach(r=>{
      if(r.metric==='—'||!W){r.status='Thiếu dữ liệu'}
      else if(r.links.some(([id])=>W.blocks?.[id.replace(/^bank-/,'')]?.status==='error')){r.status='Chờ cập nhật';r.limit+=' Lần tải lỗi; đang giữ bản trước.'}
    });
    if(!p)rows.at(-1).status='Thiếu dữ liệu';
  }
  const filter=make('div','thesis-filter');signals.append(filter);
  const intro=make('p','thesis-scope',bank?'Theo dõi toàn ngành · Wi kiểm '+date(W?.checked_at)+'; mỗi số giữ kỳ riêng.':'Khung theo dõi · số liệu giữ đúng kỳ nguồn, không mặc định là hôm nay.');signals.append(intro);
  const grid=make('div','thesis-signals');signals.append(grid);
  rows.forEach((r,i)=>{
    const card=make('article','thesis-signal');card.dataset.groups=r.groups.join(',');
    const top=make('div','thesis-signal-top');top.append(make('h3','',r.title),make('span','thesis-state',r.status));card.append(top);
    if(['Thiếu dữ liệu','Chưa đủ số','Chưa xác minh','Chờ cập nhật'].includes(r.status))card.dataset.state='unknown';else if(r.status==='Cần chú ý')card.dataset.state='attention';
    card.append(make('strong','thesis-metric',r.metric),make('small','thesis-period',r.period));
    const impact=make('p','');impact.append(make('b','','Ảnh hưởng: '),r.impact);card.append(impact);
    const condition=make('p','');condition.append(make('b','','Đổi đánh giá khi: '),r.condition);card.append(condition);
    card.append(make('p','thesis-limitation',r.limit));
    const detail=make('details','thesis-evidence-links');detail.append(make('summary','','Xem bằng chứng'));
    const links=make('div','');r.links.forEach(([id,label])=>{const target=document.getElementById(id);if(!target)return;const a=make('a','',label+' ↗');a.href='#'+target.closest('.majorpane')?.dataset.tab;a.addEventListener('click',e=>{e.preventDefault();reveal(id)});links.append(a)});
    const all=make('button','','Theo dõi & nguồn của tab');all.type='button';all.addEventListener('click',()=>{view(1,true);board.scrollIntoView({block:'start'})});links.append(all);detail.append(links);card.append(detail);grid.append(card);
  });
  if(!bank){
    const label=make('label','','Góc nhìn doanh nghiệp');label.htmlFor='thesis-scope';const select=make('select','');select.id='thesis-scope';
    const opts=oil?[['all','Toàn chuỗi'],['upstream','Khai thác'],['services','Dịch vụ'],['gas','Khí'],['refining','Lọc dầu'],['distribution','Phân phối']]:[['all','Toàn ngành'],['cane','Tự chủ vùng mía'],['import','Phụ thuộc nguyên liệu nhập']];
    opts.forEach(([v,t])=>{const o=make('option','',t);o.value=v;select.append(o)});filter.append(label,select);
    select.addEventListener('change',()=>{[...grid.children].forEach(c=>c.hidden=select.value!=='all'&&!c.dataset.groups.split(',').includes(select.value));intro.textContent=oil?'Các tín hiệu liên quan '+select.selectedOptions[0].textContent.toLowerCase()+' · dữ liệu thị trường vẫn giữ phạm vi gốc.':select.value==='cane'?'Tự chủ mía: ưu tiên giá bán so giá mía, năng suất và độ bền vùng nguyên liệu.':select.value==='import'?'Nguyên liệu nhập: ưu tiên giá đường thô, tỷ giá, thuế và khả năng chuyển giá bán.':'Khung theo dõi toàn ngành · số liệu giữ đúng kỳ nguồn.'});
    if(!oil)select.addEventListener('change',()=>{
      const c=grid.children[1],raw=select.value==='import',cane=select.value==='cane';
      c.querySelector('h3').textContent=raw?'Giá bán & đường thô nhập':cane?'Giá bán & giá mía':rows[1].title;
      const impact=c.querySelector('p');impact.replaceChildren(make('b','','Ảnh hưởng: '),raw?'Giá đường thô, tỷ giá, thuế và khả năng chuyển giá bán.':cane?'Giá bán so chi phí mía; năng suất và tỷ lệ thu hồi đường.':rows[1].impact);
      c.querySelector('.thesis-limitation').textContent=raw?'Giá thế giới chưa phải giá vốn nhập về; chưa có spread cùng kỳ sau tỷ giá, thuế, logistics.':rows[1].limit;
      c.querySelectorAll('.thesis-evidence-links a').forEach(a=>{a.hidden=raw&&a.textContent.startsWith('Giá mía')});
    });
  }else{
    const go=make('button','','Chọn nhóm / mã ở bộ lọc ngân hàng ↑');go.type='button';go.addEventListener('click',()=>{document.getElementById('bank-group').focus();document.querySelector('.bank-filter').scrollIntoView({block:'center'})});filter.append(go);
    const snapshot=make('div','thesis-bank-snapshot');filter.after(snapshot);
    function selected(){
      const sym=document.getElementById('bank-ticker').value,group=document.getElementById('bank-group');snapshot.replaceChildren();
      if(sym==='all'){snapshot.textContent='Đang chọn '+group.selectedOptions[0].textContent+' · tín hiệu bên dưới là toàn ngành, chưa chấm riêng nhóm.';return}
      const r=W?.blocks?.['bank-ratios']?.data?.banks?.find(x=>x.symbol===sym),v=W?.blocks?.valuation?.data?.banks?.find(x=>x.symbol===sym);
      snapshot.append(make('b','',sym+' · '));snapshot.append(r?'NIM '+num(r.nim*100,2)+'% · NPL '+num(r.npl*100,2)+'% · ROE '+num(r.roe*100,1)+'%':'Chưa có chỉ số Wi cho mã này');
      if(v)snapshot.append(' · P/B '+num(v.pb,2)+'x');snapshot.append(make('small','','Chỉ số TTM Q2/2026 · P/B '+date(W?.blocks?.valuation?.price_date)+' · Wi. Trạng thái bên dưới vẫn là toàn ngành.'));
    }
    ['bank-group','bank-ticker'].forEach(id=>document.getElementById(id).addEventListener('change',selected));
    document.querySelectorAll('[data-player]').forEach(b=>b.addEventListener('click',selected));selected();
  }
  signals.append(make('p','thesis-assumption','Điều kiện theo dõi do AI đề xuất, chưa kiểm định thống kê. “Theo dõi” không đồng nghĩa thuận lợi; thiếu dữ liệu không được coi là bình thường.'));
  const scenarios=make('section','thesis-scenarios');scenarios.append(make('h3','','Kịch bản cần kiểm chứng'),make('p','thesis-scope','Tóm lược khung ngày '+stamp+' · chưa hiệu chỉnh; không gán xác suất hoặc giá mục tiêu.'));
  const scenarioNav=make('div','thesis-scenario-tabs');scenarioNav.setAttribute('role','tablist');scenarioNav.setAttribute('aria-label','Kịch bản');scenarios.append(scenarioNav);
  const conditions=bank?[
    ['Tín dụng và huy động cùng mở rộng; NIM ổn định, nợ sớm không tăng.','Thu nhập lãi và phí hỗ trợ tăng trưởng.','NIM suy giảm hoặc chất lượng tài sản xấu đi.'],
    ['Giá vốn hạ nhanh hơn lợi suất; vốn/room còn dư địa.','Biên và chi phí rủi ro cùng cải thiện.','Bao phủ yếu đi hoặc tăng trưởng che khuất nợ xấu.'],
    ['Huy động đắt lên, lãi đầu ra bị nén và nợ sớm tăng.','Lợi nhuận chịu áp lực từ biên, dự phòng và vốn.','Biên ổn định và chất lượng tài sản phục hồi có bằng chứng.']
  ]:oil?[
    ['Gián đoạn kéo dài, không leo thang; crack hạ nhiệt.','Giá và biên phân hóa theo khâu kinh doanh.','Dòng chảy phục hồi bền hoặc mất thêm nguồn cung vật chất.'],
    ['Leo thang gây mất thêm dòng chảy vật chất.','Upstream được hỗ trợ giá; khâu nhập hàng chịu áp lực.','Hormuz bình thường hóa, tồn kho sản phẩm phục hồi.'],
    ['Dòng chảy bình thường hóa và nhu cầu yếu.','Giá bán upstream và kỳ vọng đầu tư chịu sức ép.','Gián đoạn tăng trở lại hoặc cung–cầu thắt chặt hơn.']
  ]:[
    ['Giá đi ngang khi tồn kho chưa giảm rõ.','Biên phụ thuộc chi phí nguyên liệu và tốc độ bán hàng.','Tồn kho/tiêu thụ giảm hoặc áp lực cung tăng mạnh.'],
    ['Giá thế giới hồi phục, thực thi chống cạnh tranh bất hợp pháp hiệu quả hơn.','Khả năng tăng giá bán cải thiện nếu chi phí đầu vào phù hợp.','Tồn kho không giảm hoặc chi phí tăng nhanh hơn giá bán.'],
    ['Tồn kho tăng và giá thế giới giảm sâu hơn.','Giá bán, vòng quay hàng và biên chịu áp lực.','Tồn kho giảm bền cùng phục hồi giá bán.']
  ];
  const scenarioPanels=conditions.map((lines,i)=>{const p=make('div','thesis-scenario-panel');p.id='thesis-case-'+i;p.setAttribute('role','tabpanel');const range=oldScenarios[i]?.querySelector('.range')?.textContent;if(range)p.append(make('strong','',range+' · giả định lưu'));['Điều kiện','Tác động','Bác bỏ khi'].forEach((label,j)=>{const n=make('p','');n.append(make('b','',label+': '),lines[j]);p.append(n)});scenarios.append(p);return p});
  function scenario(i){scenarioPanels.forEach((p,j)=>{p.hidden=i!==j;const b=scenarioNav.children[j];b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1})}
  ['Cơ sở','Thuận lợi','Bất lợi'].forEach((label,i)=>{const b=make('button','',label);b.type='button';b.setAttribute('role','tab');b.id='thesis-case-tab-'+i;b.setAttribute('aria-controls',scenarioPanels[i].id);scenarioPanels[i].setAttribute('aria-labelledby',b.id);b.addEventListener('click',()=>scenario(i));scenarioNav.append(b)});keys([...scenarioNav.children],scenario);scenario(0);signals.append(scenarios);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const d=document.activeElement?.closest('.thesis-evidence-links');if(d){d.open=false;d.querySelector('summary').focus()}}});
  view(0);
  // Enter the requested tab at its decision board, avoiding the repeated hero.
  const enter=()=>requestAnimationFrame(()=>{view(0);board.scrollIntoView({block:'start',behavior:'instant'})});
  document.querySelectorAll('.majortabbtn')[4]?.addEventListener('click',enter);
  if(location.hash==='#mt5')enter();
})();
