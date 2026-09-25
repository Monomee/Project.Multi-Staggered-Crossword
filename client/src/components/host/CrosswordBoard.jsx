import React from 'react';
import { Sparkles, Trophy, Lock } from 'lucide-react';

/**
 * CrosswordBoard.jsx
 * Hiển thị bàn cờ ô chữ so le (Staggered Crossword) bằng CSS Grid
 * Tuân thủ thuật toán:
 * - Trục chuẩn: COL_ANCHOR = 12
 * - startCol = COL_ANCHOR - keyCharIndex
 * - Ô tại keyCharIndex có class CSS nổi bật
 * - Lật ô 3D khi hàng được mở
 */
export function CrosswordBoard({ gameState, onSelectRow }) {
  if (!gameState || !gameState.rows) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        Đang nạp bàn cờ ô chữ...
      </div>
    );
  }

  const { rows, currentRowId, COL_ANCHOR = 12, verticalSolved, verticalWinner } = gameState;
  const TOTAL_COLS = 24; // 24 cột đủ rộng để căn chỉnh cho mọi từ

  return (
    <div className="w-full flex flex-col items-center">
      {/* Tiêu đề & Trạng thái Chướng ngại vật */}
      <div className="text-center mb-6">
        <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2 inline-block">
          Phần thi Vượt Chướng Ngại Vật
        </span>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">
          {gameState.title || 'VĂN HÓA DÂN GIAN VIỆT NAM'}
        </h1>

        {verticalSolved && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm animate-bounce">
            <Trophy className="w-4 h-4 text-emerald-400" />
            CHƯỚNG NGẠI VẬT ĐÃ ĐƯỢC GIẢI! {verticalWinner?.name ? `(${verticalWinner.name})` : ''}
          </div>
        )}
      </div>

      {/* Khung Bàn cờ Crossword */}
      <div className="w-full max-w-5xl overflow-x-auto p-4 md:p-6 rounded-2xl glass-panel-elevated relative">
        {/* Đường chỉ dẫn trục dọc COL_ANCHOR */}
        <div className="text-xs text-amber-400/80 font-bold uppercase tracking-wider mb-3 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Cột Chướng Ngại Vật</span>
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>

        {/* Danh sách các hàng ngang */}
        <div className="flex flex-col gap-2.5 min-w-[720px]">
          {rows.map((row) => {
            const isSelected = row.id === currentRowId;
            const startCol = COL_ANCHOR - row.keyCharIndex; // 1-based index calculation

            return (
              <div
                key={row.id}
                onClick={() => onSelectRow && onSelectRow(row.id)}
                className={`group flex items-center gap-3 p-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 ring-2 ring-amber-400/60 shadow-lg shadow-amber-500/10'
                    : 'hover:bg-slate-800/50'
                }`}
              >
                {/* Số thứ tự hàng & Số chữ cái */}
                <div className="flex items-center justify-between w-20 flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/60 shadow-inner">
                  <span className={`text-xs font-black ${isSelected ? 'text-amber-400' : 'text-slate-300'}`}>
                    HÀNG {row.id}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {row.charCount}C
                  </span>
                </div>

                {/* Grid các ô chữ so le */}
                <div
                  className="flex-1 grid gap-1.5 items-center justify-start"
                  style={{
                    gridTemplateColumns: `repeat(${TOTAL_COLS}, minmax(36px, 44px))`,
                  }}
                >
                  {Array.from({ length: row.charCount }).map((_, charIdx) => {
                    const isKeyChar = charIdx === row.keyCharIndex;
                    const charAt = row.answer ? row.answer[charIdx] : (isKeyChar && row.revealedKeyChar ? row.revealedKeyChar : '');
                    const isTileRevealed = row.isRevealed || (isKeyChar && row.revealedKeyChar);

                    // Cột của ô này = startCol + charIdx
                    const gridCol = startCol + charIdx;

                    return (
                      <div
                        key={charIdx}
                        style={{ gridColumnStart: gridCol }}
                        className="perspective-1000 w-9 h-10 md:w-11 md:h-12"
                      >
                        <div
                          className={`tile-inner relative w-full h-full rounded-lg text-center select-none shadow-md transition-all duration-500 ${
                            isTileRevealed ? 'tile-flipped' : ''
                          }`}
                        >
                          {/* MẶT TRƯỚC (Khi chưa mở ô) */}
                          <div
                            className={`tile-front absolute inset-0 rounded-lg flex items-center justify-center font-bold border transition-colors ${
                              isKeyChar
                                ? 'bg-gradient-to-br from-amber-600/30 to-amber-900/40 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                                : 'bg-slate-800/90 border-slate-600/80'
                            }`}
                          >
                            {isKeyChar ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                            ) : (
                              <span className="text-slate-600 text-xs">●</span>
                            )}
                          </div>

                          {/* MẶT SAU (Khi đã mở chữ cái) */}
                          <div
                            className={`tile-back absolute inset-0 rounded-lg flex items-center justify-center font-black text-lg md:text-xl border shadow-inner ${
                              isKeyChar
                                ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                                : 'bg-gradient-to-b from-slate-100 to-slate-300 text-slate-900 border-white'
                            }`}
                          >
                            {charAt || ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
