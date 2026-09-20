import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTimeSelect, createDateTimeField, FR, type TimeSelectInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

let host: HTMLElement;
let menus: TimeSelectInstance;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  menus?.destroy();
  host.remove();
});

const menu = (part: 'hour' | 'minute' | 'meridiem') =>
  host.querySelector<HTMLSelectElement>(`select[data-part="${part}"]`)!;
const options = (part: 'hour' | 'minute') => Array.from(menu(part).options).map((o) => o.textContent);
const pick = (part: 'hour' | 'minute' | 'meridiem', value: string) => {
  const select = menu(part);
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('two menus', () => {
  it('are the browser’s own, one per part', () => {
    menus = createTimeSelect(host, { locale: 'en-GB' });
    expect(menu('hour').tagName).toBe('SELECT');
    expect(menu('minute').tagName).toBe('SELECT');
    expect(menu('hour').getAttribute('aria-label')).toBe('Hour');
  });

  it('show nothing chosen until something is', () => {
    menus = createTimeSelect(host, { locale: 'en-GB' });
    expect(menu('hour').value).toBe('');
    expect(options('hour')[0]).toBe('--');

    pick('hour', '9');
    expect(menus.value!.toString()).toBe('09:00:00');
    expect(options('hour')[0]).toBe('00'); // the empty option goes once it is
  });

  it('take the step they are given, every minute by default', () => {
    menus = createTimeSelect(host, { locale: 'en-GB' });
    expect(options('minute')).toHaveLength(61); // 60 minutes, plus '--'
    menus.update({ minuteStep: 15, value: Temporal.PlainTime.from('09:00') });
    expect(options('minute')).toEqual(['00', '15', '30', '45']);
  });

  it('build the time one menu at a time', () => {
    const onChange = vi.fn();
    menus = createTimeSelect(host, { locale: 'en-GB', minuteStep: 5, onChange });
    pick('hour', '14');
    pick('minute', '45');
    expect(menus.value!.toString()).toBe('14:45:00');
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(menu('hour').value).toBe('14');
  });

  it('keep to the bounds, hour by hour', () => {
    menus = createTimeSelect(host, { locale: 'en-GB', minTime: '08:30', maxTime: '17:00', minuteStep: 30 });
    expect(options('hour')).toEqual(['--', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17']);
    pick('hour', '8');
    expect(options('minute')).toEqual(['30']);
  });

  it('add a menu for the half of the day where the locale asks for one', () => {
    menus = createTimeSelect(host, { locale: 'en-US', value: Temporal.PlainTime.from('13:30') });
    // Midnight reads as 12 on a 12-hour clock; nothing is empty here, since
    // a time is already chosen.
    expect(options('hour')[0]).toBe('12');
    expect(menu('meridiem').value).toBe('PM');

    pick('meridiem', 'AM');
    expect(menus.value!.toString()).toBe('01:30:00');
    expect(host.querySelector('select[data-part="meridiem"]')).not.toBeNull();
  });

  it('speak the language they are given, and stop when disabled', () => {
    menus = createTimeSelect(host, { locale: 'fr-FR', messages: FR, disabled: true });
    expect(menu('hour').getAttribute('aria-label')).toBe('Heure');
    expect(menu('hour').disabled).toBe(true);
  });
});

describe('inside the date-and-time field', () => {
  it('is the third way to ask, next to the compact field and the day’s slots', () => {
    const field = createDateTimeField(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      timeLayout: 'select',
      minuteStep: 15,
      today: Temporal.PlainDate.from('2026-06-15'),
    });
    field.open();
    const panel = document.querySelector('.tz-field__panel')!;
    panel.querySelector<HTMLButtonElement>('[data-date="2026-06-17"]')!.click();
    for (const [part, value] of [['hour', '14|'], ['minute', '45']] as const) {
      const select = panel.querySelector<HTMLSelectElement>(`select[data-part="${part}"]`)!;
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    expect(field.value!.toString()).toBe('2026-06-17T12:45:00Z');
    field.destroy();
  });
});

describe('the day the menus are choosing on', () => {
  const paris = 'Europe/Paris';
  const hours = () => Array.from(menu('hour').options).map((o) => o.textContent);

  it('does not offer the hour the clocks skip', () => {
    // 02:00 does not exist in Paris on 29 March 2026.
    menus = createTimeSelect(host, {
      locale: 'en-GB',
      date: '2026-03-29',
      timeZone: paris,
      minuteStep: 30,
    });
    expect(hours()).not.toContain('02');
    expect(hours()).toContain('01');
    expect(hours()).toContain('03');
    expect(hours()).toHaveLength(24); // 23 hours that day, plus '--'
  });

  it('offers the hour that happens twice, once per reading', () => {
    menus = createTimeSelect(host, {
      locale: 'en-GB',
      date: '2026-10-25',
      timeZone: paris,
      minuteStep: 30,
    });
    // Named rather than numbered: nobody books a room at UTC+02:00.
    expect(hours()).toContain('02 — summer');
    expect(hours()).toContain('02 — winter');
    expect(hours().filter((h) => h?.startsWith('02'))).toHaveLength(2);
  });

  it('a chosen reading travels with the hour', () => {
    const onChange = vi.fn();
    menus = createTimeSelect(host, {
      locale: 'en-GB',
      date: '2026-10-25',
      timeZone: paris,
      minuteStep: 30,
      onChange,
    });
    pick('hour', '2|+01:00');
    expect(onChange.mock.calls.at(-1)).toEqual([expect.anything(), '+01:00']);
    expect(menus.value!.toString()).toBe('02:00:00');
    expect(menu('hour').value).toBe('2|+01:00');
  });

  it('offers only the minutes that hour really has', () => {
    // Lord Howe moves its clocks by half an hour: 02:00 to 02:29 vanish.
    menus = createTimeSelect(host, {
      locale: 'en-GB',
      date: '2026-10-04',
      timeZone: 'Australia/Lord_Howe',
      minuteStep: 15,
    });
    pick('hour', '2|');
    expect(Array.from(menu('minute').options).map((o) => o.textContent)).toEqual(['30', '45']);
    expect(menus.value!.toString()).toBe('02:30:00');
  });

  it('offers a plain day in full', () => {
    menus = createTimeSelect(host, { locale: 'en-GB', date: '2026-06-15', timeZone: paris, minuteStep: 60 });
    expect(hours()).toHaveLength(25); // 24 hours, plus '--'
  });
});
