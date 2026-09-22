import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createCalendar, type CalendarInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';
import type { PlainDate } from '@tzslot/core';

/**
 * A month or year picker obeys the same bounds a day picker does.
 *
 * `minView: 'months'` makes the month *the answer*, so clicking one must go
 * through the same gate a day goes through. It used to call choose() directly
 * — so a birthdate or fiscal-period picker with min and max emitted dates
 * outside them, from a cell that did not even look disabled.
 */
let host: HTMLElement;
let cal: CalendarInstance;
let reported: string[];

const cells = () => [...host.querySelectorAll<HTMLButtonElement>('.tz-cal__coarse-cell')];
const make = (options = {}) => {
  reported = [];
  cal = createCalendar(host, {
    locale: 'en-GB',
    today: Temporal.PlainDate.from('2026-09-15'),
    onChange: (value) => reported.push(value?.toString() ?? 'null'),
    ...options,
  });
};

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  cal?.destroy();
  host.remove();
});

describe('a month picker with bounds', () => {
  it('refuses a month before min, and says so by being disabled', () => {
    make({ minView: 'months', view: 'months', min: Temporal.PlainDate.from('2026-06-01') });
    const january = cells()[0]!;
    expect(january.disabled).toBe(true);
    january.click();
    expect(reported).toEqual([]);
  });

  it('and takes one inside them', () => {
    make({ minView: 'months', view: 'months', min: Temporal.PlainDate.from('2026-06-01') });
    const july = cells()[6]!;
    expect(july.disabled).toBe(false);
    july.click();
    expect(reported).toEqual(['2026-07-01']);
  });

  it('isDateDisabled is consulted too', () => {
    make({
      minView: 'months',
      view: 'months',
      isDateDisabled: (day: PlainDate) => day.month % 2 === 0, // even months are closed
    });
    expect(cells().map((c) => c.disabled)).toEqual([
      false, true, false, true, false, true, false, true, false, true, false, true,
    ]);
  });

  it('a year picker is held the same way', () => {
    make({ minView: 'years', view: 'years', min: Temporal.PlainDate.from('2026-01-01') });
    const shown = cells().map((c) => ({ year: c.dataset['value'], off: c.disabled }));
    expect(shown.filter((y) => Number(y.year) < 2026).every((y) => y.off)).toBe(true);
    expect(shown.find((y) => y.year === '2026')!.off).toBe(false);
  });
});

describe('higher up, a month is a way of getting somewhere', () => {
  it('so it stays clickable even when its first day is out of bounds', () => {
    // minView is 'days': the month view is navigation, not an answer. June is
    // partly allowed, and blocking it would strand the reader above the only
    // days they may pick.
    make({ view: 'months', min: Temporal.PlainDate.from('2026-06-15') });
    expect(cells()[5]!.disabled).toBe(false); // June
    cells()[5]!.click();
    expect(reported).toEqual([]); // it descended rather than choosing
    expect(host.querySelector('.tz-cal__title')!.textContent).toBe('June 2026');
  });
});
