import { describe, it, expect } from 'vitest';
import { getMonthGrid, getWeekdayOrder, getDecadeYears, isOutsideDecade } from '../src/index.js';

const iso = (grid: ReturnType<typeof getMonthGrid>) => grid.map((w) => w.map((d) => d.toString()));

describe('month grid', () => {
  it('is always six weeks of seven days', () => {
    // February 2026 has 28 days and starts on a Sunday — the shortest possible
    // month, and the one a five-row grid would get away with. Six rows anyway,
    // so the calendar never changes height between months.
    for (const [y, m] of [[2026, 2], [2026, 9], [2024, 2], [2026, 12]] as const) {
      const grid = getMonthGrid(y, m);
      expect(grid).toHaveLength(6);
      expect(grid.every((w) => w.length === 7)).toBe(true);
    }
  });

  it('starts on the chosen first day of the week', () => {
    expect(getMonthGrid(2026, 9, 1)[0]![0]!.dayOfWeek).toBe(1); // Monday
    expect(getMonthGrid(2026, 9, 7)[0]![0]!.dayOfWeek).toBe(7); // Sunday
  });

  it('leads with the right number of days from the previous month', () => {
    // 1 September 2026 is a Tuesday: one day of August leads a Monday week.
    expect(iso(getMonthGrid(2026, 9, 1))[0]![0]).toBe('2026-08-31');
    // With weeks starting Sunday, two days lead.
    expect(iso(getMonthGrid(2026, 9, 7))[0]![0]).toBe('2026-08-30');
  });

  it('handles a month that begins on the first day of the week', () => {
    // 1 June 2026 is a Monday — no leading days at all.
    expect(iso(getMonthGrid(2026, 6, 1))[0]![0]).toBe('2026-06-01');
  });

  it('handles the worst case: a month starting the day before the week does', () => {
    // 1 February 2026 is a Sunday; with Monday weeks that is six leading days.
    expect(iso(getMonthGrid(2026, 2, 1))[0]![0]).toBe('2026-01-26');
  });

  it('contains every day of the month, in order, without gaps', () => {
    const flat = getMonthGrid(2026, 2, 1).flat();
    for (let i = 1; i < flat.length; i++) {
      expect(flat[i]!.since(flat[i - 1]!).days).toBe(1);
    }
    const inMonth = flat.filter((d) => d.month === 2 && d.year === 2026);
    expect(inMonth).toHaveLength(28);
  });

  it('crosses a year boundary', () => {
    const grid = iso(getMonthGrid(2026, 1, 1));
    expect(grid[0]![0]).toBe('2025-12-29');
    expect(grid.flat()).toContain('2026-01-01');
  });

  it('is unaffected by the day the clocks change', () => {
    // 29 March 2026 is a 23-hour day in Paris. It is still one day on a
    // calendar, and the grid knows nothing about time zones by design.
    expect(iso(getMonthGrid(2026, 3, 1)).flat()).toContain('2026-03-29');
    expect(getMonthGrid(2026, 3, 1).flat()).toHaveLength(42);
  });

  it('handles a leap day', () => {
    const flat = iso(getMonthGrid(2024, 2, 1)).flat();
    expect(flat).toContain('2024-02-29');
  });
});

describe('weekday order', () => {
  it('rotates to the chosen first day', () => {
    expect(getWeekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(getWeekdayOrder(7)).toEqual([7, 1, 2, 3, 4, 5, 6]);
    expect(getWeekdayOrder(6)).toEqual([6, 7, 1, 2, 3, 4, 5]);
  });
});

describe('decade view', () => {
  it('shows twelve years, so the grid is a rectangle', () => {
    expect(getDecadeYears(2026)).toHaveLength(12);
  });

  it('centres on the decade, with one year either side', () => {
    // Three rows of four, and the ends of the decade reachable without
    // navigating first — the same reason a month shows the days either side.
    expect(getDecadeYears(2026)).toEqual([
      2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030,
    ]);
  });

  it('gives the same twelve for every year of a decade', () => {
    expect(getDecadeYears(2020)).toEqual(getDecadeYears(2029));
  });

  it('knows which two are borrowed from the neighbours', () => {
    expect(isOutsideDecade(2019, 2026)).toBe(true);
    expect(isOutsideDecade(2030, 2026)).toBe(true);
    expect(isOutsideDecade(2020, 2026)).toBe(false);
    expect(isOutsideDecade(2029, 2026)).toBe(false);
  });

  it('handles a century boundary', () => {
    expect(getDecadeYears(2000)[0]).toBe(1999);
    expect(getDecadeYears(1999)).toContain(2000);
  });
});
