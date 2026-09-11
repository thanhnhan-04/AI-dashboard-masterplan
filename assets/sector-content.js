/* AI-authored industry reading framework, separate from analyst's own views.
   All source notes remain inline. Cadence evidence is visible under each chart. */
(() => {
'use strict';
// Bank has its own explicit source registry and dated AI framework. Do not run
// legacy oil/sugar selectors against bank policy and catalyst panels.
if(document.body.dataset.sector==='bank'){
 window.SECTOR_CONTENT={bank:window.BANK_CONTENT};
 return;
}
const oil=!!document.getElementById('chCurve');
const EIA='https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm';
const WPSR='https://www.eia.gov/petroleum/supply/weekly/';
const USDA='https://esmis.nal.usda.gov/publication/sugar-world-markets-and-trade';
const WB='https://www.worldbank.org/en/research/commodity-markets';
const sources={
 chVnPrice:['irregular','mốc quan sát giá, không nội suy','VSSA qua báo chí; lịch không cố định',null],
 chRegional:['irregular','snapshot T7/2026','Bài báo trích VSSA ngày 16/08/2026',null],
 chCaneCrush:['irregular','niên vụ','VSSA / công bố nhà máy, chưa có lịch phát hành ổn định',null],
 chCaneArea:['irregular','niên vụ; các năm thiếu để trống','VSSA / công bố vùng mía',null],
 chCanePrice:['irregular','niên vụ, các mốc nhà máy','Công bố nhà máy; phạm vi khác nhau theo mốc',null],
 chSmuggled:['irregular','ước tính năm / mốc khảo sát','VCBS 2024, VSSA; không phải dữ liệu hải quan',null],
 chHfcs:['irregular','năm và 7T YTD, tổng hợp báo cáo','Báo cáo thị trường; chưa nối bảng hải quan trực tiếp',null],
 chMarginCompare:['irregular','FY2022/23, cùng kỳ phân khúc','Vietcap, báo cáo 09/01/2024; không có lịch cố định',null],
 chVnUpstream:['irregular','năm / 6T YTD / ước tính','PVN, GSO và công bố định kỳ/bất thường',null],
 chGasCustomer:['irregular','bốn tỷ trọng, khác mẫu số','PV GAS / Petrovietnam / ĐHĐCĐ 2026',null],
 chRetailYear:['event','cuối năm hoặc mốc mới nhất','Giá bán lẻ theo kỳ điều hành','https://costflow.vn/du-lieu/gia-xang-dau-lap-du-toan'],
 chRetailFuel:['event','từng kỳ điều hành','CostFlow tổng hợp Petrolimex','https://costflow.vn/du-lieu/gia-xang-dau-lap-du-toan'],
 chRetailFuelMini:['event','từng kỳ điều hành','CostFlow tổng hợp Petrolimex','https://costflow.vn/du-lieu/gia-xang-dau-lap-du-toan'],
 chWorldRecent:['monthly','tháng','World Bank Pink Sheet',WB],chWorldLong:['monthly','bình quân năm','World Bank Pink Sheet',WB],
 chSupplyDemand:['semiannual','niên vụ','USDA FAS · công bố tháng 5 và tháng 11',USDA],chStocks:['semiannual','niên vụ','USDA FAS · công bố tháng 5 và tháng 11',USDA],chImports:['semiannual','niên vụ','USDA FAS · công bố tháng 5 và tháng 11',USDA],
 chWorldSD:['monthly','bình quân năm / dự báo','EIA STEO','https://www.eia.gov/outlooks/steo/'],chWorldBalance:['monthly','bình quân năm / dự báo','EIA STEO','https://www.eia.gov/outlooks/steo/'],chSpare:['monthly','tháng','EIA STEO','https://www.eia.gov/outlooks/steo/'],
 chCrudeStock:['weekly','cuối tháng, tổng hợp từ tuần','EIA WPSR',WPSR],chProdStock:['weekly','cuối tháng, tổng hợp từ tuần','EIA WPSR',WPSR],chCushing:['weekly','cuối tháng, tổng hợp từ tuần','EIA WPSR',WPSR],chUsProd:['weekly','bình quân tháng, từ số tuần','EIA WPSR',WPSR],chDistYear:['weekly','bình quân tháng 8 theo năm','EIA WPSR',WPSR],
 chCot:['weekly','vị thế thứ Ba; công bố thứ Sáu','CFTC','https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm'],
 chBrent24:['weekly','giá ngày → bình quân tháng','EIA spot prices',EIA],chBrentYear:['weekly','giá ngày → bình quân năm / YTD','EIA spot prices',EIA],chBrentWti:['weekly','giá ngày → bình quân tháng','EIA spot prices',EIA],chCrack:['weekly','giá ngày → bình quân tháng','EIA spot prices',EIA],chMoit:['weekly','giá ngày → bình quân tháng','EIA spot prices',EIA],
 chCurve:['daily','giá đóng cửa theo ngày giao dịch','Yahoo Finance · không chính thức','https://finance.yahoo.com/quote/CL%3DF/futures/'],
 chHormuzM:['weekly','ngày; kèm bình quân 7 ngày','IMF PortWatch · dữ liệu ngày, cập nhật tuần (OCHA)','https://github.com/OCHA-DAP/hdx-scraper-portwatch'],
 chMargin:['annual','niên độ, số kiểm toán','BCTC kiểm toán SBT',null],chBsrMargin:['annual','năm, số kiểm toán','BCTC kiểm toán BSR',null],chPlx:['quarterly','cuối quý','BCTC PLX',null],chGasVol:['annual','năm và kế hoạch ĐHĐCĐ','PV GAS · công bố năm / ĐHĐCĐ',null],
};
const insight={
 chWorldRecent:'Giá thế giới giảm sẽ kéo giá nhập khẩu quy đổi xuống, tạo áp lực lên giá bán đường nội địa dù có phòng vệ thương mại. Cần đặt cạnh tỷ giá, thuế áp dụng và tồn kho trong nước; giá ISA là đường thô, không phải giá bán đường trắng tại Việt Nam.',
 chWorldLong:'Chu kỳ giá đường kéo dài nhiều niên vụ vì vùng trồng không phản ứng tức thời. Giá cao có thể kích thích mở rộng cung và làm yếu giá ở các vụ sau; bình quân năm giúp nhìn chu kỳ nhưng che mất biến động trong mùa ép.',
 chVnPrice:'Biên ngành phụ thuộc khoảng cách giữa giá bán đường và chi phí mía, không chỉ chiều đi của giá bán. Các khoảng giá này là quan sát rời rạc và khác địa bàn/chủng loại; không nối chúng thành một chuỗi giao dịch liên tục hay suy ra tăng trưởng tháng.',
 chRegional:'Giá Việt Nam thấp tương đối có thể phản ánh áp lực cung nội địa, nhưng không tự chứng minh cơ hội xuất khẩu. Cần so cùng phẩm cấp, thuế, tỷ giá và chi phí vận chuyển trước khi kết luận chênh lệch giá có thể khai thác.',
 chSupplyDemand:'Sản lượng dưới tiêu thụ không đồng nghĩa thiếu đường: nhập khẩu và tồn kho đầu vụ có thể bù chênh lệch. Đọc cả bảng cân đối, nhất là đường thô nhập để tinh luyện, trước khi suy ra khả năng tăng giá bán của doanh nghiệp.',
 chStocks:'Tồn kho là phần đệm hấp thụ chênh lệch cung–cầu. Tồn kho cao tương đối so với tiêu thụ làm sức mạnh định giá yếu đi; phải so cùng niên vụ và phân biệt số ước tính với số chốt, không coi đây là tồn kho được đo hằng tháng.',
 chCaneCrush:'Mía ép cho biết khả năng sử dụng công suất và hấp thụ chi phí cố định của nhà máy. Tăng lượng ép chỉ giúp lợi nhuận khi chữ đường, giá mua mía và giá bán còn phù hợp; không thay mía ép bằng tổng sản lượng mía cả nước.',
 chCaneArea:'Diện tích là chỉ báo cung cho các vụ sau, còn sản lượng hiện tại phụ thuộc năng suất và chữ đường. Giá mua mía thấp có thể làm nông dân chuyển cây trồng; số vùng riêng lẻ không đại diện diện tích toàn quốc.',
 chCanePrice:'Giá mía là đầu vào lớn của nhà máy nhưng đồng thời quyết định khả năng giữ vùng nguyên liệu. Giảm giá mua có thể đỡ biên ngắn hạn và làm thiếu mía trung hạn; các quan sát KCP/Lam Sơn cần được đọc theo địa bàn, không gán thành giá bình quân ngành.',
 chMargin:'Biên gộp phản ánh giá bán, chi phí mía/đường thô và cơ cấu thương mại–sản xuất. Biên năm có thể khác mạnh biên quý mùa ép; không thay số kiểm toán năm bằng một quý thuận lợi.',
 chImports:'Nhập khẩu tăng có thể là cạnh tranh đường thành phẩm hoặc nguyên liệu cho tinh luyện nội địa. Đặt các mốc chính sách cạnh biến động nhập khẩu để tìm cơ chế, nhưng không quy toàn bộ thay đổi cho thuế khi giá quốc tế và mùa vụ cũng thay đổi.',
 chSmuggled:'Đường nhập lậu tạo cạnh tranh giá ngoài cơ chế thuế và làm giảm hiệu lực bảo hộ. Đây là ước tính khó đo trực tiếp: cần đối chiếu giá bán, tồn kho và thông tin thực thi; không coi một số ước tính thị phần là thống kê hải quan.',
 chHfcs:'HFCS cạnh tranh ở khách hàng đồ uống/thực phẩm, nên nhập khẩu tăng có thể làm nhu cầu đường yếu ngay cả khi tiêu dùng thành phẩm tăng. So sánh chi phí theo độ ngọt và quy cách; cột lũy kế không thể so trực tiếp với cả năm.',
 chMarginCompare:'Chênh lệch biên giữa các doanh nghiệp gợi ý khác biệt vùng nguyên liệu, thu hồi đường và tỷ trọng thương mại. Cần cùng kỳ và cùng phân khúc; biên cao một vụ chưa đủ chứng minh lợi thế bền vững.',
 chWorldSD:'Cân bằng toàn cầu quyết định hướng tích lũy hoặc rút tồn kho, nhưng phản ứng giá phụ thuộc nơi thiếu hàng và loại sản phẩm thiếu. Phần năm có chữ E là dự báo của EIA, không phải cung/cầu đã thực hiện.',
 chWorldBalance:'Balance âm kéo dài thường hỗ trợ giá qua việc rút tồn kho; đổi sang dương chỉ làm giá hạ nếu cung dự báo thực sự trở lại. So thêm revision của IEA/OPEC và năng lực vận chuyển để kiểm tra giả định phục hồi nguồn cung.',
 chCrudeStock:'Tồn kho dầu thô Mỹ tăng có thể do cung dư hoặc do nhà máy giảm chạy. Nếu sản phẩm vẫn thiếu, dầu thô tăng không phủ định stress ở khâu lọc dầu. Cần so mùa vụ, công suất lọc dầu và tồn kho sản phẩm.',
 chProdStock:'Distillate yếu trong khi xăng ổn định gợi ý nút thắt riêng ở nhiên liệu công nghiệp/vận tải. Tác động tới BSR phải qua cơ cấu sản phẩm và nguồn crude; không chuyển tỷ lệ tồn kho Mỹ thành biên lợi nhuận Việt Nam.',
 chDistYear:'So cùng tháng giúp giảm nhiễu mùa vụ và xác định độ chật của thị trường diesel. Tuy nhiên nhu cầu, công suất và quy mô thị trường thay đổi theo năm; cần đọc thêm số ngày tiêu thụ có thể được tồn kho đáp ứng.',
 chUsProd:'Sản lượng Mỹ là phần cung ngoài OPEC có thể bù gián đoạn, nhưng tốc độ tăng chậm hơn phản ứng giá. Sản lượng tăng chưa chắc hạ crack nếu nút thắt nằm ở lọc dầu hay tuyến vận tải.',
 chCushing:'Cushing là điểm giao nhận WTI. Tồn kho thấp tại đây làm giá hợp đồng gần nhạy hơn với thiếu hàng vật chất, nhưng không đại diện toàn cầu; đặt cạnh Brent–WTI và đường cong kỳ hạn.',
 chCurve:'Backwardation cho thấy dầu giao gần được định giá cao hơn giao xa, phù hợp với khan hiếm ngắn hạn hoặc nhu cầu giữ hàng ngay. Nó không chứng minh gián đoạn chắc chắn tạm thời: kỳ vọng, chi phí vốn và nhu cầu giữ tồn kho đều ảnh hưởng đường cong. Đối chiếu với Hormuz và tồn kho để xem giá kỳ hạn có theo kịp dòng chảy thực tế.',
 chSpare:'Gián đoạn tăng trong khi công suất dự phòng giảm làm hệ thống khó bù cú sốc mới, nên phần bù rủi ro có thể tăng phi tuyến. Cả hai là ước tính và có thể chịu giới hạn vận chuyển; không cộng công suất dự phòng cơ học vào nguồn cung sẵn dùng.',
 chCot:'Vị thế ròng đo mức độ đặt cược của quỹ, không đo thiếu hụt dầu vật chất. Khi giá tăng cùng vị thế đã đông, rủi ro tháo vị thế lớn hơn; cần xác nhận bằng tồn kho, curve và dòng chảy, không coi COT là tín hiệu mua/bán độc lập.',
 chVnUpstream:'Sản lượng nội địa quyết định lượng hàng có thể thương mại hóa cho chuỗi dầu khí Việt Nam, bên cạnh giá bán. Dầu và khí có đơn vị khác nhau; 6 tháng là YTD nên không so chiều cao với cả năm rồi kết luận suy giảm.',
 chGasVol:'Khí nội địa suy giảm và LNG tăng thay đổi cơ cấu chi phí của GAS và khách hàng điện. LNG nhập tăng chưa chắc lợi nhuận tăng tương ứng nếu chưa chuyển được chi phí vào giá bán; kế hoạch không phải sản lượng đã tiêu thụ.',
 chGasCustomer:'Vị trí lớn trong chuỗi khí tạo lợi thế hạ tầng và quan hệ khách hàng, nhưng bốn tỷ trọng có mẫu số khác nhau. Không cộng thành thị phần 100%; cần theo dõi khả năng chuyển giá LNG và nhu cầu điện/đạm thực tế.',
 chCrack:'Crack mở rộng phản ánh sản phẩm đắt tương đối so với dầu thô, có thể hỗ trợ khâu lọc dầu. BSR/Nghi Sơn chỉ hưởng lợi khi có đủ nguyên liệu và vận hành tốt; đây là proxy USGC, chưa trừ năng lượng, hao hụt, logistics hay chi phí cố định.',
 chMoit:'Giá sản phẩm tăng nhanh hơn Brent cho thấy áp lực từ khâu sản phẩm thay vì chỉ từ crude. Rổ USGC là đối chiếu quốc tế; để đánh giá độ trễ điều hành Việt Nam phải lấy đúng rổ thành phẩm và tỷ giá trong văn bản từng kỳ.',
 chBrent24:'Brent xác định mặt bằng giá bán upstream và vốn lưu động toàn chuỗi. Cùng một đợt tăng giá có thể giúp khai thác nhưng gây áp lực vốn nhập hàng; kết luận biên lọc dầu phải đọc crack, không dùng Brent thay thế.',
 chBrentYear:'Bình quân năm cho thấy nền chu kỳ để đánh giá đầu tư dự án dài hạn. Năm hiện tại là YTD và sẽ đổi khi có phiên mới; giá cao ngắn hạn không đủ để bảo đảm hiệu quả dự án có thời gian thu hồi nhiều năm.',
 chBrentWti:'Spread Brent–WTI phản ánh định giá giữa các khu vực và điều kiện xuất khẩu dầu Mỹ. Spread rộng chỉ mở cơ hội vận chuyển nếu bù đủ cước, chất lượng và chi phí khác; không phải biên lợi nhuận chắc chắn của doanh nghiệp vận tải.',
 chRetailFuelMini:'Giá điều hành là mức bán lẻ theo kỳ, còn hàng tồn kho được mua ở nhiều thời điểm. Theo dõi tốc độ đổi giá và cơ cấu diesel/xăng để nhận diện áp lực vốn lưu động; mức giá cao không tự đồng nghĩa biên phân phối cao.',
 chRetailFuel:'Các bước tăng/giảm theo kỳ cho biết doanh nghiệp được điều chỉnh giá bán nhanh tới đâu. So với giá vốn nhập hàng cùng kỳ và trích/chi quỹ mới đánh giá được ảnh hưởng thực tế; biểu đồ này không thay bảng tính giá cơ sở.',
 chRetailYear:'Chuỗi dài mô tả mặt bằng giá người tiêu dùng, không đo trực tiếp lợi nhuận PLX. Mốc cuối năm và mốc mới nhất trong năm có phạm vi thời gian khác nhau; không dùng chúng như bình quân năm.',
 chBsrMargin:'Biên gộp biến động theo crack, cơ cấu dầu và chu kỳ bảo dưỡng. Năm biên âm phải được giữ trong bảng và khi vẽ chart; dự báo cần tách biến động giá hàng tồn kho khỏi hiệu quả lọc dầu.',
 chPlx:'Tồn kho tăng làm doanh nghiệp nhạy hơn với biến động giá giữa lúc nhập và bán. Cần đọc chung dự phòng, lợi nhuận và tiền mặt; giá trị tồn kho tăng có thể do tăng giá vốn, không nhất thiết tăng số lít dự trữ.',
 chHormuzM:'Chuỗi ngày cho biết dòng chảy thực tế có phục hồi sau tin tức hay chưa; bình quân 7 ngày giảm nhiễu một chuyến tàu. Đây là số lượt tàu AIS quan sát được, không phải thùng dầu: thay đổi tải trọng và nhiễu tín hiệu có thể làm hai đại lượng đi khác nhau.',
};
const frequency={daily:'hằng ngày giao dịch',weekly:'hằng tuần',monthly:'hằng tháng',quarterly:'hằng quý',annual:'hằng năm',semiannual:'2 lần/năm (tháng 5, 11)',irregular:'theo công bố, chưa có lịch cố định',event:'theo sự kiện'};
// Add a proper source/cadence line to every chart, including those whose sources
// previously appeared only in the section introduction.
document.querySelectorAll('[id^="ch"]').forEach(host=>{
 if(!host.querySelector('svg'))return;
 const block=host.closest('.viz-block,.card');if(!block)return;
 const cfg=sources[host.id];
 if(cfg){block.dataset.cadence=cfg[0];block.dataset.observationFrequency=cfg[1];if(block.classList.contains('viz-block')){block.dataset.updateKind=cfg[0]==='monthly'?'periodic':'event';block.dataset.refreshStatus=block.dataset.refreshStatus||'snapshot';block.dataset.blockId=host.id}}
 const cadence=cfg?frequency[cfg[0]]:frequency[block.dataset.cadence]||'theo công bố';
 const provenance=document.createElement('div');provenance.className='source-note cadence-note';
 provenance.textContent=`Lịch nguồn: ${cadence} · Kỳ dữ liệu: ${cfg?cfg[1]:'theo kỳ ghi trên chart'}. `;
 if(cfg?.[3]){const a=document.createElement('a');a.href=cfg[3];a.target='_blank';a.rel='noopener';a.textContent=cfg[2];provenance.append(a)}
 else if(cfg)provenance.append(cfg[2]+'.');else provenance.append('Nguồn tổng hợp/tài liệu; không suy lịch công bố từ trục thời gian.');
 host.after(provenance);
 if(insight[host.id]){const n=document.createElement('div');n.className='chart-insight';n.dataset.inputOwner='ai';n.innerHTML='<b>Cách hiểu trong bối cảnh ngành · AI:</b> ';n.append(insight[host.id]);block.append(n)}
});
// Method of obtaining data stays visible, even when the old markup called it a note.
['chCrack','chVnPrice','chVnUpstream','chGasVol','chGasCustomer','chBrent24','chBrentYear','chBsrMargin'].forEach(id=>{
 document.getElementById(id)?.closest('.card')?.querySelectorAll('.conf-note').forEach(n=>{n.classList.replace('conf-note','source-note');n.classList.add('method-note')});
});
const spare=document.getElementById('chSpare')?.closest('.card');
spare?.querySelectorAll('.conf-note').forEach(n=>{if(n.textContent.startsWith('Cần đọc kèm cảnh báo'))n.classList.replace('conf-note','source-note')});
// Existing long comments are historical readings, separate from the current framework.
document.querySelectorAll('.card .conf-note,.viz-block .signal-line').forEach(n=>{
 if(n.closest('.data-gap,.gap-row'))return;
 const block=n.closest('.card,.viz-block');if(!block.querySelector('.chart-title'))return;
 n.dataset.snapshotAt=oil?'03/09/2026':'17/08/2026';
});
function card(title,id,sub,source,reading){
 const c=document.createElement('div');c.className='card';Object.assign(c.dataset,{updateKind:'event',cadence:'event',blockId:id,transform:'derived',refreshStatus:'snapshot'});
 const h=document.createElement('div');h.className='chart-title';h.textContent=title;c.append(h);
 const s=document.createElement('div');s.className='chart-sub';s.textContent=sub;c.append(s);
 const chart=document.createElement('div');chart.id=id;c.append(chart);
 const src=document.createElement('div');src.className='source-note';src.innerHTML=source;c.append(src);
 const note=document.createElement('div');note.className='chart-insight';note.textContent='Cách hiểu trong bối cảnh ngành · AI: '+reading;c.append(note);return c;
}
const policy=document.querySelector('.majorpane[data-tab="mt4"] .section');
if(policy){
 const grid=document.createElement('div');grid.className='grid two policy-visuals';policy.querySelector('.sectionhead')?.after(grid);
 if(oil){
  grid.append(card('Chênh lệch giá diesel so với RON95','chPolicyPremium','đồng/lít · cùng kỳ điều hành, 02/07–03/09/2026','Tự tính diesel − RON95 từ chuỗi giá điều hành đang có trong dashboard. <a href="https://costflow.vn/du-lieu/gia-xang-dau-lap-du-toan" target="_blank" rel="noopener">CostFlow / Petrolimex</a>.','Diesel đắt hơn xăng cho thấy sức ép tương đối ở nhiên liệu vận tải/sản xuất. Chênh lệch này chịu cả giá thành phẩm và thuế/quỹ; không phải biên lọc dầu hay biên bán lẻ.'));
  balanceBarChart('chPolicyPremium',{labels:retailDates,values:retailDiesel.map((v,i)=>v-retailRon95[i]),unit:'đ/lít',height:250});
  grid.append(card('Mức điều chỉnh diesel qua từng kỳ','chPolicyChange','đồng/lít · thay đổi so với kỳ trước','Tự tính chênh lệch hai kỳ liên tiếp; kỳ đầu bỏ vì không có mốc trước. <a href="https://costflow.vn/du-lieu/gia-xang-dau-lap-du-toan" target="_blank" rel="noopener">Chuỗi giá điều hành</a>.','Các bước đổi giá lớn làm rủi ro lệch pha giữa giá mua hàng và giá bán tăng. Cần ghép ngày nhập, vòng quay tồn kho và quyết định trích/chi quỹ để đo tác động lên PLX; không quy toàn bộ mức tăng cho một sắc thuế.'));
  balanceBarChart('chPolicyChange',{labels:retailDates.slice(1),values:retailDiesel.slice(1).map((v,i)=>v-retailDiesel[i]),unit:'đ/lít',height:250});
 }else{
  grid.append(card('Hạn ngạch đường 2024 — mức phân giao thực tế','chPolicyQuota','nghìn tấn · 121 / 126 = 96,03%','<a href="https://moit.gov.vn/tin-tuc/thong-bao/thong-bao-ket-qua-phien-phan-giao-han-ngach-thue-quan-nhap-khau-duong-nam-2024-theo-phuong-thuc-dau-gia.html" target="_blank" rel="noopener">Bộ Công Thương · kết quả đấu giá 2024</a>. Đây là hạn ngạch được phân giao, không phải lượng hàng đã nhập.','Tỷ lệ phân giao cao cho thấy nhu cầu tiếp cận nguồn nhập có ưu đãi, nhưng không đo được khối lượng nhập thực tế. Hạn ngạch chỉ là một phần của cạnh tranh nhập khẩu; cần đối chiếu số thực nhập và đường ngoài hạn ngạch.'));
  barLineChart('chPolicyQuota',{categories:['Hạn ngạch','Đã phân giao','Chưa phân giao'],series:[{name:'Nghìn tấn',color:S1,values:[126,121,5]}],unit:'nghìn tấn',digits:0,height:250});
  grid.append(card('Cấu phần thuế phòng vệ — mốc 2021','chPolicyTax','% · 42,99 + 4,65 = 47,64; không phải tổng mọi sắc thuế','<a href="https://moit.gov.vn/tin-tuc/thong-tin-hop-bao/bo-cong-thuong-hop-bao-thuong-ky-quy-ii-2021.html" target="_blank" rel="noopener">Bộ Công Thương · Quyết định 1578/QĐ-BCT, 2021</a>. Chart là mốc lịch sử; không khẳng định đây là mức áp dụng sau rà soát/gia hạn 2026.','Phòng vệ thương mại làm tăng chi phí nhập các hàng hóa thuộc phạm vi áp dụng, tạo khoảng bảo vệ cho nhà máy trong nước. Hiệu quả còn phụ thuộc xuất xứ, chống lẩn tránh, hàng nhập lậu và HFCS; không suy thuế cao thành giá đường hay lợi nhuận chắc chắn tăng.'));
  barLineChart('chPolicyTax',{categories:['Chống bán phá giá','Chống trợ cấp','Tổng hai biện pháp'],series:[{name:'Thuế suất lịch sử',color:S2,values:[42.99,4.65,47.64]}],unit:'%',digits:2,height:250});
 }
}
// An explicit place for proprietary analyst input; do not invent an analyst view.
const catalyst=document.querySelector('.majorpane[data-tab="mt5"] .section');
if(catalyst){
 const personal=document.createElement('details');personal.className='analyst-input';personal.dataset.updateKind='analyst';personal.dataset.cadence='on-demand';
 personal.innerHTML='<summary>Góc nhìn riêng của analyst</summary><p>Chưa có ý kiến riêng được nhập. Dành cho key insight, giả định khác với AI hoặc thông tin thực địa; phần theo dõi dữ liệu và phân tích công khai phía trên do AI hỗ trợ.</p>';catalyst.append(personal);
}
})();
