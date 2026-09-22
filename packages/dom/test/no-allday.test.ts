import { describe, it, expect, afterEach } from 'vitest';
import { Temporal } from '@tzslot/core';
import { createRangeField, type RangeFieldValue } from '../src/range-field.js';

/**
 * A period is two moments and nothing else.
 *
 * There used to be an `allDay` flag on the value, set by whoever built it and
 * forgotten by everyone handed one: a screen that computed 09:00 to 18:00 and
 * left it out had its hours hidden, silently. Whether a period is whole days
 * is read off the moments instead.
 */
const paris = 'Europe/Paris';
const at = (iso: string) => Temporal.Instant.from(iso);
let host: HTMLElement;
type Field = ReturnType<typeof createRangeField>;
let field: Field | null = null;

const mount = (options: Record<string, unknown>): Field => {
  host = document.createElement('div');
  document.body.append(host);
  field = createRangeField(host, { timeZone: paris, locale: 'en-GB', ...options });
  return field;
};
const shown = () => host.querySelector('.tz-field__text, .tz-field__trigger')!.textContent!.replace('▾', '').trim();
const panel = () => document.querySelector<HTMLElement>('.tz-field__panel')!;
const day = (iso: string) => panel().querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;

afterEach(() => {
  field?.destroy();
  field = null;
  document.body.replaceChildren();
});

describe('a period is two moments, with no flag', () => {
  it('hours handed in are shown, with nothing extra to remember', () => {
    mount({ showTime: true, value: { start: at('2026-09-21T07:00:00Z'), end: at('2026-09-25T16:00:00Z') } });
    expect(shown()).toBe('21/09/2026 09:00 – 25/09/2026 18:00');
  });

  it('and the same value on a day-only screen reads as the days it covers', () => {
    mount({ showTime: false, value: { start: at('2026-09-20T22:00:00Z'), end: at('2026-09-25T22:00:00Z') } });
    expect(shown()).toBe('21/09/2026 – 25/09/2026');
  });

  it('a day clicked as the end means all of it, hours on screen or not', () => {
    const f = mount({ showTime: true, today: Temporal.PlainDate.from('2026-09-14') });
    f.open();
    day('2026-09-14').click();
    day('2026-09-20').click();
    // Read as "the 20th at 00:00" this would have dropped the day just clicked.
    expect(f.value.end!.toZonedDateTimeISO(paris).toPlainDate().toString()).toBe('2026-09-21');
  });

  it('an hour the screen named takes over from the whole-day reading', () => {
    const f = mount({
      showTime: true,
      defaultTimes: { start: '09:00', end: '18:00' },
      today: Temporal.PlainDate.from('2026-09-14'),
    });
    f.open();
    day('2026-09-14').click();
    day('2026-09-20').click();
    expect(shown()).toBe('14/09/2026 09:00 – 20/09/2026 18:00');
  });

  it('a shortcut of whole days keeps its last day on a screen showing hours', () => {
    const f = mount({ showTime: true, presets: ['thisWeek'], today: Temporal.PlainDate.from('2026-09-22') });
    f.open();
    panel().querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();
    // Monday the 21st to the instant the 28th opens: seven days, none dropped.
    expect(f.value.start!.toZonedDateTimeISO(paris).toPlainDate().toString()).toBe('2026-09-21');
    expect(f.value.end!.toZonedDateTimeISO(paris).toPlainDate().toString()).toBe('2026-09-28');
  });

  it('a value with hours is never silently read as whole days', () => {
    // The trap the flag created: this is the value that used to lose its hours.
    mount({ showTime: true, value: { start: at('2026-09-21T07:00:00Z'), end: at('2026-09-25T16:00:00Z') } });
    expect(shown()).toContain('09:00');
    expect(shown()).toContain('18:00');
  });
});
