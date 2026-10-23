/**
 * @tzslot/dom — the widgets themselves, in plain DOM.
 *
 * This entry brings Temporal with it, so a widget works the moment it is
 * built: no await, no ordering to think about, and the same bytes as every
 * release before this one.
 *
 * The import below has no bindings on purpose. Every module in this package
 * reads Temporal from `@tzslot/core/lazy`, which bundles no polyfill; this
 * line pulls in the core's default entry for its one side effect, which is to
 * install the polyfill into the module both entries share. So the choice of
 * entry is made here, once, rather than in sixteen widget files.
 *
 * An editor that only opens on demand, on browsers that mostly ship Temporal
 * natively, pays 24.5 kB gzipped for this — 38% of such a bundle, measured on
 * a consumer's own. That one imports `@tzslot/dom/lazy` instead and awaits
 * `loadTemporal()` once at startup.
 */
import '@tzslot/core';

export * from './api.js';
