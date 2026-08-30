import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend desacoplado: fala com o backend apenas por HTTP (VITE_API_BASE_URL).
// Em dev, um proxy evita CORS e mantem as chamadas em /api.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', sourcemap: true },
});
