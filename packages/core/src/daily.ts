import { Temporal } from './temporal.js';
import type { Instant, PlainDate, PlainTime } from './temporal.js';
import { resolve } from './slots.js';

/**
 * One day's occurrence of a daily window: "09:00 to 17:00" on one date.
 *
 * Every field that could surprise someone is here to be shown rather than
 * hidden. The window is the same on the clock every day; what it lasts is
 * not, twice a year.
 */
export interface DailyWindow {
  /** The day the window starts on. An overnight window ends on the next. */
  readonly date: PlainDate;
  readonly start: Instant;
  readonly end: Instant;
  /** What it really lasts. */
  readonly minutes: number;
  /** What the clock faces suggest — the same every day. */
  readonly wallMinutes: number;
  /** Real minus apparent: +60 the night the clocks go back, −60 when they go forward. */
  readonly shiftMinutes: number;
  /**
   * A boundary fell in the hour the clocks skipped and was moved forward by the
   * length of the gap — 02:30 becomes 03:30, what an unchanged clock would read.
   */
  readonly adjusted: boolean;
  /**
   * A boundary fell in the hour that happens twice. The start takes the first
   * reading and the end the second, so the window keeps all of that hour.
   */
  readonly ambiguous: boolean;
}

export interface DailyWindowsSummary {
  readonly windows: readonly DailyWindow[];
  /** The real total across every day. */
  readonly minutes: number;
  /** Only the days whose length or boundaries differ from the others. */
  readonly unusual: readonly DailyWindow[];
}

const minutesOf = (t: PlainTime) => t.hour * 60 + t.minute;

/**
 * Where one boundary lands on one day.
 *
 * `edge` decides the repeated hour: a start takes its first reading and an end
 * its last, so a window never loses part of the hour it was meant to cover.
 * A skipped time moves forward by the length of the gap (Temporal's 'later'):
 * 02:30 on the night the clocks go forward is read as 03:30.
 */
function place(date: PlainDate, time: PlainTime, timeZone: string, edge: 'start' | 'end') {
  const found = resolve(date, time, timeZone);
  if (found.exists) {
    const instant = edge === 'start' ? found.instants[0]! : found.instants[found.instants.length - 1]!;
    return { instant, adjusted: false, ambiguous: found.ambiguous };
  }
  const moved = date.toPlainDateTime(time).toZonedDateTime(timeZone, { disambiguation: 'later' });
  return { instant: moved.toInstant(), adjusted: true, ambiguous: false };
}

/**
 * Every occurrence of a daily window over a range of days, in one zone.
 *
 * `to` at or before `from` means the window runs overnight and ends the next
 * day: 22:00 to 06:00 is a night shift, and 08:00 to 08:00 a full day.
 *
 * Each occurrence is measured on its own, because the whole point is that
 * they differ: a night shift from 22:00 to 06:00 is eight hours, except on
 * the night the clocks go back, when it is nine.
 */
export function getDailyWindows(
  start: PlainDate | string,
  end: PlainDate | string,
  from: PlainTime | string,
  to: PlainTime | string,
  timeZone: string,
): DailyWindowsSummary {
  const first = typeof start === 'string' ? Temporal.PlainDate.from(start) : start;
  const last = typeof end === 'string' ? Temporal.PlainDate.from(end) : end;
  const opens = typeof from === 'string' ? Temporal.PlainTime.from(from) : from;
  const closes = typeof to === 'string' ? Temporal.PlainTime.from(to) : to;

  if (Temporal.PlainDate.compare(last, first) < 0) {
    throw new RangeError(`end (${last}) is before start (${first})`);
  }

  const overnight = minutesOf(closes) <= minutesOf(opens);
  const wallMinutes = minutesOf(closes) - minutesOf(opens) + (overnight ? 1440 : 0);

  const windows: DailyWindow[] = [];
  for (let day = first; Temporal.PlainDate.compare(day, last) <= 0; day = day.add({ days: 1 })) {
    const a = place(day, opens, timeZone, 'start');
    const b = place(overnight ? day.add({ days: 1 }) : day, closes, timeZone, 'end');
    const minutes = Math.round(a.instant.until(b.instant).total({ unit: 'minute' }));
    windows.push({
      date: day,
      start: a.instant,
      end: b.instant,
      minutes,
      wallMinutes,
      shiftMinutes: minutes - wallMinutes,
      adjusted: a.adjusted || b.adjusted,
      ambiguous: a.ambiguous || b.ambiguous,
    });
  }

  return {
    windows,
    minutes: windows.reduce((sum, w) => sum + w.minutes, 0),
    unusual: windows.filter((w) => w.shiftMinutes !== 0 || w.adjusted || w.ambiguous),
  };
}
