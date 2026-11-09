import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: 'jsdom', exclude: ['tests/e2e/**', 'node_modules/**'] },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': process.env.OPEN_GARMIN_API_TARGET ?? 'http://127.0.0.1:8000' },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: { charts: ['recharts'], react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
});
