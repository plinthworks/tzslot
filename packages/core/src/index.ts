/**
 * The default entry: Temporal is there the moment you import it.
 *
 * The polyfill is imported statically and installed as this module loads, so
 * every existing consumer behaves exactly as before — no await, no ordering to
 * think about, and the same bytes as the previous release.
 *
 * It costs 24.5 kB gzipped on a runtime that already has Temporal: Chrome 144
 * and Edge 144 since January 2026, Firefox 139 since May 2025. Safari has none
 * in any stable release — Technology Preview 249 is the first, in August 2026 —
 * so every Safari and every iOS browser still needs it. An application that
 * would rather
 * pay that only where it is needed imports `@tzslot/core/lazy` instead and
 * awaits `loadTemporal()` once at startup. The two entries export the same
 * things, so nothing else in the code changes.
 */
import { Temporal as Polyfill } from 'temporal-polyfill/full';
import { install } from './temporal.js';

install(Polyfill as never);

export * from './api.js';
