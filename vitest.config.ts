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
    setupFiles: ['packages/ui/test/setup.ts'],
    include: ['packages/**/test/**/*.test.ts'],
  },
});
