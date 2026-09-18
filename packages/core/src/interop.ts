import { Temporal } from './temporal.js';
import type { Instant, PlainDate } from './temporal.js';

/**
 * Talking to code that still uses `Date`.
 *
 * Existing applications hold `Date` in their form controls — flatpickr hands
 * one back, and so does every date library written before Temporal. Making the
 * components speak that shape is the difference between replacing a tag and
 * rewriting every screen that touches a date.
 *
 * It is an interop layer and nothing more. Inside, everything stays Temporal,
 * because `Date` cannot express the thing this library exists for: it has no
 * IANA zone, so it cannot tell you that a wall time happened twice.
 */

/** What a component hands out, and accepts back. */
export type ValueShape = 'temporal' | 'date' | 'iso';

/** Whatever a caller might reasonably pass for a calendar day. */
export type DateLike = PlainDate | Date | string;

/** Whatever a caller might reasonably pass for a moment. */
export type InstantLike = Instant | Date | string | number;

/**
 * A `Date` to a calendar day.
 *
 * This needs a time zone and there is no sensible default that is also
 * correct. A `Date` is an instant; which day it falls on depends on where you
 * are standing — 2026-01-01T00:30Z is New Year's Day in Paris and New Year's
 * Eve in New York. Guessing here would be the same class of bug the library
 * exists to prevent, so the zone is required.
 */
export function toPlainDate(value: DateLike, timeZone: string): PlainDate {
  if (value instanceof Date) {
    return Temporal.Instant.fromEpochMilliseconds(value.getTime())
      .toZonedDateTimeISO(timeZone)
      .toPlainDate();
  }
  if (typeof value === 'string') {
    // An ISO instant carries a zone offset and must be resolved through one;
    // a plain '2026-06-15' is already a calendar day and must not be.
    return /[TZ+]|\d{2}:\d{2}/.test(value)
      ? Temporal.Instant.from(value).toZonedDateTimeISO(timeZone).toPlainDate()
      : Temporal.PlainDate.from(value);
  }
  return value;
}

/** A calendar day back out, in the shape the caller asked for. */
export function fromPlainDate(date: PlainDate | null, shape: ValueShape, timeZone: string): unknown {
  if (date === null) return null;
  switch (shape) {
    case 'temporal':
      return date;
    case 'iso':
      return date.toString();
    case 'date':
      // Midnight in the given zone, which is what "that day" means to a `Date`
      // holder. Any other hour would silently move the day for readers further
      // east or west.
      return new Date(date.toZonedDateTime({ timeZone }).epochMilliseconds);
  }
}

export function toInstant(value: InstantLike): Instant {
  if (value instanceof Date) return Temporal.Instant.fromEpochMilliseconds(value.getTime());
  if (typeof value === 'number') return Temporal.Instant.fromEpochMilliseconds(value);
  if (typeof value === 'string') return Temporal.Instant.from(value);
  return value;
}

export function fromInstant(instant: Instant | null, shape: ValueShape): unknown {
  if (instant === null) return null;
  switch (shape) {
    case 'temporal':
      return instant;
    case 'iso':
      return instant.toString();
    case 'date':
      return new Date(instant.epochMilliseconds);
  }
}

/** True for the values the conversions above accept, so a guard can be written. */
export function isDateLike(value: unknown): value is DateLike {
  return (
    value instanceof Date ||
    typeof value === 'string' ||
    (typeof value === 'object' && value !== null && 'day' in value && 'month' in value)
  );
}
