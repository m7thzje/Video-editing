import { defineConfig } from 'vite';

// Relatieve base zodat de build werkt op GitHub Pages (https://<user>.github.io/<repo>/)
// en ook lokaal via `vite preview`.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});
