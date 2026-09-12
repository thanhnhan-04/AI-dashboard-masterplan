/* Metadata is explicit in HTML: never infer ingestion requirements from chart titles. */
(() => {
  'use strict';
  const kinds = {public:'Dữ liệu công khai',periodic:'Dữ liệu định kỳ',document:'AI đọc tài liệu',ai:'AI phân tích',static:'Nội dung tĩnh',analyst:'Góc nhìn analyst',event:'Theo sự kiện'};
  const cadence = {daily:'hằng ngày giao dịch',weekly:'hằng tuần',monthly:'hằng tháng',quarterly:'hằng quý',annual:'hằng năm',semiannual:'2 lần/năm · T5, T11',event:'theo sự kiện',rare:'ít thay đổi',irregular:'theo công bố, không cố định','on-data-change':'khi dữ liệu thay đổi','on-demand':'khi có ý kiến riêng'};
  document.querySelectorAll('[data-update-kind]').forEach(block => {
    const badge = document.createElement('span'); badge.className='update-badge';
    const kind=block.dataset.updateKind, freq=cadence[block.dataset.cadence]||'chưa xác minh lịch';
    badge.textContent=kind==='periodic'?'Nguồn · '+freq:kind==='event'?'Theo kỳ / sự kiện':kinds[kind]+' · '+freq;
    badge.title='Lịch nguồn và kỳ dữ liệu được ghi riêng dưới chart. Tự động lấy số không đồng nghĩa tự tạo lại nhận định AI.';
    if(block.dataset.transform==='derived') badge.textContent+=' · Tính toán';
    block.prepend(badge);
  });
  const legend = document.createElement('div');legend.className='update-legend';legend.setAttribute('aria-label','Phân loại cập nhật dữ liệu');
  const label=document.createElement('strong');label.textContent='Loại nội dung';legend.append(label);
  Object.entries(kinds).filter(([k])=>k!=='periodic').concat([['monthly','Hằng tháng'],['quarterly','Hằng quý'],['annual','Hằng năm'],['semiannual','2 lần/năm']]).forEach(([kind,text])=>{const item=document.createElement('span');item.className='legend-item';item.dataset.updateKind=kinds[kind]?kind:'periodic';if(!kinds[kind])item.dataset.cadence=kind;item.textContent=text;legend.append(item)});
  const note=document.createElement('small');note.textContent='Lịch công bố ≠ kỳ dữ liệu ≠ lịch kiểm tra tự động · Nguồn và cách lấy số nằm dưới chart · ⓘ AI giải thích chart trong bối cảnh ngành';legend.append(note);
  const hero=document.querySelector('.hero');if(hero)hero.after(legend);

  let active=null, timer=null;
  const close=()=>{clearTimeout(timer);if(active){active.panel.hidden=true;active.button.setAttribute('aria-expanded','false');active.button.dataset.pinned='false';active=null}};
  const position=()=>{
    if(!active)return;
    const {button,panel}=active,r=button.getBoundingClientRect(),gap=8;
    const below=innerHeight-r.bottom-gap-12,above=r.top-gap-12;
    const down=below>=Math.min(300,above);
    panel.style.maxHeight=Math.min(480,Math.max(100,down?below:above))+'px';
    const w=panel.offsetWidth,h=panel.offsetHeight;
    panel.style.left=Math.max(12,Math.min(r.right-w,innerWidth-w-12))+'px';
    panel.style.top=Math.max(12,down?r.bottom+gap:r.top-gap-h)+'px';
  };
  const open=(button,panel)=>{clearTimeout(timer);if(active?.button!==button)close();active={button,panel};panel.hidden=false;button.setAttribute('aria-expanded','true');position()};
  const later=()=>{clearTimeout(timer);if(active?.button.dataset.pinned==='true')return;timer=setTimeout(()=>{if(!active?.panel.contains(document.activeElement)&&document.activeElement!==active?.button)close()},200)};
  function wire(button,panel){
    button.addEventListener('mouseenter',()=>open(button,panel));button.addEventListener('mouseleave',later);
    button.addEventListener('click',()=>{if(active?.button===button&&button.dataset.pinned==='true'){button.dataset.pinned='false';close()}else{button.dataset.pinned='true';open(button,panel)}});
    button.addEventListener('focus',()=>open(button,panel));button.addEventListener('blur',later);
    panel.addEventListener('mouseenter',()=>clearTimeout(timer));panel.addEventListener('mouseleave',later);
    panel.addEventListener('focusout',later);
    button.addEventListener('keydown',e=>{if(e.key==='Tab'&&!e.shiftKey&&active?.button===button){const link=panel.querySelector('summary,a[href]');if(link){e.preventDefault();link.focus()}}});
    panel.addEventListener('keydown',e=>{const links=[...panel.querySelectorAll('summary,a[href]')];if(e.key==='Tab'&&e.shiftKey&&document.activeElement===links[0]){e.preventDefault();button.focus()}else if(e.key==='Tab'&&!e.shiftKey&&document.activeElement===links.at(-1)){close();button.focus();close()}});
  }
  // Process inner chart blocks before their containing card so each note moves once.
  const blocks=[...document.querySelectorAll('.card,.viz-block')].reverse();
  blocks.forEach((block,index)=>{
    if(!block.querySelector('.chart-title'))return;
    const notes=[...block.querySelectorAll('.chart-insight,.conf-note,.signal-line')].filter(n=>n.closest('.card,.viz-block')===block&&!n.closest('.data-gap,.gap-row')&&!n.querySelector('.data-gap,.gap-row'));
    if(!notes.length)return;
    const heading=[...block.querySelectorAll('.chart-title,h3')].find(h=>h.closest('.card,.viz-block')===block);
    if(!heading)return;
    const title=heading.textContent.trim();
    const panel=document.createElement('div');panel.className='chart-info-panel';panel.id=`chart-info-${index}`;panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label',`AI giải thích trong bối cảnh ngành: ${title}`);
    const caption=document.createElement('div');caption.className='info-heading';caption.textContent=title;panel.append(caption);
    notes.filter(n=>n.classList.contains('chart-insight')).forEach(n=>panel.append(n));
    const historical=notes.filter(n=>!n.classList.contains('chart-insight'));
    if(historical.length){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Nhận định lưu từ bản chụp '+(historical[0].dataset.snapshotAt||'trước');details.append(summary);historical.forEach(n=>details.append(n));panel.append(details)}
    const button=document.createElement('button');button.type='button';button.className='chart-info-button';button.textContent='i';button.setAttribute('aria-label',`AI giải thích trong bối cảnh ngành: ${title}`);button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',panel.id);
    heading.append(button);document.body.append(panel);
    wire(button,panel);
  });
  window.ChartCards?.compact();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){const {button,panel}=active;if(panel.contains(document.activeElement))button.focus();button.dataset.pinned='false';close()}});
  document.addEventListener('pointerdown',e=>{if(active&&!active.panel.contains(e.target)&&!active.button.contains(e.target))close()});
  window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
  document.querySelectorAll('.majortabbtn,.tabbtn,.inventory-tabs button,.supply-tabs button').forEach(b=>b.addEventListener('click',close));
  document.querySelectorAll('.majortabbtn').forEach(b=>b.addEventListener('click',()=>window.scrollTo({top:0,behavior:'instant'})));
})();
