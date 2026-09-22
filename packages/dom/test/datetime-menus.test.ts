import { describe, it, expect, afterEach } from 'vitest';
import { Temporal } from '@tzslot/core';
import { createDateTimeField } from '../src/datetime-field.js';

/**
 * The hour menu of a date-and-time field.
 *
 * Its options are keyed by hour *and* reading — "10|" on an ordinary day,
 * "2|+02:00" and "2|+01:00" on the morning one happens twice. Naming a reading
 * where there is only one matches no option, and the menu shows a blank over a
 * field that reads 10:15. The interval field was fixed for this; this one was
 * not, and shipped in 1.0.0.
 */
const paris = 'Europe/Paris';
let field: { destroy(): void } | null = null;

const open = (value: string, extra: Record<string, unknown> = {}) => {
  const host = document.createElement('div');
  document.body.append(host);
  const f = createDateTimeField(host, {
    timeZone: paris,
    locale: 'fr-FR',
    timeLayout: 'select',
    minuteStep: 15,
    value: Temporal.Instant.from(value),
    ...extra,
  } as never);
  field = f;
  f.open();
  return [...document.querySelectorAll<HTMLSelectElement>('.tz-field__panel select')];
};

afterEach(() => {
  field?.destroy();
  field = null;
  document.body.replaceChildren();
});

describe('the hour menu shows the hour it holds', () => {
  it('on an ordinary day', () => {
    const [hour, minute] = open('2026-09-22T08:15:00Z'); // 10:15 in Paris
    expect(hour!.value).toBe('10|');
    expect(minute!.value).toBe('15');
    expect(hour!.selectedOptions[0]!.textContent).toBe('10');
  });

  it('at midnight, where an empty menu would look like an empty value', () => {
    const [hour] = open('2026-09-21T22:00:00Z'); // 22 Sept, 00:00 in Paris
    expect(hour!.value).toBe('0|');
  });

  it('and still tells the two readings apart the morning one repeats', () => {
    // 02:30 twice in Paris on 25 October 2026: this is the first, +02:00.
    const [hour] = open('2026-10-25T00:30:00Z');
    expect(hour!.value).toBe('2|+02:00');
    const keys = [...hour!.options].map((o) => o.value);
    expect(keys).toContain('2|+02:00');
    expect(keys).toContain('2|+01:00');
  });

  it('the second reading of that hour is the other option', () => {
    const [hour] = open('2026-10-25T01:30:00Z'); // the same clock face, an hour later
    expect(hour!.value).toBe('2|+01:00');
  });
});
