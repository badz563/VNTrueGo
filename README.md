# VietNam TrueGo

Mobile-first MVP khám phá điểm tham quan Hà Nội, lập lịch trình dựa trên dữ liệu có cấu trúc và cảnh báo khi địa điểm trong lịch trình thay đổi. Không có đăng nhập, đặt ăn uống hoặc lưu trú.

## Chạy cục bộ

Yêu cầu **Node.js 25.x** (dùng `node:sqlite`) và npm.

```bash
npm install
copy .env.example .env.local
npm run db:seed
npm run dev
```

Mở `http://localhost:3000`. Nếu dùng PowerShell, thay `copy` bằng `Copy-Item`. Seed cũng được khởi tạo tự động khi API truy cập database lần đầu. File SQLite nằm tại `data/truego.sqlite` và bị Git bỏ qua. Có thể đặt `DATABASE_PATH` để dùng đường dẫn SQLite khác.

## Demo luồng cảnh báo

1. Vào **Lịch trình**, nhập ngày và tạo lịch trình. Lịch trình tự lưu vào trình duyệt.
2. Mở **Partner demo** tại `/partner-demo` trong tab khác.
3. Chọn một địa điểm thuộc lịch trình, bấm **Mô phỏng tạm đóng cửa**.
4. Quay lại tab du khách. Ứng dụng kiểm tra ngay khi tab được kích hoạt hoặc sau tối đa 15 giây trong phiên hoạt động.
5. Vào **Thông báo** để chọn một địa điểm thay thế. Chấp nhận sẽ cập nhật địa điểm, giờ, chi phí và thời gian di chuyển. “Để sau” giữ lịch trình và đánh dấu cảnh báo đã xem. Với thay đổi giờ mở cửa, ứng dụng còn đề xuất đổi giờ hoặc thứ tự nếu toàn bộ hoạt động trong ngày vẫn khả thi. Không tự sửa lịch trình trước khi người dùng chấp nhận.
6. Bấm **Khôi phục demo** trên dashboard để đưa dữ liệu về trạng thái ban đầu.

API ghi dữ liệu dashboard chỉ hoạt động trong `NODE_ENV=development`. Bản production trả HTTP 403 cho các thao tác quản lý vì chưa có xác thực và phân quyền. Không triển khai công khai dashboard có quyền ghi nếu chưa bổ sung bảo vệ thực sự.

## Dữ liệu và giới hạn

- 24 địa điểm Hà Nội; tên và vị trí gần đúng. Ảnh là **minh họa tạo bởi AI**, không phải ảnh thực địa được xác minh.
- Giờ tham quan, giá vé, mức đông, thời lượng và trạng thái ban đầu là dữ liệu **demo/chưa xác minh**. API đánh dấu nguồn và thời gian cập nhật. Trạng thái không có cập nhật gần đây hiện “Chưa có thông tin mới”.
- Dashboard ghi cập nhật, lịch sử, thông báo và revision vào SQLite. API địa điểm trả `Cache-Control: no-store`.
- Bản đồ dùng OpenStreetMap/Leaflet với tile PNG chuẩn. Đường nối là minh họa; thời gian di chuyển tính từ khoảng cách địa lý, hệ số đường đi và tốc độ ước tính, **không phải dữ liệu định tuyến thực tế**.
- Font Be Vietnam Pro và Noto Serif được đóng gói trong ứng dụng, có bộ ký tự tiếng Việt. Sở thích trong mục Cá nhân lưu tại trình duyệt để gợi ý điểm đến và chọn sẵn trên form tạo lịch trình.
- Trạng thái điểm đến và mức đông quá 24 giờ được hiển thị là “Chưa có thông tin mới”; đây là ngưỡng trình bày của demo, không phải cam kết độ chính xác của nguồn.
- Không có push notification khi đóng trình duyệt. Lịch trình và thông báo lưu trong localStorage của từng thiết bị; server không biết các lịch trình này.
- Phản hồi địa điểm lưu với trạng thái chưa xác minh. Không có đánh giá sao được gắn nhãn xác minh.
- PWA cache trang/ảnh đã xem để hỗ trợ ngoại tuyến cơ bản; API trạng thái không được cache bởi service worker và cần mạng.

## AI và thuật toán fallback

`POST /api/plan` kiểm tra đầu vào, dùng điểm tham quan trong database để chọn điểm và tính giờ, chi phí, khoảng cách. Nếu đặt `AI_API_KEY`, server gọi endpoint Chat Completions tương thích OpenAI chỉ để viết **lý do lựa chọn**. LLM không quyết định giờ, giá, trạng thái hay khoảng cách. Nếu provider lỗi hoặc phản hồi sai dạng, thuật toán nội bộ tiếp tục trả lịch trình với `mode: "demo"`.

```env
AI_API_KEY=...
AI_PROVIDER_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=gpt-4o-mini
```

Secret chỉ được đọc ở route handler trên server. Bản demo hiện hỗ trợ Hà Nội và tối đa 7 ngày. Chi phí là ngân sách hoạt động tham quan, không gồm lưu trú, ăn uống hoặc vận chuyển.

## API chính

| Endpoint | Mục đích |
| --- | --- |
| `GET /api/destinations` | Danh sách kèm trạng thái/revision hiện tại |
| `GET /api/destinations/:slug` | Chi tiết, thông báo, review |
| `POST /api/plan` | Tạo lịch trình có kiểm tra ngân sách/giờ |
| `PATCH /api/partner/destinations/:id` | Cập nhật trạng thái, giờ, mức đông, thông báo (development) |
| `GET /api/partner/history?destinationId=:id` | Lịch sử cập nhật |
| `POST /api/partner/reset` | Khôi phục dữ liệu demo (development) |
| `POST /api/feedback` | Lưu phản hồi chưa xác minh |

Schema và migration: `migrations/001_init.sql`. Seed: `data/seed.json`, `scripts/seed.mjs`. Mô hình dữ liệu có Destination, StatusHistory, Announcement, CrowdForecast, Review, VerificationEvidence, Trip/Day/Activity, TravelPreference, NotificationEvent và PartnerOrganization. Trip trên MVP hiện lưu cục bộ; các bảng Trip và NotificationEvent chuẩn bị cho dịch vụ đồng bộ trong tương lai.

## Kiểm thử

```bash
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Vitest kiểm tra tạo lịch trình, giờ mở cửa, ngân sách, thay/khóa/đổi thứ tự, tính lại, phát hiện cập nhật, chống thông báo trùng, phương án thay thế, đổi giờ/thứ tự, chấp nhận/từ chối và sao lưu/khôi phục. Playwright kiểm tra đóng cửa → thay điểm, đổi giờ mở cửa → điều chỉnh giờ, lưu sở thích, chống thêm điểm trùng và màn hình 320×640, 375×812, 390×844, 430×932, 1440×900.

Kết quả xác minh ngày 17/10/2026: TypeScript strict và production build đạt; **18/18** unit test, **5/5** E2E test đạt; kiểm tra responsive không tràn ngang và không có lỗi runtime trên 320×640, 375×812, 390×844, 430×932, 1440×900 ở các trang chính; `npm audit` báo **0 lỗ hổng**. Tile OpenStreetMap trả HTTP 200 và hiển thị trên bản đồ. Production build tải font Noto Serif, không tràn ngang ở 390px; `GET /api/destinations` trả 200 và `PATCH /api/partner/destinations/d01` trả 403.

## Hướng triển khai production

Mã hiện ưu tiên môi trường demo Node.js có ổ đĩa ghi được. Để vận hành công khai: chuyển SQLite sang PostgreSQL, thêm migration và seed tương ứng; xác thực/phân quyền dashboard; rate limit API ghi; xác minh và cập nhật nguồn dữ liệu thực tế; thay ước tính di chuyển bằng routing provider; bổ sung monitoring, backup và retention. Không đặt `/partner-demo` với quyền ghi công khai. Triển khai bằng `npm run build && npm start` trên Node 25 có persistent volume chỉ phù hợp môi trường nội bộ.

## Những gì đã hoàn thành

Khám phá, tìm kiếm/lọc, chi tiết địa điểm, bản đồ toàn màn hình, form lịch trình, thuật toán fallback, timeline có chỉnh sửa và tính lại, lưu/xuất/nhập JSON, sở thích lưu cục bộ, dashboard demo, API trạng thái có lịch sử, polling cảnh báo và chấp nhận/từ chối phương án thay thế hoặc đổi giờ/thứ tự khả thi, giao diện Việt/Anh, PWA cơ bản, responsive và bộ test.
