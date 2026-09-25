import React from 'react';
import { AlertTriangle, Clock, CheckCircle2, XCircle, RotateCcw, Volume2, ShieldAlert } from 'lucide-react';

export function BuzzQueueList({
  gameState,
  onJudge,
  onDismiss,
  onResetBuzzer
}) {
  const rowQueue = gameState?.buzzer?.rowQueue || [];
  const verticalQueue = gameState?.buzzer?.verticalQueue || [];
  const hasVertical = verticalQueue.length > 0;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. KHU VỰC CẢNH BÁO ƯU TIÊN HÀNG DỌC (INTERRUPT PRIORITY) */}
      {hasVertical && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/80 to-rose-900/60 border-2 border-red-500 shadow-2xl animate-alarm-glow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-red-300 font-black tracking-wide uppercase text-sm">
              <ShieldAlert className="w-5 h-5 text-red-400 animate-bounce" />
              <span>CÒI BÁO ĐỘNG: CÓ TÍN HIỆU XIN TRẢ LỜI CHƯỚNG NGẠI VẬT!</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/30 text-red-200 border border-red-500/50">
              Ưu tiên Hàng Dọc
            </span>
          </div>

          <div className="space-y-3">
            {verticalQueue.map((item, idx) => (
              <div
                key={item.playerId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-red-500/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-black text-lg text-white">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-xs text-red-300 font-mono flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Thời gian chênh lệch: +{item.deltaMs}ms</span>
                  </div>
                </div>

                {/* Các nút trọng tài cho Hàng Dọc */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onJudge(item.playerId, 'VERTICAL', true)}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/40 transition-transform active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Đúng (Thắng)
                  </button>
                  <button
                    onClick={() => onJudge(item.playerId, 'VERTICAL', false)}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-900/40 transition-transform active:scale-95"
                  >
                    <XCircle className="w-4 h-4" />
                    Sai (Loại vĩnh viễn)
                  </button>
                  <button
                    onClick={() => onDismiss(item.playerId, 'VERTICAL')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold text-xs transition-colors"
                    title="Bỏ qua ấn nhầm, không phạt"
                  >
                    Bỏ qua
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. KHU VỰC HÀNG ĐỢI CHUÔNG HÀNG NGANG */}
      <div className="p-4 rounded-2xl glass-panel">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase">
              Danh sách bấm chuông Hàng Ngang ({rowQueue.length})
            </h3>
          </div>

          {rowQueue.length > 0 && (
            <button
              onClick={onResetBuzzer}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa chuông</span>
            </button>
          )}
        </div>

        {rowQueue.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-sm">
            Chưa có thí sinh nào bấm chuông lượt này.
          </div>
        ) : (
          <div className="space-y-2">
            {rowQueue.map((item, idx) => {
              const isFirst = idx === 0;

              return (
                <div
                  key={item.playerId}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl transition-all ${
                    isFirst
                      ? 'bg-amber-500/15 border border-amber-500/40 shadow-md shadow-amber-500/5'
                      : 'bg-slate-900/60 border border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                        isFirst
                          ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{item.name}</span>
                        {isFirst && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-400 text-slate-950 font-black uppercase">
                            Nhanh nhất
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{isFirst ? '0ms' : `+${item.deltaMs}ms`}</span>
                      </div>
                    </div>
                  </div>

                  {/* Nút chấm hàng ngang */}
                  <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
                    <button
                      onClick={() => onJudge(item.playerId, 'ROW', true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đúng (+10đ)
                    </button>
                    <button
                      onClick={() => onJudge(item.playerId, 'ROW', false)}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Sai
                    </button>
                    <button
                      onClick={() => onDismiss(item.playerId, 'ROW')}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                      title="Bỏ qua ấn nhầm"
                    >
                      Bỏ qua
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
