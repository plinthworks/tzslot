import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

/**
 * Angular components are compiled for the tests, not stubbed.
 *
 * A component whose template silently fails to bind still compiles under plain
 * tsc, and its class tests still pass — which is precisely how a button ends up
 * on screen with no click handler behind it. Rendering the real template is the
 * only check that catches that.
 */
export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['packages/angular/test/setup.ts'],
    include: [
      'packages/**/test/**/*.test.ts',
      'packages/**/test/**/*.test.tsx',
      'playground/test/**/*.test.ts',
      'site/*.test.ts',
    ],
  },
  /*
   * JSX, for the React package's tests.
   *
   * The Angular plugin above transforms Angular's own decorators and templates
   * and leaves `.tsx` alone, so esbuild is told how to read one. `automatic`
   * rather than the classic transform, so a component file does not have to
   * import React to use a tag — which is what React has told people to write
   * since 17, and what the package's own sources do.
   */
  esbuild: { jsx: 'automatic' },
});
