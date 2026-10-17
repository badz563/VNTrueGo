# VietNam TrueGo

Mobile-first MVP khám phá điểm tham quan Hà Nội, lập lịch trình dựa trên dữ liệu có cấu trúc và cảnh báo khi địa điểm trong lịch trình thay đổi. Không có đăng nhập, đặt ăn uống hoặc lưu trú.

## Chạy cục bộ

Yêu cầu Node.js 24.x và npm.

```bash
npm install
copy .env.example .env.local
npm run db:seed
npm run dev
```

Mở `http://localhost:3000`. Nếu dùng PowerShell, thay `copy` bằng `Copy-Item`. Seed cũng được khởi tạo tự động khi API truy cập database lần đầu trong môi trường development. File SQLite nằm tại `data/truego.sqlite` và bị Git bỏ qua. Có thể đặt `DATABASE_PATH` để dùng đường dẫn SQLite khác. Ứng dụng không dùng Prisma.

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
- Dashboard development ghi cập nhật, lịch sử, thông báo và revision vào SQLite cục bộ. API địa điểm trả `Cache-Control: no-store`. Trên Vercel, dashboard chỉ đọc vì chưa có xác thực và phân quyền.
- Bản đồ dùng OpenStreetMap/Leaflet với tile PNG chuẩn. Nếu mạng chặn máy chủ tile, ứng dụng báo lỗi và cung cấp liên kết mở vị trí trên Google Maps. Đường nối là minh họa; thời gian di chuyển tính từ khoảng cách địa lý, hệ số đường đi và tốc độ ước tính, **không phải dữ liệu định tuyến thực tế**.
- Font Be Vietnam Pro và Noto Serif được đóng gói trong ứng dụng, có bộ ký tự tiếng Việt. Sở thích trong mục Cá nhân lưu tại trình duyệt để gợi ý điểm đến và chọn sẵn trên form tạo lịch trình.
- Trạng thái điểm đến và mức đông quá 24 giờ được hiển thị là “Chưa có thông tin mới”; đây là ngưỡng trình bày của demo, không phải cam kết độ chính xác của nguồn.
- Không có push notification khi đóng trình duyệt. Lịch trình và thông báo lưu trong localStorage của từng thiết bị; server không biết các lịch trình này.
- Phản hồi địa điểm lưu với trạng thái chưa xác minh khi đã kết nối database bền vững. Nếu chưa cấu hình database trên production, API phản hồi trả 503 và không báo lưu thành công. Không có đánh giá sao được gắn nhãn xác minh.
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

Kết quả kiểm thử trước commit ngày 17/10/2026: `npm run build`, TypeScript strict, **18/18** unit test và **5/5** E2E test đạt; `npm audit` báo **0 lỗ hổng**. E2E kiểm tra các trang chính ở 320×640, 375×812, 390×844, 430×932 và 1440×900 không tràn ngang. Bản production thử cục bộ trả 24 địa điểm, trang chi tiết và lịch trình HTTP 200; khi chưa kết nối database, phản hồi HTTP 503 và ghi dashboard HTTP 403. Chế độ remote được thử với database libSQL dùng một lần trên máy cục bộ: phản hồi HTTP 201 và dữ liệu còn sau khi dừng server. Kết nối Turso qua mạng và deployment Vercel cần kiểm chứng riêng sau khi cấp tài khoản/biến môi trường.

## Triển khai trên Vercel

Dự án dùng Next.js App Router và Function của Vercel; không dùng static export, `basePath` của GitHub Pages hoặc CNAME cũ. Import repository GitHub vào Vercel, chọn **Next.js**, build bằng `npm run build`, output theo mặc định của framework và Node.js 24.x. Sau khi kết nối repository, mỗi lần push lên `main` sẽ tạo deployment theo cấu hình dự án Vercel. Vercel cấp URL HTTPS dạng `*.vercel.app`; tên miền riêng cần cấu hình DNS riêng.

Filesystem của Vercel Function không phù hợp để ghi SQLite cục bộ lâu dài. Production có hai chế độ:

1. **Không có `TURSO_DATABASE_URL` và `TURSO_AUTH_TOKEN`:** API đọc danh sách/chi tiết từ 24 địa điểm seed đóng gói cùng mã nguồn. Tìm kiếm, bản đồ, lập và lưu lịch trình trong trình duyệt tiếp tục hoạt động. Phản hồi địa điểm trả 503; lịch sử cập nhật trống; dashboard chỉ đọc.
2. **Có cả hai biến:** ứng dụng đọc địa điểm và lưu phản hồi vào Turso/libSQL. Dữ liệu không được migrate hay seed tự động trong request. Trước khi bật hai biến trên Vercel, tạo **database Turso mới và rỗng**, rồi chạy `npm run db:setup:remote` đúng một lần với hai biến đó trong shell cục bộ. Script từ chối database đã có bảng và không thay đổi database hiện hữu. Không dùng script này trên database production đang chứa dữ liệu.

Ví dụ PowerShell, thay giá trị bằng URL và token của database **mới**; không đưa token vào Git hoặc tài liệu:

```powershell
$env:TURSO_DATABASE_URL = "libsql://<database-host>"
$env:TURSO_AUTH_TOKEN = "<database-token>"
npm run db:setup:remote
```

Sau đó đặt `TURSO_DATABASE_URL` và `TURSO_AUTH_TOKEN` trong Vercel Project Settings → Environment Variables cho Production và Preview nếu muốn preview dùng cùng database. Nên dùng database riêng cho Preview để tránh trộn dữ liệu. Đặt `AI_API_KEY` trên Vercel nếu muốn bật phần giải thích do LLM sinh; tùy chọn `AI_PROVIDER_URL`, `AI_MODEL`. Không đặt secret với tiền tố `NEXT_PUBLIC_`. Redeploy sau khi đổi biến môi trường. Nếu chỉ triển khai chế độ seed, không cần cấu hình Turso và planner sẽ dùng thuật toán demo khi không có AI key.

Lịch trình và sở thích hiện lưu trong `localStorage` của từng trình duyệt, không đồng bộ qua thiết bị. Production không cho ghi trạng thái địa điểm hay reset demo; cần đăng nhập, phân quyền và bảo vệ API trước khi mở quyền ghi. Trước khi vận hành với lượng truy cập thực, cần rate limit endpoint phản hồi, giám sát/backup và nguồn dữ liệu địa điểm đã xác minh. Bản đồ OpenStreetMap và ảnh cần kết nối mạng.

## Những gì đã hoàn thành

Khám phá, tìm kiếm/lọc, chi tiết địa điểm, bản đồ toàn màn hình, form lịch trình, thuật toán fallback, timeline có chỉnh sửa và tính lại, lưu/xuất/nhập JSON, sở thích lưu cục bộ, dashboard demo, API trạng thái có lịch sử, polling cảnh báo và chấp nhận/từ chối phương án thay thế hoặc đổi giờ/thứ tự khả thi, giao diện Việt/Anh, PWA cơ bản, responsive và bộ test.
