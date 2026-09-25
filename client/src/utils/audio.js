/**
 * audio.js
 * Bộ tổng hợp hiệu ứng âm thanh Olympia bằng Web Audio API
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('Không thể khởi tạo Web Audio Context:', e);
    }
  }

  // Mở khóa AudioContext ngay khi có tương tác người dùng đầu tiên (iOS Safari / Android Chrome)
  unlockAudio() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      const resume = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().then(() => {
            ['click', 'touchstart', 'touchend'].forEach((evt) => {
              window.removeEventListener(evt, resume);
            });
          }).catch(() => {});
        }
      };
      ['click', 'touchstart', 'touchend'].forEach((evt) => {
        window.addEventListener(evt, resume, { once: true, passive: true });
      });
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  // Chuông bấm hàng ngang (Ding chuông thanh thoát)
  playRowBuzz() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // Note A5
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Còi báo động khẩn cấp Hàng Dọc (Red Alert Olympia)
  playVerticalAlarm() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Chạy chuỗi âm cảnh báo 2 nốt dồn dập
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.28;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.linearRampToValueAtTime(880, t + 0.14);
      osc.frequency.linearRampToValueAtTime(520, t + 0.26);

      gain.gain.setValueAtTime(0.6, t);
      gain.gain.linearRampToValueAtTime(0.8, t + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.27);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.28);
    }
  }

  // Trả lời đúng (Chime vui tươi)
  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.1;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  // Trả lời sai (Buzzer trầm tò te)
  playWrong() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(170, now + 0.2);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  // Lật ô chữ
  playTileFlip() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Chiến thắng giải chướng ngại vật
  playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const melody = [
      { f: 523.25, d: 0.15 },
      { f: 659.25, d: 0.15 },
      { f: 783.99, d: 0.15 },
      { f: 1046.5, d: 0.35 },
      { f: 880, d: 0.2 },
      { f: 1046.5, d: 0.6 }
    ];

    let t = this.ctx.currentTime;
    melody.forEach((note) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + note.d);
      t += note.d * 1.1;
    });
  }
}

export const sounds = new SoundEngine();
