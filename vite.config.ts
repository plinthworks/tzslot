import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

/**
 * The playground. Not shipped; it exists so the components can be looked at.
 *
 * The tsconfig has to be named explicitly, and it has to list every folder
 * that holds components: the plugin only transforms what that file includes,
 * and anything outside it is served with its `import type` statements intact —
 * which is not JavaScript, and the browser blames a brace several modules away.
 */
export default defineConfig({
  plugins: [angular({ tsconfig: 'tsconfig.spec.json' })],
  server: { port: 4500 },
  optimizeDeps: { include: ['temporal-polyfill'] },
});
