import { defineConfig } from 'vite';

// `--mode single` erzeugt einen Build, in dem alle Assets (Schriften) als
// Data-URLs eingebettet sind; scripts/inline-single.mjs packt danach JS und CSS
// in eine einzige index.html (z. B. zum Teilen ohne Server).
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    target: 'es2022',
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 2000,
  },
}));
