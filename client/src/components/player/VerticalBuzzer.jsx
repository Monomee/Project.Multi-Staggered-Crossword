import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Flame, Skull } from 'lucide-react';

/**
 * VerticalBuzzer.jsx
 * Nút ĐỎ bấm chuông Hàng Dọc (Chướng Ngại Vật)
 * Kèm cảnh báo Permadeath và Màn hình xám xịt khi bị loại
 */
export function VerticalBuzzer({
  gameState,
  playerId,
  onBuzz,
  isEliminated
}) {
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const buzzerState = gameState?.buzzer || {};
  const isVerticalOpen = buzzerState.isVerticalOpen !== false && !gameState?.verticalSolved;
  const verticalQueue = buzzerState.verticalQueue || [];

  const myVerticalIndex = verticalQueue.findIndex(item => item.playerId === playerId);
  const hasBuzzedVertical = myVerticalIndex !== -1;

  // Xử lý bấm chuông hàng dọc
  const handleTriggerBuzz = () => {
    if (buttonDisabled || isEliminated || !isVerticalOpen || hasBuzzedVertical) return;

    setButtonDisabled(true);
    setTimeout(() => {
      setButtonDisabled(false);
    }, 1000);

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 200]);
    }

    setShowConfirm(false);
    onBuzz('VERTICAL');
  };

  // MÀN HÌNH XÁM XỊT KHI BỊ LOẠI (PERMADEATH)
  if (isEliminated) {
    return (
      <div className="w-full max-w-sm mx-auto p-6 rounded-3xl bg-neutral-900 border-2 border-neutral-700 shadow-2xl text-center space-y-4 filter grayscale">
        <div className="w-16 h-16 mx-auto rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center text-neutral-400">
          <Skull className="w-10 h-10" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-neutral-200 uppercase tracking-wide">
            ĐÃ BỊ LOẠI KHỎI PHẦN THI
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Bạn đã mất quyền tham gia phần thi này do trả lời chưa chính xác Chướng Ngại Vật.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-500 font-mono">
          Mọi nút bấm đã bị vô hiệu hóa hoàn toàn
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-3">
      {/* Cảnh báo rủi ro Permadeath */}
      <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-semibold tracking-wide uppercase">
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>Cảnh báo: Trả lời sai sẽ bị loại ngay lập tức!</span>
      </div>

      {/* Nút bấm hàng dọc */}
      {hasBuzzedVertical ? (
        <div className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 border-2 border-red-400 text-white text-center shadow-xl animate-pulse">
          <div className="font-black text-base uppercase tracking-wider flex items-center justify-center gap-2">
            <Flame className="w-5 h-5 text-amber-300" />
            <span>BẠN ĐÃ BẤM CHUÔNG HÀNG DỌC!</span>
          </div>
          <div className="text-xs text-red-100 mt-1">
            Vị trí #{myVerticalIndex + 1} - Chuẩn bị trả lời câu hỏi của MC
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!isVerticalOpen || buttonDisabled}
          onClick={() => setShowConfirm(true)}
          className={`no-tap-highlight relative w-full h-20 sm:h-24 rounded-2xl font-black text-lg sm:text-xl tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-3 border-2 shadow-xl active:scale-95 ${
            isVerticalOpen && !buttonDisabled
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 border-red-400 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] cursor-pointer'
              : 'bg-slate-800/80 border-slate-700/60 text-slate-500 cursor-not-allowed opacity-75'
          }`}
        >
          <Flame className="w-6 h-6 text-amber-300" />
          <span>BẤM CHƯỚNG NGẠI VẬT</span>
        </button>
      )}

      {/* Modal xác nhận nhanh chống bấm nhầm */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border-2 border-red-500 shadow-2xl space-y-4 animate-flip-in text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white uppercase">
                Xác nhận bấm Hàng Dọc?
              </h3>
              <p className="text-xs text-red-300">
                Nếu trả lời SAI, bạn sẽ bị LOẠI KHỎI CUỘC CHƠI vĩnh viễn và không thể bấm chuông nữa!
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                HỦY BỎ
              </button>
              <button
                type="button"
                onClick={handleTriggerBuzz}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-red-900/50 active:scale-95 transition-all"
              >
                XÁC NHẬN BẤM!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
