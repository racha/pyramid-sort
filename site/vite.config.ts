import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/pyramid-sort/',
  plugins: [react(), tailwindcss()],
  server: { fs: { allow: ['..'] } },
});
