import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

/**
 * The playground. Not shipped; it exists so the components can be looked at.
 *
 * `jit` because there is no AOT build step here, and the tsconfig has to be
 * named explicitly — without it the plugin leaves `type` specifiers in the
 * output, which reaches the browser as invalid JavaScript.
 */
export default defineConfig({
  plugins: [angular({ tsconfig: 'tsconfig.spec.json', jit: true })],
  server: { port: 4500 },
  optimizeDeps: { include: ['temporal-polyfill'] },
});
