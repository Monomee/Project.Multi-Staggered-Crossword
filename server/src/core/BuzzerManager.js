/**
 * BuzzerManager.js
 * Quản lý độc lập logic bấm chuông, timestamp Server-Authoritative và hàng đợi
 */
export class BuzzerManager {
  constructor() {
    this.rowQueue = [];
    this.verticalQueue = [];
    this.firstRowBuzzTime = null;
    this.firstVerticalBuzzTime = null;
    this.isRowOpen = false;
    this.isVerticalOpen = true; // Hàng dọc mở mặc định suốt cuộc thi trừ khi bị khóa/kết thúc
    this.playerLastBuzzAttempt = new Map(); // Server-side rate limiting per player
  }

  /**
   * Mở hoặc khóa quyền bấm chuông hàng ngang
   * @param {boolean} isOpen
   */
  setRowOpen(isOpen) {
    this.isRowOpen = Boolean(isOpen);
    if (!isOpen) {
      // Khi khóa, không nhất thiết phải xóa queue ngay trừ khi gọi resetRowQueue
    }
  }

  /**
   * Mở hoặc khóa quyền bấm chuông hàng dọc
   * @param {boolean} isOpen
   */
  setVerticalOpen(isOpen) {
    this.isVerticalOpen = Boolean(isOpen);
  }

  /**
   * Đang có tín hiệu hàng dọc chờ xử lý hay không (Interrupt Priority)
   */
  hasVerticalActive() {
    return this.verticalQueue.length > 0;
  }

  /**
   * Đăng ký bấm chuông với timestamp do server đóng dấu
   * @param {Object} param0
   * @param {string} param0.playerId
   * @param {string} param0.name
   * @param {'ROW'|'VERTICAL'} param0.type
   * @returns {{ success: boolean, entry?: Object, error?: string, isFirst?: boolean }}
   */
  registerBuzz({ playerId, name, type }) {
    if (!playerId) {
      return { success: false, error: 'Thiếu định danh thí sinh!' };
    }

    // 1. CHỐNG SPAM TOUCH TẠI SERVER:
    // Kiểm tra cooldown rate-limit per player (300ms) để chặn spam script/socket flood
    const nowCheck = Date.now();
    const lastAttempt = this.playerLastBuzzAttempt.get(playerId) || 0;
    if (nowCheck - lastAttempt < 300) {
      return { success: false, error: 'Thao tác quá nhanh, vui lòng không gửi liên tục!' };
    }
    this.playerLastBuzzAttempt.set(playerId, nowCheck);

    if (type === 'ROW') {
      // Kiểm tra chuông hàng ngang có đang mở không
      if (!this.isRowOpen) {
        return { success: false, error: 'Chuông hàng ngang đang đóng!' };
      }

      // Interrupt Priority: Khóa tạm thời nếu có tín hiệu hàng dọc
      if (this.hasVerticalActive()) {
        return { success: false, error: 'Đang tạm dừng để xử lý chuông Hàng Dọc!' };
      }

      // LOẠI BỎ NGAY LẬP TỨC NẾU ĐÃ CÓ TÊN TRONG HÀNG ĐỢI
      const alreadyInQueue = this.rowQueue.some(item => item.playerId === playerId);
      if (alreadyInQueue) {
        return { success: false, error: 'Bạn đã có tên trong hàng đợi hàng ngang này rồi!' };
      }

      // Đóng dấu thời gian Server-Authoritative CHỈ KHI đã hợp lệ
      const serverTimestamp = Date.now();
      const isFirst = this.rowQueue.length === 0;
      if (isFirst) {
        this.firstRowBuzzTime = serverTimestamp;
      }

      const deltaMs = isFirst ? 0 : Math.max(0, serverTimestamp - this.firstRowBuzzTime);
      const entry = {
        playerId,
        name: name || `Thí sinh ${playerId.slice(0, 4)}`,
        timestamp: serverTimestamp,
        deltaMs
      };

      this.rowQueue.push(entry);
      return { success: true, entry, isFirst };
    }

    if (type === 'VERTICAL') {
      if (!this.isVerticalOpen) {
        return { success: false, error: 'Chuông hàng dọc đang bị khóa!' };
      }

      // LOẠI BỎ NGAY LẬP TỨC NẾU ĐÃ CÓ TÊN TRONG HÀNG ĐỢI HÀNG DỌC
      const alreadyInQueue = this.verticalQueue.some(item => item.playerId === playerId);
      if (alreadyInQueue) {
        return { success: false, error: 'Bạn đã có tên trong hàng đợi hàng dọc rồi!' };
      }

      // Đóng dấu thời gian Server-Authoritative
      const serverTimestamp = Date.now();
      const isFirst = this.verticalQueue.length === 0;
      if (isFirst) {
        this.firstVerticalBuzzTime = serverTimestamp;
      }

      const deltaMs = isFirst ? 0 : Math.max(0, serverTimestamp - this.firstVerticalBuzzTime);
      const entry = {
        playerId,
        name: name || `Thí sinh ${playerId.slice(0, 4)}`,
        timestamp: serverTimestamp,
        deltaMs
      };

      this.verticalQueue.push(entry);
      return { success: true, entry, isFirst };
    }

    return { success: false, error: 'Loại chuông không hợp lệ!' };
  }

  /**
   * Bỏ qua ca ấn nhầm hoặc xóa khỏi queue sau khi xử lý mà không phạt
   */
  dismissBuzz(playerId, type) {
    if (type === 'ROW') {
      this.rowQueue = this.rowQueue.filter(item => item.playerId !== playerId);
      if (this.rowQueue.length === 0) {
        this.firstRowBuzzTime = null;
      }
      return this.rowQueue;
    } else if (type === 'VERTICAL') {
      this.verticalQueue = this.verticalQueue.filter(item => item.playerId !== playerId);
      if (this.verticalQueue.length === 0) {
        this.firstVerticalBuzzTime = null;
      }
      return this.verticalQueue;
    }
  }

  /**
   * Reset hàng đợi chuông hàng ngang
   */
  resetRowQueue() {
    this.rowQueue = [];
    this.firstRowBuzzTime = null;
  }

  /**
   * Reset hàng đợi chuông hàng dọc
   */
  resetVerticalQueue() {
    this.verticalQueue = [];
    this.firstVerticalBuzzTime = null;
  }

  /**
   * Xóa hoàn toàn một thí sinh khỏi tất cả hàng đợi (khi bị loại hoặc rời phòng)
   */
  removePlayer(playerId) {
    this.rowQueue = this.rowQueue.filter(p => p.playerId !== playerId);
    this.verticalQueue = this.verticalQueue.filter(p => p.playerId !== playerId);
    this.playerLastBuzzAttempt.delete(playerId);
    if (this.rowQueue.length === 0) this.firstRowBuzzTime = null;
    if (this.verticalQueue.length === 0) this.firstVerticalBuzzTime = null;
  }

  /**
   * Dọn dẹp toàn bộ dữ liệu rate limit và queues khi reset
   */
  resetAll() {
    this.resetRowQueue();
    this.resetVerticalQueue();
    this.playerLastBuzzAttempt.clear();
    this.isRowOpen = false;
    this.isVerticalOpen = true;
  }

  /**
   * Lấy snapshot trạng thái buzzer
   */
  getState() {
    return {
      isRowOpen: this.isRowOpen,
      isVerticalOpen: this.isVerticalOpen,
      hasVerticalActive: this.hasVerticalActive(),
      rowQueue: [...this.rowQueue],
      verticalQueue: [...this.verticalQueue]
    };
  }
}
