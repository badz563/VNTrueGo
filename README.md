# VietNam TrueGo

Ứng dụng du lịch mobile-first cho Hà Nội: khám phá địa điểm, lập lịch trình, Google Maps URLs, Google Translate, tài khoản, đánh giá chờ xác minh và cổng đối tác/admin. Logo do chủ dự án cung cấp. 29 địa điểm seed gồm 24 điểm tham quan và 5 điểm ăn uống/lưu trú. Ảnh AI đã được thay bằng ảnh chụp thật; nguồn, tác giả và giấy phép được ghi ở `/photo-credits` và `data/photo-credits.json`. Ảnh phở và pizza minh họa món ăn, không phải ảnh chụp tại hai cơ sở. Giờ, chi phí và tọa độ ghim vẫn là **dữ liệu minh họa/chưa xác minh**.

## Chạy cục bộ

Yêu cầu Node.js 24 và npm. Trong thư mục dự án:

```powershell
npm install
Copy-Item .env.example .env.local
npm run db:seed
npm run db:migrate
npm run dev
```

Mở `http://localhost:3000`. Database local mặc định ở `data/truego.sqlite` (Git bỏ qua). Không có Prisma; app dùng `@libsql/client` với SQLite cục bộ hoặc Turso/libSQL từ xa. Migration 001 có seed địa điểm; migrations 002–005 thêm bảng/index và 005 điền khóa chống review trùng theo tài khoản/địa điểm, an toàn khi chạy lại. Không chạy `db:seed` để reset một database hiện hữu.

Trong development, khóa AES cho bằng chứng review được tạo tự động tại `data/evidence.key` và Git bỏ qua. Giữ file này khi cần đọc bằng chứng cũ. Production **bắt buộc** đặt `EVIDENCE_ENCRYPTION_KEY` gồm 64 ký tự hex; thay khóa mà không di chuyển dữ liệu sẽ khiến bằng chứng cũ không giải mã được.

## Tài khoản và luồng demo

1. Vào `/account` đăng ký một tài khoản du khách, mật khẩu tối thiểu 12 ký tự. Sau đăng nhập, `/account/settings` cho phép đổi tên hiển thị và mật khẩu.
2. Tạo admin bằng lệnh riêng, dùng biến môi trường trong shell; script từ chối email đã tồn tại và không có mật khẩu mặc định:

   ```powershell
   $env:ADMIN_EMAIL = "admin@example.com"
   $env:ADMIN_PASSWORD = "<mat-khau-rieng-toi-thieu-16-ky-tu>"
   npm run admin:bootstrap
   Remove-Item Env:ADMIN_PASSWORD
   ```

3. Đăng nhập admin tại `/account`, vào `/admin` để duyệt review hoặc cấp quyền Partner Manager/Staff cho tài khoản đã đăng ký và địa điểm cụ thể.
4. Đối tác đăng nhập, vào `/partner` để cập nhật trạng thái, giờ tham khảo, thông báo, đăng sự kiện, ưu đãi hoặc thông tin mùa vụ. Staff không được sửa mô tả; ưu đãi/mùa vụ yêu cầu Manager hoặc Admin. API kiểm tra quyền ở server.
5. Du khách vào `/destinations/[slug]`, gửi đánh giá với bằng chứng văn bản riêng tư. Review chỉ được công khai và tính điểm sau khi admin duyệt. Điểm 0,0–5,0 theo bước 0,1, lưu dưới dạng số phần mười.
6. Vào `/trip` để tạo, khóa/thay/đổi thứ tự và lưu lịch trình trên thiết bị. Vào `/profile` để sao lưu lịch trình lên tài khoản hoặc mở lại; yêu thích địa điểm cũng được lưu theo tài khoản.
7. Mở vị trí hoặc tuyến theo ngày bằng Google Maps URLs. `/translate` mở nội dung sang Google Translate theo hai chiều Việt–Anh.

`/partner-demo` vẫn là sandbox **chỉ cho development**. API demo công khai trong máy cục bộ, nhưng tắt quyền ghi trên production. Nút reset demo chỉ đưa trạng thái/giờ/mô tả địa điểm seed và lịch sử trạng thái cục bộ về ban đầu; không xóa tài khoản, review hay lịch trình.

## Demo công khai qua Cloudflare Quick Tunnel trên Windows

Chế độ này chạy `next build` + `next start` trên `127.0.0.1:3000` và dùng **database riêng** `data/truego-public-demo.sqlite`; không dùng Turso/Vercel hoặc `data/truego.sqlite`. Script chỉ bật SQLite production khi `TRUEGO_LOCAL_DEMO=1` trong tiến trình được quản lý, tạo khóa mã hóa riêng trong `.demo-runtime/evidence.key`, và không seed tài khoản admin mặc định. Cloudflared chạy độc lập sau khi terminal kết thúc.

```powershell
npm run demo:start    # build, khởi chạy và in URL HTTPS mới
npm run demo:status   # kiểm tra cả localhost và URL công khai
npm run demo:restart  # giữ SQLite, cấp URL mới
npm run demo:stop     # chỉ dừng tiến trình demo; không xóa SQLite
```

Cần Node.js, npm, dependencies đã cài và `cloudflared` (có thể cài bằng `winget install --id Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements`). URL và PID hiện tại cũng được lưu ở `.demo-runtime/state.json` (Git bỏ qua). Nếu muốn tạo admin cho bản demo, dùng `DATABASE_PATH` trỏ **đúng database demo** và `npm run admin:bootstrap`; tự đặt mật khẩu mạnh, không chia sẻ tài khoản admin. Tài khoản du khách tự đăng ký trên website; chỉ dùng dữ liệu thử nghiệm, không nhập thông tin cá nhân hoặc hóa đơn thật.

Máy Windows phải bật, có Internet và hai tiến trình Next.js/cloudflared còn chạy. Quick Tunnel có hostname tạm và **không đảm bảo uptime**; URL đổi sau khi restart. Một số DNS cục bộ có thể chưa phân giải hostname mới ngay; `demo:status` kiểm tra thêm qua DNS công khai của Cloudflare mà không đổi cấu hình Windows. Xem [tài liệu Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## Vercel và database

Ứng dụng dùng Next.js App Router/Node.js Functions, không có `output: "export"`. Nếu chưa có Turso, Vercel hiển thị 29 địa điểm seed và planner trên thiết bị; các chức năng cần ghi database trả lỗi rõ ràng. Không nên trình diễn tài khoản/review/đối tác trên production khi chưa cấu hình Turso. Khi cập nhật một database đã tồn tại, việc bổ sung địa điểm seed chỉ chèn ID còn thiếu trong SQLite demo cục bộ; Turso production cần quy trình cập nhật dữ liệu riêng sau khi sao lưu và rà soát, không chạy lại `db:setup:remote`.

Với **database Turso libSQL mới và rỗng** (chọn engine libSQL; ứng dụng dùng `@libsql/client`, chưa hỗ trợ engine Turso mới):

1. Tạo database libSQL trong Turso Dashboard, hoặc chạy `turso db create vntruego` nếu đã cài Turso CLI (không thêm cờ `--tursodb`). Lấy URL từ Dashboard hoặc `turso db show vntruego`; tạo token bằng `turso db tokens create vntruego`. Không gửi token qua chat, không commit `.env.local`.
2. Đặt `TURSO_DATABASE_URL` và `TURSO_AUTH_TOKEN` trong shell cục bộ. Chạy `npm run db:setup:remote` **một lần** để tạo schema 001 và seed; script từ chối database đã có bảng.
3. Chạy `npm run db:migrate:remote` để thêm migrations 002–005. Với database có dữ liệu hiện hữu, sao lưu và chỉ chạy lệnh migration này sau khi rà soát schema; không chạy setup/seed.
4. Đặt `ADMIN_EMAIL`, `ADMIN_PASSWORD` trong shell rồi chạy `npm run admin:bootstrap:remote`. Script không sửa tài khoản hiện hữu. Xóa biến mật khẩu khỏi shell sau đó.
5. Trong Vercel Project Settings → Environment Variables đặt `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `EVIDENCE_ENCRYPTION_KEY` (64 hex). Dùng database riêng cho Preview. `AI_API_KEY`, `AI_PROVIDER_URL`, `AI_MODEL` là tùy chọn, chỉ ảnh hưởng phần diễn giải AI. Không thêm `NEXT_PUBLIC_` cho secret.
6. Triển khai Next.js theo cấu hình framework mặc định; sau deploy kiểm tra trực tiếp đăng ký, review, kiểm duyệt, đối tác, lưu lịch trình, Google Maps và Google Translate. Trong thay đổi hiện tại **chưa push hoặc deploy** theo yêu cầu chủ dự án.

Ví dụ nạp thông tin vào **phiên PowerShell hiện tại** trước bước 2–4 (token và mật khẩu được nhập ẩn, không ghi vào lịch sử lệnh):

```powershell
$env:TURSO_DATABASE_URL = Read-Host "Turso libSQL URL"
$tursoSecret = Read-Host "Turso database token" -AsSecureString
$env:TURSO_AUTH_TOKEN = [System.Net.NetworkCredential]::new("", $tursoSecret).Password
Remove-Variable tursoSecret
npm run db:setup:remote
npm run db:migrate:remote
$env:ADMIN_EMAIL = Read-Host "Email admin"
$adminSecret = Read-Host "Mật khẩu admin tối thiểu 16 ký tự" -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $adminSecret).Password
Remove-Variable adminSecret
npm run admin:bootstrap:remote
Remove-Item Env:ADMIN_PASSWORD, Env:TURSO_AUTH_TOKEN
```

Chỉ chạy khối trên với database **mới, rỗng và đúng URL**. Nếu đã có dữ liệu, dừng trước `db:setup:remote`, sao lưu và kiểm tra schema trước khi migration.

Tạo khóa AES bằng PowerShell và Node: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`; lưu kết quả trực tiếp trong secret manager của Vercel, không trong Git. Cần lưu giữ khóa an toàn để đọc bằng chứng đã mã hóa.

## Kiểm thử

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

E2E cần Chromium Playwright (`npx playwright install chromium`). Xem [FEATURES.md](docs/FEATURES.md), [DEMO_GUIDE.md](docs/DEMO_GUIDE.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), [LIMITATIONS.md](docs/LIMITATIONS.md).
