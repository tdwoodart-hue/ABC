ABC - Visited Places UI V4

Thay trực tiếp 2 file theo đúng đường dẫn:
- src/components/VisitedPlacesTracker.tsx
- src/types.ts

Bản này dựa trên V3 có rating đang hoạt động và chỉ cải thiện UI/UX:
- Header hành trình + 3 ô thống kê
- Filter/search gọn, responsive mobile
- Bỏ banner vàng lớn
- Card địa điểm mới, action chuyển xuống hàng dưới
- Rating CTA đồng bộ màu rose của app, sao vẫn amber
- Top địa điểm gọn hơn
- Modal chấm điểm mới
- Không đổi Firestore path / schema ngoài field rating đã có ở V3
