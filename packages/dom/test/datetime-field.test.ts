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
const trigger = () => host.querySelector<HTMLInputElement | HTMLButtonElement>('.tz-field__trigger')!;
/** What the field shows: the input's text, or the button's. */
const shown = () => {
  const node = trigger();
  return node instanceof HTMLInputElement ? node.value : (node.textContent ?? '');
};
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
    // Typable by default, so it writes what it would read back: 17/06/2026 14:30.
    expect(shown()).toBe('17/06/2026 14:30');
  });

  it('shows what it is given, read on the zone’s clocks', () => {
    mount({ value: Temporal.Instant.from('2026-06-17T12:30:00Z') });
    expect(shown()).toContain('14:30');
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
    expect(shown()).toBe('');
  });
});

describe('a day chosen with no time yet', () => {
  it('starts at midnight, so a date is already a moment', () => {
    const onChange = vi.fn();
    mount({ onChange, today: Temporal.PlainDate.from('2026-06-15') });
    field.open();
    day('2026-06-17').click();

    expect(field.value!.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('00:00:00');
    expect(onChange.mock.calls.at(-1)![0].toString()).toBe('2026-06-16T22:00:00Z');
    expect(shown()).toBe('17/06/2026 00:00');
  });

  it('starts at the time it is told to, or at minTime when that is later', () => {
    mount({ defaultTime: '09:00', today: Temporal.PlainDate.from('2026-06-15') });
    field.open();
    day('2026-06-17').click();
    expect(field.value!.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('09:00:00');

    field.update({ value: null, minTime: '14:00' });
    field.open();
    day('2026-06-18').click();
    expect(field.value!.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('14:00:00');
  });

  it('leaves a time already chosen alone', () => {
    mount({ value: Temporal.Instant.from('2026-06-17T12:30:00Z') });
    field.open();
    day('2026-06-19').click();
    expect(field.value!.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('14:30:00');
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
    mount({ messages: FR, locale: 'fr-FR', editable: false, timeLayout: 'list', stepMinutes: 60 });
    expect(shown()).toContain('Choisir une date et une heure');
    field.open();
    expect(panel()!.querySelector('.tz-datetime__label')!.textContent).toBe('Heure');
  });
});

describe('typing in the field', () => {
  it('does not report a change when the text is merely re-read', () => {
    // Opening the panel moves the focus out of the field, which re-reads it.
    const onChange = vi.fn();
    mount({ value: Temporal.Instant.from('2026-06-17T12:30:00Z'), onChange });
    (trigger() as HTMLInputElement).focus();
    (trigger() as HTMLInputElement).dispatchEvent(new FocusEvent('blur'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reads what it writes, and the calendar follows the text', () => {
    const onChange = vi.fn();
    mount({ onChange, today: Temporal.PlainDate.from('2026-06-15') });
    const box = trigger() as HTMLInputElement;
    box.focus();
    box.value = '17/06/2026 14:30';
    box.dispatchEvent(new Event('input', { bubbles: true }));

    expect(field.value!.toString()).toBe('2026-06-17T12:30:00Z');
    expect(day('2026-06-17').classList.contains('tz-cal__day--selected')).toBe(true);
    expect(onChange).toHaveBeenCalled();
  });

  it('takes the pattern it is given, both ways', () => {
    mount({ format: 'yyyy-MM-dd HH:mm', value: Temporal.Instant.from('2026-06-17T12:30:00Z') });
    expect(shown()).toBe('2026-06-17 14:30');

    const box = trigger() as HTMLInputElement;
    box.focus();
    box.value = '2026-07-01 08:00';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    expect(field.value!.toZonedDateTimeISO(paris).toPlainDateTime().toString()).toBe('2026-07-01T08:00:00');
  });

  it('what cannot be read is refused, and the field goes back to the last moment', () => {
    const onChange = vi.fn();
    mount({ value: Temporal.Instant.from('2026-06-17T12:30:00Z'), onChange });
    const box = trigger() as HTMLInputElement;
    box.focus();
    box.value = 'demain matin';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(box.getAttribute('aria-invalid')).toBe('true');
    expect(field.value!.toString()).toBe('2026-06-17T12:30:00Z');

    box.dispatchEvent(new FocusEvent('blur'));
    expect(shown()).toBe('17/06/2026 14:30');
    expect(box.hasAttribute('aria-invalid')).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a date outside the bounds is refused too', () => {
    mount({
      value: Temporal.Instant.from('2026-06-17T12:30:00Z'),
      max: Temporal.PlainDate.from('2026-06-30'),
    });
    const box = trigger() as HTMLInputElement;
    box.focus();
    box.value = '17/09/2026 14:30';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    expect(field.value!.toString()).toBe('2026-06-17T12:30:00Z');
  });

  it('emptying it clears the moment', () => {
    const onChange = vi.fn();
    mount({ value: Temporal.Instant.from('2026-06-17T12:30:00Z'), onChange });
    const box = trigger() as HTMLInputElement;
    box.focus();
    box.value = '';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.dispatchEvent(new FocusEvent('blur'));
    expect(field.value).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('a plain button instead, when the text is only to be read', () => {
    mount({ editable: false, value: Temporal.Instant.from('2026-06-17T12:30:00Z') });
    expect(trigger()).toBeInstanceOf(HTMLButtonElement);
    expect(shown()).toContain('17 Jun 2026');
  });
});
