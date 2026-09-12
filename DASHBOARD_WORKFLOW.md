# Workflow chung cho dashboard ngành

Áp dụng cho Đường, Dầu khí và mọi dashboard ngành mới. Cập nhật 10/09/2026 theo các điều chỉnh mới nhất của người dùng; thay thế quy tắc cũ đưa nguồn vào tooltip hoặc giao toàn bộ nhận định cho analyst.

## 1. Vai trò của chart, nguồn, AI và analyst

- Mặt dashboard giữ tiêu đề chart, đơn vị, kỳ dữ liệu, legend, một hàng nguồn có link và ngày quan sát/ngày kiểm tra. Theo yêu cầu rút gọn ngày 12/09/2026, phương pháp, lịch chi tiết, giờ kiểm tra, link bổ sung và bảng gốc mở từ **Chi tiết dữ liệu** ở chân card; nút **ⓘ Insight** riêng cho AI. Cờ hạn chế quan trọng vẫn hiển thị.
- Icon ⓘ trả lời **“Chart này có ý nghĩa gì trong bối cảnh ngành?”**: tín hiệu → cơ chế tác động → nhóm doanh nghiệp/biến lợi nhuận → điều kiện kiểm chứng và giới hạn suy luận. Không chỉ đọc lại số, không gán quan hệ nhân quả khi chưa có bằng chứng.
- Phần giải thích chart do **AI** viết. AI cũng phụ trách Đọc nhanh, so sánh các nguồn, đọc báo cáo/PDF, nhận diện yếu tố cần follow, cập nhật Catalyst/Risk và đề xuất kịch bản từ dữ liệu công khai.
- **Analyst chỉ nhập key insight, thông tin/đánh giá riêng, giả định hoặc phản biện của mình.** Không bắt analyst viết lại phần AI đã có đủ dữ liệu để đọc và phân tích. Không tự gán một quan điểm do AI viết là quan điểm analyst.
- Tách quyền sở hữu nội dung với cách chạy: `ai` là người tạo/duy trì phân tích; `rule-based` là phép tính/tóm tắt theo quy tắc; `model-generated` chỉ dùng khi thực sự gọi mô hình. Không thay nhãn để giả lập việc đã gọi AI.
- Nhận định lưu từ bản cũ phải có ngày phân tích và được tách khỏi số vừa cập nhật. Khi dữ liệu đổi, không giữ nguyên câu “hiện tại” mà làm người đọc tưởng AI đã phân tích lại.
- **Data limitation giữ nguyên nội dung, vị trí và cảnh báo hiển thị** (`.data-gap`, `.gap-row`, bảng hạn chế nguồn). Không gom vào tooltip hoặc xóa khi chưa giải quyết được hạn chế. Cờ estimate/YTD/kế hoạch và dữ liệu thiếu vẫn thấy được.

## 2. Kiểm nguồn trước khi gắn tần suất

Ba khái niệm độc lập, bắt buộc phân biệt:

1. **Kỳ quan sát**: dữ liệu đo ngày/tuần/quý/năm/niên vụ nào?
2. **Lịch công bố của nguồn**: khi nào nguồn phát hành/sửa dữ liệu?
3. **Lịch kiểm tra của job**: hệ thống đi kiểm tra khi nào?

Không ghi chung “Định kỳ · tháng/quý/năm” trên một card. Mỗi card có lịch cụ thể, kiểm từ trang lịch phát hành, metadata, loại báo cáo thực sự đã sử dụng. Nếu nguồn là bài báo, bản tổng hợp hoặc chỉ có một snapshot không thể xác nhận lịch, ghi **“theo công bố, không cố định”**, không đoán lịch từ trục chart. Chuỗi ghép nhiều nguồn phải ghi rõ sự khác biệt hoặc tách card.

Các ví dụ đã kiểm trong bản này:

| Nhóm nguồn | Kỳ dữ liệu | Lịch công bố / cách diễn giải | Bằng chứng |
| --- | --- | --- | --- |
| World Bank Pink Sheet | Tháng; bình quân năm tính từ tháng | Hằng tháng | [Commodity Markets](https://www.worldbank.org/en/research/commodity-markets), [World Bank mô tả báo cáo tháng](https://blogs.worldbank.org/en/opendata/energy-prices-eased-in-may--non-energy-edged-up-pink-sheet) |
| USDA FAS Sugar / PSD | Năm thị trường / niên vụ | 2 lần/năm, tháng 5 và 11; có thể revision | [USDA mô tả lịch](https://esmis.nal.usda.gov/publication/sugar-world-markets-and-trade). Không áp lịch WASDE tháng cho tất cả hàng hóa PSD. |
| EIA Spot Prices | Giá ngày giao dịch | Trang nguồn đang phát hành theo tuần; bình quân tháng/năm là phép tổng hợp | [EIA](https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm), [FRED Brent với ngày phát hành](https://fred.stlouisfed.org/series/DCOILBRENTEU) |
| EIA WPSR | Tuần | Hằng tuần, lịch nghỉ lễ có thể dời | [WPSR](https://www.eia.gov/petroleum/supply/weekly/) |
| EIA STEO | Dữ liệu/dự báo tháng; chart có thể bình quân năm | Hằng tháng | [EIA release schedule](https://www.eia.gov/reports/upcoming.php) |
| CFTC COT | Vị thế thứ Ba | Thường công bố thứ Sáu | [CFTC](https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm) |
| IMF PortWatch | Lượt tàu theo ngày | Cập nhật tuần; job của dashboard kiểm tra daily | [OCHA vận hành bộ tải chính thức](https://github.com/OCHA-DAP/hdx-scraper-portwatch), [API metadata](https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0?f=pjson) |
| Yahoo WTI futures | Giá từng hợp đồng theo ngày giao dịch | Ngày giao dịch, nguồn không chính thức; chỉ dùng phiên hoàn tất chung | [Yahoo WTI](https://finance.yahoo.com/quote/CL%3DF/futures/) |
| BCTC kiểm toán / báo cáo năm | Năm tài chính | Năm nếu thực sự dùng báo cáo năm; PLX BCTC quý là quý | Link công bố của đúng doanh nghiệp dưới card. Ví dụ [PV GAS báo cáo năm](https://www.pvgas.com.vn/bai-viet/category/bao-cao-thuong-nien). Không gán “quý” cho snapshot từ báo cáo broker. |
| Giá trong nước, sản lượng mía, HFCS, ước tính nhập lậu, snapshot broker | Theo mốc/niên vụ/năm/YTD ghi trên chart | Theo công bố không cố định với bộ nguồn hiện có | Giữ danh sách nguồn và hạn chế gốc; cần bảng nguồn từng quan sát trước khi tự động hóa. |

## 3. Metadata và màu pastel

Dùng chung `assets/dashboard-ui.css` và `assets/dashboard-ui.js`. Metadata nguồn/chart đặt trong HTML và mapping rõ ràng tại `assets/sector-content.js`; không suy loại dữ liệu từ tiêu đề.

| `data-update-kind` | Vai trò | Màu |
| --- | --- | --- |
| `public` | Dữ liệu public có cấu trúc, lịch cụ thể theo nguồn | Mint |
| `periodic` + `monthly` | Nguồn hằng tháng | Xanh nhạt |
| `periodic` + `quarterly` | Nguồn hằng quý | Tím xanh |
| `periodic` + `annual` | Nguồn hằng năm | Vàng kem |
| `periodic` + `semiannual` | Nguồn 2 lần/năm | Xanh lam nhạt |
| `document` | AI đọc PDF/tài liệu/bài công bố và tổng hợp | Tím nhạt |
| `ai` | AI phân tích / khung theo dõi | Xanh ngọc nhạt |
| `static` | Giải thích cơ chế/cấu trúc ít thay đổi | Xám |
| `analyst` | Góc nhìn riêng của analyst | Cam kem |
| `event` | Chính sách, thuế, điều hành giá theo sự kiện | Hồng |

Lịch tháng/quý/năm vẫn phải hiện rõ đối với `document`. `data-transform="derived"` là nhãn phụ “Tính toán”, không thay thế lịch/nguồn. `data-refresh-status` phân biệt `snapshot`, `loaded`, `derived`; không dùng “live” khi dữ liệu chỉ là lần tải gần nhất.

Hợp đồng dữ liệu cho IT: block ID, source IDs, update_kind, observation_frequency, publication_frequency, polling schedule, source URL, đơn vị, kỳ thực hiện/ước tính/dự báo, last_checked_at, last_success_at, latest_observation, hash dữ liệu, owner, reviewer, limitation. PDF cần tài liệu/trang/bảng và giá trị thô; dữ liệu tính toán cần công thức/input IDs. Nhận định AI cần ngày viết, phiên bản dữ liệu nền và trạng thái cần phân tích lại. Quan điểm analyst có tác giả/ngày và không bị job ghi đè.

## 4. Catalyst/Risk và Policy/Trade/Tax

- Catalyst/Risk là **công cụ theo dõi cho analyst**: KPI → số/kỳ mới nhất → ngưỡng hoặc xu hướng → hàm ý → nguồn và lần kiểm tra. Giá trị/điều kiện đo được tính tự động; AI đọc liên kết các biến. Không biến cả tab thành phần nhập tay của analyst.
- Ngưỡng AI đề xuất là giả định theo dõi, không phải ngưỡng thống kê đã kiểm định. Analyst có thể bổ sung hoặc thay đổi bằng quan điểm riêng.
- Dùng chart cho Policy khi có số thật: hạn ngạch công bố/phân giao, cấu phần thuế lịch sử, mức điều chỉnh giá từng kỳ, spread sản phẩm. Biện pháp định tính dùng sơ đồ truyền dẫn/timeline; không tạo thang điểm tác động giả để có chart.
- Thuế phải ghi mốc hiệu lực/phạm vi: biểu đồ thuế 2021 không khẳng định mức hiện hành sau rà soát 2026. Phân giao hạn ngạch không phải nhập khẩu thực tế.
- Hormuz: chart ngày là lớp theo dõi chính, thêm bình quân 7 ngày và chọn 30/90/365/toàn bộ; không hiển thị thêm chart bình quân tháng (theo yêu cầu mới). Lượt tàu không đồng nghĩa thùng dầu, dữ liệu AIS không phải quan sát hoàn hảo.

## 5. Luồng cập nhật đang có

- `scripts/update_daily.py`: tải 9 chuỗi EIA, Hormuz, 18 hợp đồng WTI, Brent futures, Sugar No.11 futures, giá đường World Bank tháng và sản lượng bốn trung tâm cung đường USDA PSD. `scripts/run_daily.sh` là entry point; `scripts/install_daily_schedule.py` cài idempotent cron 06:15 giờ Việt Nam, giữ nguyên cron khác.
- Lịch đã cài trên máy hiện tại. Máy phải hoạt động và có mạng lúc chạy; cron không tự chạy bù khi máy ngủ. Không có `git push`/publish tự động. Đưa lên server sau này dùng cùng entry point, khai báo Python bằng `DASHBOARD_PYTHON`.
- Đầu ra: `data/daily-data.js` cho browser/file preview, `data/update-status.json` cho kiểm tra; JSON cache và raw archives lưu cục bộ. Kiểm tra mỗi ngày ngay cả với nguồn phát hành tuần; không tự tạo quan sát mới nếu nguồn chưa phát hành.
- Kiểm schema, series ID, đơn vị, ngày hợp lệ/không trùng, lịch sử không tụt lùi/truncated. Có retry, lock và ghi file atomically; lỗi từng nguồn giữ last-good, báo lỗi riêng.
- Crack dùng **ngày giao dịch chung** của Brent/xăng/ULSD, đổi gallon × 42. BQ tháng dùng ngày có dữ liệu; đánh dấu tháng dở dang/YTD. Tồn kho tháng lấy quan sát tuần cuối có dữ liệu. Không điền ngày thiếu bằng 0 hoặc nối đường qua gap.
- WTI lấy ngày đóng cửa hoàn tất chung (timezone sàn), không ghép continuous series, không ghép ngày khác nhau, không gọi là settlement. Nếu không có đủ hợp đồng cùng ngày hợp lệ thì giữ bản tốt trước.
- Tóm tắt số liệu/KPI hiện được sinh **theo quy tắc**. Tooltip và khung phân tích do AI viết trong lần làm dashboard này; chưa cấu hình job gọi mô hình AI tự động. Khi tích hợp model, chỉ chạy khi dữ liệu nền/nguồn thay đổi, lưu version và không ghi đè analyst input.
- Dashboard đường có Sugar No.11 futures ngày (Yahoo SB=F, USX = US cent/lb), World Bank tháng và bốn trung tâm sản xuất USDA PSD. Những chuỗi nội địa/USDA Việt Nam cũ vẫn là snapshot. Job kiểm daily không làm World Bank hoặc USDA trở thành nguồn daily.

- **Bank · MCP Wi (11/09/2026):** Wi chỉ truy cập được qua connector trong phiên Claude (không có API key), nên không có job mạng cho Wi. Agent lưu response thô vào `data/raw/wi/` theo `data/bank-wi-contract.json` (ID/endpoint thật đã kiểm), rồi `scripts/build_bank_wi.py` validate và dựng `data/bank-wi-data.js` (giữ last-good khi thiếu/lỗi). Lịch công bố lấy từ metadata bảng Wi (vd tiền gửi/tín dụng SBV "trễ 1-3 tháng, ngày công bố không cố định"; lãi suất/tỷ giá/OMO "hằng ngày"; BCTC theo kỳ công bố quý). NHNN đổi phương pháp thống kê tiền gửi/M2 tháng 9-10/2025 → dùng bảng Wi "đã điều chỉnh" 301/302, không dùng bảng gốc 17/18 để tính YoY.

## 6. QA trước khi bàn giao

1. Kiểm tra lịch nguồn và ngày dữ liệu; nguồn thiếu lịch phải ghi rõ.
2. Kiểm chart, bảng, tooltip insight, link nguồn còn hiển thị, phương pháp mở được từ icon nguồn, data limitation nguyên vẹn.
3. Kiểm hover/focus/click/Escape, chuyển tab, khoảng thời gian Hormuz và viewport 390px.
4. Test phép tính cùng ngày, đơn vị, gap, dữ liệu rỗng/lỗi/tụt lùi và giữ last-good; không viết test chỉ để phản chiếu giao diện đơn giản.
5. Chạy updater thực tế, kiểm ngày từng nguồn, xác nhận cron giữ nguyên tác vụ khác. Ghi phạm vi chưa nối/publish và kết quả kiểm tra vào AI_WORKSPACE.

## 7. Bổ sung sau rà soát nguồn và bố cục (10/09/2026)

- Chuỗi giá trị phải có sơ đồ luồng hàng/phân nhánh: đầu vào → chế biến → khách hàng. Dịch vụ hỗ trợ/quan hệ thay thế dùng nét đứt và legend; không nối các ngành phụ thành chuỗi biến đổi vật chất sai. Sơ đồ có mô tả accessibility và cuộn ngang trên mobile.
- Tab 2 dùng tab con **Thế giới / Việt Nam**, ghi rõ địa lý từng tập dữ liệu. Mỹ là chỉ báo thuộc lớp thế giới, không phải tổng toàn cầu. So sánh các nước sản xuất đường không được gọi là tổng cân bằng thế giới; không cộng EU với các thành viên.
- Rà soát độ mới phải giữ nguyên định nghĩa hàng hóa, thị trường, đơn vị và loại giá. FRED DCOILBRENTEU lấy từ EIA nên đổi sang FRED không tự khắc phục độ trễ spot. [FRED metadata](https://fred.stlouisfed.org/series/DCOILBRENTEU).
- Brent futures [BZ=F](https://finance.yahoo.com/quote/BZ%3DF/) và đường futures [SB=F](https://finance.yahoo.com/quote/SB%3DF/) hiển thị riêng để theo dõi nhanh. Đây là dữ liệu Yahoo không chính thức; loại phiên hiện tại theo múi giờ sàn, giữ close (không gọi settlement), cảnh báo chuyển kỳ. Không ghép futures vào spot hay dùng thay spot để tính crack.
- [World Bank](https://www.worldbank.org/en/research/commodity-markets) bản phát hành 02/09/2026 có tháng 8/2026. Đọc đúng cột Sugar, world, đơn vị USD/kg; biểu đồ năm chỉ dùng đủ 12 tháng. Kiểm đường dẫn XLSX khi World Bank đổi tài nguyên, lỗi giữ last-good.
- [USDA PSD](https://apps.fas.usda.gov/psdonline/app/index.html): bộ tải chọn Production của Brazil, India, Thailand, European Union, nghìn tấn giá trị thô → triệu tấn. Trục là năm bắt đầu niên vụ từng nước; không coi là niên độ lịch thống nhất. Kỳ mới mang cờ ước tính/dự báo; ngày tải không phải ngày phát hành báo cáo.
- Các hạn chế dữ liệu hiện hữu vẫn hiển thị. Giữ nguyên `.data-gap`, `.gap-row`; không chuyển cảnh báo thiếu số/độ tin cậy thấp/giá trị sàn vào icon nguồn.


## 8. Card gọn (12/09/2026, yêu cầu mới nhất)

- `assets/chart-cards.js` chạy qua shared UI sau khi renderer đã dựng dữ liệu: một chân card, giữ các node nguồn/phương pháp/bảng gốc trong native details. Không xóa dữ liệu hoặc ẩn cảnh báo `.data-gap`, `.gap-row`; ghi chú giới hạn chưa gắn class cũng được bảo vệ theo mapping chart ID đã rà soát.
- Nền biểu đồ trắng; pastel dành cho badge loại nội dung. Lịch công bố gọn ở chân card, lịch đầy đủ trong details; không suy lịch từ tiêu đề. Kỳ tháng/niên vụ trình bày đúng kỳ, không biến khóa ngày đầu kỳ thành ngày quan sát thực tế.
- Nhóm tồn kho Mỹ dùng tab Dầu thô / Sản phẩm / Mùa vụ diesel / Cushing. Dải số tóm tắt lấy đúng giá trị/kỳ đang vẽ và chênh tuyệt đối so kỳ liền trước đang vẽ; thiếu giá trị thì bỏ phần chênh, không điền 0. Không thêm kết luận đầu tư.
- ⓘ Insight hỗ trợ hover/focus/click/Escape; popup đặt phía đủ khoảng trống để không che nút. Chi tiết dữ liệu mở bằng click/Enter; Escape đóng và trả focus. Tab tồn kho hỗ trợ phím mũi tên/Home/End.
- QA thay đổi chỉ giao diện: đối chiếu bảng số, link nguồn, SVG và cảnh báo với bản trước; kiểm desktop/390px và điều hướng. Không cần chạy lại mạng/updater khi không đổi nguồn hoặc phép tổng hợp dữ liệu. Luôn chạy `prepare_release.py` trước xuất bản, đối chiếu manifest sau deploy.


## 9. Catalyst/Risk theo tín hiệu (12/09/2026)

- Shared `assets/catalyst-board.js/css` chạy sau các renderer và shared UI. Mặc định mở 4 tín hiệu Dầu khí/Đường, 5 tín hiệu Bank; mỗi tín hiệu có số/kỳ, trạng thái, ảnh hưởng, điều kiện cần đổi đánh giá và giới hạn ngắn luôn hiện. Ngưỡng kế thừa là giả định theo dõi, không phải ngưỡng được kiểm định.
- Tab con Tín hiệu / Dữ liệu & nguồn / Phân tích lưu tách bảng theo dõi khỏi chi tiết. Toàn bộ node nguồn, chart, bảng và cảnh báo gốc được giữ trong đúng view; không nhét `.data-gap,.gap-row` vào details. Khi mở view bằng chứng, cảnh báo đầy đủ luôn hiện cùng dữ liệu. Bản lưu có ngày và nhắc chưa hiệu chỉnh, không được xem là phân tích lại hôm nay.
- Link bằng chứng mở biểu đồ gốc, tự chọn đúng major tab, địa lý hoặc tab tồn kho; không sao chép chart tạo ID trùng. Bấm Catalyst/Risk tới thẳng bảng tín hiệu; phần giới thiệu ngành vẫn truy cập được khi cuộn lên.
- Dầu khí lọc khâu kinh doanh; Đường đổi góc nhìn tự chủ mía/nguyên liệu nhập (không tự tính spread khi thiếu kỳ khớp). Bank dùng bộ lọc nhóm/mã đã có: hiển thị riêng các tỷ lệ Wi của mã, trạng thái theo quy tắc vẫn ghi rõ toàn ngành, không tự chấm bank bằng số ngành.
- Kịch bản mở từng phương án, tóm lược khung cũ với ngày rõ; không gán xác suất mới hay mục tiêu mới. Missing/error/stale có cờ riêng, không suy thiếu số thành tích cực.
- QA: link bằng chứng từ trạng thái địa lý/nhóm khác, keyboard các tab, missing Wi, giữ bảng/số/link/cảnh báo/analyst drafts, zero duplicate IDs, desktop/390px. Phải đối chiếu bản public sau release.
