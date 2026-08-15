import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: { alias: [
    { find: '@coder-safal/bs-calendar/react', replacement: fileURLToPath(new URL('../../src/react.ts', import.meta.url)) },
    { find: '@coder-safal/bs-calendar', replacement: fileURLToPath(new URL('../../src/index.ts', import.meta.url)) },
  ] },
  build: { outDir: '../../dist-demo', emptyOutDir: true },
});
