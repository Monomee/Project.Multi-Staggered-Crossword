import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { sounds } from '../utils/audio';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || (
  window.location.hostname === 'localhost' ? 'http://localhost:3001' : `${window.location.protocol}//${window.location.hostname}:3001`
);

// Quản lý lưu trữ phiên an toàn trên localStorage với tiền tố theo phòng (chống mất session trên iOS Safari / In-App Browser)
export const roomStorage = {
  getAuth(code) {
    if (!code) return null;
    try {
      const raw = localStorage.getItem(`olym_auth_${code.toUpperCase()}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setAuth(code, data) {
    if (!code) return;
    try {
      localStorage.setItem(`olym_auth_${code.toUpperCase()}`, JSON.stringify(data));
      localStorage.setItem('olym_last_room', code.toUpperCase());
    } catch {}
  },
  getHost(code) {
    if (!code) return null;
    try {
      const raw = localStorage.getItem(`olym_host_${code.toUpperCase()}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setHost(code, data) {
    if (!code) return;
    try {
      localStorage.setItem(`olym_host_${code.toUpperCase()}`, JSON.stringify(data));
      localStorage.setItem('olym_last_room', code.toUpperCase());
    } catch {}
  },
  getHostSession() {
    try {
      const raw = localStorage.getItem('olym_host_session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setHostSession(session) {
    try {
      if (session) {
        localStorage.setItem('olym_host_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('olym_host_session');
      }
    } catch {}
  },
  clearHostSession() {
    try {
      localStorage.removeItem('olym_host_session');
    } catch {}
  },
  clear(code) {
    try {
      if (code) {
        localStorage.removeItem(`olym_auth_${code.toUpperCase()}`);
        localStorage.removeItem(`olym_host_${code.toUpperCase()}`);
      }
      localStorage.removeItem('olym_last_room');
      const session = this.getHostSession();
      if (session && (!code || session.roomCode === code?.toUpperCase())) {
        localStorage.removeItem('olym_host_session');
      }
    } catch {}
  },
  getLastRoom() {
    try {
      return localStorage.getItem('olym_last_room') || '';
    } catch {
      return '';
    }
  }
};

// Tạo hoặc lấy playerId an toàn từ localStorage
function getOrCreatePlayerId(targetRoomCode = null) {
  if (targetRoomCode) {
    const auth = roomStorage.getAuth(targetRoomCode);
    if (auth?.playerId) return auth.playerId;
  }
  try {
    const globalId = localStorage.getItem('olym_player_id');
    if (globalId) return globalId;

    let newId;
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      newId = 'p_' + crypto.randomUUID().slice(0, 8);
    } else {
      newId = 'p_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    }
    localStorage.setItem('olym_player_id', newId);
    return newId;
  } catch {
    return 'p_' + Math.random().toString(36).substring(2, 9);
  }
}

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState(null);

  // Khởi tạo state từ query param URL hoặc localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const initialRoom = (urlParams.get('room') || roomStorage.getLastRoom() || '').toUpperCase();
  const initialAuth = roomStorage.getAuth(initialRoom);
  const initialHost = roomStorage.getHost(initialRoom);

  const [playerId] = useState(() => initialAuth?.playerId || getOrCreatePlayerId(initialRoom));
  const [roomCode, setRoomCode] = useState(initialRoom);
  const [role, setRole] = useState(() => initialHost ? 'host' : (initialAuth?.role || 'player'));
  const [playerName, setPlayerName] = useState(() => initialAuth?.playerName || '');
  const [verticalAlert, setVerticalAlert] = useState(null);
  const [joinError, setJoinError] = useState(null);
  const [hostOnline, setHostOnline] = useState(true);
  const [roomTerminatedModal, setRoomTerminatedModal] = useState(null);

  const wakeLockRef = useRef(null);

  // 1. Quản lý Screen Wake Lock API (Giữ màn hình điện thoại luôn sáng) & Mở khóa Audio
  useEffect(() => {
    let released = false;
    sounds.unlockAudio();

    async function requestWakeLock() {
      try {
        const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isSecure && 'wakeLock' in navigator && typeof navigator.wakeLock.request === 'function') {
          if (wakeLockRef.current && !wakeLockRef.current.released) {
            return;
          }
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        console.warn('[WakeLock] Không thể kích hoạt Screen Wake Lock:', err.message);
      }
    }

    requestWakeLock();

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
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000
    });

    s.on('connect', () => {
      setIsConnected(true);
      setJoinError(null);

      // Tự động khôi phục phiên (Reconnection) nếu có session phòng lưu trong localStorage
      const activeCode = roomCode || initialRoom;
      const hostSession = roomStorage.getHostSession();
      if (activeCode) {
        const savedAuth = roomStorage.getAuth(activeCode);
        const savedHost = roomStorage.getHost(activeCode);

        if (hostSession?.hostToken && hostSession.roomCode === activeCode) {
          s.emit('host:reconnect', {
            roomCode: activeCode,
            hostToken: hostSession.hostToken
          });
        } else if (savedHost?.hostToken) {
          s.emit('join_room', {
            roomCode: activeCode,
            role: 'host',
            hostToken: savedHost.hostToken
          });
        } else if (savedAuth) {
          s.emit('join_room', {
            roomCode: activeCode,
            playerName: savedAuth.playerName,
            role: 'player',
            playerId: savedAuth.playerId,
            playerSecret: savedAuth.playerSecret
          });
        }
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('room_created', ({ roomCode: newCode, hostToken }) => {
      const code = newCode.toUpperCase();
      setRoomCode(code);
      setRole('host');
      setHostOnline(true);
      if (hostToken) {
        roomStorage.setHost(code, { hostToken });
        roomStorage.setHostSession({ roomCode: code, hostToken });
      }
      setJoinError(null);
    });

    s.on('host:status_changed', ({ isOnline }) => {
      setHostOnline(Boolean(isOnline));
    });

    s.on('host:reconnect_success', ({ roomCode: recCode, hostToken: recToken }) => {
      const code = recCode.toUpperCase();
      setRoomCode(code);
      setRole('host');
      setHostOnline(true);
      if (recToken) {
        roomStorage.setHost(code, { hostToken: recToken });
        roomStorage.setHostSession({ roomCode: code, hostToken: recToken });
      }
      setJoinError(null);
    });

    s.on('host:reconnect_failed', ({ message }) => {
      setJoinError(message || 'Khôi phục phiên Host thất bại!');
      roomStorage.clearHostSession();
    });

    s.on('room:terminated', ({ roomCode: termCode, message }) => {
      sounds.playWrong();
      setRoomTerminatedModal({
        isOpen: true,
        message: message || 'Host đã kết thúc phòng chơi!'
      });
      roomStorage.clear(termCode);
      roomStorage.clearHostSession();
      setGameState(null);
    });

    s.on('player_authenticated', ({ roomCode: authRoom, playerId: authId, playerSecret }) => {
      const code = (authRoom || roomCode).toUpperCase();
      const current = roomStorage.getAuth(code) || {};
      roomStorage.setAuth(code, {
        ...current,
        playerId: authId,
        playerSecret,
        playerName: current.playerName || playerName,
        role: 'player'
      });
    });

    s.on('join_error', ({ message }) => {
      setJoinError(message);
    });

    s.on('action_error', ({ message }) => {
      alert(`[Lỗi thao tác] ${message}`);
    });

    s.on('sync_game_state', (state) => {
      setGameState(state);
      if (state.roomCode) {
        const code = state.roomCode.toUpperCase();
        setRoomCode(code);
      }
      setJoinError(null);
    });

    s.on('room:players_updated', ({ players }) => {
      setGameState((prev) => (prev ? { ...prev, players } : prev));
    });

    s.on('buzz:row_queue_updated', () => {
      sounds.playRowBuzz();
    });

    s.on('buzz:vertical_triggered', (data) => {
      sounds.playVerticalAlarm();
      setVerticalAlert(data);
      setTimeout(() => {
        setVerticalAlert(null);
      }, 8000);
    });

    s.on('game:row_revealed', () => {
      sounds.playTileFlip();
      sounds.playCorrect();
    });

    s.on('game:tiles_updated', ({ revealedTiles }) => {
      setGameState((prev) => (prev ? { ...prev, revealedTiles } : prev));
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
  }, [playerId, roomCode]);

  // Host tạo phòng mới
  const createRoom = useCallback((customCode = null) => {
    if (!socket) return;
    setJoinError(null);
    socket.emit('host:create_room', { customRoomCode: customCode });
  }, [socket]);

  // Host bắt đầu trận đấu (chuyển trạng thái LOBBY -> PLAYING)
  const startGame = useCallback(() => {
    if (!socket || !roomCode) return;
    const hostData = roomStorage.getHost(roomCode);
    socket.emit('host:start_game', { roomCode, hostToken: hostData?.hostToken });
  }, [socket, roomCode]);

  // Tham gia phòng
  const joinRoom = useCallback((targetRoomCode, name, userRole) => {
    if (!socket) return;
    setJoinError(null);
    const formattedCode = (targetRoomCode || '').trim().toUpperCase();

    setRoomCode(formattedCode);
    setRole(userRole);
    setPlayerName(name);

    if (userRole === 'host') {
      const hostData = roomStorage.getHost(formattedCode);
      socket.emit('join_room', {
        roomCode: formattedCode,
        role: 'host',
        hostToken: hostData?.hostToken
      });
    } else {
      const auth = roomStorage.getAuth(formattedCode);
      const activeId = auth?.playerId || playerId;
      const activeSecret = auth?.playerSecret;

      roomStorage.setAuth(formattedCode, {
        playerId: activeId,
        playerName: name,
        playerSecret: activeSecret,
        role: 'player'
      });

      socket.emit('join_room', {
        roomCode: formattedCode,
        playerName: name,
        role: 'player',
        playerId: activeId,
        playerSecret: activeSecret
      });
    }
  }, [socket, playerId]);

  // Rời phòng, xóa session để đăng nhập mới hoàn toàn
  const leaveRoom = useCallback(() => {
    if (roomCode) {
      roomStorage.clear(roomCode);
    }
    window.location.href = window.location.pathname; // xóa cả query params
  }, [roomCode]);

  // Thí sinh bấm chuông (Row hoặc Vertical)
  const buzz = useCallback((type) => {
    if (!socket) return;
    socket.emit('client:buzz', { type, roomCode });
  }, [socket, roomCode]);

  // Host chọn hàng ngang
  const selectRow = useCallback((rowId) => {
    if (!socket) return;
    const hostData = roomStorage.getHost(roomCode);
    socket.emit('host:select_row', { rowId, roomCode, hostToken: hostData?.hostToken });
  }, [socket, roomCode]);

  // Host mở / khóa chuông hàng ngang
  const toggleBuzzer = useCallback((isOpen) => {
    if (!socket) return;
    const hostData = roomStorage.getHost(roomCode);
    socket.emit('host:toggle_buzzer', { isOpen, roomCode, hostToken: hostData?.hostToken });
  }, [socket, roomCode]);

  // Host chấm điểm Đúng / Sai
  const judgeResult = useCallback((targetPlayerId, type, isCorrect) => {
    if (!socket) return;
    if (isCorrect) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }
    const hostData = roomStorage.getHost(roomCode);
    socket.emit('host:judge_result', {
      playerId: targetPlayerId,
      type,
      isCorrect,
      roomCode,
      hostToken: hostData?.hostToken
    });
  }, [socket, roomCode]);

  // Host bỏ qua ca ấn nhầm
  const dismissBuzz = useCallback((targetPlayerId, type) => {
    if (!socket) return;
    const hostData = roomStorage.getHost(roomCode);
    socket.emit('host:dismiss_buzz', {
      playerId: targetPlayerId,
      type,
      roomCode,
      hostToken: hostData?.hostToken
    });
  }, [socket, roomCode]);

  // Host reset hàng đợi chuông
  const resetBuzzer = useCallback(() => {
    if (!socket) return;
    const hostData = roomStorage.getHost(roomCode);
    socket.emit('host:reset_buzzer', { roomCode, hostToken: hostData?.hostToken });
  }, [socket, roomCode]);

  // Host mở đáp án hàng ngang
  const revealRow = useCallback((rowId) => {
    if (!socket) return;
    const hostData = roomStorage.getHost(roomCode);
    socket.emit('host:reveal_row', { rowId, roomCode, hostToken: hostData?.hostToken });
  }, [socket, roomCode]);

  // Host mở từ khóa hàng dọc
  const revealVertical = useCallback(() => {
    if (!socket) return;
    sounds.playVictory();
    const hostData = roomStorage.getHost(roomCode);
    socket.emit('host:reveal_vertical', { roomCode, hostToken: hostData?.hostToken });
  }, [socket, roomCode]);

  // Host khởi động lại game
  const resetGame = useCallback(() => {
    if (!socket) return;
    const hostData = roomStorage.getHost(roomCode);
    socket.emit('host:reset_game', { roomCode, hostToken: hostData?.hostToken });
  }, [socket, roomCode]);

  // Host khôi phục phiên phòng chơi (Host Reconnection)
  const reconnectHost = useCallback((targetCode = null, token = null) => {
    if (!socket) return;
    setJoinError(null);
    const hostSession = roomStorage.getHostSession();
    const c = (targetCode || hostSession?.roomCode || roomCode || '').trim().toUpperCase();
    const t = token || hostSession?.hostToken || roomStorage.getHost(c)?.hostToken;
    if (!c || !t) {
      setJoinError('Không tìm thấy thông tin phiên Host hợp lệ!');
      return;
    }
    socket.emit('host:reconnect', { roomCode: c, hostToken: t });
  }, [socket, roomCode]);

  // Host kết thúc và hủy phòng chơi (Room Termination)
  const terminateRoom = useCallback((targetCode = null, token = null) => {
    if (!socket) return;
    const hostSession = roomStorage.getHostSession();
    const c = (targetCode || hostSession?.roomCode || roomCode || '').trim().toUpperCase();
    const t = token || hostSession?.hostToken || roomStorage.getHost(c)?.hostToken;
    socket.emit('host:terminate_room', { roomCode: c, hostToken: t });
    roomStorage.clearHostSession();
    roomStorage.clear(c);
    setGameState(null);
    setRoomCode('');
    setRole('player');
  }, [socket, roomCode]);

  // Đóng modal kết thúc phòng
  const closeTerminatedModal = useCallback(() => {
    setRoomTerminatedModal(null);
    setGameState(null);
    setRoomCode('');
    setRole('player');
  }, []);

  const currentPlayer = gameState?.players?.find(p => p.id === playerId) || null;

  return {
    socket,
    isConnected,
    gameState,
    playerId,
    roomCode,
    role,
    playerName,
    currentPlayer,
    verticalAlert,
    joinError,
    setJoinError,
    hostOnline,
    roomTerminatedModal,
    closeTerminatedModal,
    createRoom,
    startGame,
    joinRoom,
    leaveRoom,
    reconnectHost,
    terminateRoom,
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
