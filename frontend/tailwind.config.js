/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        soc: {
          bg: '#070b12',
          surface: '#0d1322',
          card: '#11192d',
          cardHover: '#16223b',
          border: '#1b2a45',
          borderLight: '#263b61',
          muted: '#8094ad',
          text: '#e2edf8',
          cyan: '#00e5ff',
          cyanGlow: 'rgba(0, 229, 255, 0.15)',
          red: '#ff3366',
          redGlow: 'rgba(255, 51, 102, 0.15)',
          amber: '#ffb300',
          amberGlow: 'rgba(255, 179, 0, 0.15)',
          green: '#00e676',
          greenGlow: 'rgba(0, 230, 118, 0.15)',
          purple: '#b388ff',
          purpleGlow: 'rgba(179, 136, 255, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
