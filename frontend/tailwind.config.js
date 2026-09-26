/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyan: { 50:'#edf4fb',100:'#d8e6f5',200:'#b7cee8',300:'#8fb2d8',400:'#6f98c5',500:'#4f7fb8',600:'#416a9b',700:'#38577d',800:'#314966',900:'#2b3e55',950:'#182433' },
        purple: { 50:'#f1f4f8',100:'#e1e7ef',200:'#c6d0df',300:'#a4b3c9',400:'#8295b2',500:'#687d9d',600:'#566783',700:'#47556c',800:'#3c475a',900:'#343d4c',950:'#1d232d' },
        rose: { 50:'#fdf2f2',100:'#fbe4e4',200:'#f5cccc',300:'#eba9a9',400:'#dc7d7d',500:'#c95d5d',600:'#b74343',700:'#963737',800:'#7d3232',900:'#682f2f',950:'#391616' },
        amber: { 50:'#fbf7ed',100:'#f4ead3',200:'#e8d3a5',300:'#d9b66f',400:'#c99a45',500:'#b57d32',600:'#996126',700:'#794a24',800:'#653e25',900:'#563622',950:'#311b10' },
        emerald: { 50:'#eff8f3',100:'#dcefe3',200:'#bcdfca',300:'#8fc5a5',400:'#68a884',500:'#4f8f6b',600:'#3e7356',700:'#345c47',800:'#2c493a',900:'#263d32',950:'#13221b' },
        soc: { bg:'#0d1117',surface:'#111820',card:'#151b23',cardHover:'#1b222c',border:'#2a323d',borderLight:'#37414d',muted:'#8b96a3',text:'#e6edf3',cyan:'#4f7fb8',red:'#b74343',amber:'#b57d32',green:'#4f8f6b',purple:'#687d9d' },
      },
      fontFamily: {
        sans: ['Inter','system-ui','-apple-system','BlinkMacSystemFont','Segoe UI','sans-serif'],
        mono: ['JetBrains Mono','IBM Plex Mono','Consolas','monospace'],
      },
      animation: { 'pulse-subtle': 'none' },
    },
  },
  plugins: [],
}
