import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, ExternalLink, Smartphone } from 'lucide-react';

export function QRCodeModal({ roomCode, onClose }) {
  const [copied, setCopied] = useState(false);

  // Link tham gia trực tiếp chứa param ?room=XXXX
  const joinUrl = `${window.location.origin}/?room=${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl glass-panel-elevated border-2 border-amber-500/40 shadow-2xl relative space-y-6 text-center">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề & Mã phòng */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <QrCode className="w-3.5 h-3.5" />
            <span>Quét Mã QR Tham Gia</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            MÃ PHÒNG: <span className="text-amber-400 font-mono tracking-widest">{roomCode}</span>
          </h2>
          <p className="text-xs text-slate-400">
            Dùng camera điện thoại quét mã hoặc bấm link để vào ngay
          </p>
        </div>

        {/* Khung chứa mã QR trắng nổi bật để camera quét nhạy nhất */}
        <div className="p-4 bg-white rounded-2xl inline-block shadow-xl ring-4 ring-amber-500/30">
          <QRCodeSVG
            value={joinUrl}
            size={220}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Link và nút Copy */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-mono text-slate-300 overflow-hidden">
            <span className="truncate flex-1 text-left px-2">{joinUrl}</span>
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>Thí sinh tự động điền mã phòng sau khi quét</span>
          </div>
        </div>
      </div>
    </div>
  );
}
