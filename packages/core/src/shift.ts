import { Temporal } from './temporal.js';
import type { Duration, DurationLike, Instant, PlainDate } from './temporal.js';
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

/**
 * One entry of a menu of steps, when the screen lets the reader choose.
 *
 * The label is given rather than derived: only the application knows whether
 * its users read "15 min", "quarter hour" or "un quart d'heure", and a
 * machine-made label would be wrong in some language on some screen.
 */
export interface ShiftOption {
  readonly step: ShiftStep;
  readonly label: string;
}

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

/**
 * A length of time written the short way: `25mn`, `1h`, `3d`, `2w`, `6mo`.
 *
 * Filter screens are used all day by people who know what they want before
 * the panel opens, and a list of shortcuts cannot hold every length anyone
 * might need. Typing one is faster than any list — as long as what may be
 * typed is small enough to remember, which is why this takes units and not a
 * sentence.
 *
 * Accepted: mn, min, m (minutes) · h (hours) · d, j (days) · w, s (weeks) ·
 * mo (months). Case is ignored, and a space before the unit is allowed. A
 * bare number is read as minutes, because that is what the short forms are
 * mostly used for. `m` is minutes, never months: `mo` says months, and the
 * ambiguity between the two is the reason the short one is spelled out.
 */
export function parseDuration(text: string): Duration | null {
  const match = /^\s*(\d+)\s*(mn|min|mo|[mhdjws])?\s*$/i.exec(text);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  switch ((match[2] ?? 'mn').toLowerCase()) {
    case 'mn':
    case 'min':
    case 'm':
      return Temporal.Duration.from({ minutes: amount });
    case 'h':
      return Temporal.Duration.from({ hours: amount });
    case 'd':
    case 'j':
      return Temporal.Duration.from({ days: amount });
    case 'w':
    case 's':
      return Temporal.Duration.from({ weeks: amount });
    case 'mo':
      return Temporal.Duration.from({ months: amount });
    default:
      return null;
  }
}
