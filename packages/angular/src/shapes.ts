import { toInstant, fromInstant } from '@tzslot/core';
import type { Instant, InstantLike, ValueShape } from '@tzslot/core';

/**
 * A period, as a form holds it.
 *
 * The single-value components have spoken `valueAs` since the beginning; the
 * ones holding two moments did not, so `provideTzslot({ valueAs: 'utc' })`
 * gave ISO strings from one tag and Temporal objects from the one beside it.
 * Worse, their `writeValue` was typed as if a form could only ever contain
 * the library's own objects, and threw on the ISO string a real back end
 * sends.
 */
export interface MomentPair<T> {
  readonly start: T | null;
  readonly end: T | null;
}

/** Whatever the form holds, as two moments. */
export function pairIn(value: unknown): MomentPair<Instant> {
  if (value === null || value === undefined) return { start: null, end: null };
  const given = value as { start?: unknown; end?: unknown };
  const one = (at: unknown): Instant | null =>
    at === null || at === undefined ? null : toInstant(at as InstantLike);
  return { start: one(given.start), end: one(given.end) };
}

/** And back out, in the shape the application asked for. */
export function pairOut<Extra extends object>(
  pair: MomentPair<Instant>,
  shape: ValueShape,
  extra: Extra,
): Extra & { start: unknown; end: unknown } {
  return {
    ...extra,
    start: fromInstant(pair.start, shape),
    end: fromInstant(pair.end, shape),
  };
}
