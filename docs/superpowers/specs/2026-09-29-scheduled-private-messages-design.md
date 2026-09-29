# Tin nhắn hẹn giờ riêng tư — thiết kế

## Mục tiêu

Hai người trong cặp đôi có thể gửi một lời nhắn cho đối phương, chọn thời điểm mở, nhận thông báo khi thư mở và đọc thư từ mục **Đôi lời muốn nói** trong menu Thêm.

Thư không được ghi vào Firestore dưới dạng văn bản đọc được. Thông báo không chứa nội dung thư.

## Ranh giới bảo mật

Ứng dụng hiện là SPA Vite và Firestore. Giao diện tự nó không thể bảo đảm người nhận không đọc sớm: nếu trình duyệt có cả khóa và bản mã thì người dùng kiểm soát trình duyệt có thể giải mã.

Để thực hiện đúng thời điểm, hệ thống cần một API tin cậy ở Vercel. API giữ phần khóa mở thư đến `unlockAt`; Firestore chỉ lưu bản mã và metadata không nhạy cảm. API chỉ phát phần khóa sau thời gian đó, sau khi xác thực Firebase ID token và kiểm tra tài khoản thuộc cặp đôi. Đây là bảo mật dựa trên tin cậy vào dịch vụ phát khóa; không thể hứa rằng nhà vận hành có quyền truy cập hạ tầng sẽ "không ai" đọc được tuyệt đối.

## Luồng dữ liệu

1. Người gửi tạo một khóa AES-GCM ngẫu nhiên ngay trên thiết bị, mã hóa nội dung và gửi `ciphertext`, `iv`, `recipientUid`, `unlockAt` lên Firestore.
2. Khóa AES được mã hóa cho dịch vụ phát khóa bằng khóa công khai cấu hình qua biến môi trường. Dịch vụ lưu key material tách biệt khỏi Firestore.
3. Khi đến hạn, cron Vercel gọi endpoint kiểm tra các thư đến hạn, gửi push không kèm nội dung đến người nhận và đánh dấu đã thông báo.
4. Màn **Đôi lời muốn nói** tải danh sách thư. Thư chưa đến hạn chỉ hiện thời gian mở. Thư đã đến hạn gọi API lấy key material, giải mã cục bộ và chỉ khi đó hiển thị nội dung.

## Thành phần

- `src/utils/scheduledMessages.ts`: định nghĩa model, mã hóa/giải mã Web Crypto, xác thực metadata.
- `src/components/ScheduledMessagesModal.tsx`: soạn thư, chọn giờ, danh sách Hộp thư đến / Đã gửi.
- `src/components/MoreMenuSheet.tsx` và `BottomNavigation`: mục điều hướng mở modal.
- `api/scheduled-messages/*`: API Vercel xác thực token, nhận key material, phát key sau hạn, job thông báo.
- `vercel.json`: cron gọi endpoint thông báo.
- `firestore.rules`: giới hạn theo `coupleId`, người gửi/người nhận; không cho tài khoản khác đọc thư.

## Cấu hình bắt buộc trước khi production

- Firebase Admin credentials cho API Vercel.
- Secret mã hóa key material phía server và khóa công khai dùng khi tạo thư.
- Vercel cron đã bật; FCM/VAPID và endpoint `/api/send-push` hoạt động.

Nếu một cấu hình thiếu, thao tác gửi phải báo rõ không thể bảo đảm mở đúng giờ thay vì lưu thư kém an toàn.

## Kiểm thử

- Unit test: mã hóa rồi giải mã trả nguyên nội dung; sai key/IV thất bại; giờ mở trong quá khứ bị từ chối.
- API test: token không hợp lệ, người không phải người nhận, và thư chưa đến hạn đều bị từ chối.
- UI test: thư khóa không lộ nội dung; thư đã mở gọi lấy khóa; push payload không có nội dung thư.
- Build, typecheck và kiểm tra luồng trên bản preview Vercel trước phát hành.
