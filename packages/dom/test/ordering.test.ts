import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance, type RangeFieldValue } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * A period never runs backwards.
 *
 * The calendar's own swap logic is bypassed in this widget, because a click
 * fills the armed field and nothing else — which is the whole point of having
 * two. That left one way to emit `start > end`: arm a field and click past
 * the other end. Nothing said so, and a consumer's
 * `at >= :from AND at < :to` then returns nothing at all.
 */
const paris = 'Europe/Paris';
let host: HTMLElement;
let field: RangeFieldInstance;
let reported: RangeFieldValue[];

const make = (options = {}) => {
  reported = [];
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    today: Temporal.PlainDate.from('2026-09-21'),
    presets: [],
    onChange: (value) => reported.push(value),
    ...options,
  });
};
const panel = () => document.querySelector('.tz-field__panel')!;
const shown = () => host.querySelector('.tz-field__text')!.textContent;
const day = (iso: string) => panel().querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
const armStart = () =>
  panel().querySelectorAll<HTMLInputElement>('.tz-dateinput__input')[0]!.dispatchEvent(new Event('focus'));
const inOrder = () => {
  const { start, end } = field.value;
  return !start || !end || Temporal.Instant.compare(start, end) <= 0;
};

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((node) => node.remove());
});

describe('a start pushed past the end', () => {
  it('drops the end that has become impossible, and asks for it again', () => {
    make();
    field.open();
    day('2026-09-10').click();
    day('2026-09-20').click();
    field.open();

    armStart();
    day('2026-09-25').click();

    // A new period begun, not a period of no length: the end is what to fill
    // next, and it is armed.
    expect(shown()).toBe('25/09/2026 – …');
    expect(field.value.end).toBe(null);
    expect(inOrder()).toBe(true);
    expect(reported.every((v) => !v.start || !v.end || Temporal.Instant.compare(v.start, v.end) <= 0)).toBe(true);
  });

  it('and an end pulled before the start does the same', () => {
    make();
    field.open();
    day('2026-09-10').click();
    day('2026-09-20').click();
    field.open();

    panel().querySelectorAll<HTMLInputElement>('.tz-dateinput__input')[1]!.dispatchEvent(new Event('focus'));
    day('2026-09-05').click();
    expect(field.value.start).toBe(null);
    expect(inOrder()).toBe(true);
  });

  it('with hours, the same: the impossible end is dropped', () => {
    make({ showTime: true, timeLayout: 'input' });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-18T08:00:00Z'), // 10:00
        end: Temporal.Instant.from('2026-09-18T15:00:00Z'), // 17:00
        allDay: false,
      },
    });
    field.open();
    armStart();
    day('2026-09-25').click();

    expect(inOrder()).toBe(true);
    expect(field.value.end).toBe(null);
    expect(shown()).toBe('25/09/2026 10:00 – …');
  });

  it('a locked end refuses the move instead of running backwards', () => {
    make({ disabled: { end: true } });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-09T22:00:00Z'), // 10 Sept
        end: Temporal.Instant.from('2026-09-20T22:00:00Z'), // 20 Sept
        allDay: true,
      },
    });
    field.open();
    armStart();
    day('2026-09-25').click();

    expect(shown()).toBe('10/09/2026 – 20/09/2026'); // unchanged
    expect(inOrder()).toBe(true);
  });
});
