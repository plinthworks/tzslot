/**
 * The same library, with the polyfill left out of your bundle.
 *
 * Nothing here imports `temporal-polyfill`, so a bundler never sees it: the
 * package drops from about 27 kB gzipped to 3.4 kB, measured. In exchange,
 * one call at startup:
 *
 * ```ts
 * import { loadTemporal } from '@tzslot/core/lazy';
 *
 * await loadTemporal();   // resolves immediately where Temporal is native
 * ```
 *
 * On Chrome 144, Edge 144 and Firefox 139 that await costs a microtask and
 * no bytes. Anywhere else it fetches the polyfill once — however many times it
 * is called, and whoever calls it first.
 *
 * Touching the library before that call, on a runtime with no Temporal of its
 * own, throws a ReferenceError naming `loadTemporal`. It does not fall back to
 * `Date`: `Date` has no IANA zone, so a fallback would quietly reintroduce the
 * exact bug this library exists to prevent, on the platform least able to tell
 * you about it.
 *
 * `loadTemporal` is exported from the default entry too, where it resolves
 * immediately — so the same startup code runs under either one.
 */
export * from './api.js';
