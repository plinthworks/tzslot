import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, createDateTimeRange, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * The zones whose clocks go forward at midnight.
 *
 * Santiago and Havana spring forward *at* midnight: the day begins at 01:00
 * and the wall time 00:00 never happens that morning. Every whole-day range
 * in the library used to decide "does this end open a day?" by comparing the
 * clock face with 00:00, which is false there — so a one-day period read as
 * two, the calendar lit two cells, and the next press of an arrow moved a
 * range that had silently grown.
 *
 * Ninety-nine of the suite's DST tests are in Paris, which springs forward at
 * 02:00. That is why this went unseen.
 */
const santiago = 'America/Santiago';
let host: HTMLElement;
let field: RangeFieldInstance;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((node) => node.remove());
});

describe('a whole day in a zone whose midnight is skipped', () => {
  it('is one day, on the day the clocks jump', () => {
    // 6 September 2026 begins at 01:00 in Santiago; 00:00 does not exist.
    expect(
      Temporal.PlainDate.from('2026-09-06').toZonedDateTime({ timeZone: santiago }).toPlainTime().toString(),
    ).toBe('01:00:00');

    field = createRangeField(host, {
      timeZone: santiago,
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-05'),
      presets: ['today'],
    });
    field.open();
    document.querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();

    expect(host.querySelector('.tz-field__text')!.textContent).toBe('05/09/2026');
    // And the value underneath was right all along: the two must agree.
    expect(field.value.start!.toString()).toBe('2026-09-05T04:00:00Z');
    expect(field.value.end!.toString()).toBe('2026-09-06T04:00:00Z');
  });

  it('and the calendar lights one cell, not two', () => {
    field = createRangeField(host, {
      timeZone: santiago,
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-05'),
      presets: ['today'],
    });
    field.open();
    document.querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();
    field.open();
    const lit = document.querySelectorAll('.tz-field__panel .tz-range__day--start, .tz-field__panel .tz-range__day--end');
    expect([...lit].every((cell) => cell.getAttribute('data-date') === '2026-09-05')).toBe(true);
  });

  it('so an arrow moves it by one day, not by two', () => {
    field = createRangeField(host, {
      timeZone: santiago,
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-05'),
      presets: ['today'],
      shift: 'auto',
    });
    field.open();
    document.querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();
    host.querySelectorAll<HTMLButtonElement>('.tz-field__shift')[1]!.click();
    expect(host.querySelector('.tz-field__text')!.textContent).toBe('06/09/2026');
  });

  it('Havana too, in March', () => {
    // 8 March 2026 begins at 01:00 in Havana.
    field = createRangeField(host, {
      timeZone: 'America/Havana',
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-03-08'),
      presets: ['today'],
    });
    field.open();
    document.querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();
    expect(host.querySelector('.tz-field__text')!.textContent).toBe('08/03/2026');
  });
});

describe('the interval widget has the same rule', () => {
  it('shows one day where one day was given', () => {
    const widget = createDateTimeRange(host, {
      timeZone: santiago,
      locale: 'en-GB',
      value: {
        start: Temporal.Instant.from('2026-09-05T04:00:00Z'), // 5 Sept, start of day
        end: Temporal.Instant.from('2026-09-06T04:00:00Z'), // the midnight after
        allDay: true,
      },
    });
    const shown = [...host.querySelectorAll<HTMLElement>('.tz-field__trigger')].map((n) =>
      n instanceof HTMLInputElement ? n.value : (n.textContent ?? ''),
    );
    expect(shown[1]).toContain('05/09/2026'); // the last day, not the 6th
    widget.destroy();
  });
});

describe('a step that cannot apply draws no arrows', () => {
  it('fifteen minutes on a period of whole days', () => {
    // The default: showTime off, so a period is whole days and has nowhere to
    // put an hour. The arrows used to be drawn, enabled, and do nothing at
    // all — PlainDate.add({ minutes: 15 }) adds no days and does not throw.
    field = createRangeField(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: ['today'],
      shift: '15mn',
    });
    field.open();
    document.querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();

    const arrows = [...host.querySelectorAll<HTMLButtonElement>('.tz-field__shift')];
    expect(arrows.every((a) => a.hidden || a.disabled)).toBe(true);
  });

  it('but the same step works the moment the period carries hours', () => {
    field = createRangeField(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      showTime: true,
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: [],
      shift: '15mn',
      value: {
        start: Temporal.Instant.from('2026-09-18T08:00:00Z'),
        end: Temporal.Instant.from('2026-09-18T15:00:00Z'),
        allDay: false,
      },
    });
    const arrows = [...host.querySelectorAll<HTMLButtonElement>('.tz-field__shift')];
    expect(arrows.some((a) => !a.hidden && !a.disabled)).toBe(true);
    arrows[1]!.click();
    expect(host.querySelector('.tz-field__text')!.textContent).toBe('18/09/2026 10:15 – 18/09/2026 17:15');
  });

  it('and a day-sized step still moves whole days', () => {
    field = createRangeField(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: ['today'],
      shift: '1d',
    });
    field.open();
    document.querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();
    host.querySelectorAll<HTMLButtonElement>('.tz-field__shift')[1]!.click();
    expect(host.querySelector('.tz-field__text')!.textContent).toBe('22/09/2026');
  });
});
