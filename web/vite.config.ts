import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base を相対パスにして、GitHub Pages など任意のフォルダに置いても動くようにする。
// 開発中は /api をサーバー(server/、ポート3000)に中継する
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
});
