import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';
import type { Instant } from '@tzslot/core';

/**
 * Bringing one end onto the other is a waypoint, not a mistake.
 *
 * A reader with 14:00–18:00 who wants a quarter of an hour drops the end to
 * 14:00 and then raises the minutes. For the instant the two meet the period
 * has no length — and the rule written for a mis-aimed *click* fired, threw
 * away the start they had deliberately set, and left them to do it again.
 *
 * No gesture gets the old answer any more — not a click either. I wrote the
 * opposite here when I made the change, and a review caught it: there is no
 * old answer left to get, and the test I pointed at as proof never ran the
 * path it claimed to.
 */
const paris = 'Europe/Paris';
let host: HTMLElement;
let field: RangeFieldInstance;

const wall = (i: Instant | null) =>
  i ? i.toZonedDateTimeISO(paris).toPlainDateTime().toString({ smallestUnit: 'minute' }) : '-';
const shown = () => `${wall(field.value.start)} .. ${wall(field.value.end)}`;
const setMenu = (edge: 0 | 1, part: 0 | 1, label: string) => {
  const box = document.querySelectorAll('.tz-rangefield__field')[edge]!;
  const menu = box.querySelectorAll<HTMLSelectElement>('.tz-timeselect__menu')[part]!;
  const option = [...menu.options].find((o) => o.textContent === label);
  if (!option) throw new Error(`no option "${label}"`);
  menu.value = option.value;
  menu.dispatchEvent(new Event('change', { bubbles: true }));
};

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
});

describe('narrowing a period with the hour menus', () => {
  it('keeps the start while the two ends meet', () => {
    field = createRangeField(host, {
      timeZone: paris,
      locale: 'fr-FR',
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: [],
      showTime: true,
      timeLayout: 'select',
      minuteStep: 15,
      value: {
        start: Temporal.Instant.from('2026-09-10T12:00:00Z'), // 14:00 Paris
        end: Temporal.Instant.from('2026-09-10T16:00:00Z'), // 18:00
      },
    });
    field.open();
    expect(shown()).toBe('2026-09-10T14:00 .. 2026-09-10T18:00');

    setMenu(1, 0, '14');
    // The waypoint. The start is still there.
    expect(shown()).toBe('2026-09-10T14:00 .. 2026-09-10T14:00');

    setMenu(1, 1, '15');
    expect(shown()).toBe('2026-09-10T14:00 .. 2026-09-10T14:15');
  });
});

describe('a length limit waits for a period to hold', () => {
  it('does not move the start while the two ends are meeting', () => {
    // The same gesture, on a field whose screen asked for at least an hour.
    // The limits used to fire on the empty step — nothing is shorter than an
    // hour quite like nothing — and walked the start back to 13:00 while the
    // reader was still typing. `minSpan` moving the untouched end is the
    // screen's own rule and stays; it just has nothing to hold until there is
    // a period running forwards.
    field = createRangeField(host, {
      timeZone: paris,
      locale: 'fr-FR',
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: [],
      showTime: true,
      timeLayout: 'select',
      minuteStep: 15,
      minSpan: '1h',
      value: {
        start: Temporal.Instant.from('2026-09-10T12:00:00Z'), // 14:00 Paris
        end: Temporal.Instant.from('2026-09-10T16:00:00Z'), // 18:00
      },
    });
    field.open();

    setMenu(1, 0, '14');
    expect(shown()).toBe('2026-09-10T14:00 .. 2026-09-10T14:00');

    setMenu(1, 1, '15');
    // Now there is a period, and now the hour the screen asked for applies —
    // once, pulling the untouched end out and saying so.
    expect(field.value.end!.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('14:15:00');
    expect(field.value.start!.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('13:15:00');
  });
});

describe('an empty period in the calendar', () => {
  it('does not mark the day before it as its end', () => {
    // An exclusive end that opens a day is pulled back to the day it closes,
    // which is right for a period and wrong for none: the grid marked the 9th,
    // selected it, and read it aloud as the end of a period containing no days.
    field = createRangeField(host, {
      timeZone: paris,
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: [],
      value: {
        start: Temporal.Instant.from('2026-09-09T22:00:00Z'), // 10 Sept 00:00
        end: Temporal.Instant.from('2026-09-09T22:00:00Z'), // the same instant
      },
    });
    field.open();
    const panel = document.querySelector('.tz-field__panel')!;
    const dayed = (cls: string) =>
      [...panel.querySelectorAll<HTMLElement>(`.tz-range__day--${cls}`)].map((c) => c.dataset['date']);

    expect(dayed('end')).toEqual(['2026-09-10']);
    expect(dayed('start')).toEqual(['2026-09-10']);
    expect(dayed('within')).toEqual(['2026-09-10']);
  });
});
