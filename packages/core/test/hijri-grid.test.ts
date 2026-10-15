import { describe, it, expect } from 'vitest';
import { getMonthGrid, inMonth } from '../src/grid.js';
import { Temporal } from '../src/temporal.js';
import type { PlainDate } from '../src/temporal.js';

/**
 * A month grid in a calendar that is not the Gregorian one.
 *
 * Intl will name Hijri months for any locale that asks, but naming is the
 * easy half: a Hijri month is 29 or 30 days and begins on its own boundary,
 * somewhere in the middle of a Gregorian one. A grid built from Gregorian
 * month lengths and titled in Hijri says "Rabi al-Thani 1448" above the days
 * of September — which is worse than refusing, because it looks right.
 *
 * What comes back is ISO whatever was asked for. The calendar is a way of
 * reading dates, not of storing them, exactly as a time zone is: a caller that
 * wants the Hijri day number for a cell asks the date for it. Returning Hijri
 * dates would change every key and every comparison a screen already holds, to
 * spell the same days differently.
 */
const CAL = 'islamic-umalqura';
const hijri = (d: PlainDate) => d.withCalendar(CAL);

describe('a Hijri month', () => {
  // Rabi al-Thani 1448 is the month holding 20 September 2026.
  const grid = getMonthGrid(1448, 4, 7, CAL); // weeks start on Sunday
  const flat = grid.flat();
  const inside = flat.filter((d) => inMonth(d, 1448, 4, CAL));

  it('begins and ends where the Hijri month does, not where September does', () => {
    expect(inside[0]!.toString()).toBe('2026-09-12');
    expect(inside.at(-1)!.toString()).toBe('2026-10-11');
  });

  it('is thirty days, which no Gregorian month boundary would have given', () => {
    expect(inside.length).toBe(30);
    expect(hijri(inside[0]!).day).toBe(1);
    expect(hijri(inside.at(-1)!).day).toBe(30);
  });

  it('still shows six weeks, so the panel does not change height', () => {
    expect(grid.length).toBe(6);
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });

  it('starts its first row on the weekday asked for', () => {
    expect(flat[0]!.dayOfWeek).toBe(7); // Sunday
  });

  it('hands back ISO dates, every one of them', () => {
    expect(flat.every((d) => d.calendarId === 'iso8601')).toBe(true);
  });

  it('and `inMonth` reads the calendar it was given, not the one in the date', () => {
    const middle = Temporal.PlainDate.from('2026-09-20');
    expect(inMonth(middle, 1448, 4, CAL)).toBe(true);
    // The same day is in September, and in no Hijri month but its own.
    expect(inMonth(middle, 2026, 9)).toBe(true);
    expect(inMonth(middle, 1448, 5, CAL)).toBe(false);
  });
});

describe('the Gregorian grid is untouched', () => {
  it('builds exactly as it did before a calendar could be named', () => {
    const a = getMonthGrid(2026, 9, 1);
    const b = getMonthGrid(2026, 9, 1, 'iso8601');
    expect(a.flat().map(String)).toEqual(b.flat().map(String));
    expect(a.flat()[0]!.toString()).toBe('2026-08-31');
  });
});
