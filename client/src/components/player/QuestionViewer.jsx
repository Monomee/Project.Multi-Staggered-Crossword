import React from 'react';
import { HelpCircle, Eye, Sparkles } from 'lucide-react';

/**
 * QuestionViewer.jsx
 * Thẻ xem câu hỏi chống cận: font chữ to, tương phản cao, hiển thị rõ ràng trên điện thoại
 */
export function QuestionViewer({ gameState }) {
  if (!gameState) return null;

  const { rows, currentRowId, title } = gameState;
  const currentRow = rows.find(r => r.id === currentRowId) || null;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Tiêu đề phần thi */}
      <div className="text-center">
        <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-block">
          {title || 'VƯỢT CHƯỚNG NGẠI VẬT'}
        </span>
      </div>

      {/* Thẻ câu hỏi chống cận */}
      <div className="p-5 md:p-6 rounded-2xl glass-panel-elevated border border-slate-700/80 shadow-2xl relative overflow-hidden">
        {/* Glow trang trí nền */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {currentRow ? (
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide shadow-md">
                HÀNG {currentRow.id}
              </span>
              <span className="text-xs font-mono font-bold text-amber-300">
                {currentRow.charCount} KÝ TỰ • {currentRow.points} ĐIỂM
              </span>
            </div>

            {/* Nội dung câu hỏi font to, tương phản cao */}
            <div className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight">
              {currentRow.question}
            </div>

            {currentRow.isRevealed && (
              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  ĐÁP ÁN:
                </span>
                <span className="font-mono font-black text-lg text-emerald-300 tracking-widest">
                  {currentRow.answer}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center space-y-2 relative z-10">
            <HelpCircle className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
            <div className="text-base font-bold text-slate-300">
              Đang chờ MC chọn hàng ngang tiếp theo...
            </div>
            <div className="text-xs text-slate-500">
              Hãy chú ý lắng nghe và chuẩn bị ngón tay trên nút chuông!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
