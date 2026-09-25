# OLYMPIA REALTIME BUZZER & CROSSWORD SYSTEM
> Hệ thống web tương tác thời gian thực phục vụ thuyết trình: "Vượt Chướng Ngại Vật & Buzzer System" (Olympia Style).

---

## 1. Kiến trúc & Công nghệ
- **Backend:** Node.js, Express, Socket.io, UUID, In-memory State Machine.
- **Frontend:** React (Vite), Tailwind CSS, Socket.io-client, Web Audio API (Synthesized SFX), Canvas-confetti.
- **Transports:** Hỗ trợ song song cả `websocket` và `polling`.

---

## 2. Các tính năng cốt lõi

### 2.1. Server-Authoritative Buzzer
- Timestamp bấm chuông được đóng dấu tuyệt đối tại Server bằng `Date.now()`.
- Thí sinh đầu tiên đạt `deltaMs = 0`, các thí sinh tiếp theo tính chính xác độ trễ `+X ms`.
- Chống double buzz, chống spam touch ở mobile với debounce 1000ms.

### 2.2. Thuật toán Render Bàn Cờ Ô Chữ So Le (Staggered Crossword)
- Sử dụng CSS Grid với trục chuẩn `COL_ANCHOR = 12`.
- Mỗi ô chữ của hàng ngang được căn vị trí: `startCol = COL_ANCHOR - keyCharIndex`.
- Ô tại `keyCharIndex` được làm nổi bật với hiệu ứng phát sáng đặc biệt.
- Hiệu ứng 3D flip card khi hàng ngang được Host mở.

### 2.3. Ưu tiên Hàng Dọc (Interrupt Priority) & Án phạt Loại (Permadeath)
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
# Chạy Unit Test State Machine & Buzzer
node test/engine.test.js

# Chạy E2E Socket Flow Simulation
node test/simulation.js
```