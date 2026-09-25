# KỸ THUẬT VÀ KIẾN TRÚC DỰ ÁN (PROJECT SPEC)



## 1. Cấu trúc thư mục dự án (Monorepo)

```text

├── client/

│   ├── src/

│   │   ├── components/

│   │   │   ├── host/

│   │   │   │   ├── CrosswordBoard.jsx   # Bàn cờ chữ so le

│   │   │   │   ├── HostControls.jsx     # Nút unlock, reset, next

│   │   │   │   └── BuzzQueueList.jsx    # Danh sách người bấm (ms)

│   │   │   └── player/

│   │   │       ├── QuestionViewer.jsx   # Thẻ xem câu hỏi chống cận

│   │   │       ├── RowBuzzer.jsx        # Nút bấm hàng ngang

│   │   │       └── VerticalBuzzer.jsx   # Nút đỏ bấm hàng dọc

│   │   ├── hooks/

│   │   │   └── useSocket.js             # Quản lý vòng đời kết nối socket

│   │   └── App.jsx

│   └── package.json

├── server/

│   ├── src/

│   │   ├── core/

│   │   │   └── BuzzerManager.js         # Core xử lý timestamp \& queue

│   │   ├── games/

│   │   │   └── ObstacleEngine.js        # State Machine game Olympia

│   │   ├── socket/

│   │   │   └── handlers.js              # Socket controller

│   │   └── server.js                    # Khởi tạo Express \& Socket.io

│   └── package.json

├── data/

│   └── game-sample.json                 # Dữ liệu câu hỏi

└── docs/  
```

## 2. Đặc tả Socket Event API

### Client -> Server:

* `join_room` `{ roomCode, playerName, role, playerId }`
* `client:buzz` `{ type: 'ROW' | 'VERTICAL' }` (Gửi tín hiệu bấm chuông)
* `host:select_row` `{ rowId }` (Host kích hoạt câu hỏi hàng ngang)
* `host:toggle_buzzer` `{ isOpen: boolean }` (Host mở/khóa quyền bấm chuông hàng ngang)
* `host:judge_result` `{ playerId, type: 'ROW'|'VERTICAL', isCorrect: boolean }`
* `host:dismiss_buzz` `{ playerId, type: 'ROW'|'VERTICAL' }` (Bỏ qua ca ấn nhầm, không phạt)
* `host:reset_buzzer` (Xóa hàng đợi chuông hiện tại)

### Server -> Client (Broadcast):

* `sync_game_state` Toàn bộ state phòng (gửi khi reconnect hoặc có thay đổi lớn).
* `buzz:row_queue_updated` `{ queue: [{ playerId, name, deltaMs }] }`
* `buzz:vertical_triggered` `{ playerId, name, deltaMs }` (Còi báo động khẩn cấp)
* `game:row_revealed` `{ rowId, answer }`
* `game:player_eliminated` `{ playerId }`

```
