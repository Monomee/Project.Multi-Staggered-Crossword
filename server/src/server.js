/**
 * server.js
 * Điểm khởi chạy Server Express & Socket.io
 */
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './core/RoomManager.js';
import { registerSocketHandlers } from './socket/handlers.js';

const app = express();
const server = http.createServer(app);

// Cấu hình CORS chặt chẽ: hỗ trợ biến môi trường CLIENT_URL khi Deploy Render
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : null;

const corsOriginChecker = (origin, callback) => {
  // Cho phép request không có origin (mobile apps, server-to-server, curl)
  if (!origin) return callback(null, true);

  if (allowedOrigins && allowedOrigins.length > 0) {
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: Origin ${origin} is not allowed`));
  }

  // Chế độ Dev/Local: Cho phép localhost và IP mạng nội bộ LAN (192.168.x.x, 10.x.x.x, v.v.)
  const isLocalOrLan =
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|26\.)/.test(origin);

  if (isLocalOrLan) {
    return callback(null, true);
  }

  return callback(null, true);
};

const corsOptions = {
  origin: corsOriginChecker,
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// API health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: roomManager.rooms.size,
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Cấu hình Socket.io hỗ trợ cả websocket và polling theo tài liệu
const io = new Server(server, {
  cors: {
    origin: corsOriginChecker,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const roomManager = new RoomManager();
registerSocketHandlers(io, roomManager);

// Render tự động cấp cổng qua biến môi trường process.env.PORT
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Olympia Server] Running on port ${PORT} (http://localhost:${PORT})`);
  console.log(`[Olympia Server] Allowed Origins: ${allowedOrigins ? allowedOrigins.join(', ') : 'Dev Mode (Localhost & LAN IP)'}`);
  console.log(`[Olympia Server] Socket.io ready with transports: websocket, polling`);
});
