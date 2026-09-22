import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDateRange, type DateRangeInstance } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';
import type { PlainDate } from '@tzslot/core';

/**
 * Four hundred lines, a public export, an Angular component over it — and no
 * test file at all. That is how it kept no keyboard for so long.
 */
let host: HTMLElement;
let range: DateRangeInstance;

const make = (options = {}) => {
  range = createDateRange(host, {
    locale: 'en-GB',
    today: Temporal.PlainDate.from('2026-09-15'),
    ...options,
  });
};
const cells = () => [...host.querySelectorAll<HTMLButtonElement>('.tz-range__day')];
const day = (iso: string) =>
  cells().find((c) => c.dataset['date'] === iso && !c.classList.contains('tz-range__day--outside'))!;
const classesOf = (iso: string) => day(iso).className;
const stops = () => cells().filter((c) => c.tabIndex === 0);
const press = (key: string, from?: HTMLElement) => {
  (from ?? document.activeElement ?? host).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
};

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  range?.destroy();
  host.remove();
});

describe('choosing with the mouse', () => {
  it('two clicks make a range, and everything between is marked', () => {
    const onChange = vi.fn();
    make({ onChange });
    day('2026-09-10').click();
    day('2026-09-14').click();

    expect(classesOf('2026-09-10')).toContain('tz-range__day--start');
    expect(classesOf('2026-09-14')).toContain('tz-range__day--end');
    expect(classesOf('2026-09-12')).toContain('tz-range__day--within');
    expect(onChange).toHaveBeenLastCalledWith({
      start: Temporal.PlainDate.from('2026-09-10'),
      end: Temporal.PlainDate.from('2026-09-14'),
    });
  });

  it('a click before the start becomes the start, not a backwards range', () => {
    make();
    day('2026-09-14').click();
    day('2026-09-10').click();
    // Someone correcting a mis-click meant "from the 10th", and the day they
    // had already chosen is the other end.
    expect(range.value.start!.toString()).toBe('2026-09-10');
    expect(range.value.end!.toString()).toBe('2026-09-14');
  });

  it('a closed day cannot be clicked, and a range may not step over one', () => {
    const onChange = vi.fn();
    make({ isDateDisabled: (d: PlainDate) => d.dayOfWeek > 5, onChange, messages: FR });
    expect(day('2026-09-12').disabled).toBe(true); // a Saturday

    day('2026-09-10').click();
    day('2026-09-16').click(); // across the weekend
    expect(host.querySelector('.tz-range__error')?.textContent ?? host.textContent).toContain(
      'traverse un jour indisponible',
    );
    expect(range.value.end).toBe(null);
  });
});

describe('choosing with the keyboard', () => {
  it('one tab stop for the whole grid, however many months it shows', () => {
    make({ months: 2 });
    expect(cells().length).toBe(84);
    expect(stops().length).toBe(1);
  });

  it('the arrows move a day and the focus follows', () => {
    make();
    const entry = stops()[0]!;
    entry.focus();
    const started = entry.dataset['date']!;

    press('ArrowRight');
    const after = Temporal.PlainDate.from(started).add({ days: 1 }).toString();
    expect((document.activeElement as HTMLElement).dataset['date']).toBe(after);

    press('ArrowDown');
    expect((document.activeElement as HTMLElement).dataset['date']).toBe(
      Temporal.PlainDate.from(after).add({ weeks: 1 }).toString(),
    );
  });

  it('Home and End walk the week, PageDown the month', () => {
    make({ firstDayOfWeek: 1 });
    day('2026-09-16').focus(); // a Wednesday
    press('Home');
    expect((document.activeElement as HTMLElement).dataset['date']).toBe('2026-09-14'); // Monday
    press('End');
    expect((document.activeElement as HTMLElement).dataset['date']).toBe('2026-09-20'); // Sunday
    press('PageDown');
    expect((document.activeElement as HTMLElement).dataset['date']).toBe('2026-10-20');
  });

  it('walking off the months on screen brings them along', () => {
    make();
    day('2026-09-30').focus();
    for (let i = 0; i < 2; i++) press('ArrowRight');
    expect(host.querySelector('.tz-range__title')!.textContent).toContain('October');
    expect((document.activeElement as HTMLElement).dataset['date']).toBe('2026-10-02');
  });

  it('the run under the keyboard is previewed, as the run under the pointer is', () => {
    make();
    day('2026-09-10').click();
    day('2026-09-10').focus();
    for (let i = 0; i < 3; i++) press('ArrowRight');
    // Half a selection is hard enough to hold in the head without the screen
    // keeping the other half to itself.
    expect(classesOf('2026-09-12')).toContain('tz-range__day--within');
  });

  it('Enter is left to the button, which is what a button is for', () => {
    const onChange = vi.fn();
    make({ onChange });
    const entry = stops()[0]!;
    entry.focus();
    press('Enter');
    expect(onChange).not.toHaveBeenCalled(); // no double handling
    entry.click();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('a calendar whose entry point is closed still has a usable one', () => {
    make({ min: Temporal.PlainDate.from('2026-09-20') });
    expect(stops().length).toBe(1);
    expect(stops()[0]!.disabled).toBe(false);
    expect(stops()[0]!.dataset['date']).toBe('2026-09-20');
  });
});

describe('what it says to a screen reader', () => {
  it('a grid of rows of cells, and the chosen ends marked', () => {
    make();
    expect(host.querySelector('[role="grid"]')).not.toBeNull();
    expect(host.querySelectorAll('[role="row"]').length).toBeGreaterThan(0);
    day('2026-09-10').click();
    expect(day('2026-09-10').getAttribute('aria-selected')).toBe('true');
    expect(day('2026-09-11').getAttribute('aria-selected')).toBe('false');
  });
});

describe('being taken away', () => {
  it('destroy leaves nothing of its own behind', () => {
    make({ months: 2, weekNumbers: true });
    range.destroy();
    expect(host.querySelector('.tz-range__day')).toBe(null);
    expect([...host.classList].filter((c) => c.startsWith('tz-range'))).toEqual([]);
  });
});
