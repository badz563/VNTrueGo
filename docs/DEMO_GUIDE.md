# Kịch bản demo cục bộ

1. Chạy các lệnh trong README và tạo admin bằng `npm run admin:bootstrap`. Không có tài khoản/mật khẩu demo hard-code.
2. Đăng ký hai tài khoản du khách tại `/account`. Đăng nhập admin và cấp một tài khoản quyền Partner Manager cho một địa điểm tại `/admin`.
3. Với du khách: tìm địa điểm, thêm yêu thích, tạo lịch trình, thay điểm, mở tuyến Google Maps, dùng `/translate`. Vào `/profile` lưu bản sao lịch trình lên tài khoản.
4. Với đối tác: đăng nhập `/partner`, chọn địa điểm được cấp, đổi trạng thái/giờ, thêm thông báo, sự kiện, ưu đãi, mùa vụ. Quay lại trang chi tiết để xác nhận thông tin; lịch trình chứa địa điểm sẽ hiện cảnh báo khi trạng thái thay đổi.
5. Với review: du khách gửi điểm 0,0 hoặc 4,2 và bằng chứng văn bản thử nghiệm không có dữ liệu cá nhân. Trước duyệt, trang công khai không tính điểm. Admin xem bằng chứng trong `/admin`, duyệt, rồi tải lại trang chi tiết và kiểm tra điểm. Sửa review đã duyệt đưa nó về chờ duyệt.
6. Với phân quyền: du khách không vào `/admin`; đối tác không sửa địa điểm chưa được cấp. Bằng chứng không có URL public.

Chỉ sử dụng địa điểm và nội dung minh họa để demo. Không đưa hóa đơn thật hay bí mật vào bộ dữ liệu thử nghiệm. `npm run db:seed` không xóa dữ liệu đã có; muốn tạo môi trường demo sạch hãy dùng một file SQLite **mới** qua `DATABASE_PATH`.
