import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Radio,
  Tv,
  Smartphone,
  ShieldAlert,
  Trophy,
  LogOut,
  QrCode,
  Play,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  Power,
  AlertTriangle,
  AlertOctagon
} from 'lucide-react';
import { useSocket, roomStorage } from './hooks/useSocket';
import { sounds } from './utils/audio';

import { CrosswordBoard } from './components/host/CrosswordBoard';
import { HostControls } from './components/host/HostControls';
import { BuzzQueueList } from './components/host/BuzzQueueList';
import { ImagePuzzleBoard } from './components/host/ImagePuzzleBoard';

import { QuestionViewer } from './components/player/QuestionViewer';
import { RowBuzzer } from './components/player/RowBuzzer';
import { VerticalBuzzer } from './components/player/VerticalBuzzer';

import { QRCodeModal } from './components/common/QRCodeModal';
import { LobbyView } from './components/common/LobbyView';

export default function App() {
  const {
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
  } = useSocket();

  // Đọc param ?room=XXXX từ URL (Auto-fill room khi quét QR)
  const urlParams = new URLSearchParams(window.location.search);
  const queryRoom = (urlParams.get('room') || '').trim().toUpperCase();
  const lastActiveRoom = queryRoom || roomStorage.getLastRoom() || 'OLYM8';
  const savedAuth = roomStorage.getAuth(lastActiveRoom);
  const savedHost = roomStorage.getHost(lastActiveRoom);
  const hostSession = roomStorage.getHostSession();

  const [inputRoomCode, setInputRoomCode] = useState(() => lastActiveRoom);
  const [inputName, setInputName] = useState(() => savedAuth?.playerName || playerName || '');
  const [selectedRole, setSelectedRole] = useState(() => (queryRoom ? 'player' : (savedHost ? 'host' : (savedAuth?.role || 'player'))));
  const [hasJoined, setHasJoined] = useState(() => Boolean(savedHost || savedAuth));
  const [isMuted, setIsMuted] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);

  const nameInputRef = useRef(null);

  // Auto-focus vào ô tên khi có param room trên URL
  useEffect(() => {
    if (queryRoom) {
      setInputRoomCode(queryRoom);
      setSelectedRole('player');
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 200);
    }
  }, [queryRoom]);

  // Kích hoạt pháo hoa khi chướng ngại vật được giải
  useEffect(() => {
    if (gameState?.verticalSolved) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [gameState?.verticalSolved]);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  // Host tạo phòng
  const handleHostCreateRoom = (customCode = null) => {
    sounds.init();
    createRoom(customCode || inputRoomCode);
    setHasJoined(true);
  };

  // Người dùng tham gia phòng
  const handleJoin = (e) => {
    e.preventDefault();
    sounds.init();

    const targetRoom = inputRoomCode.trim().toUpperCase();
    const finalName = inputName.trim() || (selectedRole === 'host' ? 'Ban Tổ Chức' : 'Thí sinh');

    if (selectedRole === 'host') {
      // Nếu host nhập mã phòng, thử kết nối hoặc tạo mới
      joinRoom(targetRoom, finalName, 'host');
    } else {
      joinRoom(targetRoom, finalName, 'player');
    }
    setHasJoined(true);
  };

  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const activeRoomCode = roomCode || gameState?.roomCode || inputRoomCode;
  const roomStatus = gameState?.roomStatus || 'LOBBY';

  // ==========================================
  // MÀN HÌNH ĐĂNG NHẬP / CHỌN PHÒNG / TẠO PHÒNG
  // ==========================================
  if (!hasJoined || joinError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#070b16]">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl glass-panel-elevated space-y-6 shadow-2xl border border-slate-700/80">
          <div className="text-center space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              OLYMPIA BUZZER SYSTEM
            </span>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Vượt Chướng Ngại Vật
            </h1>
            <p className="text-xs text-slate-400">
              Hệ thống phòng chơi đa thiết bị & mã QR thời gian thực
            </p>
          </div>

          {/* Banner khôi phục phiên Host nếu phát hiện session đang diễn ra */}
          {hostSession?.roomCode && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-400 text-amber-200 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 animate-bounce" />
                <span>
                  Bạn đang có phòng <strong className="font-mono text-base font-black text-amber-300 uppercase">{hostSession.roomCode}</strong> đang diễn ra!
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Bạn có thể tiếp tục điều khiển phòng thi đấu này hoặc hủy bỏ hoàn toàn phòng để giải phóng máy chủ.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    sounds.init();
                    reconnectHost(hostSession.roomCode, hostSession.hostToken);
                    setHasJoined(true);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Tiếp tục làm Host</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn hủy bỏ phòng ${hostSession.roomCode}?`)) {
                      terminateRoom(hostSession.roomCode, hostSession.hostToken);
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/40 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Hủy bỏ phòng</span>
                </button>
              </div>
            </div>
          )}

          {/* Thông báo lỗi nếu có */}
          {joinError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{joinError}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            {/* Chọn vai trò */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Bạn là:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('player')}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                    selectedRole === 'player'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/40'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-6 h-6" />
                  <span className="font-bold text-xs uppercase">Thí Sinh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('host')}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                    selectedRole === 'host'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-2 ring-cyan-400/40'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Tv className="w-6 h-6" />
                  <span className="font-bold text-xs uppercase">Host / Máy chiếu</span>
                </button>
              </div>
            </div>

            {/* Nhập mã phòng */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Mã phòng thi đấu:</span>
                {queryRoom && (
                  <span className="text-[10px] text-emerald-400 font-mono">Đã tự động điền từ QR</span>
                )}
              </label>
              <input
                type="text"
                required
                maxLength={8}
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                placeholder="VD: OLYM8"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-base font-mono font-black tracking-widest uppercase text-center"
              />
            </div>

            {/* Nhập tên thí sinh */}
            {selectedRole === 'player' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Tên của bạn:
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="Ví dụ: Hoàng, Minh Anh, Tuấn..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm font-semibold"
                />
              </div>
            )}

            {/* Nút hành động */}
            {selectedRole === 'host' ? (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleHostCreateRoom(inputRoomCode || 'OLYM8')}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Tv className="w-4 h-4" />
                  <span>Tạo phòng "{inputRoomCode || 'OLYM8'}" Mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleHostCreateRoom(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Tạo phòng ngẫu nhiên (5 ký tự)
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
              >
                Vào Phòng Thi Đấu
              </button>
            )}
          </form>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Socket.io Reconnection Ready
            </span>
            <span>Room Management Active</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN CHÍNH KHI ĐÃ VÀO PHÒNG
  // ==========================================
  return (
    <div className="min-h-screen flex flex-col bg-[#070b16] text-slate-100">
      {/* 1. TOP HEADER CỐ ĐỊNH: MÃ PHÒNG TO RÕ RÀNG & NÚT MỞ MÃ QR */}
      <header className="sticky top-0 z-40 w-full px-4 py-2.5 glass-panel border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-black text-sm md:text-base tracking-wider text-white uppercase">
              OLYMPIA
            </span>
          </div>

          {/* Badge Mã Phòng To Rõ */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <span className="text-[10px] text-amber-400/80 font-bold uppercase">PHÒNG:</span>
            <span className="font-mono font-black text-sm text-amber-300 tracking-wider">
              {activeRoomCode}
            </span>
          </div>

          {/* Nút Mở Mã QR */}
          <button
            onClick={() => setShowQRModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 border border-slate-700 transition-colors cursor-pointer"
            title="Mở mã QR mời thí sinh"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Mã QR</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/70 border border-slate-700 text-[11px] font-mono">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'}`} />
            <span className="text-slate-300">{isConnected ? 'Đã kết nối' : 'Đang kết nối lại...'}</span>
          </div>
        </div>

        {/* Action Buttons bên phải */}
        <div className="flex items-center gap-2">
          {/* Nút xem QR trên mobile */}
          <button
            onClick={() => setShowQRModal(true)}
            className="sm:hidden p-1.5 rounded-lg bg-slate-800 text-amber-400 border border-slate-700"
            title="Mở mã QR"
          >
            <QrCode className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleMute}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={handleToggleFullScreen}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors hidden sm:block"
            title="Toàn màn hình máy chiếu"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn rời phòng thi đấu này?')) {
                leaveRoom();
              }
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition-colors"
            title="Rời phòng"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Nút màu đỏ: Kết thúc & Đóng phòng (dành riêng cho Host) */}
          {role === 'host' && (
            <button
              onClick={() => setShowTerminateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 border border-rose-400 active:scale-95 transition-all cursor-pointer"
              title="Đóng phòng thi đấu và kick thí sinh"
            >
              <Power className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đóng Phòng</span>
            </button>
          )}
        </div>
      </header>

      {/* BANNER THÔNG BÁO CHO PLAYER KHI HOST MẤT KẾT NỐI */}
      {role === 'player' && !hostOnline && (
        <div className="w-full bg-amber-500 text-slate-950 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-black sticky top-12 z-30 shadow-lg animate-pulse border-b border-amber-600">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-slate-950 flex-shrink-0 animate-bounce" />
            <span>Host đang mất kết nối, hệ thống đang chờ Host quay lại...</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider bg-black/20 text-slate-950 px-2 py-0.5 rounded font-mono font-bold">
            Đang chờ Host
          </span>
        </div>
      )}

      {/* BANNER CẢNH BÁO TOÀN CỤC KHI CÓ NGƯỜI BẤM HÀNG DỌC */}
      {verticalAlert && (
        <div className="w-full bg-red-600 text-white px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-black animate-alarm-glow sticky top-12 z-30">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            <span>
              CÒI BÁO ĐỘNG HÀNG DỌC: Thí sinh <span className="underline">{verticalAlert.name}</span> vừa bấm chuông xin trả lời Chướng Ngại Vật (+{verticalAlert.deltaMs}ms)!
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded">
            Ưu tiên khẩn cấp
          </span>
        </div>
      )}

      {/* 2. NỘI DUNG CHÍNH: LOBBY HOẶC GAME PLAYING */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6">
        {roomStatus === 'LOBBY' ? (
          /* MÀN HÌNH SẢNH CHỜ LOBBY CHO CẢ HOST & PLAYER */
          <LobbyView
            roomCode={activeRoomCode}
            role={role}
            players={gameState?.players || []}
            playerName={playerName}
            onOpenQR={() => setShowQRModal(true)}
            onStartGame={startGame}
          />
        ) : role === 'host' ? (
          /* MÀN HÌNH BÀN CỜ & ĐIỀU KHIỂN CHO HOST */
          <div className="space-y-6">
            {/* Hình ảnh bí mật chia lưới 3x2 (6 mảnh ghép) */}
            <ImagePuzzleBoard
              secretImage={gameState?.secretImage}
              revealedTiles={gameState?.revealedTiles || []}
            />

            <CrosswordBoard
              gameState={gameState}
              onSelectRow={selectRow}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BuzzQueueList
                gameState={gameState}
                onJudge={judgeResult}
                onDismiss={dismissBuzz}
                onResetBuzzer={resetBuzzer}
              />

              <HostControls
                gameState={gameState}
                onSelectRow={selectRow}
                onToggleBuzzer={toggleBuzzer}
                onRevealRow={revealRow}
                onRevealVertical={revealVertical}
                onResetGame={resetGame}
              />
            </div>
          </div>
        ) : (
          /* MÀN HÌNH CÂU HỎI & CHUÔNG BẤM CHO THÍ SINH (PLAYER) */
          <div className="max-w-lg mx-auto space-y-6">
            <div className="p-4 rounded-2xl glass-panel flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black flex items-center justify-center text-base">
                  {playerName ? playerName.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <div className="font-bold text-base text-white">
                    {playerName || 'Thí sinh'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    ID: {playerId.slice(0, 8)}...
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Điểm của bạn
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {currentPlayer?.score ?? 0}đ
                </div>
              </div>
            </div>

            <QuestionViewer gameState={gameState} />

            <RowBuzzer
              gameState={gameState}
              playerId={playerId}
              onBuzz={buzz}
              isEliminated={currentPlayer?.isEliminated}
            />

            <VerticalBuzzer
              gameState={gameState}
              playerId={playerId}
              onBuzz={buzz}
              isEliminated={currentPlayer?.isEliminated}
            />
          </div>
        )}
      </main>

      {/* MODAL MÃ QR */}
      {showQRModal && (
        <QRCodeModal
          roomCode={activeRoomCode}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {/* MODAL XÁC NHẬN ĐÓNG PHÒNG DÀNH CHO HOST */}
      {showTerminateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border-2 border-rose-500/80 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase text-white tracking-wider">
                  Xác Nhận Đóng Phòng
                </h3>
                <p className="text-xs text-slate-400">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn đóng phòng chơi này và kick tất cả thí sinh? Toàn bộ dữ liệu phòng thi đấu sẽ được dọn dẹp sạch sẽ khỏi máy chủ.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTerminateModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTerminateModal(false);
                  terminateRoom();
                  setHasJoined(false);
                }}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
              >
                Xác nhận đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÔNG BÁO CHO THÍ SINH KHI PHÒNG BỊ HOST ĐÓNG */}
      {roomTerminatedModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900 border-2 border-amber-500/80 shadow-2xl space-y-5 text-center animate-scale-in">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase text-white tracking-wider">
                Phòng Thi Đấu Đã Kết Thúc
              </h3>
              <p className="text-sm text-slate-300">
                {roomTerminatedModal.message || 'Host đã kết thúc phòng chơi!'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                closeTerminatedModal();
                setHasJoined(false);
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              OK - Về Trang Chủ
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full py-3 text-center text-xs text-slate-600 border-t border-slate-800/40">
        Olympia Realtime Interactive System • Room Management & QR Code
      </footer>
    </div>
  );
}
