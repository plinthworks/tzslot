import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTimeColumns, createDateTimeField, type TimeColumnsInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

let host: HTMLElement;
let columns: TimeColumnsInstance;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  columns?.destroy();
  host.remove();
});

const option = (part: 'hour' | 'minute', value: string) =>
  host.querySelector<HTMLButtonElement>(`[data-part="${part}"][data-value="${value}"]`)!;
const count = (part: 'hour' | 'minute') =>
  host.querySelectorAll(`.tz-timecols__column--${part} .tz-timecols__option`).length;
const chosen = (part: 'hour' | 'minute') =>
  host.querySelector(`.tz-timecols__column--${part} .tz-timecols__option--selected`)?.textContent;

describe('hours on one side, minutes on the other', () => {
  it('offers every hour and every minute by default', () => {
    columns = createTimeColumns(host, {});
    expect(count('hour')).toBe(24);
    expect(count('minute')).toBe(60);
  });

  it('takes the step it is given', () => {
    columns = createTimeColumns(host, { minuteStep: 15 });
    expect(count('minute')).toBe(4);
    expect(
      Array.from(host.querySelectorAll('.tz-timecols__column--minute .tz-timecols__option')).map(
        (b) => b.textContent,
      ),
    ).toEqual(['00', '15', '30', '45']);
  });

  it('a click on each side builds the time', () => {
    const onChange = vi.fn();
    columns = createTimeColumns(host, { minuteStep: 5, onChange });
    option('hour', '9').click();
    expect(onChange.mock.calls[0]![0].toString()).toBe('09:00:00');
    option('minute', '45').click();
    expect(columns.value!.toString()).toBe('09:45:00');
    expect(chosen('hour')).toBe('09');
    expect(chosen('minute')).toBe('45');
  });

  it('marks what it was given, on both sides', () => {
    columns = createTimeColumns(host, { value: Temporal.PlainTime.from('17:30'), minuteStep: 30 });
    expect(chosen('hour')).toBe('17');
    expect(chosen('minute')).toBe('30');
    expect(option('hour', '17').getAttribute('aria-selected')).toBe('true');
  });

  it('keeps to the bounds, hour by hour', () => {
    columns = createTimeColumns(host, { minTime: '08:30', maxTime: '17:00', minuteStep: 30 });
    expect(count('hour')).toBe(10); // 08 to 17
    expect(option('hour', '7')).toBeNull();

    option('hour', '8').click();
    // Inside the first hour, the minutes start where the bound does — and
    // choosing that hour starts from the bound itself, so 08:30 it is.
    expect(count('minute')).toBe(1);
    expect(chosen('minute')).toBe('30');
    expect(columns.value!.toString()).toBe('08:30:00');
  });

  it('disabled stops it', () => {
    const onChange = vi.fn();
    columns = createTimeColumns(host, { disabled: true, onChange });
    expect(option('hour', '9').disabled).toBe(true);
    option('hour', '9').click();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('inside the date-and-time field', () => {
  it('is a third way to ask, next to the compact field and the day’s slots', () => {
    const field = createDateTimeField(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      timeLayout: 'columns',
      minuteStep: 15,
      today: Temporal.PlainDate.from('2026-06-15'),
    });
    field.open();
    const panel = document.querySelector('.tz-field__panel')!;
    panel.querySelector<HTMLButtonElement>('[data-date="2026-06-17"]')!.click();
    panel.querySelector<HTMLButtonElement>('[data-part="hour"][data-value="14"]')!.click();
    panel.querySelector<HTMLButtonElement>('[data-part="minute"][data-value="45"]')!.click();

    expect(field.value!.toString()).toBe('2026-06-17T12:45:00Z');
    field.destroy();
  });
});
