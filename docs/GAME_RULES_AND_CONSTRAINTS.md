
# NGUYÊN TẮC NGHIỆP VỤ & RÀNG BUỘC KỸ THUẬT (CONSTRAINTS)

## 1. Thuật toán Render Lưới Ô Chữ So Le (Staggered Crossword)
* **Vấn đề:** Các hàng ngang có độ dài khác nhau nhưng phải thẳng hàng tại chữ cái Chướng ngại vật.
* **Quy chuẩn hiển thị:**
  - Sử dụng CSS Grid. Xác định trục chuẩn tại cột: `COL_ANCHOR = 12`.
  - Mỗi ô chữ của hàng ngang được render từ vị trí: `startCol = COL_ANCHOR - keyCharIndex`.
  - Ô tại `keyCharIndex` bắt buộc có class CSS đặc biệt để tô màu nổi bật (ví dụ: `bg-green-500` hoặc `bg-amber-400`).
  - Ban đầu, toàn bộ chữ cái được ẩn (chỉ hiện khung ô vuông trắng). Khi Host xác nhận đúng hàng ngang, trạng thái ô chuyển sang hiển thị ký tự in hoa kèm animation lật ô.

## 2. Quy tắc Xử lý Chuông & Trọng tài Host
1. **Server-Authoritative:**
   - Server ghi nhận `buzzTime = Date.now()`.
   - Người đầu tiên trong chu kỳ bấm được tính `deltaMs = 0`. Các người bấm sau được tính `deltaMs = buzzTime - firstBuzzTime`.
2. **Ưu tiên Hàng Dọc (Interrupt Priority):**
   - Khi có người bấm Hàng Dọc (`VERTICAL`), hệ thống lập tức phát hiệu ứng âm thanh cảnh báo trên màn hình Host.
   - Khóa tạm thời nút bấm Hàng Ngang của mọi người chơi cho đến khi Host xử lý xong trường hợp Hàng Dọc này.
3. **Phạt Loại Khỏi Cuộc Chơi (Permadeath):**
   - Nếu Host ấn **"Sai"** cho lượt đoán Hàng Dọc:
     * Server set `players[id].isEliminated = true`.
     * Client người chơi đó chuyển ngay sang màn hình xám xịt: "Bạn đã mất quyền tham gia phần thi này".
     * Mọi nút bấm (cả Row lẫn Vertical) bị vô hiệu hóa hoàn toàn.
4. **Xử lý Bấm Nhầm (Dismiss Action):**
   - Host có nút "Bỏ qua". Hành động này xóa người chơi khỏi `verticalQueue` mà không kích hoạt cờ `isEliminated`.

## 3. Ràng buộc Mạng & Ngoại cảnh Hội trường
1. **Chống Spam Touch (Mobile):**
   - Phía Mobile Client: Ngay khi touch/click, set local state `buttonDisabled = true` trong 1000ms để chặn spam socket packet.
2. **Chống Tắt Màn Hình (Screen Sleep):**
   - Tích hợp Screen Wake Lock API ở client phía người chơi để giữ màn hình điện thoại luôn sáng trong suốt buổi thuyết trình.
3. **Session Reconnection:**
   - Client tự sinh `playerId = uuidv4()` và lưu vào `sessionStorage`.
   - Nếu rớt mạng hoặc reload tab, client gửi lại `playerId` này trong event `join_room` để server phục hồi điểm số và trạng thái `isEliminated`.
4. **Transport Fallback:**
   - Socket Client bắt buộc dùng: `transports: ['websocket', 'polling']`.