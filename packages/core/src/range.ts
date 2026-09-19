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
 * Formats a duration the way a person writes one: `7h 30m`, `45m`, `2d 3h`.
 *
 * Not localised on purpose — a caller with a locale should use Intl's
 * DurationFormat and the `duration` field. This is the version that has to work
 * in a log line and a unit test.
 */
export function formatDuration(
  duration: Duration,
  { days: inDays = true }: { days?: boolean } = {},
): string {
  const total = Math.round(duration.total({ unit: 'minute' }));
  // Forty hours of work is "40h", not "1d 16h": days are optional.
  const days = inDays ? Math.floor(total / 1440) : 0;
  const hours = Math.floor((total - days * 1440) / 60);
  const minutes = total % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}
