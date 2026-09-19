import { describe, it, expect } from 'vitest';
import { getDailyWindows, formatDuration, Temporal } from '../src/index.js';
import type { Instant } from '../src/index.js';

const paris = 'Europe/Paris';
const utcTime = (i: Instant) => i.toString();

describe('an ordinary week', () => {
  it('09:00 to 17:00 from Monday to Friday is five windows of eight hours', () => {
    const r = getDailyWindows('2026-06-15', '2026-06-19', '09:00', '17:00', paris);
    expect(r.windows).toHaveLength(5);
    expect(r.windows.every((w) => w.minutes === 480)).toBe(true);
    expect(r.minutes).toBe(2400);
    expect(r.unusual).toHaveLength(0);
    // 09:00 in Paris in June is 07:00 UTC.
    expect(utcTime(r.windows[0]!.start)).toBe('2026-06-15T07:00:00Z');
  });

  it('a total is written in hours, not days', () => {
    expect(formatDuration(Temporal.Duration.from({ minutes: 2400 }), { days: false })).toBe('40h');
    expect(formatDuration(Temporal.Duration.from({ minutes: 2400 }))).toBe('1d 16h');
  });
});

describe('night shifts', () => {
  it('an end before the start ends the next morning', () => {
    const r = getDailyWindows('2026-06-15', '2026-06-15', '22:00', '06:00', paris);
    expect(r.windows[0]!.minutes).toBe(480);
    expect(utcTime(r.windows[0]!.end)).toBe('2026-06-16T04:00:00Z');
  });

  it('the night the clocks go back lasts nine hours, and only that night', () => {
    // Paris goes from +02:00 to +01:00 at 03:00 on Sunday 25 October 2026.
    const r = getDailyWindows('2026-10-23', '2026-10-26', '22:00', '06:00', paris);
    expect(r.windows.map((w) => w.minutes)).toEqual([480, 540, 480, 480]);
    expect(r.unusual.map((w) => w.date.toString())).toEqual(['2026-10-24']);
    expect(r.unusual[0]!.shiftMinutes).toBe(60);
    expect(r.minutes).toBe(1980); // 33h, where the clock faces say 32
  });

  it('the night the clocks go forward lasts seven', () => {
    const r = getDailyWindows('2026-03-28', '2026-03-28', '22:00', '06:00', paris);
    expect(r.windows[0]!.minutes).toBe(420);
    expect(r.windows[0]!.shiftMinutes).toBe(-60);
  });
});

describe('a boundary inside the hour that changes', () => {
  it('a start the clocks skip moves to the first moment after the gap', () => {
    // 02:30 does not exist in Paris on 29 March 2026.
    const r = getDailyWindows('2026-03-29', '2026-03-29', '02:30', '06:00', paris);
    const w = r.windows[0]!;
    expect(w.adjusted).toBe(true);
    expect(w.start.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('03:30:00');
    expect(r.unusual).toHaveLength(1);
  });

  it('a window over the repeated hour keeps all of it', () => {
    // 02:30 happens twice in Paris on 25 October 2026: start at the first,
    // end at the second, and the window is the hour and a half it looks like
    // plus the hour the clocks gave back.
    const r = getDailyWindows('2026-10-25', '2026-10-25', '01:00', '02:30', paris);
    const w = r.windows[0]!;
    expect(w.ambiguous).toBe(true);
    expect(w.minutes).toBe(150);
    expect(w.wallMinutes).toBe(90);
  });
});

describe('refusals', () => {
  it('an end date before the start date is an error, not an empty list', () => {
    expect(() => getDailyWindows('2026-06-19', '2026-06-15', '09:00', '17:00', paris)).toThrow(RangeError);
  });
});
