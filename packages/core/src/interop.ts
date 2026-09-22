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
export type ValueShape = 'temporal' | 'date' | 'iso' | 'utc';

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
    // Three shapes, and they are not interchangeable.
    //
    // '2026-06-15T10:00Z' or '…+02:00' is an instant: which day it falls on
    // depends on where you stand, so it is resolved through the zone.
    // '2026-06-15T10:00' is a wall time with no zone at all — what a Java or
    // .NET back end sends, and what a datetime-local input holds — and its
    // day is written in it. Sending that through Instant.from threw.
    // '2026-06-15' is already a calendar day.
    if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(value)) {
      return Temporal.Instant.from(value).toZonedDateTimeISO(timeZone).toPlainDate();
    }
    if (value.includes('T')) return Temporal.PlainDateTime.from(value).toPlainDate();
    return Temporal.PlainDate.from(value);
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
    case 'utc':
      // The same midnight, written as the instant it is: 2026-09-14 in Paris
      // leaves as 2026-09-13T22:00:00Z. A back end that stores instants gets
      // one from a date-only widget too, and never has to guess a zone.
      return date.toZonedDateTime({ timeZone }).toInstant().toString();
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
    case 'utc':
      // Instant.toString() is already UTC and already ends in Z.
      return instant.toString();
  }
}

/** True for the values the conversions above accept, so a guard can be written. */
export function isDateLike(value: unknown): value is DateLike {
  if (value instanceof Date) return true;
  // A string only when it reads as a date. It used to say yes to 'hello',
  // which makes a guard that guards nothing — the caller finds out at the
  // throw instead.
  if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(value.trim());
  return typeof value === 'object' && value !== null && 'day' in value && 'month' in value && 'year' in value;
}
