/**
 * @tzslot/dom — the same widgets, with the Temporal polyfill left out.
 *
 * Identical to `@tzslot/dom` in every export. The one difference is that
 * nothing here installs a polyfill, so an application must call
 * `loadTemporal()` once before the first widget reads a date:
 *
 *     import { loadTemporal } from '@tzslot/dom/lazy';
 *     await loadTemporal();   // a microtask where Temporal is native
 *
 * It resolves immediately on Chrome 144, Edge 144 and Firefox 139, and fetches
 * the polyfill as a chunk of its own where there is none, which today is every
 * stable Safari and every iOS browser.
 *
 * Asked for by a consumer whose on-demand editor is the only part of their
 * application using these widgets: the polyfill was 38% of that chunk and was
 * being fetched by every visitor, including the three in four whose browser
 * had Temporal already.
 *
 * Reading a date before the await throws a ReferenceError that says so. That
 * state does not exist on the default entry, which is why the default entry
 * is still the default.
 */
export { loadTemporal } from '@tzslot/core/lazy';

export * from './api.js';
