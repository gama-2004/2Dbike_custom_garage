import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base を相対パスにして、GitHub Pages など任意のフォルダに置いても動くようにする
export default defineConfig({
  base: './',
  plugins: [react()],
});
