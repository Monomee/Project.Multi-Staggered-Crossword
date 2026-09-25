import React from 'react';
import { Bell, Lock, Unlock, Eye, RotateCcw, Award, ChevronRight, HelpCircle, Users } from 'lucide-react';

export function HostControls({
  gameState,
  onSelectRow,
  onToggleBuzzer,
  onRevealRow,
  onRevealVertical,
  onResetGame
}) {
  if (!gameState) return null;

  const { rows, currentRowId, buzzer, players = [], verticalWord } = gameState;
  const currentRow = rows.find(r => r.id === currentRowId) || null;
  const isRowBuzzerOpen = buzzer?.isRowOpen || false;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. THANH TRẠNG THÁI & ĐIỀU KHIỂN CHUÔNG HÀNG NGANG */}
      <div className="p-4 rounded-2xl glass-panel flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isRowBuzzerOpen ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
            <Bell className={`w-6 h-6 ${isRowBuzzerOpen ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Trạng thái Chuông Hàng Ngang
            </div>
            <div className={`font-black text-lg ${isRowBuzzerOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isRowBuzzerOpen ? 'ĐANG MỞ CHO THÍ SINH BẤM' : 'ĐANG KHÓA'}
            </div>
          </div>
        </div>

        {/* Nút bật/tắt mở chuông */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onToggleBuzzer(!isRowBuzzerOpen)}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
              isRowBuzzerOpen
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 ring-2 ring-rose-400'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 ring-2 ring-emerald-400'
            }`}
          >
            {isRowBuzzerOpen ? (
              <>
                <Lock className="w-4 h-4" />
                <span>KHÓA CHUÔNG NGAY</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>MỞ CHUÔNG CHO THÍ SINH</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. CHỌN HÀNG NGANG & XEM CÂU HỎI */}
      <div className="p-4 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Chọn Hàng Ngang Đang Thi Đấu</span>
          </div>

          {currentRow && !currentRow.isRevealed && (
            <button
              onClick={() => onRevealRow(currentRow.id)}
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Mở đáp án hàng {currentRow.id}
            </button>
          )}
        </div>

        {/* Danh sách nút chọn hàng */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {rows.map((row) => {
            const isSelected = row.id === currentRowId;
            return (
              <button
                key={row.id}
                onClick={() => onSelectRow(row.id)}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex flex-col items-center gap-1 transition-all border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 ring-2 ring-amber-300'
                    : row.isRevealed
                    ? 'bg-slate-800/80 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-900/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <span>Hàng {row.id}</span>
                <span className="text-[10px] opacity-80">
                  {row.isRevealed ? '✓ Đã mở' : `${row.charCount} chữ`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Chi tiết câu hỏi hiện tại cho MC / Host */}
        {currentRow ? (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-inner">
            <div className="text-xs text-amber-400 font-bold uppercase mb-1">
              Câu hỏi Hàng {currentRow.id} ({currentRow.charCount} chữ cái - {currentRow.points} điểm):
            </div>
            <div className="text-base md:text-lg font-bold text-white leading-relaxed">
              "{currentRow.question}"
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
              <span className="text-slate-500">Gợi ý đáp án (chỉ Host thấy):</span>
              <span className="font-mono font-bold text-amber-300 tracking-wider">
                {currentRow.answer || '(Ẩn)'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-slate-500 text-sm">
            Hãy chọn một hàng ngang phía trên để bắt đầu câu hỏi.
          </div>
        )}
      </div>

      {/* 3. ĐIỀU KHIỂN CHƯỚNG NGẠI VẬT & QUẢN TRỊ TRẬN ĐẤU */}
      <div className="p-4 rounded-2xl glass-panel space-y-3">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-700/50">
          <Award className="w-4 h-4 text-emerald-400" />
          <span>Điều khiển Chướng Ngại Vật & Trận Đấu</span>
        </div>

        {/* Câu hỏi chướng ngại vật */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1">
          <div className="font-bold text-emerald-400">
            Từ khóa Chướng Ngại Vật ({verticalWord?.keywordLength || 6} chữ cái):
          </div>
          <div>{verticalWord?.question}</div>
          {verticalWord?.keyword && (
            <div className="font-mono font-bold text-emerald-300 tracking-widest text-sm pt-1">
              ĐÁP ÁN: {verticalWord.keyword}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!gameState.verticalSolved && (
            <button
              onClick={onRevealVertical}
              className="px-4 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <Eye className="w-4 h-4" />
              Mở Chướng Ngại Vật (Không ai đoán trúng)
            </button>
          )}

          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn RESET toàn bộ trận đấu về ban đầu?')) {
                onResetGame();
              }
            }}
            className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition-all ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            Làm mới trận đấu (Reset Game)
          </button>
        </div>
      </div>

      {/* 4. BẢNG ĐIỂM THÍ SINH */}
      <div className="p-4 rounded-2xl glass-panel space-y-3">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between pb-2 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Bảng Điểm Thí Sinh ({players.length})</span>
          </div>
        </div>

        {players.length === 0 ? (
          <div className="text-center py-4 text-slate-500 text-xs">
            Chưa có thí sinh nào tham gia phòng.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {players.map((p) => (
              <div
                key={p.id}
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  p.isEliminated
                    ? 'bg-rose-950/20 border-rose-800/40 opacity-60'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span>{p.name}</span>
                  </div>
                  {p.isEliminated && (
                    <span className="text-[10px] text-rose-400 font-bold uppercase">
                      ĐÃ BỊ LOẠI
                    </span>
                  )}
                </div>
                <div className="text-lg font-black text-amber-400 font-mono">
                  {p.score}đ
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
