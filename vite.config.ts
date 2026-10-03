import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * CSP лише для продакшн-збірки: у dev вона заблокує inline-скрипт
 * React Refresh, тому хук обмежений apply: 'build'.
 *
 * connect-src 'none' — машинний доказ того, що додаток не робить
 * жодного мережевого запиту (навіть fetch заборонений на рівні політики).
 * style-src 'unsafe-inline' — inline-стилі React (style={{ … }}).
 */
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
      ];
    },
  };
}

// GitHub Pages: збірка у ./dist, base './' щоб працювало
// і на <user>.github.io/<repo>/, і на кастомному домені.
export default defineConfig({
  plugins: [react(), cspPlugin()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
});
