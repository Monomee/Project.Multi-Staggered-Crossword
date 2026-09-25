import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { sounds } from '../utils/audio';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || (
  window.location.hostname === 'localhost' ? 'http://localhost:3001' : `${window.location.protocol}//${window.location.hostname}:3001`
);

// Tạo hoặc lấy playerId từ sessionStorage
function getOrCreatePlayerId() {
  const STORAGE_KEY = 'olympia_player_id';
  let id = sessionStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    sessionStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [playerId] = useState(getOrCreatePlayerId);
  const [role, setRole] = useState(() => sessionStorage.getItem('olympia_user_role') || 'player');
  const [playerName, setPlayerName] = useState(() => sessionStorage.getItem('olympia_player_name') || '');
  const [verticalAlert, setVerticalAlert] = useState(null); // Alert khi có người bấm chuông hàng dọc

  const wakeLockRef = useRef(null);

  // 1. Quản lý Screen Wake Lock API (Giữ màn hình điện thoại luôn sáng) & Mở khóa Audio
  useEffect(() => {
    let released = false;

    // Tự động gắn listener để mở khóa AudioContext khi có tương tác đầu tiên trên mobile
    sounds.unlockAudio();

    async function requestWakeLock() {
      try {
        // Chỉ gọi khi có hỗ trợ và trong Secure Context (HTTPS hoặc localhost)
        const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isSecure && 'wakeLock' in navigator && typeof navigator.wakeLock.request === 'function') {
          // Nếu đã có lock cũ đang giữ, không cần request lại
          if (wakeLockRef.current && !wakeLockRef.current.released) {
            return;
          }
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        // Nuốt lỗi an toàn: Không làm gián đoạn ứng dụng nếu thiết bị không hỗ trợ Wake Lock (ví dụ HTTP mạng LAN)
        console.warn('[WakeLock] Không thể kích hoạt Screen Wake Lock:', err.message);
      }
    }

    requestWakeLock();

    // Tự kích hoạt lại khi chuyển tab quay lại (Safari iOS & Android Chrome)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !released) {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // 2. Khởi tạo Socket.io với fallback transport
  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'], // Bắt buộc theo tài liệu
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    s.on('connect', () => {
      setIsConnected(true);
      // Tự động join lại nếu đã có tên hoặc role
      const savedRole = sessionStorage.getItem('olympia_user_role') || role;
      const savedName = sessionStorage.getItem('olympia_player_name') || playerName;

      s.emit('join_room', {
        roomCode: 'OLYMPIA',
        playerName: savedName,
        role: savedRole,
        playerId
      });
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('sync_game_state', (state) => {
      setGameState(state);
    });

    s.on('buzz:row_queue_updated', () => {
      sounds.playRowBuzz();
    });

    s.on('buzz:vertical_triggered', (data) => {
      sounds.playVerticalAlarm();
      setVerticalAlert(data);
      // Tự động xóa banner còi báo động sau 8 giây
      setTimeout(() => {
        setVerticalAlert(null);
      }, 8000);
    });

    s.on('game:row_revealed', () => {
      sounds.playTileFlip();
      sounds.playCorrect();
    });

    s.on('game:player_eliminated', (data) => {
      if (data.playerId === playerId) {
        sounds.playWrong();
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [playerId]);

  // Các hàm tương tác
  const joinRoom = useCallback((roomCode, name, userRole) => {
    if (!socket) return;
    sessionStorage.setItem('olympia_user_role', userRole);
    sessionStorage.setItem('olympia_player_name', name);
    setRole(userRole);
    setPlayerName(name);

    socket.emit('join_room', {
      roomCode: roomCode || 'OLYMPIA',
      playerName: name,
      role: userRole,
      playerId
    });
  }, [socket, playerId]);

  // Thí sinh bấm chuông (Row hoặc Vertical)
  const buzz = useCallback((type) => {
    if (!socket) return;
    socket.emit('client:buzz', { type });
  }, [socket]);

  // Host chọn hàng ngang
  const selectRow = useCallback((rowId) => {
    if (!socket) return;
    socket.emit('host:select_row', { rowId });
  }, [socket]);

  // Host mở / khóa chuông hàng ngang
  const toggleBuzzer = useCallback((isOpen) => {
    if (!socket) return;
    socket.emit('host:toggle_buzzer', { isOpen });
  }, [socket]);

  // Host chấm điểm Đúng / Sai
  const judgeResult = useCallback((targetPlayerId, type, isCorrect) => {
    if (!socket) return;
    if (isCorrect) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }
    socket.emit('host:judge_result', { playerId: targetPlayerId, type, isCorrect });
  }, [socket]);

  // Host bỏ qua ca ấn nhầm
  const dismissBuzz = useCallback((targetPlayerId, type) => {
    if (!socket) return;
    socket.emit('host:dismiss_buzz', { playerId: targetPlayerId, type });
  }, [socket]);

  // Host reset hàng đợi chuông
  const resetBuzzer = useCallback(() => {
    if (!socket) return;
    socket.emit('host:reset_buzzer');
  }, [socket]);

  // Host mở đáp án hàng ngang
  const revealRow = useCallback((rowId) => {
    if (!socket) return;
    socket.emit('host:reveal_row', { rowId });
  }, [socket]);

  // Host mở từ khóa hàng dọc
  const revealVertical = useCallback(() => {
    if (!socket) return;
    sounds.playVictory();
    socket.emit('host:reveal_vertical');
  }, [socket]);

  // Host khởi động lại game
  const resetGame = useCallback(() => {
    if (!socket) return;
    socket.emit('host:reset_game');
  }, [socket]);

  // Rời phòng, xóa session để đăng nhập mới hoàn toàn
  const leaveRoom = useCallback(() => {
    sessionStorage.removeItem('olympia_user_role');
    sessionStorage.removeItem('olympia_player_name');
    sessionStorage.removeItem('olympia_player_id');
    window.location.reload();
  }, []);

  const currentPlayer = gameState?.players?.find(p => p.id === playerId) || null;

  return {
    socket,
    isConnected,
    gameState,
    playerId,
    role,
    playerName,
    currentPlayer,
    verticalAlert,
    joinRoom,
    leaveRoom,
    buzz,
    selectRow,
    toggleBuzzer,
    judgeResult,
    dismissBuzz,
    resetBuzzer,
    revealRow,
    revealVertical,
    resetGame
  };
}
