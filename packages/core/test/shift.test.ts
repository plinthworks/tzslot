import { describe, it, expect } from 'vitest';
import {
  Temporal,
  presetRange,
  presetMoments,
  presetStep,
  shiftDayRange,
  shiftInstant,
  shiftDate,
  parseDuration,
  snapTime,
} from '../src/index.js';
import type { Instant, PlainDate } from '../src/index.js';

const day = (iso: string) => Temporal.PlainDate.from(iso);
const today = day('2026-09-21');
const span = (r: { start: PlainDate; end: PlainDate }) =>
  `${r.start.toString()}…${r.end.toString()}`;

describe('quarters', () => {
  it('are counted from January, whichever month we are in', () => {
    expect(span(presetRange('thisQuarter', { today }))).toBe('2026-07-01…2026-09-30');
    expect(span(presetRange('lastQuarter', { today }))).toBe('2026-04-01…2026-06-30');
    expect(span(presetRange('nextQuarter', { today }))).toBe('2026-10-01…2026-12-31');
  });

  it('cross the year at both ends', () => {
    expect(span(presetRange('lastQuarter', { today: day('2026-02-10') }))).toBe('2025-10-01…2025-12-31');
    expect(span(presetRange('nextQuarter', { today: day('2026-11-30') }))).toBe('2027-01-01…2027-03-31');
  });

  it('and the days ahead are counted like the days behind — today included', () => {
    expect(span(presetRange('next7Days', { today }))).toBe('2026-09-21…2026-09-27');
    expect(span(presetRange('next30Days', { today }))).toBe('2026-09-21…2026-10-20');
  });
});

describe('an arrow that moves what is selected', () => {
  it('moves a quarter by a quarter, not by its length in days', () => {
    const q3 = presetRange('thisQuarter', { today });
    // 92 days back from 1 July is 31 March: the naive answer, and the wrong one.
    expect(span(shiftDayRange(q3, 'auto', -1))).toBe('2026-04-01…2026-06-30');
    expect(span(shiftDayRange(q3, 'auto', 1))).toBe('2026-10-01…2026-12-31');
  });

  it('keeps a month on its own last day, however long it is', () => {
    const feb = { start: day('2026-02-01'), end: day('2026-02-28') };
    expect(span(shiftDayRange(feb, 'auto', -1))).toBe('2026-01-01…2026-01-31');
    expect(span(shiftDayRange(feb, 'auto', 1))).toBe('2026-03-01…2026-03-31');
  });

  it('moves anything else by its own length, so nothing drifts', () => {
    const week = presetRange('last7Days', { today }); // 15–21 September
    const back = shiftDayRange(week, 'auto', -1);
    expect(span(back)).toBe('2026-09-08…2026-09-14');
    expect(span(shiftDayRange(back, 'auto', 1))).toBe(span(week)); // and back again
  });

  it('takes an imposed step when the screen has one', () => {
    const week = presetRange('last7Days', { today });
    expect(span(shiftDayRange(week, { months: 1 }, -1))).toBe('2026-08-15…2026-08-21');
    expect(shiftDate(day('2026-09-21'), { days: 1 }, 1).toString()).toBe('2026-09-22');
  });
});

describe('an arrow that moves a moment', () => {
  const paris = 'Europe/Paris';

  it('adds an hour of real time, even on the night an hour repeats', () => {
    // 25 October 2026, 02:00 happens twice in Paris. An hour after the first
    // 02:30 is the second 02:30, not 03:30.
    const first = Temporal.Instant.from('2026-10-25T00:30:00Z');
    expect(shiftInstant(first, { hours: 1 }, 1, paris).toString()).toBe('2026-10-25T01:30:00Z');
    expect(shiftInstant(first, { hours: 1 }, 1, paris).toZonedDateTimeISO(paris).hour).toBe(2);
  });

  it('adds a day as the clock reads it, not as 24 hours', () => {
    // The day the clocks go back is 25 hours long; the same wall time next day
    // is 25 hours away, and that is what a user asking for "tomorrow" means.
    const at = Temporal.Instant.from('2026-10-24T13:00:00Z'); // 15:00 in Paris
    const next = shiftInstant(at, { days: 1 }, 1, paris);
    expect(next.toZonedDateTimeISO(paris).hour).toBe(15);
    expect(next.epochMilliseconds - at.epochMilliseconds).toBe(25 * 3600_000);
  });
});

describe('the named ranges shorter than a day', () => {
  const paris = 'Europe/Paris';
  const at = (iso: string) => Temporal.Instant.from(iso);
  const clock = (instant: Instant) =>
    instant.toZonedDateTimeISO(paris).toPlainTime().toString({ smallestUnit: 'minute' });

  it('the quarter hour that is running, not the next one', () => {
    const now = at('2026-09-21T09:07:32Z'); // 11:07:32 in Paris
    const { start, end } = presetMoments('thisQuarterHour', { now, timeZone: paris });
    expect([clock(start), clock(end)]).toEqual(['11:00', '11:15']);
  });

  it('and again at the far end of a quarter', () => {
    const { start, end } = presetMoments('thisQuarterHour', {
      now: at('2026-09-21T09:29:59Z'), // 11:29:59
      timeZone: paris,
    });
    expect([clock(start), clock(end)]).toEqual(['11:15', '11:30']);
  });

  it('the hour that is running', () => {
    const { start, end } = presetMoments('thisHour', { now: at('2026-09-21T09:47:00Z'), timeZone: paris });
    expect([clock(start), clock(end)]).toEqual(['11:00', '12:00']);
    expect(end.epochMilliseconds - start.epochMilliseconds).toBe(3600_000);
  });

  it('rounds on the zone’s clock, not on the epoch', () => {
    // Kathmandu is +05:45. Rounding the epoch would land on :15, :30, :45 of
    // somebody else's clock and be wrong by a quarter of an hour here.
    const { start } = presetMoments('thisQuarterHour', {
      now: at('2026-09-21T05:22:00Z'), // 11:07 in Kathmandu
      timeZone: 'Asia/Kathmandu',
    });
    expect(start.toZonedDateTimeISO('Asia/Kathmandu').toPlainTime().toString({ smallestUnit: 'minute' })).toBe('11:00');
  });

  it('a preset carries the step its reader has in mind', () => {
    expect(presetStep('thisQuarterHour')).toEqual({ minutes: 15 });
    expect(presetStep('thisHour')).toEqual({ hours: 1 });
    expect(presetStep('thisQuarter')).toBe('auto');
  });

  it('asking for one of them as days is refused, not fudged', () => {
    expect(() => presetRange('thisHour', { today })).toThrow(/shorter than a day/);
  });
});

describe('a length written the short way', () => {
  const read = (text: string) => {
    const parsed = parseDuration(text);
    return parsed ? parsed.toString() : null;
  };

  it('reads the units a filter screen actually uses', () => {
    expect(read('25mn')).toBe('PT25M');
    expect(read('25 min')).toBe('PT25M');
    expect(read('1h')).toBe('PT1H');
    expect(read('3d')).toBe('P3D');
    expect(read('3j')).toBe('P3D'); // the French spelling, for a French screen
    expect(read('2w')).toBe('P2W');
    expect(read('6mo')).toBe('P6M');
  });

  it('is not fussy about case or spacing, and reads a bare number as minutes', () => {
    expect(read('  90 MN ')).toBe('PT90M');
    expect(read('45')).toBe('PT45M');
  });

  it("'m' is minutes and never months — 'mo' says months", () => {
    // The whole reason the longer form exists: a screen that read 6m as six
    // months would be wrong by a factor of forty-three thousand.
    expect(read('6m')).toBe('PT6M');
    expect(read('6mo')).toBe('P6M');
  });

  it('refuses what it cannot read rather than guessing', () => {
    for (const text of ['', 'soon', '0h', '-2d', '2 days', '1.5h', '12x']) {
      expect(read(text)).toBe(null);
    }
  });
});

describe('snapping a clock face to a grid', () => {
  const at = (text: string) => Temporal.PlainTime.from(text);
  const snap = (text: string, minutes: number) =>
    snapTime(at(text), minutes).toString({ smallestUnit: 'minute' });

  it('goes to the nearest mark, ties upward', () => {
    expect(snap('10:00', 15)).toBe('10:00');
    expect(snap('10:07', 15)).toBe('10:00');
    expect(snap('10:08', 15)).toBe('10:15');
    // The tie, which is the one minute anyone will argue about.
    expect(snap('10:07:30', 15)).toBe('10:15');
  });

  it('carries into the next hour when it should', () => {
    expect(snap('10:53', 15)).toBe('11:00');
    expect(snap('23:53', 15)).toBe('23:45'); // and never into tomorrow
    expect(snap('23:59', 30)).toBe('23:30');
  });

  it('works on grids that are not quarters', () => {
    expect(snap('10:07', 5)).toBe('10:05');
    expect(snap('10:08', 5)).toBe('10:10');
    expect(snap('10:29', 60)).toBe('10:00');
    expect(snap('10:31', 60)).toBe('11:00');
  });

  it('leaves the time alone when there is no grid to speak of', () => {
    expect(snap('10:07', 1)).toBe('10:07');
    expect(snap('10:07', 0)).toBe('10:07');
  });
});
