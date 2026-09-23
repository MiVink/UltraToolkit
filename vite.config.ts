import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: збірка у ./dist, base './' щоб працювало
// і на <user>.github.io/<repo>/, і на кастомному домені.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
});
