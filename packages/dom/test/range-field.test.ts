import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRangeField, FR, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

const paris = 'Europe/Paris';
const today = Temporal.PlainDate.from('2026-09-20');
let host: HTMLElement;
let field: RangeFieldInstance;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
});

const mount = (o = {}) => (field = createRangeField(host, { timeZone: paris, locale: 'en-GB', today, ...o }));
const trigger = () => host.querySelector<HTMLButtonElement>('.tz-field__trigger')!;
const panel = () => document.querySelector<HTMLElement>('.tz-field__panel');
const presets = () =>
  Array.from(panel()!.querySelectorAll<HTMLButtonElement>('.tz-rangefield__preset'));
const preset = (label: string) => presets().find((b) => b.textContent === label)!;
const day = (iso: string) => panel()!.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;

describe('one field for a period', () => {
  it('says what it holds, and nothing when it holds nothing', () => {
    mount();
    expect(trigger().textContent).toContain('Choose a range');

    field.update({
      value: {
        start: Temporal.Instant.from('2026-08-21T22:00:00Z'), // 22 Aug, 00:00 Paris
        end: Temporal.Instant.from('2026-09-20T22:00:00Z'), // 21 Sept, 00:00 — after the 20th
        allDay: true,
      },
    });
    expect(trigger().textContent).toContain('22/08/2026 – 20/09/2026');
  });

  it('opens two months at once, so a range across the boundary is one click each', () => {
    mount();
    field.open();
    expect(panel()!.querySelectorAll('.tz-range__month')).toHaveLength(2);
    expect(panel()!.querySelectorAll('.tz-range__month-title')[0]!.textContent).toBe('September 2026');
  });

  it('a named range is one click, and it closes', () => {
    const onChange = vi.fn();
    mount({ onChange });
    field.open();
    preset('Last 7 days').click();

    const value = onChange.mock.calls.at(-1)![0];
    // Six days back and today, midnight to the midnight after.
    expect(value.start.toZonedDateTimeISO(paris).toString()).toContain('2026-09-14T00:00:00');
    expect(value.end.toZonedDateTimeISO(paris).toString()).toContain('2026-09-21T00:00:00');
    expect(value.allDay).toBe(true);
    expect(panel()).toBeNull();
  });

  it('marks the named range in force', () => {
    mount();
    field.open();
    preset('This month').click();
    field.open();
    expect(preset('This month').getAttribute('aria-pressed')).toBe('true');
    expect(preset('Last 7 days').getAttribute('aria-pressed')).toBe('false');
  });

  it('two clicks on the calendar do the same', () => {
    const onChange = vi.fn();
    mount({ onChange });
    field.open();
    day('2026-09-28').click();
    expect(panel()).not.toBeNull(); // a range needs its second end
    day('2026-10-03').click();

    const value = onChange.mock.calls.at(-1)![0];
    expect(value.start.toZonedDateTimeISO(paris).toString()).toContain('2026-09-28T00:00:00');
    expect(value.end.toZonedDateTimeISO(paris).toString()).toContain('2026-10-04T00:00:00');
    expect(trigger().textContent).toContain('28/09/2026 – 03/10/2026');
  });

  it('counts a week that loses an hour as the zone really has it', () => {
    const onChange = vi.fn();
    mount({ onChange, today: Temporal.PlainDate.from('2026-10-27') });
    field.open();
    preset('Last 7 days').click();

    const { start, end } = onChange.mock.calls.at(-1)![0];
    const hours = start.until(end).total({ unit: 'hour' });
    // The clocks went back on the 25th: seven days, 169 hours.
    expect(hours).toBe(169);
  });
});

describe('with times', () => {
  it('offers them, and the switch back to whole days', () => {
    mount({ showTime: true });
    field.open();
    expect(panel()!.querySelectorAll('.tz-time__input').length).toBe(4); // two fields, hour and minute
    expect(panel()!.querySelector('.tz-dtr__allday-box')!.getAttribute('aria-checked')).toBe('true');
  });

  it('setting a time turns the range into moments', () => {
    const onChange = vi.fn();
    mount({ showTime: true, onChange });
    field.open();
    day('2026-09-21').click();
    day('2026-09-22').click();

    const hour = panel()!.querySelector<HTMLInputElement>('.tz-rangefield__time .tz-time__input')!;
    hour.focus();
    hour.value = '09';
    hour.dispatchEvent(new Event('input', { bubbles: true }));
    hour.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    const value = onChange.mock.calls.at(-1)![0];
    expect(value.allDay).toBe(false);
    expect(value.start.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('09:00:00');
  });
});

describe('waiting for Apply', () => {
  it('reports nothing until it is pressed', () => {
    const onChange = vi.fn();
    mount({ confirm: true, onChange });
    field.open();
    preset('Today').click();
    expect(onChange).not.toHaveBeenCalled();
    expect(panel()).not.toBeNull();

    panel()!.querySelector<HTMLButtonElement>('.tz-rangefield__apply')!.click();
    expect(onChange).toHaveBeenCalledOnce();
    expect(panel()).toBeNull();
  });

  it('Cancel leaves the value where it was', () => {
    const onChange = vi.fn();
    mount({ confirm: true, onChange });
    field.open();
    preset('Yesterday').click();
    panel()!.querySelector<HTMLButtonElement>('.tz-rangefield__cancel')!.click();
    expect(onChange).not.toHaveBeenCalled();
    expect(field.value.start).toBeNull();
  });
});

describe('words', () => {
  it('names the ranges in the language it is given', () => {
    mount({ messages: FR, locale: 'fr-FR' });
    field.open();
    expect(presets().map((b) => b.textContent)).toContain('7 derniers jours');
    expect(panel()!.querySelector('.tz-rangefield__preset')!.textContent).toBe("Aujourd'hui");
  });
});
