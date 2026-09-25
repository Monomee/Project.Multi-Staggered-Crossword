import React, { useState, useEffect } from 'react';
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
  UserCheck,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { useSocket } from './hooks/useSocket';
import { sounds } from './utils/audio';

import { CrosswordBoard } from './components/host/CrosswordBoard';
import { HostControls } from './components/host/HostControls';
import { BuzzQueueList } from './components/host/BuzzQueueList';

import { QuestionViewer } from './components/player/QuestionViewer';
import { RowBuzzer } from './components/player/RowBuzzer';
import { VerticalBuzzer } from './components/player/VerticalBuzzer';

export default function App() {
  const {
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
  } = useSocket();

  const [inputName, setInputName] = useState(playerName || '');
  const [selectedRole, setSelectedRole] = useState(role || 'player');
  const [hasJoined, setHasJoined] = useState(() => Boolean(sessionStorage.getItem('olympia_user_role')));
  const [isMuted, setIsMuted] = useState(false);

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

  const handleJoin = (e) => {
    e.preventDefault();
    // Kích hoạt Web Audio Context ngay trong User Gesture đầu tiên
    sounds.init();

    const finalName = inputName.trim() || (selectedRole === 'host' ? 'Ban Tổ Chức' : 'Thí sinh');
    joinRoom('OLYMPIA', finalName, selectedRole);
    setHasJoined(true);
  };

  const handleSwitchRole = (newRole) => {
    setSelectedRole(newRole);
    joinRoom('OLYMPIA', playerName || 'Người tham gia', newRole);
  };

  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // MÀN HÌNH ĐĂNG NHẬP / CHỌN VAI TRÒ
  if (!hasJoined) {
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
              Hệ thống tương tác thời gian thực chuẩn truyền hình
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            {/* Chọn vai trò */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Chọn vai trò:
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

            {/* Nhập tên */}
            {selectedRole === 'player' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Tên thí sinh:
                </label>
                <input
                  type="text"
                  required
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Long, Minh Anh..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm font-semibold"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
            >
              Vào Phòng Thi Đấu
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Socket.io Ready
            </span>
            <span>Room: OLYMPIA</span>
          </div>
        </div>
      </div>
    );
  }

  // GIAO DIỆN CHÍNH
  return (
    <div className="min-h-screen flex flex-col bg-[#070b16] text-slate-100">
      {/* 1. TOP HEADER THANH ĐIỀU HƯỚNG */}
      <header className="sticky top-0 z-40 w-full px-4 py-2.5 glass-panel border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-black text-sm md:text-base tracking-wider text-white uppercase">
              OLYMPIA
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/70 border border-slate-700 text-[11px] font-mono">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'}`} />
            <span className="text-slate-300">{isConnected ? 'Đã kết nối' : 'Đang kết nối lại...'}</span>
          </div>
        </div>

        {/* Chuyển đổi Role & Controls */}
        <div className="flex items-center gap-2">
          {/* Quick role toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <button
              onClick={() => handleSwitchRole('host')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                role === 'host' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Host
            </button>
            <button
              onClick={() => handleSwitchRole('player')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                role === 'player' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Player
            </button>
          </div>

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
              if (window.confirm('Bạn có chắc chắn muốn rời phòng và bắt đầu lượt chơi mới?')) {
                leaveRoom();
              }
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition-colors"
            title="Rời phòng / Chơi mới"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

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

      {/* 2. NỘI DUNG CHÍNH THEO VAI TRÒ */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6">
        {role === 'host' ? (
          /* MÀN HÌNH DÀNH CHO HOST & MÁY CHIẾU */
          <div className="space-y-6">
            {/* Bàn cờ chữ so le Staggered Crossword */}
            <CrosswordBoard
              gameState={gameState}
              onSelectRow={selectRow}
            />

            {/* Bảng điều khiển Host & Danh sách bấm chuông */}
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
          /* MÀN HÌNH DÀNH CHO THÍ SINH (PLAYER) */
          <div className="max-w-lg mx-auto space-y-6">
            {/* Thông tin thí sinh & điểm số */}
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

            {/* Thẻ xem câu hỏi chống cận */}
            <QuestionViewer gameState={gameState} />

            {/* Nút bấm hàng ngang */}
            <RowBuzzer
              gameState={gameState}
              playerId={playerId}
              onBuzz={buzz}
              isEliminated={currentPlayer?.isEliminated}
            />

            {/* Nút đỏ bấm hàng dọc (Chướng Ngại Vật) */}
            <VerticalBuzzer
              gameState={gameState}
              playerId={playerId}
              onBuzz={buzz}
              isEliminated={currentPlayer?.isEliminated}
            />
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full py-3 text-center text-xs text-slate-600 border-t border-slate-800/40">
        Olympia Realtime Interactive System • Server-Authoritative Buzzer
      </footer>
    </div>
  );
}
