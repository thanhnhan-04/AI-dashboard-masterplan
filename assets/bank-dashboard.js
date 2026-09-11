(() => {
  'use strict';
  const content = window.BANK_CONTENT;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const frequency = {monthly:'tháng',quarterly:'quý',daily:'ngày',event:'sự kiện',irregular:'theo công bố, không cố định',unverified:'chưa xác minh lịch công bố'};
  const date = v => v ? new Date(v).toLocaleDateString('vi-VN') : 'Chưa kiểm tra';
  const n = v => Number.isFinite(v) ? v.toLocaleString('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';

  for (const block of content.blocks) {
    const host = $(`[data-blocks="${block.tab}"]`);
    if (!host) continue;
    const card = document.createElement('article');
    card.className='card'; card.id='bank-'+block.block_id;
    card.dataset.updateKind=block.update_kind;
    // An intended observation frequency is not evidence of publication cadence.
    card.dataset.cadence=block.publication_frequency==='unverified'?'unverified':block.publication_frequency;
    card.dataset.observationFrequency=block.observation_frequency;
    card.dataset.refreshStatus='missing';
    if(block.measure==='estimate')card.dataset.transform='derived';
    card.innerHTML=`<h3 class="chart-title">${esc(block.title)}</h3><p class="unit">${esc(block.unit)} · Việt Nam · kỳ ${frequency[block.observation_frequency]}</p>
      <div class="gap-empty"><strong>—</strong><span>${block.status==='pending-wi'?'Chờ Claude nối MCP Wi':block.status==='loaded-wi'?'Đang dựng biểu đồ Wi…':block.status==='error-wi'?'Wi lỗi, giữ bản trước':'Chưa có số đã xác minh'}</span></div>
      <p class="data-gap">${esc(block.limitation)}</p>
      <p class="source-links">Nguồn ${block.status==='pending-wi'?'dự kiến':''}: <a href="${esc(block.source_url)}" target="_blank" rel="noopener">${esc(block.source_group.length>120?block.source_group.slice(0,117)+'…':block.source_group)}</a></p>
      <p class="cadence-note">Quan sát: chưa có · Công bố: ${frequency[block.publication_frequency]} · Kiểm tra: ${date(block.last_checked_at)} · Job: chưa nối</p>
      <p class="source-note">Phương pháp nguồn: ${esc(block.source_group)}. Đơn vị chuẩn dự kiến ${esc(block.unit)}. Phải giữ metadata về kỳ, phạm vi, loại measure và nguồn gốc từng quan sát trước khi đưa vào biểu đồ. Không điền giá trị thiếu bằng 0 hoặc trộn số ngày với số quý.</p>
      <p class="chart-insight">AI · 11/09/2026 · Khung cơ chế, chưa phân tích dữ liệu thực tế: ${esc(block.insight)}</p>`;
    host.append(card);
  }

  function selectTab(key, setHash=true) {
    if(!$(`.majortabbtn[data-tab="${key}"]`))key='mt1';
    $$('.majortabbtn').forEach(b=>{const yes=b.dataset.tab===key;b.setAttribute('aria-selected',String(yes));b.tabIndex=yes?0:-1;});
    $$('.majorpane').forEach(p=>p.hidden=p.dataset.tab!==key);
    if(setHash)history.replaceState(null,'','#'+key);
  }
  $$('.majortabbtn').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.tab)));
  selectTab(/^#mt[1-7]$/.test(location.hash)?location.hash.slice(1):'mt1',false);
  window.addEventListener('hashchange',()=>selectTab(location.hash.slice(1),false));
  function keyboardTabs(selector) {
    $$(selector).forEach(b=>b.addEventListener('keydown',e=>{
      if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
      e.preventDefault(); const list=$$(selector), i=list.indexOf(b);
      const j=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;
      list[j].click();list[j].focus();
    }));
  }
  keyboardTabs('.majortabbtn');keyboardTabs('[data-geo]');keyboardTabs('[data-scenario]');
  $$('[data-geo]').forEach(b=>b.addEventListener('click',()=>{
    $$('[data-geo]').forEach(t=>{const yes=t===b;t.setAttribute('aria-selected',String(yes));t.tabIndex=yes?0:-1;});
    ['vn','world'].forEach(g=>$('#geo-pane-'+g).hidden=g!==b.dataset.geo);
  }));

  const watch = [
    ['Huy động vs tín dụng','funding','Chênh lệch tăng trưởng YoY tín dụng − tiền gửi tăng trong 3 tháng liên tiếp.','Áp lực giá vốn có thể tăng; kiểm thêm M2, nguồn ngoài tiền gửi và ON.'],
    ['Giá vốn & NIM','bank-ratios','Lãi huy động tăng, trong khi NIM giảm qua 2 quý cùng phạm vi.','Kiểm repricing, CASA và lãi đầu ra trước khi kết luận biên suy yếu bền vững.'],
    ['Nợ sớm & dự phòng','asset-quality','Nợ nhóm 2/NPL tăng 2 quý hoặc credit cost tăng trong khi bao phủ giảm.','Tăng trưởng tín dụng có thể chưa bù chi phí rủi ro; đối chiếu xử lý nợ và hoàn nhập.'],
    ['Thanh khoản & tỷ giá','omo','ON tăng kéo dài cùng OMO bơm ròng; đối chiếu USD/VND cùng ngày.','Khả năng nới lỏng cần được kiểm lại; một phiên tăng chưa đủ phát tín hiệu.'],
    ['Room & an toàn vốn','safety','Dư địa room hoặc khoảng cách tới ngưỡng áp dụng thu hẹp.','Kiểm kế hoạch vốn, huy động và cơ cấu tài sản; không tính headroom khi thiếu ngưỡng pháp lý.']
  ];
  function monitor(w){const b=content.blocks.find(x=>x.block_id===w[1]);return `<article class="monitor-item"><span class="status">Chưa đánh giá · thiếu dữ liệu</span><strong>${w[0]}</strong><p><b>Điều kiện theo dõi:</b> ${w[2]}</p><small>${w[3]}</small><p class="cadence-note">Mới nhất: — · Kỳ: chưa có · Kiểm tra: ${date(b.last_checked_at)}</p><a href="#mt${b.tab}">Nguồn & dữ liệu cần kiểm ↗</a></article>`;}
  $('#overview-watch').innerHTML=watch.map(monitor).join('');
  $('#catalyst-watch').innerHTML=watch.map(monitor).join('');
  const scenarios={base:'Cơ sở: tín dụng và huy động cùng mở rộng, NIM ổn định, nợ sớm không tăng; thu phí bổ sung lợi nhuận. Chỉ giữ kịch bản nếu các chuỗi cùng kỳ xác nhận.',up:'Thuận lợi: giá vốn hạ nhanh hơn lợi suất tài sản, room và vốn còn dư địa, thu phí tăng, credit cost giảm mà bao phủ không yếu đi. Kiểm nguy cơ tăng trưởng dư nợ làm đẹp tỷ lệ NPL.',down:'Bất lợi: huy động đắt lên, lãi đầu ra bị nén, nợ nhóm 2/NPL tăng và CAR/thanh khoản hạn chế tăng trưởng. Kiểm mức trích lập thực tế, hoàn nhập và khả năng bổ sung vốn.'};
  function scenario(key){$$('[data-scenario]').forEach(b=>{const yes=b.dataset.scenario===key;b.setAttribute('aria-selected',String(yes));b.tabIndex=yes?0:-1;});$('#scenario-detail').textContent=scenarios[key];$('#scenario-detail').setAttribute('aria-labelledby','scenario-'+key);}
  $$('[data-scenario]').forEach(b=>b.addEventListener('click',()=>scenario(b.dataset.scenario)));scenario('base');

  const filter = document.createElement('div');filter.className='bank-filter';
  filter.innerHTML='<label for="bank-group">Nhóm</label><select id="bank-group"><option value="all">Tất cả ngân hàng</option>'+Object.entries(content.groups).map(([id,g])=>`<option value="${id}">${g.label}</option>`).join('')+'</select><label for="bank-ticker">Ngân hàng</label><select id="bank-ticker"></select><p>Bộ lọc dành cho bảng so sánh ở tab 07 và góc nhìn analyst ở tab 05. Biểu đồ Eximbank, vốn IFC và số toàn hệ thống giữ phạm vi ghi trên từng card.</p>';
  $('.major-tabs').after(filter);
  const bankList=Object.entries(content.groups).flatMap(([group,g])=>g.tickers.map(ticker=>({ticker,group,label:g.label})));
  function choices(){const group=$('#bank-group').value;return bankList.filter(b=>group==='all'||b.group===group);}
  function fillTickers(){const old=$('#bank-ticker').value;$('#bank-ticker').innerHTML='<option value="all">Toàn bộ nhóm</option>'+choices().map(b=>`<option>${b.ticker}</option>`).join('');if(choices().some(b=>b.ticker===old))$('#bank-ticker').value=old;}
  function comparison(){const ticker=$('#bank-ticker').value;$('#bank-rows').innerHTML=choices().filter(b=>ticker==='all'||b.ticker===ticker).map(b=>`<tr><td><b>${b.ticker==='AGRIBANK'?'Agribank':b.ticker}</b></td><td>${b.label}</td><td>—</td><td>—</td><td>—</td><td>—</td><td>${b.ticker==='AGRIBANK'?'Không áp dụng':'—'}</td><td>Chưa có kỳ · chờ Wi</td></tr>`).join('');}
  $('#players').innerHTML=Object.entries(content.groups).map(([id,g])=>`<article class="player"><h3>${g.label}</h3>${g.tickers.map(t=>`<button data-player="${t}" data-group="${id}">${t==='AGRIBANK'?'Agribank':t}</button>`).join('')}<p>Chọn mã để lọc bảng và góc nhìn riêng.</p></article>`).join('');
  fillTickers();comparison();
  let noteKey='';
  function loadNote(){
    noteKey='finsuccess.bank.analyst.v1.'+$('#bank-group').value+'.'+$('#bank-ticker').value;
    try{const note=JSON.parse(localStorage.getItem(noteKey)||'{}');$('#analyst-author').value=note.author||'';$('#analyst-note').value=note.text||'';$('#note-status').textContent=note.saved_at?'Bản lưu '+new Date(note.saved_at).toLocaleString('vi-VN'):'Chưa có góc nhìn riêng cho lựa chọn này.';}
    catch{$('#analyst-author').value='';$('#analyst-note').value='';$('#note-status').textContent='Trình duyệt không đọc được bản lưu. Có thể xuất JSON để giữ bản sao.';}
  }
  function saveNote(){const note={owner:'analyst',author:$('#analyst-author').value.trim(),text:$('#analyst-note').value,scope:noteKey,saved_at:new Date().toISOString()};try{localStorage.setItem(noteKey,JSON.stringify(note));$('#note-status').textContent='Đã lưu trên trình duyệt · '+new Date(note.saved_at).toLocaleString('vi-VN');return note;}catch{$('#note-status').textContent='Không lưu được trong trình duyệt. Hãy xuất bản sao JSON.';return note;}}
  $('#save-note').addEventListener('click',saveNote);
  // Save drafts before scope changes, without attributing generated content to analyst.
  function saveDraft(){if($('#analyst-author').value||$('#analyst-note').value)saveNote();}
  $('#bank-group').addEventListener('change',()=>{saveDraft();fillTickers();comparison();loadNote();});
  $('#bank-ticker').addEventListener('change',()=>{saveDraft();comparison();loadNote();});
  $$('[data-player]').forEach(b=>b.addEventListener('click',()=>{saveDraft();$('#bank-group').value=b.dataset.group;fillTickers();$('#bank-ticker').value=b.dataset.player;comparison();loadNote();$('#bank-ticker').focus();}));
  $('#export-note').addEventListener('click',()=>{const note=saveNote(),url=URL.createObjectURL(new Blob([JSON.stringify(note,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='bank-analyst-note.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});loadNote();

  const publicData=window.BANK_PUBLIC_DATA||{points:[],status:'missing'};
  const points=publicData.points||[];
  const analysisDataHash='00a61cec63e98e444945c7ef6565a989850757848479a6c5d3bc6ac23dc00e70';
  const needsAnalysis=!!publicData.data_hash && publicData.data_hash!==analysisDataHash;
  $$('.external-meta').forEach(h=>{
    h.closest('.card').dataset.refreshStatus=publicData.status==='loaded'?'loaded':'snapshot';
    h.closest('.card').dataset.analysisVersion=analysisDataHash;
    h.closest('.card').dataset.analysisStatus=needsAnalysis?'needs-review':'current';
  });
  const tooltip=document.createElement('div');tooltip.className='chart-tooltip';tooltip.hidden=true;document.body.append(tooltip);
  function chart(id,series,rows){
    const host=$('#'+id);
    if(!rows.length){host.innerHTML='<div class="gap-empty">Không có dữ liệu nguồn hợp lệ.</div>';return;}
    const W=innerWidth<700?340:580,H=255,L=48,R=20,T=20,B=34;
    const vals=series.flatMap(s=>rows.map(r=>r[s.key])).filter(Number.isFinite);
    if(!vals.length){host.innerHTML='<div class="gap-empty">Không có dữ liệu nguồn hợp lệ.</div>';return;}
    const min=Math.max(0,Math.floor((Math.min(...vals)-.3)*2)/2),max=Math.ceil((Math.max(...vals)+.3)*2)/2;
    const x=i=>L+(W-L-R)*(rows.length===1?.5:i/(rows.length-1));
    const y=v=>T+(H-T-B)*(max-v)/(max-min);
    let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${id==='eib-spread'?'Chênh lệch lãi suất':'Lãi suất cho vay'} Eximbank; bảng số gốc ngay bên dưới">`;
    for(let i=0;i<=4;i++){const v=min+(max-min)*i/4;svg+=`<path d="M${L} ${y(v)}H${W-R}" stroke="#d9e1ed"/><text x="${L-9}" y="${y(v)+4}" text-anchor="end">${n(v)}</text>`;}
    rows.forEach((r,i)=>svg+=`<text x="${x(i)}" y="${H-9}" text-anchor="middle">T${Number(r.date.slice(5,7))}/${r.date.slice(2,4)}</text>`);
    series.forEach(s=>{
      let path='';let previous=null;
      rows.forEach((r,i)=>{
        const month=Number(r.date.slice(0,4))*12+Number(r.date.slice(5,7)),valid=Number.isFinite(r[s.key]);
        if(valid)path+=(previous!==null&&month-previous===1?'L':'M')+x(i)+' '+y(r[s.key]);
        previous=valid?month:null;
      });
      svg+=`<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.5"/>`;
      rows.forEach((r,i)=>{if(!Number.isFinite(r[s.key]))return;const text=`${s.label} · ${date(r.date)}: ${n(r[s.key])} ${s.key==='spread'?'điểm %':'%/năm'}`;svg+=`<circle cx="${x(i)}" cy="${y(r[s.key])}" r="4" fill="${s.color}" tabindex="0" aria-label="${esc(text)}" data-tip="${esc(text)}"><title>${esc(text)}</title></circle>`;});
    });host.innerHTML=svg+'</svg>';
    host.querySelectorAll('[data-tip]').forEach(dot=>{
      const show=()=>{const r=dot.getBoundingClientRect();tooltip.textContent=dot.dataset.tip;tooltip.hidden=false;tooltip.style.left=Math.max(8,Math.min(r.x,innerWidth-tooltip.offsetWidth-8))+'px';tooltip.style.top=Math.max(8,r.y-tooltip.offsetHeight-9)+'px';};
      dot.addEventListener('mouseenter',show);dot.addEventListener('focus',show);dot.addEventListener('click',show);dot.addEventListener('mouseleave',()=>tooltip.hidden=true);dot.addEventListener('blur',()=>tooltip.hidden=true);
    });
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape')tooltip.hidden=true;});document.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-tip]'))tooltip.hidden=true;});window.addEventListener('scroll',()=>tooltip.hidden=true,true);
  function renderRates(){const windowValue=$('#rate-window').value,rows=windowValue==='all'?points:points.slice(-Number(windowValue));chart('eib-lending',[{key:'lending',label:'Toàn bộ',color:'#167b79'},{key:'retail',label:'Cá nhân',color:'#426cba'},{key:'corporate',label:'Doanh nghiệp',color:'#ad724d'}],rows);chart('eib-spread',[{key:'spread',label:'Chênh lệch',color:'#7862a4'}],rows);$('#eib-table').innerHTML='<table><thead><tr><th>Kỳ thực tế</th><th>Toàn bộ (%/năm)</th><th>Cá nhân (%/năm)</th><th>Doanh nghiệp (%/năm)</th><th>Chênh lệch (điểm %)</th></tr></thead><tbody>'+rows.map(r=>`<tr><td>${date(r.date)}</td><td>${n(r.lending)}</td><td>${n(r.retail)}</td><td>${n(r.corporate)}</td><td>${n(r.spread)}</td></tr>`).join('')+'</tbody></table>';}
  renderRates();$('#rate-window').addEventListener('change',renderRates);
  window.addEventListener('resize',renderRates);
  const meta=`<p class="source-links">Nguồn: <a href="https://eximbank.com.vn/tin-tuc/lai-suat-binh-quan-thang-trong-nam-2026" target="_blank" rel="noopener">Eximbank · công bố lãi suất 2026</a></p><p class="cadence-note">Quan sát mới nhất: ${date(publicData.latest_observation)} · Kỳ dữ liệu: tháng · Công bố: theo công bố, không cố định · Kiểm tra: ${date(publicData.last_checked_at)} · Tải thành công: ${date(publicData.last_success_at)} · Job: kiểm hằng ngày 06:15 (máy phải hoạt động)</p><p class="source-note">Phương pháp: đọc bảng tháng có ngày báo cáo trên trang Eximbank. Giữ nguyên lãi suất bình quân chung, cá nhân, doanh nghiệp và chênh lệch do bank công bố. Không suy ra NIM từ chênh lệch. Bảng là số thực hiện, đơn vị phần trăm/năm; chênh lệch trình bày điểm phần trăm.</p>${publicData.status==='error'?'<p class="data-gap">Lần tải gần nhất lỗi; đang giữ dữ liệu thành công trước đó nếu có.</p>':''}${needsAnalysis?'<p class="data-gap">Dữ liệu đã thay đổi; insight AI ngày 11/09/2026 cần phân tích lại.</p>':''}`;
  $$('.external-meta').forEach(h=>h.innerHTML=meta);
  const first=points[0],last=points.at(-1);
  $('#eib-summary').textContent=last?`Tóm tắt theo quy tắc · ${date(first.date)} → ${date(last.date)}: lãi cho vay bình quân ${n(first.lending)}% → ${n(last.lending)}%; chênh lệch công bố ${n(first.spread)} → ${n(last.spread)} điểm %. Đây là số Eximbank, chưa kết luận toàn ngành.`:'Chưa có dữ liệu lãi suất công khai hợp lệ.';
  $('#source-rows').innerHTML=content.blocks.map(b=>`<tr class="gap-row"><td><b>${esc(b.title)}</b><small>${b.block_id}</small></td><td><a href="${esc(b.source_url)}" target="_blank" rel="noopener">${esc(b.source_group)}</a></td><td>${frequency[b.observation_frequency]}<small>${frequency[b.publication_frequency]}</small></td><td>${date(b.last_checked_at)}<small>${b.status==='pending-wi'?'Chờ Claude nối Wi':b.status==='loaded-wi'?'Đã nối Wi':b.status==='error-wi'?'Wi lỗi, giữ bản trước':'Chưa có số xác minh'}</small></td><td>${esc(b.limitation)}</td></tr>`).join('')+`<tr><td>Eximbank · lãi suất<small>eib_lending_2026</small></td><td><a href="${esc(publicData.source_url||'https://eximbank.com.vn/')}" target="_blank" rel="noopener">Eximbank</a></td><td>Tháng / theo công bố</td><td>${date(publicData.last_checked_at)}<small>${esc(publicData.status)} · ${date(publicData.latest_observation)}</small></td><td>Một bank; không phải NIM; dữ liệu năm 2026.</td></tr>`;
  $('#coverage-count').textContent=content.blocks.filter(b=>b.status==='pending-wi').length+' block chờ Wi · '+content.blocks.filter(b=>b.status==='loaded-wi').length+' block Wi đã nối';
  $('#source-rows').insertAdjacentHTML('beforeend',content.verified_sources.map(s=>`<tr><td><b>${esc(s.source_group)}</b><small>${esc(s.block_id)}</small></td><td><a href="${esc(s.source_url)}" target="_blank" rel="noopener">${esc(s.source_group)}</a></td><td>Sự kiện<small>Theo công bố, không cố định</small></td><td>${date(s.last_checked_at)}<small>Snapshot · mốc ${date(s.latest_observation)}</small></td><td>${esc(s.limitation)}</td></tr>`).join(''));
})();
