import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * FE คุย API ผ่าน proxy ไม่เปิด CORS ที่ฝั่ง Nest
 * เพราะ proxy ทำให้เป็น same-origin ตอน dev จึงไม่มี config ที่ต้องรื้อตอน deploy จริง
 */
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
