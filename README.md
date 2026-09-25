# OLYMPIA REALTIME BUZZER & CROSSWORD SYSTEM
> Hệ thống web tương tác thời gian thực phục vụ thuyết trình: "Vượt Chướng Ngại Vật & Buzzer System" (Olympia Style).

---

## 1. Kiến trúc & Công nghệ
- **Backend:** Node.js, Express, Socket.io, UUID, In-memory State Machine.
- **Frontend:** React (Vite), Tailwind CSS, Socket.io-client, Web Audio API (Synthesized SFX), Canvas-confetti.
- **Transports:** Hỗ trợ song song cả `websocket` và `polling`.

---

## 2. Các tính năng cốt lõi

### 2.1. Quản lý Phòng chơi & QR Code (Room Management & Reconnection)
- **Mã phòng 5 ký tự dễ đọc:** Tự động sinh từ bảng chữ cái đã loại bỏ ký tự dễ nhầm lẫn (Bỏ `I`, `O`, `0`, `1`; chỉ dùng `A-Z`, `2-9`). Cho phép Host tùy chọn mã phòng tùy ý (ví dụ: `OLYM8`).
- **Mã QR & Auto-fill Link:** Host bấm "Mở mã QR", thí sinh dùng camera quét mã hoặc click link `?room=OLYM8` để tự động điền mã phòng và focus sẵn ô nhập tên.
- **Sảnh chờ (Lobby View):** Hiển thị danh sách thí sinh kèm trạng thái Online/Offline theo thời gian thực. Host bấm "Bắt đầu chơi" để chuyển sang bảng ô chữ.
- **Khôi phục phiên (Reconnection):** Lưu `playerId` và `roomCode` trong `sessionStorage`. Thí sinh reload hoặc rớt mạng được tự động phục hồi điểm số, trạng thái và bàn cờ hiện tại.
- **Chống rò rỉ RAM (Anti-Memory Leak):** Khi Host ngắt kết nối, server kích hoạt timer 10 phút. Nếu sau 10 phút Host không reconnect, toàn bộ dữ liệu phòng được giải phóng hoàn toàn khỏi bộ nhớ RAM.

### 2.2. Server-Authoritative Buzzer
- Timestamp bấm chuông được đóng dấu tuyệt đối tại Server bằng `Date.now()`.
- Thí sinh đầu tiên đạt `deltaMs = 0`, các thí sinh tiếp theo tính chính xác độ trễ `+X ms`.
- Chống spam touch ngay tại Server (rate-limiting 300ms) và drop packet nếu đã có tên trong hàng đợi.

### 2.3. Thuật toán Render Bàn Cờ Ô Chữ So Le (Staggered Crossword)
- Sử dụng CSS Grid với trục chuẩn `COL_ANCHOR = 12`.
- Mỗi ô chữ của hàng ngang được căn vị trí: `startCol = COL_ANCHOR - keyCharIndex`.
- Ô tại `keyCharIndex` được làm nổi bật với hiệu ứng phát sáng đặc biệt.
- Hiệu ứng 3D flip card khi hàng ngang được Host mở.

### 2.4. Ưu tiên Hàng Dọc (Interrupt Priority) & Án phạt Loại (Permadeath)
- Khi có thí sinh bấm chuông Hàng Dọc (Chướng Ngại Vật), còi báo động khẩn cấp lập tức phát và hiển thị trên màn hình Host.
- Chuông hàng ngang tạm thời bị khóa.
- Nếu Host xác nhận **Sai**: Thí sinh bị loại vĩnh viễn khỏi phần thi (`isEliminated = true`), màn hình chuyển sang xám xịt và toàn bộ nút bấm bị vô hiệu hóa.
- Host có nút **Bỏ qua (Dismiss)** để tha cho các trường hợp bấm nhầm mà không phạt.

### 2.4. Trải nghiệm Hội trường & Mobile Client
- Tích hợp **Screen Wake Lock API** giữ màn hình điện thoại của thí sinh luôn sáng.
- **Session Reconnection:** Tự lưu `playerId` vào `sessionStorage`, tự động phục hồi điểm và trạng thái khi rớt mạng hoặc reload tab.
- **Web Audio API:** Tích hợp bộ phát âm thanh tự tạo (tiếng chuông bấm, còi báo động khẩn cấp, tiếng ting ting đúng, tiếng tò te sai, tiếng lật ô chữ).

---

## 3. Hướng dẫn chạy dự án

### Cách 1: Chạy đồng thời bằng npm scripts
```bash
# Cửa sổ 1: Chạy Server (Port 3001)
npm run server

# Cửa sổ 2: Chạy Client (Port 3000)
npm run client
```

### Cách 2: Chạy riêng từng thư mục
```bash
# 1. Khởi chạy Server
cd server
npm start
# Server chạy tại: http://localhost:3001

# 2. Khởi chạy Client
cd client
npm run dev
# Client mở tại: http://localhost:3000
```

---

## 4. Kiểm thử tự động (Unit Test & E2E Simulation)
```bash
cd server
# 1. Chạy Unit Test State Machine & Buzzer
node test/engine.test.js

# 2. Chạy Unit Test RoomManager & Reconnection
node test/roomManager.test.js

# 3. Chạy E2E Socket Flow Simulation
node test/simulation.js

# 4. Chạy E2E Acceptance Criteria Test (Tạo phòng OLYM8, QR link, Reconnect, Anti-Leak)
node test/room_e2e_acceptance.test.js
```