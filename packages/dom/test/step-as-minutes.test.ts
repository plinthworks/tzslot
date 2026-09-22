import { describe, it, expect, afterEach } from 'vitest';
import { Temporal, asShiftStep } from '@tzslot/core';
import { createRangeField } from '../src/range-field.js';

/**
 * A step written as a plain number is minutes.
 *
 * `15` is a quarter of an hour, `60` an hour, `1440` a day. Seconds are not
 * offered: an arrow that moves a booking by a second is an arrow nobody
 * presses. Anything a number cannot say is said in full.
 */
const paris = 'Europe/Paris';
let field: ReturnType<typeof createRangeField> | null = null;

const mount = (shift: unknown) => {
  const host = document.createElement('div');
  document.body.append(host);
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    shift: shift as never,
    value: {
      start: Temporal.Instant.from('2026-09-21T22:00:00Z'), // 22 Sept 00:00
      end: Temporal.Instant.from('2026-09-22T22:00:00Z'), // 23 Sept 00:00
    },
  });
  return { host, field };
};
const forward = (host: HTMLElement) =>
  host.querySelector<HTMLButtonElement>('.tz-field__shift--next')!.click();
const reads = (host: HTMLElement) => host.querySelector('.tz-field__text')!.textContent;

afterEach(() => {
  field?.destroy();
  field = null;
  document.body.replaceChildren();
});

describe('a number is minutes', () => {
  it('converts on its own', () => {
    expect(asShiftStep(15)).toEqual({ minutes: 15 });
    expect(asShiftStep(60)).toEqual({ minutes: 60 });
    expect(asShiftStep({ months: 1 })).toEqual({ months: 1 });
  });

  it('60 is an hour', () => {
    const { host } = mount(60);
    forward(host);
    expect(reads(host)).toBe('22/09/2026 01:00 – 23/09/2026 01:00');
  });

  it('15 is a quarter of an hour', () => {
    const { host } = mount(15);
    forward(host);
    expect(reads(host)).toBe('22/09/2026 00:15 – 23/09/2026 00:15');
  });

  it('1440 is a day, and stays whole days', () => {
    const { host } = mount(1440);
    forward(host);
    expect(reads(host)).toBe('23/09/2026');
  });

  it('and a menu takes numbers too', () => {
    const { host } = mount([
      { step: 15, label: '15 min' },
      { step: 60, label: '1 h' },
    ]);
    expect(host.querySelector('.tz-field__step')!.textContent).toBe('15 min');
    forward(host);
    expect(reads(host)).toBe('22/09/2026 00:15 – 23/09/2026 00:15');
  });
});
