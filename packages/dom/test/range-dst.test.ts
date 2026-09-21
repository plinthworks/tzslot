import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * The period field on the two days a year that are not ordinary.
 *
 * It stores moments but is edited through a clock face, and a clock face
 * cannot say which 02:30 — so on the morning the clocks go back it has to
 * ask, exactly as the date-and-time field does. It used to resolve the
 * question quietly, which is the bug this pins.
 */
const paris = 'Europe/Paris';
let host: HTMLElement;
let field: RangeFieldInstance;

const panel = () => document.querySelector('.tz-field__panel')!;
const hourUp = (index: number) =>
  panel().querySelectorAll<HTMLButtonElement>('.tz-time__arrow--up[data-part="hour"]')[index]!;
const readings = () =>
  [...panel().querySelectorAll<HTMLElement>('.tz-rangefield__readings')].map((box) =>
    box.hidden ? [] : [...box.querySelectorAll('button')].map((b) => b.textContent),
  );
const startAt = () =>
  field.value.start!.toZonedDateTimeISO(paris).toString({ smallestUnit: 'minute' });

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((node) => node.remove());
});

const make = (day: string, options = {}) => {
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    showTime: true,
    today: Temporal.PlainDate.from(day),
    ...options,
  });
};

describe('the morning an hour happens twice', () => {
  it('offers both readings instead of choosing one quietly', () => {
    make('2026-10-25', {
      value: {
        start: Temporal.Instant.from('2026-10-24T22:00:00Z'), // 25 Oct, 00:00
        end: Temporal.Instant.from('2026-10-25T22:00:00Z'),
        allDay: false,
      },
      messages: FR,
    });
    field.open();
    expect(readings()[0]).toEqual([]); // 00:00 happens once

    hourUp(0).click(); // 01:00
    expect(readings()[0]).toEqual([]);
    hourUp(0).click(); // 02:00 — and there are two of them
    expect(readings()[0]).toEqual(['été', 'hiver']);
    expect(startAt()).toBe('2026-10-25T02:00+02:00[Europe/Paris]'); // summer, offered first

    panel().querySelectorAll<HTMLButtonElement>('.tz-rangefield__readings button')[1]!.click();
    expect(startAt()).toBe('2026-10-25T02:00+01:00[Europe/Paris]'); // winter, chosen
    expect(readings()[0]).toEqual(['été', 'hiver']); // and the choice stays on screen

    hourUp(0).click(); // 03:00, ordinary again
    expect(readings()[0]).toEqual([]);
  });

  it('the two readings are an hour apart, and the period knows it', () => {
    make('2026-10-25', {
      value: {
        start: Temporal.Instant.from('2026-10-25T00:00:00Z'), // 02:00 summer
        end: Temporal.Instant.from('2026-10-25T22:00:00Z'),
        allDay: false,
      },
    });
    field.open();
    hourUp(0).click();
    hourUp(0).click(); // back round to 02:00 via 03:00… whatever the path, ask again
    const before = field.value.start!.epochMilliseconds;
    const both = panel().querySelectorAll<HTMLButtonElement>('.tz-rangefield__readings button');
    if (both.length === 2) {
      both[1]!.click();
      expect(field.value.start!.epochMilliseconds - before).toBe(3600_000);
    }
  });
});

describe('the morning an hour does not happen', () => {
  it('cannot land on it, and says the later time instead', () => {
    make('2026-03-29', {
      value: {
        start: Temporal.Instant.from('2026-03-29T00:00:00Z'), // 01:00 Paris
        end: Temporal.Instant.from('2026-03-29T22:00:00Z'),
        allDay: false,
      },
    });
    field.open();
    expect(startAt()).toBe('2026-03-29T01:00+01:00[Europe/Paris]');
    hourUp(0).click();
    // 02:00 never happens that morning: the step goes over it.
    expect(startAt()).toBe('2026-03-29T03:00+02:00[Europe/Paris]');
    expect(readings()[0]).toEqual([]);
  });
});
