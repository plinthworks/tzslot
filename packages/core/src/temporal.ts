/**
 * Where Temporal comes from.
 *
 * Native on Chrome 144, Edge 144 and Firefox 139; absent from every stable
 * Safari, and from Node. The native one is used whenever it exists.
 *
 * The polyfill arrives one of two ways, and the entry point decides which.
 * `@tzslot/core` imports it statically, so a bundler includes it for every
 * visitor: 24.5 kB gzipped of the core's 25.1. `@tzslot/core/lazy` leaves it
 * out and fetches it from `loadTemporal()`, only where the runtime has none.
 * Measured, not assumed — an earlier version of this comment claimed the
 * opposite, and `npm run check:bundle` now measures it on every build.
 *
 * `/full` rather than the default entry, which knows only ISO 8601 and throws
 * on any other calendar: "Unknown calendar islamic-umalqura; might need
 * temporal-polyfill/full". A screen that displays Hijri months needs Temporal
 * to count in them, not merely Intl to name them — the grid is built from
 * month lengths and year boundaries, and those differ.
 *
 * It costs 3.8 kB gzipped over the basic entry, bundled and measured rather
 * than estimated: 19,739 bytes against 23,663. An earlier estimate here said
 * 7 kB, from adding the two calendar chunks' own gzipped sizes — which counts
 * the code they share with everything else twice.
 *
 * Every other file imports Temporal from here rather than touching the global,
 * so there is one place that decides, and one place to change when Safari ships
 * — which, measured rather than assumed, it has not: Temporal is in Technology
 * Preview 249 and nothing stable, which is why Baseline still lists it blocked.
 *
 * What this deliberately does not do is fall back to `Date` when Temporal is
 * unavailable. `Date` has no notion of an IANA time zone, so a fallback would
 * silently reintroduce the exact bug this library exists to fix — and it would
 * do it on the platform least able to tell you.
 */
/*
 * A type-only import, which is erased at build.
 *
 * The aliases below need the polyfill's shapes; nothing here needs its code.
 * Written `import type`, the entry point decides whether the implementation
 * is bundled at all — which is the whole point of `@tzslot/core/lazy`.
 */
import type { Temporal as Polyfill } from 'temporal-polyfill/full';

type TemporalNamespace = typeof Polyfill;

/**
 * The Temporal types this library hands out, named directly.
 *
 * `Temporal` is a value and a namespace at once, and a module cannot re-export
 * both under one name. Aliasing the few types that appear in the public API is
 * clearer than the alternative anyway: a consumer writes `PlainDate`, and never
 * has to know whether it came from the platform or from a polyfill.
 */
export type PlainDate = Polyfill.PlainDate;
export type PlainTime = Polyfill.PlainTime;
export type PlainDateTime = Polyfill.PlainDateTime;
export type ZonedDateTime = Polyfill.ZonedDateTime;
export type Instant = Polyfill.Instant;
export type Duration = Polyfill.Duration;
/** What can be written where a length of time is expected: { days: 7 }, { months: 3 }, 'PT1H'. */
export type DurationLike = Polyfill.DurationLike | string;

const native = (globalThis as { Temporal?: TemporalNamespace }).Temporal;

/** The implementation in force, or nothing yet on a runtime that has none. */
let current: TemporalNamespace | null = native ?? null;

/**
 * Temporal, as one object that forwards to whatever is in force.
 *
 * The first version of this was `export let Temporal`, reassigned by
 * `install()`. An ES module binding is live, so that worked — right up to the
 * one shape it cannot survive:
 *
 *     const mod = await import('@tzslot/core/lazy');
 *     const { Temporal } = mod;   // a copy of the value, not the binding
 *     await mod.loadTemporal();
 *     Temporal.PlainDate.from(…)  // still the old value: throws
 *
 * Measured, not imagined — it threw, while every other interop shape tried
 * (ESM, CJS, `require()` of the ESM build) kept working. Rather than document
 * a trap, there is nothing left to trap: this object is the same object
 * forever, so a copy of it is as good as the original, and each property read
 * asks for the current implementation.
 *
 * The cost is one proxy hop per `Temporal.X`, not per date operation — the
 * grid builds 42 days through `PlainDate.prototype.add`, which the proxy never
 * sees. Reading any property before an implementation exists throws and says
 * what to do, because `Cannot read properties of undefined (reading
 * 'PlainDate')` from three calls deep tells a reader nothing about the entry
 * point they chose or the call they skipped.
 *
 * What this costs in exchange: `Temporal` is no longer the polyfill's own
 * namespace object, so `Temporal === OtherCopyOfTemporal` is false. Nothing
 * here depends on that — the library already tests Temporal values by shape
 * rather than by class, precisely because a page can hold two copies.
 */
export const Temporal: TemporalNamespace = new Proxy({} as TemporalNamespace, {
  get(_target, property) {
    if (current === null) {
      throw new ReferenceError(
        `Temporal is not available yet. This runtime has none of its own and ` +
          `'@tzslot/core/lazy' does not bundle the polyfill — await loadTemporal() ` +
          `before using the library. (Reading Temporal.${String(property)}.)`,
      );
    }
    return (current as unknown as Record<string | symbol, unknown>)[property];
  },
  has(_target, property) {
    return current !== null && property in (current as object);
  },
  /*
   * Enumeration has to answer from the implementation too, or `Object.keys`
   * and a spread would quietly report an empty namespace. `configurable: true`
   * is what a proxy must say about a property its target does not have.
   */
  ownKeys() {
    return current === null ? [] : Reflect.ownKeys(current as object);
  },
  getOwnPropertyDescriptor(_target, property) {
    if (current === null) return undefined;
    const value = (current as unknown as Record<string | symbol, unknown>)[property];
    return value === undefined && !(property in (current as object))
      ? undefined
      : { value, writable: false, enumerable: true, configurable: true };
  },
});

/** True when the runtime brought none of its own — a diagnostic, not logic. */
export const usingPolyfill = native === undefined;

/**
 * Hands an implementation to every module that imported `Temporal`.
 *
 * The static entry calls this as it loads, so `@tzslot/core` behaves exactly
 * as it always has. A runtime with its own Temporal keeps it: a page holding
 * two implementations is a page where `instanceof` answers false between them.
 */
export function install(implementation: TemporalNamespace): void {
  if (native === undefined) current = implementation;
}

let loading: Promise<void> | null = null;

/**
 * Makes Temporal usable, fetching the polyfill only where there is none.
 *
 * Resolved immediately on Chrome 144, Edge 144 and Firefox 139 — the await
 * costs a microtask and no bytes. Elsewhere it imports the polyfill once,
 * however many times it is called: the same promise comes back, so two widgets
 * racing at startup fetch one copy.
 */
export function loadTemporal(): Promise<void> {
  if (current !== null) return Promise.resolve();
  loading ??= import('temporal-polyfill/full').then(
    (module) => {
      install(module.Temporal as unknown as TemporalNamespace);
    },
    (reason) => {
      /*
       * A failed fetch is the absence of an answer, not an answer.
       *
       * `??=` kept a rejected promise as happily as a fulfilled one, so one
       * blocked chunk — a proxy, a moment offline, a deploy that replaced the
       * hashed filenames under an open page — meant every later call returned
       * that same rejection and the page could never recover without a
       * reload. Reported by a consumer reading this; confirmed by a test that
       * counts the attempts, which saw exactly one.
       *
       * Clearing it first and rethrowing means this caller still learns the
       * load failed, and the next one tries again.
       */
      loading = null;
      throw reason;
    },
  );
  return loading;
}
