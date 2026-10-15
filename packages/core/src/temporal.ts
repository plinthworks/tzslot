/**
 * Where Temporal comes from.
 *
 * Native on Chrome, Firefox and Edge; absent from Safari and from Node before
 * it ships. The native one is used whenever it exists, but the polyfill is a
 * static import: a bundler includes it for every visitor, about 23 kB gzipped
 * of the core's 24. Measured, not assumed — an earlier version of this comment
 * claimed the opposite.
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
 * so there is one place that decides, and one place to change when Safari ships.
 *
 * What this deliberately does not do is fall back to `Date` when Temporal is
 * unavailable. `Date` has no notion of an IANA time zone, so a fallback would
 * silently reintroduce the exact bug this library exists to fix — and it would
 * do it on the platform least able to tell you.
 */
import { Temporal as Polyfill } from 'temporal-polyfill/full';

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

const globalTemporal = (globalThis as { Temporal?: TemporalNamespace }).Temporal;

export const Temporal: TemporalNamespace = globalTemporal ?? Polyfill;

/** True when the runtime brought its own — useful for a diagnostic, not for logic. */
export const usingPolyfill = globalTemporal === undefined;
