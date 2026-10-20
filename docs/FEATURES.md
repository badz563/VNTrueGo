# Trạng thái tính năng

| Phân hệ | Hiện trạng |
| --- | --- |
| Khám phá 29 địa điểm Hà Nội gồm 5 quán ăn/cà phê/nhà hàng/khách sạn mới, tìm kiếm, loại hình, sở thích, lọc giá/sắp xếp rating đã duyệt, tải thêm, bản đồ MapLibre/OpenFreeMap | Hoạt động với dữ liệu minh họa; khách sạn không được tự xếp vào lịch trình tham quan |
| Lập lịch trình cá nhân hóa theo quy tắc, mẫu sở thích, khóa/thay/sắp xếp, cảnh báo trạng thái, lưu localStorage | Hoạt động; chưa có định tuyến thực tế |
| Đồng hành sau khi lập lịch: điểm sắp đến, chỉ đường Google Maps, đánh dấu đã ghé/bỏ qua, tiến độ theo ngày và tính lại giờ khi trễ | Hoạt động trên trình duyệt; giờ mới là ước tính, không tự đồng bộ lên tài khoản |
| Google Maps URLs cho điểm và tuyến ngày; Google Translate Việt–Anh | Hoạt động bằng liên kết ngoài |
| Đăng ký/đăng nhập/đăng xuất, đổi tên/mật khẩu, cookie phiên, scrypt | Hoạt động khi có database |
| Yêu thích, sao lưu/mở lịch trình trên tài khoản | Hoạt động khi có database; sao lưu thủ công |
| Biên nhận thanh toán mô phỏng gắn tài khoản/địa điểm; review 0,0–5,0, bằng chứng AES-GCM riêng tư, chờ duyệt, admin duyệt/từ chối | Hoạt động khi có database và khóa mã hóa; không thu tiền hoặc xác minh trải nghiệm thật |
| Admin cấp quyền theo địa điểm, Partner Manager/Staff cập nhật trạng thái/giờ/thông báo | Hoạt động khi có database; Staff bị giới hạn sửa mô tả |
| Đối tác đăng sự kiện, ưu đãi, mùa vụ; du khách xem thông tin còn hiệu lực | Hoạt động khi có database; chưa có tải ảnh/tài liệu |
| Tình huống đóng cửa riêng trên trình duyệt, gợi ý thay thế theo giờ/sở thích/ngân sách; AI tùy chọn giải thích kế hoạch và phương án | Hoạt động dạng demo; khi không có API key thì diễn giải theo thuật toán |

Các nội dung chưa triển khai đầy đủ được liệt kê trong [LIMITATIONS.md](LIMITATIONS.md). Không dùng dữ liệu seed để tuyên bố thông tin đã xác minh.
