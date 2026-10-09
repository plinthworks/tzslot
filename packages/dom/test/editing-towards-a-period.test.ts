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
 * A click that collapses a period still gets the old answer: the reader
 * pointed at a day and got nothing, so the other end is dropped and asked for
 * again. That case has its own test in review-1.4.0.
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
