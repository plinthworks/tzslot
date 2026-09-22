import { Temporal } from './temporal.js';
import type { Duration, DurationLike, Instant, PlainDate, PlainTime } from './temporal.js';
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
export type ShiftStep = number | DurationLike;

/**
 * A step two dates can actually move by: years, months, weeks, days.
 *
 * `ShiftStep` is what a *field* takes, and a field can hold a time. A pair of
 * dates cannot, so `shiftDayRange` asks for this narrower thing rather than
 * accepting a quarter of an hour and returning the same two days.
 */
export interface DayStep {
  readonly years?: number;
  readonly months?: number;
  readonly weeks?: number;
  readonly days?: number;
}

/**
 * A step as Temporal can add it.
 *
 * A plain number is minutes, which is the shape most screens want: `15` is a
 * quarter of an hour, `60` an hour, `1440` a day. Seconds are not offered —
 * an arrow that moves a booking by a second is an arrow nobody presses — and
 * anything a number cannot say is said in full: `{ months: 1, hours: 1,
 * minutes: 45 }`, or the short form `'45mn'`.
 */
export function asShiftStep(step: ShiftStep): DurationLike {
  return typeof step === 'number' ? { minutes: step } : step;
}

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


/** Whole months from the first to the last, or 0 when the range is not that. */
function wholeMonths({ start, end }: DayRange): number {
  const lastOfMonth = end.day === end.daysInMonth;
  if (start.day !== 1 || !lastOfMonth) return 0;
  return (end.year - start.year) * 12 + (end.month - start.month) + 1;
}

/**
 * The same range, one notch away.
 *
 * The step is a duration and nothing else — `{ days: 1 }`, `{ hours: 1 }`,
 * `{ months: 1, hours: 1, minutes: 45 }` — and it is added as written.
 *
 * With one exception, and it is arithmetic rather than taste: a range of whole
 * months moved by whole months has its end recomputed from its new start.
 * Added to both ends, three months from 1 July – 30 September gives 1 October
 * – 30 December, and the fourth quarter ends on the 31st. Months do not all
 * have the same length, so the last day has to be asked for rather than
 * carried along.
 */
export function shiftDayRange(range: DayRange, step: DayStep, direction: 1 | -1): DayRange {
  const by = Temporal.Duration.from(step);
  // Dates cannot hold an hour, and PlainDate.add does not say so: it truncates
  // and returns the same day. A caller who asks to move two dates by fifteen
  // minutes has made a mistake, and hearing about it is better than watching
  // the arrow do nothing.
  if (by.hours || by.minutes || by.seconds || by.milliseconds || by.microseconds || by.nanoseconds) {
    throw new RangeError(`a range of days cannot move by ${by.toString()}: it has a time part`);
  }
  const months = wholeMonths(range);
  const inMonths = by.years * 12 + by.months;
  if (months > 0 && inMonths > 0 && by.weeks === 0 && by.days === 0) {
    const start = range.start.add({ months: direction * inMonths });
    return { start, end: start.add({ months }).subtract({ days: 1 }) };
  }
  const moved = direction === 1 ? by : by.negated();
  return { start: range.start.add(moved), end: range.end.add(moved) };
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

/**
 * A clock face moved to the nearest mark of a grid.
 *
 * A field that takes fifteen-minute appointments and accepts 10:07 has two
 * truths about the same booking: what the reader typed and what the system
 * will honour. Snapping settles it at the moment of typing, where the reader
 * can still see it happen.
 *
 * Ties go up — 10:07:30 becomes 10:15 — because the alternative is a rule
 * nobody can predict at the one minute it matters.
 */
export function snapTime(time: PlainTime, minutes: number): PlainTime {
  if (!Number.isFinite(minutes) || minutes <= 1) return time;
  const total = time.hour * 60 + time.minute + (time.second >= 30 ? 1 : 0);
  const snapped = Math.round(total / minutes) * minutes;
  // Round past the end of the day and the answer is tomorrow; the last mark
  // of this one is the honest one.
  const capped = Math.min(snapped, Math.floor((24 * 60 - 1) / minutes) * minutes);
  return Temporal.PlainTime.from({ hour: Math.floor(capped / 60), minute: capped % 60 });
}
