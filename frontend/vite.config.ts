import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/static/',
  build: {
    outDir: path.resolve(__dirname, '../static'),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/health': 'http://127.0.0.1:8000',
      '/events': 'http://127.0.0.1:8000',
      '/alerts': 'http://127.0.0.1:8000',
      '/incidents': 'http://127.0.0.1:8000',
      '/audit': 'http://127.0.0.1:8000',
      '/evaluation': 'http://127.0.0.1:8000',
      '/demo': 'http://127.0.0.1:8000',
      '/simulated-assets': 'http://127.0.0.1:8000',
    },
  },
});
