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
  it('offers both readings by name instead of guessing', () => {
    // 02:30 happens twice in Paris on 25 October 2026.
    mount({ today: Temporal.PlainDate.from('2026-10-25') });
    field.open();
    day('2026-10-25').click();
    typeTime('hour', '02');
    typeTime('minute', '30');

    // The words that tell the two apart, with the full name on hover.
    expect(readings().map((b) => b.textContent)).toEqual(['Summer', 'Standard']);
    expect(readings()[0]!.title).toBe('Central European Summer Time (UTC+02:00)');
    expect(note().textContent).toContain('happens twice');
    // And which of the two stands, since the field shows 02:30 either way.
    expect(note().textContent).toContain('Central European Summer Time (UTC+02:00)');
    // The first reading is shown, but the choice is the user's.
    expect(field.value!.toString()).toBe('2026-10-25T00:30:00Z');

    readings()[1]!.click();
    expect(field.value!.toString()).toBe('2026-10-25T01:30:00Z');
    expect(readings()[1]!.getAttribute('aria-pressed')).toBe('true');
    expect(note().textContent).toContain('Central European Standard Time (UTC+01:00)');
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

  it('letters never make it into the text at all', () => {
    // The mask keeps the field to what its pattern can hold, like a card field.
    mount({ value: Temporal.Instant.from('2026-06-17T12:30:00Z') });
    const box = trigger() as HTMLInputElement;
    box.focus();
    box.value = '17/06/2026 14:30x';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    expect(box.value).toBe('17/06/2026 14:30');
  });

  it('the separators appear as the figures are typed', () => {
    mount({});
    const box = trigger() as HTMLInputElement;
    box.focus();
    for (const [typed, shown] of [
      ['2', '2'],
      ['20', '20/'],
      ['2009', '20/09/'],
      ['20092026', '20/09/2026 '],
      ['200920260915', '20/09/2026 09:15'],
    ] as const) {
      box.value = typed;
      box.dispatchEvent(new Event('input', { bubbles: true }));
      expect(box.value).toBe(shown);
    }
    expect(field.value!.toZonedDateTimeISO(paris).toPlainDateTime().toString()).toBe('2026-09-20T09:15:00');
  });

  it('a date that cannot exist is refused, and the field goes back to the last moment', () => {
    const onChange = vi.fn();
    mount({ value: Temporal.Instant.from('2026-06-17T12:30:00Z'), onChange });
    const box = trigger() as HTMLInputElement;
    box.focus();
    box.value = '32/13/2026 99:99';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(box.getAttribute('aria-invalid')).toBe('true');
    expect(field.value!.toString()).toBe('2026-06-17T12:30:00Z');

    box.dispatchEvent(new FocusEvent('blur'));
    expect(shown()).toBe('17/06/2026 14:30');
    expect(box.hasAttribute('aria-invalid')).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('opens on a click, on ArrowDown, and again after Escape', () => {
    // Not on focus: Escape hands the focus back, and a field that opened on
    // focus would open straight back — Escape would close nothing.
    mount({});
    const box = trigger() as HTMLInputElement;
    box.dispatchEvent(new FocusEvent('focus'));
    expect(panel()).toBeNull();

    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(panel()).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel()).toBeNull();

    box.click();
    expect(panel()).not.toBeNull();
  });

  it('the pattern is never the placeholder', () => {
    mount({});
    expect((trigger() as HTMLInputElement).placeholder).toBe('Choose a date and a time');
    field.update({ placeholder: 'When?' });
    expect((trigger() as HTMLInputElement).placeholder).toBe('When?');
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

describe('the panel brings its own styles', () => {
  it('even on a page with no other calendar on it', () => {
    // Everything in the panel is created with injectStyles: false, so the
    // panel itself has to carry them. It did not, and the interval tab —
    // whose only calendars live inside panels — came up unstyled.
    document.head.querySelectorAll('style[data-tzslot]').forEach((style) => style.remove());
    mount({});
    field.open();

    const sheets = Array.from(document.head.querySelectorAll('style[data-tzslot]')).map(
      (style) => (style as HTMLElement).dataset['tzslot'],
    );
    expect(sheets).toContain('calendar');
    expect(sheets).toContain('field');
    expect(sheets).toContain('datetime');
    expect(sheets).toContain('time');
  });
});

describe('a moment whose clock face happens twice', () => {
  const ambiguous = Temporal.Instant.from('2026-10-25T01:30:00Z'); // 02:30 +01:00 in Paris

  it('says which of the two the field holds', () => {
    mount({ value: ambiguous });
    expect(shown()).toBe('25/10/2026 02:30 (Standard)');

    field.update({ value: Temporal.Instant.from('2026-10-25T00:30:00Z') });
    expect(shown()).toBe('25/10/2026 02:30 (Summer)');
  });

  it('says nothing of the sort on an ordinary day', () => {
    mount({ value: Temporal.Instant.from('2026-06-17T12:30:00Z') });
    expect(shown()).toBe('17/06/2026 14:30');
  });

  it('reads the name back, so the text means what it says', () => {
    const onChange = vi.fn();
    mount({ onChange, today: Temporal.PlainDate.from('2026-10-25') });
    const box = trigger() as HTMLInputElement;
    box.focus();
    box.value = '25/10/2026 02:30 (Standard)';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    expect(field.value!.toString()).toBe('2026-10-25T01:30:00Z');

    box.value = '25/10/2026 02:30 (Summer)';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    expect(field.value!.toString()).toBe('2026-10-25T00:30:00Z');
  });

  it('takes the offset in brackets too, and ignores anything else', () => {
    mount({ today: Temporal.PlainDate.from('2026-10-25') });
    const box = trigger() as HTMLInputElement;
    box.focus();
    box.value = '25/10/2026 02:30 (UTC+01:00)';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    expect(field.value!.toString()).toBe('2026-10-25T01:30:00Z');

    box.value = '25/10/2026 02:30 (whatever)';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    expect(field.value!.toString()).toBe('2026-10-25T00:30:00Z'); // the first, as before
  });
});
