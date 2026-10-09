import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * An arrow moves a period of whole days; it does not eat them.
 *
 * `days()` pulls an exclusive end back to the last day the period holds, which
 * is right. `fromDays()` read that midnight back as an hour the reader had
 * picked, and put the end on that day's own midnight — a day short. Pressing
 * an arrow seven times emptied a week; pressing it once more ran the period
 * backwards. A reader may write a backwards period on purpose now, but an
 * arrow asked to move a week and returning one of less than nothing is not
 * that — it is the widget losing a day on every press.
 *
 * Covered only with `showTime` off, or with 09:00–17:00 hours. The midnight
 * end that every shortcut produces was the uncovered case.
 */
const paris = 'Europe/Paris';
let host: HTMLElement;
let field: RangeFieldInstance;

const hours = () => {
  const v = field.value;
  return v.start && v.end ? (v.end.epochMilliseconds - v.start.epochMilliseconds) / 3600_000 : NaN;
};

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
});

describe('the arrows on a period of whole days', () => {
  const make = (options = {}) => {
    field = createRangeField(host, {
      timeZone: paris,
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: ['last7Days'],
      shift: { days: 1 },
      ...options,
    });
    field.open();
    // Only when there is one: the third case starts from a value of its own.
    document.querySelector<HTMLButtonElement>('.tz-rangefield__preset')?.click();
  };
  const back = () => host.querySelector<HTMLButtonElement>('.tz-field__shift--prev')!.click();

  it('keeps its length with the hours on screen', () => {
    make({ showTime: true, timeLayout: 'input' });
    const walk = [hours()];
    for (let i = 0; i < 8; i++) {
      back();
      walk.push(hours());
    }
    expect(walk).toEqual([168, 168, 168, 168, 168, 168, 168, 168, 168]);
  });

  it('keeps its length with the hours hidden, which always worked', () => {
    make({ showTime: false });
    const before = hours();
    back();
    expect(hours()).toBe(before);
  });

  it('leaves an hour the reader did pick alone', () => {
    // Nine hours, 09:00 to 18:00: the end is not midnight, so nothing applies.
    make({
      showTime: true,
      timeLayout: 'input',
      presets: [],
      defaultTimes: { start: '09:00', end: '18:00' },
      value: {
        start: Temporal.Instant.from('2026-09-14T07:00:00Z'),
        end: Temporal.Instant.from('2026-09-14T16:00:00Z'),
      },
    });
    back();
    expect(hours()).toBe(9);
    expect(field.value.end!.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('18:00:00');
  });
});
