import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance, type RangeFieldValue } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * A shortcut that stays a shortcut.
 *
 * "The last seven days" was resolved at the moment of the click and the name
 * thrown away, so a filter stored on Monday and reopened on Friday was a fixed
 * window that had quietly stopped being the last seven days. The name travels
 * with the value now, and handing it back resolves it again.
 */
const paris = 'Europe/Paris';
let host: HTMLElement;
let field: RangeFieldInstance;
const reported: { value: RangeFieldValue; preset: string | null }[] = [];

const make = (today: string, options = {}) => {
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'fr-FR',
    messages: FR,
    today: Temporal.PlainDate.from(today),
    months: 1,
    presets: ['last7Days', 'yesterday'],
    onChange: (value, from) => reported.push({ value, preset: from.preset }),
    ...options,
  });
};
const shortcut = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('.tz-field__panel .tz-rangefield__preset')].find(
    (b) => b.textContent === label,
  )!;
const days = () => {
  const { start, end } = field.value;
  const d = (i: typeof start) => i!.toZonedDateTimeISO(paris).toPlainDate().toString();
  return `${d(start)} → ${d(end)}`;
};

beforeEach(() => { host = document.createElement('div'); document.body.append(host); reported.length = 0; });
afterEach(() => { field?.destroy(); host.remove(); document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove()); });

describe('the name of a shortcut', () => {
  it('is reported beside the period', () => {
    make('2026-09-25');
    field.open();
    shortcut('7 derniers jours').click();
    expect(reported).toHaveLength(1);
    expect(reported[0]!.preset).toBe('last7Days');
  });

  it('is dropped as soon as a day is chosen by hand', () => {
    make('2026-09-25');
    field.open();
    shortcut('7 derniers jours').click();
    field.open();
    document.querySelector<HTMLButtonElement>('.tz-field__panel .tz-range__day[data-date="2026-09-10"]')!.click();
    // Whatever it coincides with, it is a period of its own now.
    expect(reported.at(-1)!.preset).toBe(null);
  });

  it('means today’s seven days when it is handed back, not the day it was stored', () => {
    // Stored on the 25th…
    make('2026-09-25');
    field.open();
    shortcut('7 derniers jours').click();
    const stored = reported.at(-1)!;
    expect(stored.preset).toBe('last7Days');
    field.destroy();
    host.replaceChildren();

    // …and reopened four days later. A value alone would still read the 18th.
    reported.length = 0;
    make('2026-09-29');
    field.update({ preset: stored.preset });
    // Seven days ending today, the end exclusive: 23 to 29 inclusive.
    expect(days()).toBe('2026-09-23 → 2026-09-30');
    expect(reported.at(-1)!.preset).toBe('last7Days');
  });

  it('wins over a value handed in beside it', () => {
    make('2026-09-29');
    field.update({
      preset: 'last7Days',
      value: { start: Temporal.Instant.from('2020-01-01T00:00:00Z'), end: Temporal.Instant.from('2020-01-02T00:00:00Z') },
    });
    expect(days()).toBe('2026-09-23 → 2026-09-30');
  });

  it('is left alone when the screen hands back a value and no name', () => {
    make('2026-09-29');
    field.update({
      value: { start: Temporal.Instant.from('2026-09-21T22:00:00Z'), end: Temporal.Instant.from('2026-09-25T22:00:00Z') },
    });
    expect(days()).toBe('2026-09-22 → 2026-09-26');
  });
});

describe('a bound that holds an hour', () => {
  it('clamps a moment past the ceiling instead of refusing it', () => {
    // "Nothing after 18:00 today" was inexpressible: the bounds were dates in
    // a library built on the difference between a date and a moment.
    make('2026-09-25', {
      showTime: true,
      max: Temporal.Instant.from('2026-09-25T16:00:00Z'), // 18:00 Paris
      presets: [],
    });
    field.open();
    document.querySelector<HTMLButtonElement>('.tz-field__panel .tz-range__day[data-date="2026-09-25"]')!.click();
    const end = field.value.start!.toZonedDateTimeISO(paris);
    expect(`${end.hour}:${String(end.minute).padStart(2, '0')}`).toBe('0:00');

    // Typing past the ceiling gives the ceiling, the way maxSpan does.
    const input = document.querySelector<HTMLInputElement>('.tz-field__panel .tz-dateinput__input')!;
    input.value = '25/09/2026';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(Temporal.Instant.compare(field.value.start!, Temporal.Instant.from('2026-09-25T16:00:00Z'))).toBeLessThanOrEqual(0);
  });

  it('still greys the days beyond it', () => {
    make('2026-09-25', { max: Temporal.Instant.from('2026-09-25T16:00:00Z'), presets: [] });
    field.open();
    const beyond = document.querySelector<HTMLButtonElement>('.tz-field__panel .tz-range__day[data-date="2026-09-26"]')!;
    expect(beyond.disabled).toBe(true);
  });
});
