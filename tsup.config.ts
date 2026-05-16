import { defineConfig, type Options } from 'tsup';
import { rmSync } from 'node:fs';

const shared: Options = { format: ['esm', 'cjs'], dts: true, sourcemap: true, external: ['react', 'react-dom'], target: 'es2022', splitting: false };

export default defineConfig(() => {
  // Clean once before parallel builds so neither build removes the other's output.
  rmSync('dist', { recursive: true, force: true });
  return [
    { ...shared, entry: ['src/index.ts', 'src/core/index.ts'] },
    { ...shared, entry: ['src/react.ts'], banner: { js: '"use client";' } },
  ];
});
