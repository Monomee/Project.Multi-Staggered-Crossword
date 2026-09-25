/**
 * RoomManager.js
 * Quản lý đa phòng chơi In-Memory, sinh mã phòng 5 ký tự dễ đọc, xác thực HostToken & PlayerSecret, và chống rò rỉ bộ nhớ
 */
import crypto from 'crypto';
import { ObstacleEngine } from '../games/ObstacleEngine.js';

// Bảng chữ cái đã loại bỏ các ký tự dễ nhầm lẫn (Bỏ I, O, 0, 1)
const SAFE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const HOST_CLEANUP_TIMEOUT_MS = 10 * 60 * 1000; // 10 phút

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode => Room Object
  }

  /**
   * Sinh mã phòng 5 ký tự ngẫu nhiên, không trùng với phòng đang hoạt động
   */
  generateRoomCode() {
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * SAFE_ALPHABET.length);
        code += SAFE_ALPHABET[randomIndex];
      }
    } while (this.rooms.has(code));
    return code;
  }

  /**
   * Khởi tạo phòng mới cho Host kèm mã bảo mật hostToken chống cướp quyền
   * @param {string} hostSocketId
   * @param {string|null} customCode (tùy chọn, vd: OLYM8)
   */
  createRoom(hostSocketId, customCode = null) {
    const rawCode = customCode ? customCode.trim().toUpperCase() : this.generateRoomCode();
    const roomCode = rawCode || this.generateRoomCode();

    // Nếu phòng cũ trùng mã đang tồn tại, xóa dọn dẹp trước
    if (this.rooms.has(roomCode)) {
      this.deleteRoom(roomCode);
    }

    const hostToken = crypto.randomBytes(24).toString('hex');
    const gameEngine = new ObstacleEngine();
    gameEngine.roomCode = roomCode;

    const room = {
      roomCode,
      hostToken, // Mã bảo mật phiên Host chống chiếm quyền
      hostSocketId,
      hostDisconnectedAt: null,
      cleanupTimer: null,
      status: 'LOBBY', // 'LOBBY' | 'PLAYING' | 'FINISHED'
      players: new Map(), // playerId => { id, name, score, isEliminated, socketId, connected, secret }
      gameEngine,
      buzzerManager: gameEngine.buzzer
    };

    this.rooms.set(roomCode, room);
    console.log(`[RoomManager] Khởi tạo phòng mới: ${roomCode} (Host Socket: ${hostSocketId})`);
    return room;
  }

  /**
   * Tìm phòng theo mã phòng
   */
  getRoom(roomCode) {
    if (!roomCode) return null;
    return this.rooms.get(roomCode.trim().toUpperCase()) || null;
  }

  /**
   * Xác thực quyền Host thông qua hostToken
   */
  verifyHost(roomCode, hostToken) {
    const room = this.getRoom(roomCode);
    if (!room || !hostToken) return false;
    return room.hostToken === hostToken;
  }

  /**
   * Tìm phòng mà socketId đang làm Host
   */
  findRoomByHostSocket(socketId) {
    for (const room of this.rooms.values()) {
      if (room.hostSocketId === socketId) {
        return room;
      }
    }
    return null;
  }

  /**
   * Tìm phòng và player theo socketId
   */
  findRoomByPlayerSocket(socketId) {
    for (const room of this.rooms.values()) {
      for (const player of room.players.values()) {
        if (player.socketId === socketId) {
          return { room, player };
        }
      }
    }
    return null;
  }

  /**
   * Thí sinh tham gia phòng hoặc phục hồi phiên (Reconnection) có xác thực playerSecret
   */
  joinPlayer(roomCode, { playerId, playerName, playerSecret, socketId }) {
    const room = this.getRoom(roomCode);
    if (!room) return { error: `Phòng ${roomCode} không tồn tại!` };

    let player = room.players.get(playerId);
    if (player) {
      // Xác thực bí mật phiên: Chống giả mạo chiếm đoạt playerId của người khác
      if (player.secret && playerSecret && player.secret !== playerSecret) {
        console.warn(`[Security] Cảnh báo giả mạo: Thử truy cập trái phép playerId ${playerId} tại phòng ${roomCode}!`);
        return { error: 'Xác thực thất bại! Bạn không có quyền truy cập phiên thí sinh này.' };
      }

      // Reconnection hợp lệ: Cập nhật socketId mới, đánh dấu connected
      player.socketId = socketId;
      player.connected = true;
      if (playerName && playerName.trim()) {
        player.name = playerName.trim();
      }

      const enginePlayer = room.gameEngine.getPlayer(playerId);
      if (enginePlayer) {
        player.score = enginePlayer.score;
        player.isEliminated = enginePlayer.isEliminated;
      }
      console.log(`[RoomManager] Thí sinh ${player.name} (${playerId}) RECONNECT vào phòng ${room.roomCode} với socket: ${socketId}`);
      return { room, player, playerSecret: player.secret };
    } else {
      // Thí sinh mới: Cấp mới playerSecret bảo mật
      const secret = playerSecret || crypto.randomBytes(16).toString('hex');
      player = {
        id: playerId,
        name: (playerName && playerName.trim()) || `Thí sinh ${room.players.size + 1}`,
        score: 0,
        isEliminated: false,
        socketId,
        connected: true,
        secret
      };
      room.players.set(playerId, player);
      console.log(`[RoomManager] Thí sinh mới ${player.name} (${playerId}) gia nhập phòng ${room.roomCode}`);

      // Đồng bộ vào Game Engine
      room.gameEngine.joinPlayer({
        playerId: player.id,
        playerName: player.name,
        socketId
      });

      return { room, player, playerSecret: secret };
    }
  }

  /**
   * Xử lý khi Host ngắt kết nối: Hẹn giờ 10 phút tự hủy phòng chống rò rỉ RAM
   * Đảm bảo không giữ closure reference để tránh Memory Leak
   */
  handleHostDisconnect(socketId) {
    const room = this.findRoomByHostSocket(socketId);
    if (!room) return null;

    room.hostDisconnectedAt = Date.now();
    console.log(`[RoomManager] Host phòng ${room.roomCode} ngắt kết nối. Đặt timer 10 phút dọn dẹp...`);

    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
      room.cleanupTimer = null;
    }

    // Chỉ capture primitive string roomCode để tránh closure memory leak giữ toàn bộ object room
    const targetCode = room.roomCode;
    room.cleanupTimer = setTimeout(() => {
      console.log(`[RoomManager] Quá 10 phút Host không trở lại. Giải phóng phòng ${targetCode} khỏi RAM.`);
      this.deleteRoom(targetCode);
    }, HOST_CLEANUP_TIMEOUT_MS);

    return room;
  }

  /**
   * Xử lý khi Host kết nối lại (Reconnection): Hủy timer dọn dẹp
   */
  handleHostReconnect(roomCode, hostToken, socketId) {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Phòng không tồn tại!' };

    // Kiểm tra hostToken bảo mật
    if (room.hostToken !== hostToken) {
      return { success: false, error: 'Mã xác thực Host không hợp lệ! Không thể chiếm quyền điều khiển.' };
    }

    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
      room.cleanupTimer = null;
    }
    room.hostDisconnectedAt = null;
    room.hostSocketId = socketId;
    console.log(`[RoomManager] Host đã RECONNECT vào phòng ${roomCode} với socket: ${socketId}. Đã hủy timer dọn dẹp.`);
    return { success: true, room };
  }

  /**
   * Xử lý khi Player ngắt kết nối: Đánh dấu offline nhưng giữ nguyên vị trí trong hàng đợi chuông
   */
  handlePlayerDisconnect(socketId) {
    const found = this.findRoomByPlayerSocket(socketId);
    if (!found) return null;

    const { room, player } = found;
    // Chỉ đánh dấu offline nếu socket ngắt chính là socket hiện tại của player
    if (player.socketId === socketId) {
      player.connected = false;
      room.gameEngine.disconnectPlayer(socketId);
      console.log(`[RoomManager] Thí sinh ${player.name} (${player.id}) phòng ${room.roomCode} đã ngắt kết nối (offline).`);
      return { room, player };
    }
    return null;
  }

  /**
   * Xóa phòng hoàn toàn và triệt tiêu mọi tham chiếu để V8 Garbage Collector thu hồi RAM ngay lập tức
   */
  deleteRoom(roomCode) {
    const room = this.getRoom(roomCode);
    if (room) {
      if (room.cleanupTimer) {
        clearTimeout(room.cleanupTimer);
        room.cleanupTimer = null;
      }
      // Dọn sạch mọi reference để ngăn memory leak
      room.players.clear();
      room.gameEngine = null;
      room.buzzerManager = null;
      this.rooms.delete(room.roomCode);
      return true;
    }
    return false;
  }

  /**
   * Danh sách người chơi cho broadcast (không lộ secret)
   */
  getPlayersList(roomCode) {
    const room = this.getRoom(roomCode);
    if (!room) return [];
    return Array.from(room.players.values()).map(p => {
      const enginePlayer = room.gameEngine?.getPlayer(p.id);
      return {
        id: p.id,
        name: p.name,
        score: enginePlayer ? enginePlayer.score : p.score,
        isEliminated: enginePlayer ? enginePlayer.isEliminated : p.isEliminated,
        connected: p.connected
      };
    });
  }

  /**
   * Xuất toàn bộ Game State kèm trạng thái Room (status, roomCode)
   */
  getFullRoomState(roomCode) {
    const room = this.getRoom(roomCode);
    if (!room || !room.gameEngine) return null;

    const engineState = room.gameEngine.getState();
    return {
      ...engineState,
      roomCode: room.roomCode,
      roomStatus: room.status, // 'LOBBY' | 'PLAYING' | 'FINISHED'
      players: this.getPlayersList(room.roomCode)
    };
  }
}
