import { Temporal } from './temporal.js';
import type { Duration, Instant, PlainDateTime } from './temporal.js';

/**
 * What an interval really costs, as against what it looks like.
 *
 * Read off a clock, 02:00 to 08:00 is six hours. On the morning a zone puts its
 * clocks back it is seven, and on the morning it puts them forward it is five.
 * Payroll, invoicing and rostering all get this wrong twice a year, and they
 * get it wrong silently — nothing in the numbers looks unusual afterwards.
 */
export interface RangeInfo {
  /** Elapsed time, the kind a stopwatch would measure. */
  readonly duration: Duration;

  /** The same interval in whole minutes, for arithmetic that has to be simple. */
  readonly minutes: number;

  /**
   * What the clock faces suggest: end wall time minus start wall time, as if
   * every day had twenty-four hours. This is the number a person expects.
   */
  readonly wallMinutes: number;

  /**
   * True when the two disagree — the interval crosses a change of offset. When
   * this is set, showing `wallMinutes` to a user is showing them a wrong number.
   */
  readonly crossesTransition: boolean;

  /**
   * Signed difference in minutes, real minus apparent. Positive when the clocks
   * went back and the interval is longer than it looks; negative when they went
   * forward and it is shorter.
   */
  readonly shiftMinutes: number;

  /** The offsets at each end, which is what makes the shift visible. */
  readonly startOffset: string;
  readonly endOffset: string;
}

export interface RangeProblem {
  readonly kind: 'end-before-start';
}

/**
 * Measures an interval in a zone, and says whether its apparent length lies.
 *
 * Both ends are instants, deliberately. A range whose ends are wall times is a
 * range whose length cannot be computed without also knowing which reading of
 * each end was meant — and on the morning the clocks go back, "02:30" has two.
 */
export function getRangeInfo(
  start: Instant,
  end: Instant,
  timeZone: string,
): RangeInfo | RangeProblem {
  if (Temporal.Instant.compare(end, start) < 0) {
    return { kind: 'end-before-start' };
  }

  const from = start.toZonedDateTimeISO(timeZone);
  const to = end.toZonedDateTimeISO(timeZone);

  const duration = from.until(to, { largestUnit: 'hour' });
  const minutes = Math.round(duration.total({ unit: 'minute' }));

  // The apparent length: the same two clock faces, measured as if the day were
  // always twenty-four hours long. PlainDateTime has no zone, so no transition
  // can affect it — which is exactly what makes it the right comparison.
  const wallMinutes = Math.round(
    (from.toPlainDateTime() as PlainDateTime)
      .until(to.toPlainDateTime(), { largestUnit: 'hour' })
      .total({ unit: 'minute' }),
  );

  return {
    duration,
    minutes,
    wallMinutes,
    crossesTransition: minutes !== wallMinutes,
    shiftMinutes: minutes - wallMinutes,
    startOffset: from.offset,
    endOffset: to.offset,
  };
}

/** Narrows the result of getRangeInfo. */
export function isRangeProblem(result: RangeInfo | RangeProblem): result is RangeProblem {
  return 'kind' in result;
}

/**
 * One number and its unit, written for a reader of that language.
 *
 * Built per call rather than cached: a formatter is cheap beside the three
 * `Intl` objects a panel already builds on every paint, and caching them by
 * locale is a map that never empties on a page that switches language.
 */
const inWords = (value: number, unit: 'day' | 'hour' | 'minute', locale: string): string =>
  new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short' }).format(value);

/**
 * Formats a duration the way a person writes one: `7h 30m`, `45m`, `2d 3h`.
 *
 * Given a `locale`, the way a person writes one *in that language*: `7 j`,
 * `30 min`, `يومان`. Without one, the compact ASCII form, which is what a log
 * line and a test want and what every existing caller already gets.
 *
 * This had no `locale` at all, and said so: "a caller with a locale should use
 * Intl's DurationFormat". That advice pointed at an API no engine ships yet —
 * `Intl.DurationFormat` is undefined in Node 22 and absent from the polyfill —
 * so every caller used the ASCII form, the widgets included. A field in
 * `ar-SA` read `يومان · 2h 30m`: the Arabic dual, which this library computes
 * with `Intl.PluralRules`, sitting beside two Latin abbreviations. One line,
 * two scripts, two directions. Reported by a consumer who had it on screen in
 * French as `1d · Africa/Algiers`, and whose own user had looked past it while
 * reporting three other things about that very screen.
 *
 * What a language buys, measured rather than assumed:
 *
 *     fr-FR   1 j | 2 j | 3 j | 11 j
 *     ar-SA   يوم | يومان | ٣ أيام | ١١ يومًا
 *
 * Six plural categories, the dual among them, out of `unitDisplay: 'short'`.
 * That is why this takes a language and not a table of suffixes: a table maps
 * `d → j` correctly and reinstates in Arabic the exact defect `arabicDays`
 * exists to avoid, since `يومان` already carries its own count and "2" in
 * front of it says "two two-days". The suggestion is the reporting consumer's,
 * and it is better than either option this file had — it also leaves
 * `@tzslot/core` with no words of its own, which was the constraint that made
 * the defect possible in the first place.
 *
 * `unitDisplay: 'narrow'` is not used: in Arabic it gives `٧ ي`, abbreviations
 * with no plural morphology, and the morphology is the whole point.
 */
export function formatDuration(
  duration: Duration,
  { days: inDays = true, locale }: { days?: boolean; locale?: string | undefined } = {},
): string {
  const signed = Math.round(duration.total({ unit: 'minute' }));
  // Signed once, at the front. Carrying the sign into every part gave
  // "-1d 22h -30m" for minus ninety minutes: three numbers, two of them
  // wrong, and no reading of it that means anything.
  const total = Math.abs(signed);
  // Forty hours of work is "40h", not "1d 16h": days are optional.
  const days = inDays ? Math.floor(total / 1440) : 0;
  const hours = Math.floor((total - days * 1440) / 60);
  const minutes = total % 60;

  const parts: string[] = [];
  if (days) parts.push(locale ? inWords(days, 'day', locale) : `${days}d`);
  if (hours) parts.push(locale ? inWords(hours, 'hour', locale) : `${hours}h`);
  if (minutes || parts.length === 0)
    parts.push(locale ? inWords(minutes, 'minute', locale) : `${minutes}m`);
  return (signed < 0 ? '-' : '') + parts.join(' ');
}
