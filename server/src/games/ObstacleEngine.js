/**
 * ObstacleEngine.js
 * Quản lý trạng thái và luật chơi Vượt Chướng Ngại Vật (Olympia Style)
 */
import { BuzzerManager } from '../core/BuzzerManager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ObstacleEngine {
  constructor(gameDataPath) {
    this.buzzer = new BuzzerManager();
    this.players = new Map(); // playerId => { id, name, score, isEliminated, isConnected, socketId }
    this.roomCode = 'OLYMPIA';
    this.COL_ANCHOR = 12;

    this.defaultGameDataPath = gameDataPath || path.resolve(__dirname, '../../../data/game-sample.json');
    this.loadGameData(this.defaultGameDataPath);
  }

  loadGameData(filePath) {
    try {
      let resolvedPath = filePath;
      if (!fs.existsSync(resolvedPath)) {
        resolvedPath = path.resolve(__dirname, '../../../docs/game-sample.json');
      }
      const raw = fs.readFileSync(resolvedPath, 'utf8');
      const parsed = JSON.parse(raw);

      this.title = parsed.title || 'VƯỢT CHƯỚNG NGẠI VẬT';
      this.verticalWord = {
        keyword: (parsed.verticalWord?.keyword || '').toUpperCase(),
        question: parsed.verticalWord?.question || '',
        isRevealed: false
      };

      this.rows = (parsed.rows || []).map((row) => ({
        id: row.id,
        question: row.question,
        answer: (row.answer || '').toUpperCase(),
        keyCharIndex: Number(row.keyCharIndex),
        points: row.points || 10,
        isRevealed: false
      }));

      this.currentRowId = null;
      this.verticalSolved = false;
      this.verticalWinner = null;
    } catch (err) {
      console.error('Lỗi khi nạp dữ liệu game:', err);
      // Dữ liệu fallback dự phòng
      this.title = 'VƯỢT CHƯỚNG NGẠI VẬT';
      this.verticalWord = { keyword: 'VIỆTNAM', question: 'Tên đất nước thân yêu', isRevealed: false };
      this.rows = [];
      this.currentRowId = null;
      this.verticalSolved = false;
      this.verticalWinner = null;
    }
  }

  /**
   * Thêm hoặc khôi phục Player (hỗ trợ reconnection với playerId từ sessionStorage)
   */
  joinPlayer({ playerId, playerName, socketId }) {
    if (!playerId) return null;

    let player = this.players.get(playerId);
    if (player) {
      // Reconnection: cập nhật socketId và kết nối
      player.socketId = socketId;
      player.isConnected = true;
      if (playerName && playerName.trim()) {
        player.name = playerName.trim();
      }
    } else {
      player = {
        id: playerId,
        name: (playerName && playerName.trim()) || `Thí sinh ${this.players.size + 1}`,
        score: 0,
        isEliminated: false,
        isConnected: true,
        socketId
      };
      this.players.set(playerId, player);
    }
    return player;
  }

  /**
   * Đánh dấu ngắt kết nối an toàn (chỉ khi socket ngắt trùng với socket hiện tại của thí sinh)
   */
  disconnectPlayer(socketId) {
    for (const player of this.players.values()) {
      if (player.socketId === socketId) {
        player.isConnected = false;
        return player;
      }
    }
    return null;
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  /**
   * Host chọn hàng ngang để chuẩn bị đọc câu hỏi
   */
  selectRow(rowId) {
    const id = Number(rowId);
    const row = this.rows.find(r => r.id === id);
    if (!row) return false;

    this.currentRowId = id;
    this.buzzer.setRowOpen(false); // Khóa chuông, chờ Host kích hoạt toggle_buzzer
    this.buzzer.resetRowQueue(); // Xóa queue của hàng trước
    this.buzzer.playerLastBuzzAttempt.clear(); // Reset cooldown để sẵn sàng cho câu hỏi mới
    return true;
  }

  /**
   * Host mở hoặc khóa chuông hàng ngang
   */
  toggleRowBuzzer(isOpen) {
    this.buzzer.setRowOpen(isOpen);
    if (isOpen) {
      this.buzzer.playerLastBuzzAttempt.clear(); // Cho phép mọi thí sinh bấm ngay khi mở chuông
    }
    return this.buzzer.isRowOpen;
  }

  /**
   * Thí sinh bấm chuông
   */
  handleBuzz({ playerId, type }) {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Thí sinh không tồn tại trong phòng!' };
    }

    // Kiểm tra án phạt loại (Permadeath)
    if (player.isEliminated) {
      return { success: false, error: 'Bạn đã bị loại khỏi phần thi này!' };
    }

    if (this.verticalSolved) {
      return { success: false, error: 'Chướng ngại vật đã được giải xong!' };
    }

    return this.buzzer.registerBuzz({
      playerId,
      name: player.name,
      type
    });
  }

  /**
   * Host chấm điểm câu trả lời
   * @param {Object} param0
   * @param {string} param0.playerId
   * @param {'ROW'|'VERTICAL'} param0.type
   * @param {boolean} param0.isCorrect
   */
  judgeResult({ playerId, type, isCorrect }) {
    const player = this.players.get(playerId);

    if (type === 'ROW') {
      const currentRow = this.rows.find(r => r.id === this.currentRowId);
      if (isCorrect) {
        if (player) {
          player.score += (currentRow ? currentRow.points : 10);
        }
        if (currentRow) {
          currentRow.isRevealed = true;
        }
        // Khóa chuông và xóa hàng đợi
        this.buzzer.setRowOpen(false);
        this.buzzer.resetRowQueue();
      } else {
        // Sai hàng ngang: xóa người này khỏi queue để người sau có cơ hội
        this.buzzer.dismissBuzz(playerId, 'ROW');
      }
      return { success: true, isCorrect, player, row: currentRow };
    }

    if (type === 'VERTICAL') {
      if (isCorrect) {
        // Đúng từ khóa chướng ngại vật!
        if (player) {
          // Tính điểm: Olympia thường cho 60 điểm nếu chưa mở hàng nào, giảm dần theo số hàng đã mở
          const unrevealedRows = this.rows.filter(r => !r.isRevealed).length;
          const pointsEarned = Math.max(20, 20 + unrevealedRows * 10);
          player.score += pointsEarned;
        }

        this.verticalSolved = true;
        this.verticalWinner = player ? { playerId: player.id, name: player.name } : null;
        this.verticalWord.isRevealed = true;

        // Mở toàn bộ các hàng ngang còn lại
        this.rows.forEach(r => { r.isRevealed = true; });

        // Khóa toàn bộ chuông
        this.buzzer.setRowOpen(false);
        this.buzzer.setVerticalOpen(false);
        this.buzzer.resetRowQueue();
        this.buzzer.resetVerticalQueue();

        return { success: true, isCorrect: true, player, solved: true };
      } else {
        // Permadeath: Trả lời sai hàng dọc -> Bị loại khỏi phần thi này!
        if (player) {
          player.isEliminated = true;
        }
        this.buzzer.removePlayer(playerId);

        return { success: true, isCorrect: false, player, eliminated: true };
      }
    }

    return { success: false, error: 'Loại câu hỏi không hợp lệ!' };
  }

  /**
   * Bỏ qua ca ấn nhầm (không phạt)
   */
  dismissBuzz(playerId, type) {
    this.buzzer.dismissBuzz(playerId, type);
    return true;
  }

  /**
   * Reset chuông (Host nút reset)
   */
  resetBuzzer(type = 'ROW') {
    if (type === 'ROW' || type === 'ALL') {
      this.buzzer.resetRowQueue();
    }
    if (type === 'VERTICAL' || type === 'ALL') {
      this.buzzer.resetVerticalQueue();
    }
  }

  /**
   * Host chủ động mở đáp án 1 hàng ngang (nếu không ai trả lời đúng)
   */
  revealRow(rowId) {
    const id = Number(rowId);
    const row = this.rows.find(r => r.id === id);
    if (row) {
      row.isRevealed = true;
      this.buzzer.setRowOpen(false);
      this.buzzer.resetRowQueue();
      return true;
    }
    return false;
  }

  /**
   * Host chủ động mở từ khóa hàng dọc
   */
  revealVertical() {
    this.verticalSolved = true;
    this.verticalWord.isRevealed = true;
    this.rows.forEach(r => { r.isRevealed = true; });
    this.buzzer.setRowOpen(false);
    this.buzzer.setVerticalOpen(false);
    return true;
  }

  /**
   * Khởi động lại toàn bộ game - xóa sạch toàn bộ người chơi và dữ liệu cũ
   */
  resetGame() {
    this.loadGameData(this.defaultGameDataPath);
    this.players.clear(); // XÓA SẠCH người chơi cũ, phòng trở thành trò chơi mới 100%
    this.buzzer.resetAll();
  }

  /**
   * Xuất toàn bộ Game State đồng bộ tới Client
   */
  getState() {
    const currentRow = this.rows.find(r => r.id === this.currentRowId) || null;

    return {
      title: this.title,
      verticalWord: {
        keywordLength: this.verticalWord.keyword.length,
        question: this.verticalWord.question,
        isRevealed: this.verticalWord.isRevealed,
        // Chỉ gửi keyword nếu đã được giải hoặc Host mở
        keyword: this.verticalWord.isRevealed ? this.verticalWord.keyword : null
      },
      rows: this.rows.map(row => ({
        id: row.id,
        question: row.question,
        charCount: row.answer.length,
        keyCharIndex: row.keyCharIndex,
        points: row.points,
        isRevealed: row.isRevealed,
        // Chỉ gửi đáp án đầy đủ khi hàng đã được mở
        answer: row.isRevealed ? row.answer : null,
        // Nếu chướng ngại vật giải xong hoặc hàng này mở thì hiện ký tự khóa
        revealedKeyChar: (row.isRevealed || this.verticalWord.isRevealed) ? row.answer[row.keyCharIndex] : null
      })),
      currentRowId: this.currentRowId,
      currentRowQuestion: currentRow ? currentRow.question : null,
      verticalSolved: this.verticalSolved,
      verticalWinner: this.verticalWinner,
      COL_ANCHOR: this.COL_ANCHOR,
      buzzer: this.buzzer.getState(),
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        isEliminated: p.isEliminated,
        isConnected: p.isConnected
      }))
    };
  }
}
