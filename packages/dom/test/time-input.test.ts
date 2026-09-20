import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTimeInput, FR, type TimeInputInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

let host: HTMLElement;
let input: TimeInputInstance;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  input?.destroy();
  host.remove();
});

const mount = (o = {}) => (input = createTimeInput(host, { locale: 'en-GB', ...o }));
const box = (part: 'hour' | 'minute') => host.querySelector<HTMLInputElement>(`[data-part="${part}"].tz-time__input`)!;
const arrow = (part: 'hour' | 'minute', dir: 'up' | 'down') =>
  host.querySelector<HTMLButtonElement>(`.tz-time__arrow[data-part="${part}"][data-step="${dir}"]`)!;
const shown = () => `${box('hour').value}:${box('minute').value}`;
const type = (part: 'hour' | 'minute', text: string) => {
  const b = box(part);
  b.focus();
  b.value = text;
  b.dispatchEvent(new Event('input', { bubbles: true }));
  b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
};

describe('showing a time', () => {
  it('starts empty and shows what it is given, padded', () => {
    mount();
    expect(shown()).toBe('--:--');
    input.update({ value: Temporal.PlainTime.from('09:05') });
    expect(shown()).toBe('09:05');
  });

  it('announces itself as a spinbutton with its bounds', () => {
    mount({ value: Temporal.PlainTime.from('09:05') });
    expect(box('hour').getAttribute('role')).toBe('spinbutton');
    expect(box('hour').getAttribute('aria-valuemax')).toBe('23');
    expect(box('minute').getAttribute('aria-valuenow')).toBe('5');
    expect(box('hour').getAttribute('aria-label')).toBe('Hour');
  });
});

describe('moving it', () => {
  it('the arrows step the hour by one and the minutes by stepMinutes', () => {
    const onChange = vi.fn();
    mount({ value: Temporal.PlainTime.from('09:00'), stepMinutes: 15, onChange });
    arrow('minute', 'up').click();
    expect(shown()).toBe('09:15');
    arrow('hour', 'up').click();
    expect(shown()).toBe('10:15');
    arrow('minute', 'down').click();
    expect(shown()).toBe('10:00');
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange.mock.calls.at(-1)![0].toString()).toBe('10:00:00');
  });

  it('a field wraps within itself, never carrying into the other', () => {
    // Stepping the minutes past the hour would move an appointment by an hour.
    mount({ value: Temporal.PlainTime.from('09:45'), stepMinutes: 30 });
    arrow('minute', 'up').click();
    expect(shown()).toBe('09:15');
    input.update({ value: Temporal.PlainTime.from('23:30') });
    arrow('hour', 'up').click();
    expect(shown()).toBe('00:30');
  });

  it('the keyboard does what the arrows do', () => {
    mount({ value: Temporal.PlainTime.from('09:00'), stepMinutes: 30 });
    box('minute').focus();
    box('minute').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(shown()).toBe('09:30');
    box('hour').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(shown()).toBe('08:30');
  });

  it('typing settles on Enter, and only digits count', () => {
    const onChange = vi.fn();
    mount({ value: Temporal.PlainTime.from('09:00'), onChange });
    type('hour', '17');
    expect(shown()).toBe('17:00');
    type('minute', '4x5');
    expect(shown()).toBe('17:45');
    expect(onChange.mock.calls.at(-1)![0].toString()).toBe('17:45:00');
  });

  it('keeps what it is given inside min and max', () => {
    mount({ value: Temporal.PlainTime.from('09:00'), minTime: '08:00', maxTime: '18:00' });
    type('hour', '22');
    expect(shown()).toBe('18:00');
    type('hour', '02');
    expect(shown()).toBe('08:00');
  });
});

describe('12-hour locales', () => {
  it('shows 1 to 12 with a button for the half of the day', () => {
    mount({ locale: 'en-US', value: Temporal.PlainTime.from('13:30') });
    const meridiem = host.querySelector<HTMLButtonElement>('.tz-time__meridiem')!;
    expect(shown()).toBe('01:30');
    expect(meridiem.textContent).toBe('PM');

    meridiem.click();
    expect(input.value!.toString()).toBe('01:30:00');
    expect(host.querySelector('.tz-time__meridiem')!.textContent).toBe('AM');
  });

  it('is absent where the locale writes 24-hour time, unless asked for', () => {
    mount({ locale: 'fr-FR', value: Temporal.PlainTime.from('13:30') });
    expect(host.querySelector('.tz-time__meridiem')).toBeNull();
    input.update({ hour12: true });
    expect(host.querySelector('.tz-time__meridiem')).not.toBeNull();
  });
});

describe('words and state', () => {
  it('speaks the language it is given', () => {
    mount({ messages: FR, locale: 'fr-FR', value: Temporal.PlainTime.from('09:00') });
    expect(box('hour').getAttribute('aria-label')).toBe('Heure');
  });

  it('disabled stops everything', () => {
    const onChange = vi.fn();
    mount({ value: Temporal.PlainTime.from('09:00'), disabled: true, onChange });
    expect(box('hour').disabled).toBe(true);
    arrow('hour', 'up').click();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('the morning an hour goes missing', () => {
  it('steps over it instead of into it', () => {
    // 02:00 to 02:59 do not exist in Paris on 29 March 2026.
    mount({
      value: Temporal.PlainTime.from('03:00'),
      date: '2026-03-29',
      timeZone: 'Europe/Paris',
    });
    arrow('hour', 'down').click();
    expect(shown()).toBe('01:00');

    arrow('hour', 'up').click();
    expect(shown()).toBe('03:00');
  });

  it('steps the minutes over a missing half hour, within their own hour', () => {
    // Lord Howe moves by half an hour: on 4 October 2026, 02:00 to 02:29 are
    // skipped. The minutes wrap inside their hour, so this is where stepping
    // them can land in a gap at all.
    mount({
      value: Temporal.PlainTime.from('02:30'),
      stepMinutes: 15,
      date: '2026-10-04',
      timeZone: 'Australia/Lord_Howe',
    });
    arrow('minute', 'down').click();
    // 02:15 and 02:00 are not there; the wrap lands on 02:45.
    expect(shown()).toBe('02:45');
  });

  it('leaves an ordinary day alone', () => {
    mount({ value: Temporal.PlainTime.from('03:00'), date: '2026-06-15', timeZone: 'Europe/Paris' });
    arrow('hour', 'down').click();
    expect(shown()).toBe('02:00');
  });
});
