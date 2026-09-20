import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDateTimeField, FR, type DateTimeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

const paris = 'Europe/Paris';
let host: HTMLElement;
let field: DateTimeFieldInstance;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
});

const mount = (o = {}) =>
  (field = createDateTimeField(host, { timeZone: paris, locale: 'en-GB', ...o }));
const panel = () => document.querySelector<HTMLElement>('.tz-field__panel');
const trigger = () => host.querySelector<HTMLButtonElement>('.tz-field__trigger')!;
const day = (iso: string) => panel()!.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
const timeBox = (part: 'hour' | 'minute') =>
  panel()!.querySelector<HTMLInputElement>(`[data-part="${part}"].tz-time__input`)!;
const typeTime = (part: 'hour' | 'minute', text: string) => {
  const b = timeBox(part);
  b.focus();
  b.value = text;
  b.dispatchEvent(new Event('input', { bubbles: true }));
  b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
};
const readings = () =>
  Array.from(panel()!.querySelectorAll<HTMLButtonElement>('.tz-datetime__reading'));
const note = () => panel()!.querySelector<HTMLElement>('.tz-datetime__note')!;

describe('choosing a moment', () => {
  it('takes a day and a time, and stays open in between', () => {
    const onChange = vi.fn();
    mount({ onChange, today: Temporal.PlainDate.from('2026-06-15') });
    field.open();

    day('2026-06-17').click();
    expect(panel()).not.toBeNull(); // a date alone is not a moment
    typeTime('hour', '14');
    typeTime('minute', '30');

    // 14:30 in Paris in June is 12:30 UTC.
    expect(field.value!.toString()).toBe('2026-06-17T12:30:00Z');
    expect(onChange.mock.calls.at(-1)![0].toString()).toBe('2026-06-17T12:30:00Z');
    expect(trigger().textContent).toContain('17 Jun 2026');
    expect(trigger().textContent).toContain('14:30');
  });

  it('shows what it is given, read on the zone’s clocks', () => {
    mount({ value: Temporal.Instant.from('2026-06-17T12:30:00Z') });
    expect(trigger().textContent).toContain('14:30');
    field.open();
    expect(timeBox('hour').value).toBe('14');
    expect(day('2026-06-17').classList.contains('tz-cal__day--selected')).toBe(true);
  });

  it('clear empties it', () => {
    const onChange = vi.fn();
    mount({ value: Temporal.Instant.from('2026-06-17T12:30:00Z'), onChange });
    field.clear();
    expect(field.value).toBeNull();
    expect(onChange).toHaveBeenCalledWith(null);
    expect(trigger().textContent).toContain('Choose a date and a time');
  });
});

describe('the hour the clocks skip', () => {
  it('moves to the first moment that exists, and says why', () => {
    // 02:30 does not exist in Paris on 29 March 2026.
    mount({ today: Temporal.PlainDate.from('2026-03-29') });
    field.open();
    day('2026-03-29').click();
    // The minutes first: 02:00 alone is already skipped, and correcting it
    // would make the next keystroke an ordinary time.
    typeTime('minute', '30');
    typeTime('hour', '02');

    expect(field.value!.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('03:30:00');
    expect(note().hidden).toBe(false);
    expect(note().textContent).toContain('does not exist');
    expect(timeBox('hour').value).toBe('03');
  });
});

describe('the hour that happens twice', () => {
  it('offers both readings by their offset instead of guessing', () => {
    // 02:30 happens twice in Paris on 25 October 2026.
    mount({ today: Temporal.PlainDate.from('2026-10-25') });
    field.open();
    day('2026-10-25').click();
    typeTime('hour', '02');
    typeTime('minute', '30');

    expect(readings().map((b) => b.textContent)).toEqual(['UTC+02:00', 'UTC+01:00']);
    expect(note().textContent).toContain('happens twice');
    // The first reading is shown, but the choice is the user's.
    expect(field.value!.toString()).toBe('2026-10-25T00:30:00Z');

    readings()[1]!.click();
    expect(field.value!.toString()).toBe('2026-10-25T01:30:00Z');
    expect(readings()[1]!.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the explanation when the value it just reported is handed back', () => {
    // An Angular or React wrapper does exactly this on every change; the
    // browser showed the note vanishing a frame after it appeared.
    mount({ today: Temporal.PlainDate.from('2026-10-25') });
    field.open();
    day('2026-10-25').click();
    typeTime('minute', '30');
    typeTime('hour', '02');
    expect(readings()).toHaveLength(2);

    field.update({ value: field.value });
    expect(readings()).toHaveLength(2);
    expect(note().hidden).toBe(false);
  });

  it('forgets the choice once the moment is ordinary again', () => {
    mount({ today: Temporal.PlainDate.from('2026-10-25') });
    field.open();
    day('2026-10-25').click();
    typeTime('hour', '02');
    typeTime('minute', '30');
    expect(readings()).toHaveLength(2);

    typeTime('hour', '09');
    expect(readings()).toHaveLength(0);
    expect(note().hidden).toBe(true);
  });
});

describe('the list layout', () => {
  it('offers the day’s times to click, the impossible one struck through', () => {
    mount({
      timeLayout: 'list',
      stepMinutes: 60,
      today: Temporal.PlainDate.from('2026-03-29'),
      value: Temporal.Instant.from('2026-03-29T08:00:00Z'),
    });
    field.open();
    const slots = panel()!.querySelectorAll('.tz-slots__slot');
    expect(slots.length).toBeGreaterThan(0);
    expect(panel()!.querySelector('.tz-slots__slot--missing')).not.toBeNull();

    const nine = Array.from(slots).find((b) => b.textContent!.startsWith('09:00')) as HTMLButtonElement;
    nine.click();
    expect(field.value!.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('09:00:00');
  });
});

describe('words', () => {
  it('speaks French when given French', () => {
    mount({ messages: FR, locale: 'fr-FR' });
    expect(trigger().textContent).toContain('Choisir une date et une heure');
    field.open();
    expect(panel()!.querySelector('.tz-datetime__label')!.textContent).toBe('Heure');
  });
});
