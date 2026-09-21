import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createCalendar,
  createMultiDate,
  createDateField,
  createDateTimeField,
  createDateRange,
  createRangeField,
  createTimeSlots,
  createTimeInput,
  createTimeSelect,
  createDailyRange,
  createDateTimeRange,
} from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * A value given at creation is shown at creation.
 *
 * Every widget takes one, and a screen that opens on a date already chosen —
 * an edit form, a saved search — is the common case, not the exception. This
 * checks all of them at once, because it is the kind of thing that breaks
 * quietly in one of ten.
 */
const paris = 'Europe/Paris';
const day = Temporal.PlainDate.from('2026-09-23');
const moment = Temporal.Instant.from('2026-09-23T12:30:00Z'); // 14:30 in Paris
let host: HTMLElement;
let widget: { destroy(): void };

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  widget?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((panel) => panel.remove());
});

const text = (selector: string) => host.querySelector(selector)?.textContent ?? '';
const shown = () => {
  const node = host.querySelector('.tz-field__trigger');
  return node instanceof HTMLInputElement ? node.value : (node?.textContent ?? '');
};

describe('a value given at creation', () => {
  it('the calendar opens on it, and marks it', () => {
    widget = createCalendar(host, { value: day, locale: 'en-GB' });
    expect(text('.tz-cal__title')).toBe('September 2026');
    expect(host.querySelector('[data-date="2026-09-23"]')!.classList.contains('tz-cal__day--selected')).toBe(true);
  });

  it('several days are all marked, in the month of the first', () => {
    widget = createMultiDate(host, {
      value: [Temporal.PlainDate.from('2026-10-05'), day],
      locale: 'en-GB',
    });
    expect(text('.tz-cal__title')).toBe('September 2026'); // the earliest, not the first given
    // 5 October falls in September's grid, as an outside day, and is marked there too
    expect([...host.querySelectorAll('.tz-cal__day--selected')].map((d) => d.getAttribute('data-date'))).toEqual([
      '2026-09-23',
      '2026-10-05',
    ])
  });

  it('a date field writes it', () => {
    widget = createDateField(host, { value: day, locale: 'en-GB' });
    expect(shown()).toContain('23 Sept 2026');
  });

  it('a date-and-time field writes it in the zone', () => {
    widget = createDateTimeField(host, { value: moment, timeZone: paris, locale: 'en-GB' });
    expect(shown()).toBe('23/09/2026 14:30');
  });

  it('a range marks both ends and everything between', () => {
    widget = createDateRange(host, {
      value: { start: day, end: Temporal.PlainDate.from('2026-09-26') },
      locale: 'en-GB',
    });
    expect(host.querySelector('[data-date="2026-09-23"]')!.classList.contains('tz-range__day--start')).toBe(true);
    expect(host.querySelector('[data-date="2026-09-26"]')!.classList.contains('tz-range__day--end')).toBe(true);
    expect(host.querySelectorAll('.tz-range__day--within').length).toBeGreaterThan(2);
  });

  it('a period field writes both ends', () => {
    widget = createRangeField(host, {
      timeZone: paris,
      locale: 'en-GB',
      value: {
        start: Temporal.Instant.from('2026-09-22T22:00:00Z'), // 23 Sept, 00:00 Paris
        end: Temporal.Instant.from('2026-09-26T22:00:00Z'), // 27 Sept, 00:00 — after the 26th
        allDay: true,
      },
    });
    expect(shown()).toContain('23/09/2026 – 26/09/2026');
  });

  it('a slot list marks the moment it was given', () => {
    widget = createTimeSlots(host, {
      date: day,
      timeZone: paris,
      stepMinutes: 30,
      value: moment,
    });
    expect(text('.tz-slots__slot--selected')).toContain('14:30');
  });

  it('the two time widgets show the clock face they were given', () => {
    const time = Temporal.PlainTime.from('14:30');
    widget = createTimeInput(host, { value: time, locale: 'en-GB' });
    expect(host.querySelector<HTMLInputElement>('[data-part="hour"]')!.value).toBe('14');
    widget.destroy();

    widget = createTimeSelect(host, { value: time, locale: 'en-GB' });
    expect(host.querySelector<HTMLSelectElement>('select[data-part="minute"]')!.value).toBe('30');
  });

  it('an interval fills both of its ends', () => {
    widget = createDateTimeRange(host, {
      timeZone: paris,
      locale: 'en-GB',
      value: { start: moment, end: Temporal.Instant.from('2026-09-23T16:00:00Z') },
    });
    const ends = host.querySelectorAll<HTMLInputElement>('input.tz-field__trigger');
    expect(ends[0]!.value).toBe('23/09/2026 14:30');
    expect(text('.tz-dtr__summary')).toBe('3h 30m');
  });

  it('a daily range fills its days and its hours', () => {
    widget = createDailyRange(host, {
      timeZone: paris,
      locale: 'en-GB',
      value: {
        start: day,
        end: Temporal.PlainDate.from('2026-09-25'),
        from: Temporal.PlainTime.from('09:00'),
        to: Temporal.PlainTime.from('17:00'),
      },
    });
    expect(text('.tz-daily__summary')).toBe('3 days · 24h');
    expect(host.querySelector<HTMLInputElement>('.tz-daily__input[data-edge="from"] [data-part="hour"]')!.value).toBe('09');
  });
});

describe('a value given later', () => {
  it('update() moves the calendar to it without reporting a change', () => {
    let reported = 0;
    widget = createCalendar(host, { locale: 'en-GB', onChange: () => (reported += 1) });
    (widget as ReturnType<typeof createCalendar>).update({ value: day });
    expect(text('.tz-cal__title')).toBe('September 2026');
    expect(reported).toBe(0);
  });
});
