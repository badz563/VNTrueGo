# Kiến trúc

- Next.js 16 App Router, TypeScript, React 19. API dùng Node.js runtime.
- `src/lib/db.ts` chọn SQLite local trong development, Turso/libSQL khi đủ hai biến môi trường, hoặc seed chỉ đọc ở production chưa kết nối.
- `migrations/001_init.sql` là schema/seed gốc; 002–005 mở rộng bằng `CREATE TABLE/INDEX IF NOT EXISTS`. Migration 005 điền khóa chống review trùng cho review đã có, không xóa dữ liệu cũ. Remote migration chạy tường minh qua CLI, không chạy trong request.
- Session: token 32 byte ngẫu nhiên chỉ lưu trong cookie HttpOnly/SameSite; database lưu SHA-256 của token và thời hạn. Mật khẩu được băm scrypt với salt riêng. API ghi kiểm tra Origin và quyền server.
- Review: bảng `reviews` gốc được giữ nguyên; bảng `review_details` bổ sung điểm nguyên 0–50, chủ sở hữu, trạng thái và bằng chứng AES-256-GCM. Legacy review không tự công khai/tính điểm. Chỉ `approved` đi vào truy vấn công khai và trung bình.
- Quyền đối tác: `partner_members` gắn user với destination. Admin cấp quyền qua `/admin`. API kiểm tra membership cho mỗi thao tác. Audit log lưu quyết định review, cấp quyền và cập nhật nội dung.
- Sự kiện/ưu đãi chỉ hiện khi còn hiệu lực, ưu đãi chỉ hiện sau ngày bắt đầu. Hủy là đổi trạng thái, không xóa vật lý. Mùa vụ hiển thị nguồn và ngày cập nhật.
- Lịch trình localStorage vẫn là nguồn ngoại tuyến; `/api/me/trips` lưu bản sao theo tài khoản khi người dùng yêu cầu. Bản đồ dùng Leaflet/OpenStreetMap và Google Maps URLs, không gọi API định tuyến trả phí.
- PWA cache tài nguyên tĩnh và trang công khai; không cache `/api`, `/account`, `/admin`, `/partner`, `/profile`.
