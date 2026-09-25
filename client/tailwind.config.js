/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        olympia: {
          bg: '#0a0e1a',
          card: '#121829',
          accent: '#f59e0b',
          gold: '#fbbf24',
          danger: '#ef4444',
          success: '#10b981',
          neon: '#06b6d4',
          anchor: '#eab308'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flip-in': 'flipIn 0.6s ease-out forwards',
        'alarm-glow': 'alarmGlow 1s ease-in-out infinite alternate',
      },
      keyframes: {
        flipIn: {
          '0%': { transform: 'rotateX(90deg)', opacity: '0' },
          '100%': { transform: 'rotateX(0deg)', opacity: '1' }
        },
        alarmGlow: {
          '0%': { boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)' },
          '100%': { boxShadow: '0 0 35px rgba(239, 68, 68, 0.95)' }
        }
      }
    },
  },
  plugins: [],
}
