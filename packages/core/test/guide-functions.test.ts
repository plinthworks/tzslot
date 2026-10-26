import { describe, it, expect } from 'vitest';
import {
  Temporal,
  resolveWallTime,
  getRangeInfo,
  isRangeProblem,
  formatDuration,
  parseDuration,
  getDailyWindows,
  presetRange,
  matchesPreset,
  presetMoments,
  isSubDayPreset,
  SUB_DAY_PRESETS,
  shiftDate,
  shiftInstant,
  shiftDayRange,
  snapTime,
  asShiftStep,
  toPlainDate,
  isDateLike,
  getMonthGrid,
  inMonth,
  getWeekdayOrder,
  firstDayFor,
  getDecadeYears,
  isOutsideDecade,
} from '../src/index.js';
import { plain } from './plain.js';

/**
 * Every value the functions guide claims, asserted.
 *
 * `npm run docs:code` proves the examples on that page compile. It cannot
 * prove the comment beside a line is true, and a compiled example with a wrong
 * comment is precisely the defect 2.1.0 shipped: a guide section asserting the
 * opposite of what the field did, for two commits, reading perfectly well.
 *
 * Writing the page produced three of those in one sitting, all caught here
 * rather than by a reader:
 *
 *   - `getRangeInfo` was given 21:00Z–05:00Z and told to answer 540 minutes.
 *     Those instants are 23:00–06:00 in Paris: 480 elapsed, not 540. The
 *     example now uses 06:00Z, which really is 07:00 there.
 *   - `parseDuration('1h 30m')` and `('PT1H30M')` were documented as working.
 *     Both return null — it takes one number and one unit, and its own comment
 *     in `shift.ts` says so. I had not read it.
 *   - `toPlainDate` was shown taking an `Instant`. `DateLike` is a PlainDate,
 *     a Date or a string; that one the compiler caught.
 *
 * So the page's numbers live here too. If a release changes one of these, this
 * fails and names which sentence to go and rewrite.
 */

const paris = 'Europe/Paris';

describe('the functions guide: one wall time, resolved', () => {
  it('02:30 on the morning the clocks go back happens twice', () => {
    const reading = resolveWallTime(
      Temporal.PlainDate.from('2026-10-25'),
      Temporal.PlainTime.from('02:30'),
      paris,
    );
    expect(reading.exists).toBe(true);
    expect(reading.ambiguous).toBe(true);
    expect(reading.offsets).toEqual(['+02:00', '+01:00']);
    expect(reading.instants).toHaveLength(2);
  });
});

describe('the functions guide: how long a period really is', () => {
  it('a night shift across the change is nine hours, not eight', () => {
    const info = getRangeInfo(
      Temporal.Instant.from('2026-10-24T21:00Z'),
      Temporal.Instant.from('2026-10-25T06:00Z'),
      paris,
    );
    expect(isRangeProblem(info)).toBe(false);
    if (isRangeProblem(info)) return;
    expect(info.minutes).toBe(540);
    expect(info.wallMinutes).toBe(480);
    expect(info.crossesTransition).toBe(true);
    expect(info.shiftMinutes).toBe(60);
    expect(info.startOffset).toBe('+02:00');
    expect(info.endOffset).toBe('+01:00');
    expect(formatDuration(info.duration, { locale: 'en-GB' })).toBe('9 hrs');
  });

  it('an end before its start is a problem, not a negative length', () => {
    const backwards = getRangeInfo(
      Temporal.Instant.from('2026-10-25T06:00Z'),
      Temporal.Instant.from('2026-10-24T21:00Z'),
      paris,
    );
    expect(isRangeProblem(backwards)).toBe(true);
    if (isRangeProblem(backwards)) expect(backwards.kind).toBe('end-before-start');
  });

  it('writes a length in the reader s language, or compactly in none', () => {
    const week = Temporal.Duration.from({ days: 7, hours: 2, minutes: 30 });
    expect(formatDuration(week)).toBe('7d 2h 30m');
    /*
     * Compared through `plain`, which writes every kind of space as a plain
     * one. `Intl` separates a number from its unit with U+202F in French, and
     * not everywhere: `30 min` takes an ordinary space where `7 j` does not. A
     * first version of this line escaped them by hand, then held the real
     * characters, and failed against a string that looked identical to it.
     * Spacing is `Intl`'s business; what this asserts is the words.
     */
    expect(plain(formatDuration(week, { locale: 'fr-FR' }))).toBe('7 j 2 h 30 min');
    expect(formatDuration(week, { locale: 'ar-SA' })).toBe('٧ أيام ٢ س ٣٠ د');
    expect(formatDuration(week, { days: false })).toBe('170h 30m');
  });

  it('reads one number and one unit back, and nothing else', () => {
    const minutes = (text: string) => parseDuration(text)?.total({ unit: 'minute' }) ?? null;
    expect(minutes('90m')).toBe(90);
    expect(minutes('90')).toBe(90);
    expect(minutes('25mn')).toBe(25);
    expect(minutes('3h')).toBe(180);
    expect(parseDuration('2w')?.toString()).toBe('P2W');
    expect(parseDuration('6mo')?.toString()).toBe('P6M');
    expect(parseDuration('1h 30m')).toBeNull();
    expect(parseDuration('PT1H30M')).toBeNull();
    expect(parseDuration('soon')).toBeNull();
  });
});

describe('the functions guide: the same hours every day', () => {
  it('names the night that is an hour longer', () => {
    const rota = getDailyWindows('2026-10-22', '2026-10-27', '23:00', '07:00', paris);
    expect(rota.windows).toHaveLength(6);
    expect(rota.minutes).toBe(2940);
    expect(rota.unusual).toHaveLength(1);
    expect(rota.unusual[0]?.minutes).toBe(540);
  });
});

describe('the functions guide: named ranges without a widget', () => {
  const today = Temporal.PlainDate.from('2026-10-26');

  it('the last seven days, and the shortcut that describes them', () => {
    const last7 = presetRange('last7Days', { today, firstDayOfWeek: 1 });
    expect(last7.start.toString()).toBe('2026-10-20');
    expect(last7.end.toString()).toBe('2026-10-26');
    expect(matchesPreset('last7Days', last7, { today, firstDayOfWeek: 1 })).toBe(true);
  });

  it('the four that are shorter than a day are two moments', () => {
    expect(SUB_DAY_PRESETS).toEqual(['thisQuarterHour', 'lastHour', 'thisHour', 'nextHour']);
    expect(isSubDayPreset('thisHour')).toBe(true);
    expect(isSubDayPreset('last7Days')).toBe(false);

    const hour = presetMoments('thisHour', {
      now: Temporal.Instant.from('2026-10-26T11:07:00Z'),
      timeZone: paris,
    });
    expect(hour.start.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('12:00:00');
    expect(hour.end.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('13:00:00');
  });
});

describe('the functions guide: moving by a step', () => {
  it('a month from the 31st is the 30th, not 31 days later', () => {
    expect(shiftDate(Temporal.PlainDate.from('2026-10-31'), { months: 1 }, 1).toString()).toBe(
      '2026-11-30',
    );
  });

  it('a day later on the clock, which is 25 hours once a year', () => {
    const from = Temporal.Instant.from('2026-10-24T21:00Z');
    const to = shiftInstant(from, { days: 1 }, 1, paris);
    expect(to.toString()).toBe('2026-10-25T22:00:00Z');
    expect(from.until(to).total({ unit: 'hour' })).toBe(25);
  });

  it('a week back moves both ends together', () => {
    const before = shiftDayRange(
      {
        start: Temporal.PlainDate.from('2026-10-19'),
        end: Temporal.PlainDate.from('2026-10-25'),
      },
      { days: 7 },
      -1,
    );
    expect(before.start.toString()).toBe('2026-10-12');
    expect(before.end.toString()).toBe('2026-10-18');
  });

  it('snaps a typed time to the grid, and reads the shorthand', () => {
    expect(snapTime(Temporal.PlainTime.from('09:07'), 15).toString()).toBe('09:00:00');
    expect(snapTime(Temporal.PlainTime.from('09:08'), 15).toString()).toBe('09:15:00');
    expect(asShiftStep(60)).toEqual({ minutes: 60 });
    expect(asShiftStep({ days: 1 })).toEqual({ days: 1 });
  });
});

describe('the functions guide: values in and out', () => {
  it('a Date is a day only once somewhere reads it', () => {
    expect(toPlainDate('2026-10-26', paris).toString()).toBe('2026-10-26');
    expect(toPlainDate(new Date('2026-10-25T23:30Z'), paris).toString()).toBe('2026-10-26');
    expect(isDateLike('2026-10-26')).toBe(true);
    expect(isDateLike(new Date())).toBe(true);
    expect(isDateLike('tomorrow')).toBe(false);
  });
});

describe('the functions guide: building a grid yourself', () => {
  it('six rows always, and the days around the month', () => {
    const weeks = getMonthGrid(2026, 10, firstDayFor('en-GB'));
    expect(weeks).toHaveLength(6);
    expect(weeks[0]![0]!.toString()).toBe('2026-09-28');
    expect(inMonth(weeks[0]![0]!, 2026, 10)).toBe(false);
  });

  it('the week starts where the locale says', () => {
    expect(getWeekdayOrder(firstDayFor('en-GB'))).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(getWeekdayOrder(firstDayFor('en-US'))).toEqual([7, 1, 2, 3, 4, 5, 6]);
  });

  it('a decade is shown with a year either side', () => {
    expect(getDecadeYears(2026)).toHaveLength(12);
    expect(isOutsideDecade(2019, 2026)).toBe(true);
    expect(isOutsideDecade(2026, 2026)).toBe(false);
  });

  it('and a Hijri month is a Hijri month', () => {
    const ramadan = getMonthGrid(1448, 9, 7, 'islamic-umalqura');
    expect(ramadan).toHaveLength(6);
    expect(inMonth(ramadan[1]![0]!, 1448, 9, 'islamic-umalqura')).toBe(true);
  });
});
