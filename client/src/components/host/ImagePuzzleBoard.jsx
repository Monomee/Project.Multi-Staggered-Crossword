import React from 'react';
import { Eye, Image as ImageIcon } from 'lucide-react';

/**
 * ImagePuzzleBoard.jsx
 * Hiển thị hình ảnh bí mật chia lưới 3x2 (6 mảnh ghép) phủ kín tỉ lệ 16:9
 * Mỗi khi hàng ngang đúng, ô che tương ứng (revealsTileIndex) sẽ mờ dần (fade out).
 * Khi hàng dọc được giải, toàn bộ 6 ô che sẽ được mở.
 */
export function ImagePuzzleBoard({ secretImage, revealedTiles = [] }) {
  let rawUrl = secretImage?.url || '/data/manh-ghep.jpg';
  if (rawUrl.startsWith('./data/')) {
    rawUrl = rawUrl.replace('./data/', '/data/');
  }
  const imageUrl = rawUrl;
  const cols = secretImage?.grid?.cols || 3;
  const rows = secretImage?.grid?.rows || 2;
  const total = cols * rows;

  return (
    <div className="w-full flex flex-col h-full rounded-2xl glass-panel-elevated p-4 md:p-5 border border-slate-700/80">
      {/* Header chỉ báo tiến độ mở mảnh ghép */}
      <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs font-bold text-slate-300 uppercase tracking-wider">
        <div className="flex items-center gap-2 text-amber-400">
          <ImageIcon className="w-4 h-4" />
          <span>Hình Ảnh Bí Mật (3x2 Puzzle)</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-slate-400 font-mono text-[11px]">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Đã mở: <strong className="text-amber-400 font-black">{revealedTiles.length}/{total}</strong> mảnh</span>
        </div>
      </div>

      {/* Khung chứa ảnh bí mật 16:9 */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-black">
        {/* Ảnh nền bí mật */}
        <img
          src={imageUrl}
          alt="Secret Puzzle"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://picsum.photos/1200/800';
          }}
          className="absolute inset-0 w-full h-full object-cover select-none"
        />

        {/* Overlay Lưới 3x2 (3 cột, 2 hàng) */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
          }}
        >
          {Array.from({ length: total }, (_, index) => {
            const isRevealed = revealedTiles.includes(index);
            return (
              <div
                key={index}
                className={`transition-opacity duration-700 flex items-center justify-center border border-neutral-900 font-bold select-none ${
                  isRevealed
                    ? 'opacity-0 pointer-events-none'
                    : 'opacity-100 bg-black text-slate-100'
                }`}
                style={{
                  backgroundColor: isRevealed ? 'transparent' : '#000000'
                }}
              >
                {!isRevealed && (
                  <span className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center shadow-2xl text-amber-400 font-black text-lg md:text-xl">
                    {index + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ghi chú hướng dẫn nhỏ bên dưới ảnh */}
      <div className="mt-3 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-400/80 inline-block animate-pulse"></span>
        <span>Mỗi hàng ngang đúng sẽ mở 1 mảnh ghép màu đen tương ứng</span>
      </div>
    </div>
  );
}
