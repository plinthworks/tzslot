import { Temporal } from './temporal.js';
import type { DurationLike, Instant, PlainDate } from './temporal.js';
import type { DayRange } from './presets.js';

/**
 * Moving a selection by one notch.
 *
 * A filter screen is read by stepping: this quarter, the one before, the one
 * before that. Doing it with the calendar is four clicks; doing it with an
 * arrow is one. What an arrow moves by is the only real question, and there
 * are two honest answers — the length of what is already selected, or a
 * length the screen imposes.
 */
export type ShiftStep = 'auto' | DurationLike;

/** Whole months in a span, when it is made of whole months; 0 when it is not. */
function wholeMonths({ start, end }: DayRange): number {
  const lastOfMonth = end.day === end.daysInMonth;
  if (start.day !== 1 || !lastOfMonth) return 0;
  return (end.year - start.year) * 12 + (end.month - start.month) + 1;
}

/**
 * The same range, one notch away.
 *
 * `'auto'` moves by what is selected, and that is not the same as moving by
 * its length in days. The third quarter of 2026 is 92 days long; stepping
 * back 92 days from 1 July lands on 31 March, and the user who asked for the
 * previous quarter gets a range that starts one day early and drifts further
 * every time they press the arrow. So a span made of whole months moves by
 * months — which is what a quarter, a month and a year all are — and anything
 * else moves by its length in days, where the drift cannot happen.
 */
export function shiftDayRange(range: DayRange, step: ShiftStep, direction: 1 | -1): DayRange {
  if (step !== 'auto') {
    const by = Temporal.Duration.from(step);
    const moved = direction === 1 ? by : by.negated();
    return { start: range.start.add(moved), end: range.end.add(moved) };
  }
  const months = wholeMonths(range);
  if (months > 0) {
    const start = range.start.add({ months: direction * months });
    // Recomputed rather than moved, so a 31-day month followed by a 30-day one
    // still ends on its own last day.
    return { start, end: start.add({ months }).subtract({ days: 1 }) };
  }
  const days = range.start.until(range.end).days + 1;
  const by = { days: direction * days };
  return { start: range.start.add(by), end: range.end.add(by) };
}

/**
 * The same moment, one notch away, in a zone.
 *
 * Going through the zone is the whole point: a day is not always 24 hours,
 * and adding 24 to an instant on the night the clocks move lands an hour off
 * the same wall time. Hours are added as hours — asking for 'one hour later'
 * on that night is asking for an hour of real time, not for the clock face to
 * read one higher.
 */
export function shiftInstant(
  instant: Instant,
  step: DurationLike,
  direction: 1 | -1,
  timeZone: string,
): Instant {
  const by = Temporal.Duration.from(step);
  const moved = direction === 1 ? by : by.negated();
  return instant.toZonedDateTimeISO(timeZone).add(moved).toInstant();
}

/** A day, one notch away — the same rules, for a single date. */
export function shiftDate(date: PlainDate, step: DurationLike, direction: 1 | -1): PlainDate {
  const by = Temporal.Duration.from(step);
  return date.add(direction === 1 ? by : by.negated());
}
