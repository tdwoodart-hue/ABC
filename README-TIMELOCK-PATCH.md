# ABC Timelock Message Patch v2

Các file trong ZIP này thay/add đúng phần cần thiết cho chat chibi mã hóa + hẹn giờ.

## Thay đổi UI v2
- Bỏ dòng note kỹ thuật dưới ô hẹn giờ.
- Ô thời gian luôn hiển thị dạng `dd/MM/yyyy • HH:mm` (24 giờ), ví dụ `09/12/2026 • 21:38`.
- Có nút `💌 Đã gửi X` trên card chibi.
- Mở lịch sử sẽ có thống kê: Tổng đã gửi / Đang khóa / Đã mở / Đã xem.
- Tin chưa tới giờ chỉ hiện trạng thái khóa và giờ mở, không hiện plaintext.
- Qua giờ mở có nút `Xem lại` để giải mã và xem nội dung đã gửi.
- Khi người nhận đã xem, lịch sử hiển thị `Đã xem` và thời điểm xem.

## Bảo mật
- Firestore không lưu `text` cho tin mới.
- Nội dung được timelock-encrypt ở browser trước khi ghi Firestore.
- Sửa `unlockAt` hoặc đổi giờ máy không tạo được beacon drand tương lai.
- Tin cũ đã lưu plaintext trước patch không tự được migrate.

## Apply
1. Copy các file theo đúng đường dẫn vào repo ABC.
2. Chạy `npm install` (hoặc package manager đang dùng) để cài `tlock-js@0.9.0` và cập nhật lockfile.
3. Chạy `npm run lint`.
4. Chạy `npm run build`.
