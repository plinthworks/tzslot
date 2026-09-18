/**
 * Where Temporal comes from.
 *
 * Native on Chrome, Firefox and Edge; absent from Safari and from Node before
 * it ships. The polyfill is loaded only when the global is missing, so a modern
 * browser pays nothing for it — 19 kB gzipped that most visitors never fetch.
 *
 * Every other file imports Temporal from here rather than touching the global,
 * so there is one place that decides, and one place to change when Safari ships.
 *
 * What this deliberately does not do is fall back to `Date` when Temporal is
 * unavailable. `Date` has no notion of an IANA time zone, so a fallback would
 * silently reintroduce the exact bug this library exists to fix — and it would
 * do it on the platform least able to tell you.
 */
import { Temporal as Polyfill } from 'temporal-polyfill';

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

const globalTemporal = (globalThis as { Temporal?: TemporalNamespace }).Temporal;

export const Temporal: TemporalNamespace = globalTemporal ?? Polyfill;

/** True when the runtime brought its own — useful for a diagnostic, not for logic. */
export const usingPolyfill = globalTemporal === undefined;
