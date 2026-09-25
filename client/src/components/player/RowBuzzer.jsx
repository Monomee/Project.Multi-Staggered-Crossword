import React, { useState, useEffect } from 'react';
import { Bell, Check, Clock, AlertCircle } from 'lucide-react';

/**
 * RowBuzzer.jsx
 * Nút bấm chuông Hàng Ngang cho thí sinh
 * - Chống spam touch: disable 1000ms sau khi chạm
 * - Phản hồi xúc giác / haptic vibration
 */
export function RowBuzzer({
  gameState,
  playerId,
  onBuzz,
  isEliminated
}) {
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const buzzerState = gameState?.buzzer || {};
  const isRowOpen = buzzerState.isRowOpen || false;
  const hasVertical = buzzerState.hasVerticalActive || false;
  const rowQueue = buzzerState.rowQueue || [];

  // Tìm xem người chơi này đã bấm chuông chưa
  const myQueueIndex = rowQueue.findIndex(item => item.playerId === playerId);
  const hasBuzzed = myQueueIndex !== -1;
  const myBuzzInfo = hasBuzzed ? rowQueue[myQueueIndex] : null;

  const handleClick = () => {
    if (buttonDisabled || isEliminated || !isRowOpen || hasVertical || hasBuzzed) {
      return;
    }

    // 1. Chống spam touch ở mobile: debounce 1000ms
    setButtonDisabled(true);
    setTimeout(() => {
      setButtonDisabled(false);
    }, 1000);

    // 2. Rung haptic nếu thiết bị hỗ trợ
    if (navigator.vibrate) {
      navigator.vibrate(80);
    }

    onBuzz('ROW');
  };

  // Xác định trạng thái nút
  let canPress = isRowOpen && !hasVertical && !hasBuzzed && !isEliminated && !buttonDisabled;
  let statusText = 'SẴN SÀNG BẤM!';
  let subText = 'Chạm ngay khi có tín hiệu';

  if (isEliminated) {
    statusText = 'BỊ VÔ HIỆU HÓA';
    subText = 'Bạn đã bị loại khỏi phần thi này';
  } else if (hasBuzzed) {
    statusText = `ĐÃ GHI NHẬN LƯỢT #${myQueueIndex + 1}`;
    subText = myQueueIndex === 0 ? 'Bạn là người nhanh nhất (0ms)!' : `Thời gian chênh lệch: +${myBuzzInfo?.deltaMs}ms`;
  } else if (hasVertical) {
    statusText = 'TẠM KHÓA';
    subText = 'Đang tạm dừng để xử lý chuông Hàng Dọc';
  } else if (!isRowOpen) {
    statusText = 'CHUÔNG ĐANG KHÓA';
    subText = 'Chờ hiệu lệnh mở chuông từ MC';
  } else if (buttonDisabled) {
    statusText = 'ĐANG GỬI TÍN HIỆU...';
    subText = 'Vui lòng chờ giây lát';
  }

  return (
    <div className="w-full flex flex-col items-center">
      <button
        type="button"
        disabled={!canPress}
        onClick={handleClick}
        className={`no-tap-highlight relative w-full max-w-sm h-36 sm:h-44 rounded-3xl font-black text-xl sm:text-2xl tracking-wider uppercase transition-all duration-150 flex flex-col items-center justify-center p-4 border-4 shadow-2xl active:scale-95 ${
          hasBuzzed
            ? 'bg-gradient-to-b from-emerald-600 to-emerald-800 border-emerald-400 text-white shadow-emerald-900/50'
            : canPress
            ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 border-amber-200 text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.6)] cursor-pointer'
            : 'bg-slate-800/80 border-slate-700/60 text-slate-500 cursor-not-allowed opacity-75'
        }`}
      >
        {/* Icon & Trạng thái */}
        <div className="flex items-center gap-2 mb-1">
          {hasBuzzed ? (
            <Check className="w-8 h-8 text-white" />
          ) : hasVertical ? (
            <AlertCircle className="w-8 h-8 text-amber-400 animate-pulse" />
          ) : (
            <Bell className={`w-8 h-8 ${canPress ? 'animate-bounce text-slate-950' : 'text-slate-600'}`} />
          )}
        </div>

        <span className="drop-shadow-sm font-black text-center leading-tight">
          {statusText}
        </span>

        <span className={`text-xs font-semibold mt-1 tracking-normal ${
          hasBuzzed ? 'text-emerald-100' : canPress ? 'text-slate-900' : 'text-slate-500'
        }`}>
          {subText}
        </span>
      </button>
    </div>
  );
}
