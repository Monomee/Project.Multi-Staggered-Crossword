import React from 'react';
import { Users, QrCode, Play, Radio, Wifi, WifiOff, Award, Sparkles, Copy, Check } from 'lucide-react';

export function LobbyView({
  roomCode,
  role,
  players = [],
  playerName,
  onOpenQR,
  onStartGame
}) {
  const [copied, setCopied] = React.useState(false);
  const joinUrl = `${window.location.origin}/?room=${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const onlinePlayersCount = players.filter(p => p.connected !== false).length;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 py-6 animate-fadeIn">
      {/* 1. KHU VỰC THÔNG TIN PHÒNG (HEADER LOBBY) */}
      <div className="text-center space-y-3">
        <span className="px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>SẢNH CHỜ THI ĐẤU (LOBBY)</span>
        </span>

        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
          PHÒNG: <span className="text-amber-400 font-mono tracking-widest">{roomCode}</span>
        </h1>

        <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto">
          {role === 'host'
            ? 'Hãy mời các thí sinh quét mã QR hoặc nhập mã phòng để cùng tham gia tranh tài!'
            : 'Bạn đã gia nhập phòng thành công. Hãy giữ màn hình sáng và chờ hiệu lệnh từ Host!'}
        </p>
      </div>

      {/* 2. CÁC NÚT ĐIỀU KHIỂN NHANH (HOST CONTROLS IN LOBBY) */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onOpenQR}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs md:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-amber-400" />
          <span>Xem Mã QR Mời Bạn</span>
        </button>

        <button
          onClick={handleCopy}
          className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs md:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Đã chép link' : 'Sao chép link mời'}</span>
        </button>

        {role === 'host' && (
          <button
            onClick={onStartGame}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm md:text-base uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-emerald-950/60 ring-2 ring-emerald-300 transition-all active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>BẮT ĐẦU CHƠI NGAY!</span>
          </button>
        )}
      </div>

      {/* 3. DANH SÁCH THẺ BÀI THÍ SINH (PLAYER CARDS) */}
      <div className="w-full p-6 rounded-3xl glass-panel-elevated space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm uppercase tracking-wide">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Thí sinh đã vào phòng ({onlinePlayersCount}/{players.length})</span>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {role === 'host' ? 'Tự động cập nhật thời gian thực' : `Bạn: ${playerName || 'Thí sinh'}`}
          </span>
        </div>

        {players.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 animate-pulse">
              <Users className="w-8 h-8" />
            </div>
            <div className="text-base font-bold text-slate-300">
              Chưa có thí sinh nào vào phòng
            </div>
            <div className="text-xs text-slate-500">
              Hãy chia sẻ mã phòng <span className="font-mono font-bold text-amber-400">{roomCode}</span> hoặc mở mã QR để thí sinh quét tham gia!
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {players.map((p, idx) => {
              const isOnline = p.connected !== false;
              const isMe = p.name === playerName && role === 'player';

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    isMe
                      ? 'bg-amber-500/15 border-amber-400/80 ring-2 ring-amber-400/30'
                      : isOnline
                      ? 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                      : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center font-black text-sm text-amber-400 shadow">
                      #{idx + 1}
                    </div>

                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-400 text-slate-950 font-black uppercase">
                            Bạn
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono mt-0.5">
                        {isOnline ? (
                          <>
                            <Wifi className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Online</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-3 h-3 text-slate-500" />
                            <span className="text-slate-500">Mất kết nối</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {p.score ?? 0}đ
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Thông báo cho Player khi ở Lobby */}
      {role === 'player' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center max-w-md w-full space-y-1">
          <div className="text-xs font-black text-amber-400 uppercase tracking-wide flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>Đang chờ Host khởi động cuộc thi</span>
          </div>
          <div className="text-xs text-slate-400">
            Khi Host bấm "Bắt đầu chơi", màn hình sẽ tự động chuyển sang câu hỏi và nút bấm chuông!
          </div>
        </div>
      )}
    </div>
  );
}
