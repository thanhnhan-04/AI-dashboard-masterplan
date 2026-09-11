/* Value chains, geographic navigation, and clearly separated faster price feeds. */
(() => {
'use strict';
const oil=!!document.getElementById('chCurve'),src=window.SECTOR_DAILY?.sources||{};
const fmt=(v,n=2)=>v.toLocaleString('vi-VN',{maximumFractionDigits:n});
const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text)e.textContent=text;return e};
const chain=document.querySelector(`[data-block-id="${oil?'dau-khi':'sugar'}-01"]`);
if(chain){
 const grid=chain.parentElement;grid.before(chain);chain.classList.add('value-chain-card');grid.style.gridTemplateColumns='1fr';
 const heading=chain.querySelector('h3');heading.classList.add('chart-title');
 const old=[...chain.children].filter(e=>e!==heading);old.forEach(e=>{e.classList.add('conf-note');e.dataset.snapshotAt=oil?'03/09/2026':'17/08/2026'});
 const nodes=oil?[
 ['importgas',25,100,['LNG nhập khẩu']],['domestic',25,230,['Khai thác trong nước','PVN / PVEP, nhà thầu']],['importoil',25,355,['Dầu thô nhập khẩu']],
 ['gas',315,100,['Thu gom • xử lý • tái hóa khí','GAS và hạ tầng khí']],['refine',315,330,['Nhà máy lọc dầu','BSR • Nghi Sơn']],
 ['power',655,75,['Điện khí • đạm','Khách hàng công nghiệp']],['retail',655,315,['Phân phối xăng dầu','PLX • OIL']],['use',925,315,['Vận tải • sản xuất','Người tiêu dùng']],
 ['service',315,445,['Dịch vụ hỗ trợ khai thác','PVD • PVS • PVB']],['transport',655,445,['Vận tải dầu / sản phẩm','PVT • PVP']]
 ]:[
 ['cane',25,100,['Vùng nguyên liệu mía','Nông dân / vùng liên kết']],['raw',25,245,['Đường thô nhập khẩu']],['refined',25,375,['Đường thành phẩm nhập']],
 ['mill',335,100,['Ép mía • chế biến đường','SBT • QNS • SLS • LSS • KTS']],['refinery',335,245,['Tinh luyện đường thô']],['product',625,170,['Đường RS / RE']],
 ['b2b',925,85,['Khách hàng công nghiệp','Đồ uống • bánh kẹo • sữa']],['b2c',925,230,['Bán lẻ / phân phối','Người tiêu dùng']],['hfcs',625,375,['HFCS nhập khẩu','Chất tạo ngọt thay thế']]
 ];
 const edges=oil?[
 ['importgas','gas'],['domestic','gas'],['domestic','refine'],['importoil','refine'],['gas','power'],['refine','retail'],['retail','use'],['service','domestic',true],['transport','refine',true]
 ]:[['cane','mill'],['raw','refinery'],['mill','product'],['refinery','product'],['product','b2b'],['product','b2c'],['refined','b2c'],['hfcs','b2b',true]];
 const w=oil?215:220,h=65,byId=Object.fromEntries(nodes.map(n=>[n[0],n]));
 const paths=edges.map(([a,b,dashed],edgeIndex)=>{const A=byId[a],B=byId[b],forward=B[1]>A[1],x1=A[1]+(forward?w:0),x2=B[1]+(forward?0:w),y1=A[2]+h/2,y2=B[2]+h/2,mid=(x1+x2)/2;const custom=oil?{ 'domestic:gas':'M240 245 H285 V150 H315', 'domestic:refine':'M240 270 H265 V350 H315', 'service:domestic':'M315 477 H250 V285 H240', 'transport:refine':'M655 477 H610 V380 H530' }:{'refined:b2c':'M245 407 H900 V280 H925','hfcs:b2b':'M845 407 H875 V135 H925'};const route=custom[a+':'+b]||`M${x1} ${y1} H${mid} V${y2} H${x2}`;return `<path d="${route}" class="chain-edge ${dashed?'support':''}" marker-end="url(#chain-arrow)"/>`}).join('');
 const boxes=nodes.map(([id,x,y,lines])=>`<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" class="chain-node"/><text x="${x+w/2}" y="${y+(lines.length===1?37:27)}" text-anchor="middle">${lines.map((t,i)=>`<tspan x="${x+w/2}" dy="${i?21:0}">${t}</tspan>`).join('')}</text></g>`).join('');
 const figure=make('div','value-chain-scroll');figure.tabIndex=0;figure.setAttribute('aria-label','Sơ đồ chuỗi giá trị; có thể cuộn ngang trên màn hình nhỏ');
 figure.innerHTML=`<svg viewBox="0 0 1170 ${oil?535:465}" role="img" aria-labelledby="chain-title chain-desc"><title id="chain-title">Chuỗi giá trị ngành ${oil?'dầu khí':'đường'}</title><desc id="chain-desc">${oil?'Dầu và khí đi theo hai nhánh chế biến riêng. Dịch vụ kỹ thuật hỗ trợ khai thác; vận tải hỗ trợ luân chuyển dầu và sản phẩm.':'Mía nội địa và đường thô nhập đi qua chế biến, cung cấp đường cho khách hàng công nghiệp và bán lẻ. Đường nhập và HFCS tạo cạnh tranh.'}</desc><defs><marker id="chain-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#578179"/></marker></defs>${['ĐẦU VÀO / THƯỢNG NGUỒN','CHẾ BIẾN / TRUNG NGUỒN','ĐẦU RA / KHÁCH HÀNG'].map((t,i)=>`<rect x="${[0,290,640][i]}" y="0" width="${[275,335,525][i]}" height="${oil?530:460}" rx="12" fill="${['#edf5fc','#f0f7ef','#fff4e7'][i]}"/><text x="${[137,457,902][i]}" y="33" text-anchor="middle" class="chain-lane">${t}</text>`).join('')}${paths}${boxes}</svg>`;
 heading.after(figure);chain.append(make('div','chart-insight',oil?'AI · cách đọc chuỗi: Theo từng nhánh dầu và khí để xác định biến lợi nhuận. Lọc dầu nhạy với crack và công suất vận hành; phân phối nhạy với giá vốn và tồn kho; khí nhạy với sản lượng tiêu thụ và điều khoản giá. Dịch vụ kỹ thuật hưởng tác động qua đầu tư và tiến độ dự án, thường có độ trễ so với giá dầu.':'AI · cách đọc chuỗi: Tách doanh nghiệp tự chủ vùng mía với doanh nghiệp phụ thuộc đường thô nhập để hiểu độ nhạy giá nguyên liệu. Đầu ra công nghiệp và bán lẻ có cơ chế giá khác nhau; đường nhập và HFCS làm thay đổi khả năng chuyển chi phí sang khách hàng.'));
 const legend=make('div','source-note','Mũi tên liền: luồng hàng chính · Mũi tên đứt: '+(oil?'dịch vụ hỗ trợ; không phải bước biến đổi dầu thành khí.':'quan hệ thay thế tại khách hàng công nghiệp.')+' Sơ đồ không biểu thị tỷ trọng hay quan hệ sở hữu.');figure.after(legend);
}
function card(id,title,subtitle,kind='public',cadence='daily'){
 const c=make('div','card');Object.assign(c.dataset,{blockId:id,updateKind:kind,cadence});c.append(make('div','chart-title',title),make('div','chart-sub',subtitle));return c;
}
function source(c,s,method){
 c.dataset.refreshStatus=s.status==='ok'?'loaded':'last-good';c.dataset.sourceIds=Object.keys(src).find(k=>src[k]===s)||'';
 const row=make('div','source-note');const a=make('a','',s.source_name);a.href=s.source_url;a.target='_blank';a.rel='noopener';row.append('Nguồn: ',a,` · ${s.observation_frequency==='marketing year'?'Niên vụ bắt đầu: '+s.latest_observation.slice(0,4):'Kỳ cuối: '+s.latest_observation} · Kiểm tra: ${s.last_checked_at?.slice(0,10)||'—'}`);c.append(row);
 if(s.status!=='ok')c.append(make('div','refresh-note is-stale','Lần tải mới lỗi; giữ dữ liệu tốt gần nhất.'));
 c.append(make('div','source-note method-note',method));
}
// Faster futures stay separate from spot and physical-margin calculations.
const key=oil?'brent_futures':'sugar_futures',feed=src[key];
if(feed?.records?.length){
 const c=card('fast-price',oil?'Brent futures — theo dõi giá hằng ngày':'Đường No.11 futures — theo dõi giá hằng ngày',`${oil?'USD/thùng':'US cent/lb'} · Đóng cửa phiên hoàn tất · Futures, không phải spot`);
 const h=make('div');h.id='chFastPrice';c.append(h);
 const rs=feed.records.slice(-90);c.querySelector('.chart-sub').append(` · ${fmt(rs.at(-1).value)} (${rs.at(-1).date})`);
 document.querySelector('.majorpane[data-tab="mt3"] .sectionhead').after(c);
 barLineChart(h.id,{categories:rs.map(r=>r.date),series:[{name:oil?'Brent futures':'Sugar No.11 futures',kind:'line',color:'#268a76',values:rs.map(r=>r.value)}],unit:oil?'USD/thùng':'US cent/lb',digits:2,height:250,zeroBase:false});
 source(c,feed,`API Yahoo Finance chart, mã ${oil?'BZ=F':'SB=F'}, chuỗi hợp đồng gần tự chuyển kỳ; 90 phiên gần nhất, loại phiên chưa hoàn tất theo múi giờ sàn. Nguồn không chính thức; giá close không phải settlement. Chuyển hợp đồng có thể tạo bước nhảy. ${oil?'Không thay Brent spot EIA trong phép tính crack.':'Đơn vị nguồn USX = US cent/lb; không ghép trực tiếp với chuỗi World Bank USD/kg.'}`);
 c.append(make('div','chart-insight',oil?'AI · bối cảnh ngành: Futures giúp theo dõi phản ứng giá nhanh hơn chuỗi spot công khai. Giá tăng chỉ là tín hiệu đầu vào: lợi nhuận lọc dầu phụ thuộc crack, còn phân phối phụ thuộc tồn kho và chu kỳ điều hành. Chênh lệch futures–spot còn chịu ảnh hưởng kỳ hạn và ngày quan sát.':'AI · bối cảnh ngành: Đường No.11 phản ánh kỳ vọng giá đường thô quốc tế, hữu ích theo dõi chi phí nhập cho nhà tinh luyện. Tác động tới giá đường nội địa còn qua tỷ giá, thuế, logistics và tồn kho; futures tăng không bảo đảm doanh nghiệp mía đường tăng biên ngay.'));
}
if(!oil&&src.sugar_monthly?.records?.length){
 const s=src.sugar_monthly,rs=s.records.slice(-24),c=document.getElementById('chWorldRecent').closest('.card');
 lineChart('chWorldRecent',{labels:rs.map(r=>r.date.slice(0,7)),values:rs.map(r=>r.value),color:'#1f4e9c',unit:'USD/kg',digits:2,seriesName:'Đường thế giới · World Bank'});
 fillTable('tbl-world-recent',['Tháng','USD/kg'],rs.map(r=>[r.date.slice(0,7),fmt(r.value)]));
 source(c,s,'Tải file Monthly Prices của World Bank; chọn đúng cột Sugar, world và đơn vị USD/kg. Kỳ dữ liệu là bình quân tháng; ngày cuối tháng dùng làm khóa kỳ, không phải báo giá ngày. Bộ tải kiểm tra mỗi ngày và chỉ thay số khi World Bank công bố.');
 const originalNote=c.querySelector('.source-note:not(.cadence-note)');if(originalNote&&!originalNote.classList.contains('method-note'))originalNote.remove();
 const annual=window.SectorMath.aggregate(s.records,'value','year','mean').filter(r=>r.count===12),long=document.getElementById('chWorldLong').closest('.card');
 barLineChart('chWorldLong',{categories:annual.map(r=>r.date),series:[{name:'Đường thế giới',color:'#1f4e9c',values:annual.map(r=>r.value)}],unit:'USD/kg',digits:2,height:250});fillTable('tbl-world-long',['Năm đủ 12 tháng','USD/kg'],annual.map(r=>[r.date,fmt(r.value)]));
 long.querySelector('.chart-title').textContent='Giá đường thế giới — bình quân năm hoàn tất';long.querySelector('.chart-sub').textContent='USD/kg · Chỉ lấy năm có đủ 12 tháng; năm hiện tại xem chart tháng';source(long,s,'Bình quân số học 12 giá tháng World Bank. Chỉ hiển thị các năm đủ 12 quan sát; không so bình quân YTD với cả năm.');
 const kpi=document.getElementById('spk-world').closest('.kpi');kpi.querySelector('.value').textContent=fmt(rs.at(-1).value);kpi.querySelector('.sub').textContent='USD/kg · '+rs.at(-1).date.slice(0,7)+' · World Bank';kpi.querySelector('.delta').textContent='Bình quân tháng mới nhất';document.getElementById('spk-world').replaceChildren();sparkline('spk-world',rs.slice(-8).map(r=>r.value),'#1f4e9c');
 const cycle=document.querySelector('[data-block-id="sugar-02"] p');cycle.textContent='Giá đường thế giới bình quân '+rs.at(-1).date.slice(0,7)+' đạt '+fmt(rs.at(-1).value)+' USD/kg. Đọc hướng thay đổi cùng tồn kho nội địa và giá nhập quy đổi; tránh kết luận vị trí chu kỳ từ giá đơn lẻ. Số tồn kho trong tab Cung–Cầu giữ nguyên kỳ nguồn và trạng thái ước tính.';
 const old=document.querySelector('.hero .insight');if(old){const details=make('details','summary-archive'),summary=make('summary','','Bản phân tích AI lưu 17/08/2026');details.append(summary);old.before(details);details.append(old);old.classList.remove('insight');const fresh=make('div','insight','Đọc nhanh từ dữ liệu: Giá đường World Bank bình quân '+rs.at(-1).date.slice(0,7)+' là '+fmt(rs.at(-1).value)+' USD/kg. Futures No.11 có chuỗi ngày riêng ở tab Giá–Chi phí–Margin. Cân đối Việt Nam vẫn theo niên vụ USDA; cần đọc kỳ ước tính và tồn kho cùng giá nhập quy đổi trước khi kết luận biên lợi nhuận.');Object.assign(fresh.dataset,{updateKind:"ai",cadence:"on-data-change",inputOwner:"rule-based"});details.before(fresh)}
 const monitor=document.querySelector('.monitor-item');if(monitor){monitor.querySelector('strong').textContent=fmt(rs.at(-1).value)+' USD/kg';monitor.querySelector('a').textContent='World Bank · tháng '+rs.at(-1).date.slice(0,7)}
}
// Geographic tabs separate source scope, preserving all existing limitation elements.
const section=document.querySelector('.majorpane[data-tab="mt2"] .section'),head=section.querySelector('.sectionhead');
const children=[...section.children].filter(e=>e!==head),world=make('div','supply-pane'),vn=make('div','supply-pane');world.id='supply-world';vn.id='supply-vietnam';section.append(world,vn);
if(oil){let vietnam=false;children.forEach(e=>{if(e.matches('h3')&&e.textContent.includes('Việt Nam'))vietnam=true;(vietnam?vn:world).append(e)})}
else{
 children.forEach(e=>vn.append(e));head.querySelector('h2').textContent='2. Cung – cầu – tồn kho đường';head.querySelector('p').textContent='Thế giới: các trung tâm sản xuất đường lớn. Việt Nam: cân đối USDA theo niên vụ và dữ liệu mía theo công bố trong nước.';
 const s=src.sugar_producers,c=card('sugar-world-production','Các trung tâm cung đường thế giới','Triệu tấn, giá trị thô · Năm bắt đầu niên vụ của từng thị trường · Kỳ mới có thể là ước tính/dự báo','periodic','semiannual');world.append(c);
 if(s?.records?.length){const h=make('div');h.id='chSugarProducers';c.append(h);const rs=s.records.slice(-12);const countries=[['Brazil','brazil','#268a76'],['Ấn Độ','india','#d69537'],['Thái Lan','thailand','#8664aa'],['EU','eu','#427ca5']];barLineChart(h.id,{categories:rs.map(r=>String(r.market_year)+(r.market_year>=2025?'*':'')),series:countries.map(([name,key,color])=>({name,kind:'line',color,values:rs.map(r=>r[key])})),unit:'triệu tấn',digits:1,height:290});
 const legend=make('div','legend');countries.forEach(([name,,color])=>{const item=make('span','li',name);item.style.color=color;legend.append(item)});c.append(legend);
 source(c,s,'USDA PSD, Sugar Centrifugal, Production; nghìn tấn quy đổi giá trị thô chia 1.000. Chọn Brazil, India, Thailand, European Union; không cộng các nước thành tổng thế giới. Năm trên trục là năm bắt đầu niên vụ địa phương, không cùng một kỳ lịch toàn cầu. * Kỳ gần nhất có thể được USDA ước tính/dự báo và điều chỉnh; lịch báo cáo đường tháng 5 và 11.');
 c.append(make('div','chart-insight','AI · bối cảnh ngành: Theo dõi sản lượng Brazil, Ấn Độ và Thái Lan để nhận diện thay đổi nguồn cung có thể giao dịch quốc tế. Sản lượng tăng chưa chắc xuất khẩu tăng nếu tiêu thụ, ethanol hoặc hạn chế xuất khẩu hấp thụ phần tăng. Đây là đối chiếu các trung tâm cung, chưa phải tổng cân bằng toàn cầu.'));
 }else c.append(make('div','source-note','Chưa tải được USDA PSD. Không suy diễn số liệu thế giới từ cân đối Việt Nam.'));
}
const tabs=make('div','supply-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Phạm vi cung cầu');
const panes=[world,vn];function select(i){panes.forEach((p,j)=>{p.hidden=i!==j;const b=tabs.children[j];b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1})}
['Thế giới','Việt Nam'].forEach((label,i)=>{const b=make('button','tabbtn',label);b.type='button';b.id='supply-tab-'+i;b.setAttribute('role','tab');b.setAttribute('aria-controls',panes[i].id);panes[i].setAttribute('role','tabpanel');panes[i].setAttribute('aria-labelledby',b.id);b.addEventListener('click',()=>select(i));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight'||e.key==='ArrowLeft')next=1-i;else if(e.key==='Home')next=0;else if(e.key==='End')next=1;if(next!==undefined){e.preventDefault();select(next);tabs.children[next].focus()}});tabs.append(b)});
head.after(tabs,world,vn);select(0);
})();
