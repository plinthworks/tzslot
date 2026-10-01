import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTimeSelect, createRangeField, type TimeSelectInstance, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * A value the control holds is always in its own menu.
 *
 * `minuteValues` has said so since the beginning — "a menu built on a step of
 * five has nothing to offer a time sitting at 00:15; it would show a blank,
 * and picking anything at all would move a time the reader never asked to
 * move". Three of the four menu builders did not have the rule, and the one a
 * period field uses — `realMinutes`, reached whenever a day and a zone are
 * handed down — was among them. So the field read 09:07 and the minute menu
 * beside it was empty.
 */
const paris = 'Europe/Paris';
let host: HTMLElement;
let menus: TimeSelectInstance | undefined;
let field: RangeFieldInstance | undefined;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  menus?.destroy();
  field?.destroy();
  menus = field = undefined;
  host.remove();
});

const selects = (where: ParentNode = document) => [
  ...where.querySelectorAll<HTMLSelectElement>('.tz-timeselect__menu'),
];

describe('a value off the step grid', () => {
  it('is in the hour menu, standalone', () => {
    menus = createTimeSelect(host, { locale: 'en-GB', hourStep: 2, value: Temporal.PlainTime.from('09:00') });
    const hour = selects(host)[0]!;
    expect(hour.selectedIndex).not.toBe(-1);
    expect(hour.value).toContain('9');
  });

  it('is in the minute menu of a period field, which hands down a day and a zone', () => {
    field = createRangeField(host, {
      timeZone: paris,
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: [],
      showTime: true,
      timeLayout: 'select',
      minuteStep: 30,
      value: {
        start: Temporal.Instant.from('2026-09-18T07:07:00Z'),
        end: Temporal.Instant.from('2026-09-18T15:00:00Z'),
      },
    });
    field.open();
    const panel = document.querySelector('.tz-field__panel')!;
    const [, minute] = selects(panel);
    // 09:07 in Paris. The field says so; the menu must not disagree.
    expect(minute!.selectedIndex).not.toBe(-1);
    expect(minute!.value).toBe('7');
  });
});

it('does not offer a held time that the clocks skipped', () => {
  // Lord Howe moves by half an hour: 02:00 to 02:29 vanish on 4 October.
  // Off the step grid is not the same as not there — the first belongs in the
  // menu, the second would legitimise a time the widget is about to move.
  menus = createTimeSelect(host, {
    locale: 'en-GB',
    date: '2026-10-04',
    timeZone: 'Australia/Lord_Howe',
    minuteStep: 15,
  });
  const hour = selects(host)[0]!;
  hour.value = '2|';
  hour.dispatchEvent(new Event('change', { bubbles: true }));
  const minutes = [...selects(host)[1]!.options].map((o) => o.textContent);
  expect(minutes).toEqual(['30', '45']);
});
