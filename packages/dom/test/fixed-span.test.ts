import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance, type RangeFieldValue } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * A window of one length, where the reader only says where it starts.
 *
 * A screen whose rows cover a fixed three quarters of an hour had no way to say
 * so. Locking the end with `disabled: { end: true }` says the opposite of what
 * it means -- that the end never moves -- and the field then refused every
 * press past it, so the screen froze from the second click on. The screen's own
 * rule, applied after each change, came too late: the field had already decided.
 */
const paris = 'Europe/Paris';
let host: HTMLElement;
let field: RangeFieldInstance;
const reports: RangeFieldValue[] = [];

const make = (options = {}) => {
  reports.length = 0;
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    today: Temporal.PlainDate.from('2026-09-21'),
    presets: [],
    onChange: (v) => reports.push(v),
    ...options,
  });
  field.open();
};
const press = (label: string) => {
  const cell = [...document.querySelectorAll<HTMLButtonElement>('.tz-range__day')].find(
    (c) => c.textContent === label && !c.className.includes('outside'),
  );
  if (!cell) throw new Error(`no day cell "${label}"`);
  cell.click();
};
const days = (v: RangeFieldValue) =>
  `${v.start ? v.start.toZonedDateTimeISO(paris).toPlainDate().toString() : '-'} .. ${
    v.end ? v.end.toZonedDateTimeISO(paris).toPlainDate().toString() : '-'
  }`;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
});

describe('fixedSpan', () => {
  it('sets both ends on one press, and reports once', () => {
    make({ fixedSpan: { minutes: 45 }, showTime: true, timeLayout: 'input' });
    press('10');
    expect(reports).toHaveLength(1);
    expect(field.value.start!.toString()).toBe('2026-09-09T22:00:00Z'); // 10 Sept, midnight in Paris
    expect(field.value.end!.toString()).toBe('2026-09-09T22:45:00Z');
  });

  it('moves the whole window on every press, forwards and backwards', () => {
    make({ fixedSpan: { minutes: 45 }, showTime: true, timeLayout: 'input' });
    press('10');
    const a = days(field.value);
    // Forwards, which the old workaround -- locking the end by hand -- refused.
    press('16');
    const b = days(field.value);
    press('3');
    const c = days(field.value);
    expect({ a, b, c }).toEqual({
      a: '2026-09-10 .. 2026-09-10',
      b: '2026-09-16 .. 2026-09-16',
      c: '2026-09-03 .. 2026-09-03',
    });
    // The days alone would pass a regression that moved the start and left the
    // end anywhere on the same day, so the length is what is really asserted.
    expect(reports.map((v) => v.end!.epochMilliseconds - v.start!.epochMilliseconds)).toEqual([
      45 * 60_000,
      45 * 60_000,
      45 * 60_000,
    ]);
    // Never two ends to reconcile, so never a second report per press.
    expect(reports).toHaveLength(3);
  });

  it('carries the end through the night that is not twenty-four hours long', () => {
    // A span counted in days has to be added in the zone. Added to the instant
    // it would land an hour early on the morning the clocks go back, and the
    // window would stop covering the day it is supposed to cover.
    make({
      fixedSpan: { days: 1 },
      today: Temporal.PlainDate.from('2026-10-15'),
    });
    press('25');
    const start = field.value.start!;
    const end = field.value.end!;
    expect(start.toString()).toBe('2026-10-24T22:00:00Z'); // 25 Oct 00:00, still +02:00
    expect(end.toString()).toBe('2026-10-25T23:00:00Z'); // 26 Oct 00:00, now +01:00
    // Twenty-five real hours, one wall-clock day.
    expect(end.epochMilliseconds - start.epochMilliseconds).toBe(25 * 3600_000);
  });

  it('reads the short form', () => {
    make({ fixedSpan: '45mn', showTime: true, timeLayout: 'input' });
    press('10');
    expect(field.value.end!.toString()).toBe('2026-09-09T22:45:00Z');
  });
});

it('a shortcut says where to go, not how long to be', () => {
  make({
    fixedSpan: { minutes: 45 },
    showTime: true,
    timeLayout: 'input',
    presets: ['last7Days'],
  });
  document.querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();
  const start = field.value.start!;
  const end = field.value.end!;
  // Seven days asked for; forty-five minutes is what the field is.
  expect(end.epochMilliseconds - start.epochMilliseconds).toBe(45 * 60_000);
});

describe('what a review found', () => {
  const span = (v: RangeFieldValue) => v.end!.epochMilliseconds - v.start!.epochMilliseconds;

  it('an arrow moves the window whole, without showTime', () => {
    // The ordinary arrow path rebuilds both ends from the days on screen.
    // Measured before the fix: forty-five minutes became a flat 1440.
    make({ fixedSpan: { minutes: 45 }, shift: true });
    press('10');
    const before = span(field.value);
    document.querySelector<HTMLButtonElement>('.tz-field__shift--next')!.click();
    expect(span(field.value)).toBe(before);
    expect(field.value.start!.toString()).toBe('2026-09-10T22:00:00Z');
  });

  it('an arrow keeps a window of one day, where it used to collapse', () => {
    // The example the guide gives. Measured before the fix: zero on the first
    // press, then a period running backwards on the second.
    make({
      fixedSpan: { days: 1 },
      showTime: true,
      timeLayout: 'input',
      shift: { days: 1 },
    });
    press('10');
    const next = document.querySelector<HTMLButtonElement>('.tz-field__shift--next')!;
    next.click();
    next.click();
    expect(field.value.start!.toString()).toBe('2026-09-11T22:00:00Z');
    expect(span(field.value)).toBe(24 * 3600_000);
  });

  it('refuses a span that is not positive rather than reporting one', () => {
    make({ fixedSpan: { minutes: -45 }, showTime: true, timeLayout: 'input' });
    press('10');
    // A backwards period is the one thing this field promises never to emit.
    expect(field.value.end).toBeNull();
  });

  it('holds the start back so the window stays inside max', () => {
    make({
      fixedSpan: { days: 5 },
      max: Temporal.PlainDate.from('2026-09-30'),
    });
    press('30');
    // Clamping the end instead would shorten a window whose point is its length.
    expect(field.value.end!.toString()).toBe('2026-09-30T22:00:00Z');
    expect(span(field.value)).toBe(5 * 24 * 3600_000);
  });

  it('empties the end with the start, so no end is left unreachable', () => {
    make({
      fixedSpan: { minutes: 45 },
      openEnded: true,
      showTime: true,
      timeLayout: 'input',
    });
    press('10');
    const cross = document.querySelector<HTMLButtonElement>(
      '.tz-rangefield__field--start .tz-dateinput__clear',
    );
    if (!cross) throw new Error('no clear cross on the start');
    cross.click();
    // The end's own cross is disabled -- it is not the reader's -- so an end
    // left alone could not be undone from the end side.
    expect(field.value).toEqual({ start: null, end: null });
  });

  it('stands aside for singleDay, on the shortcut path as well as the press', () => {
    make({
      fixedSpan: { minutes: 45 },
      singleDay: true,
      showTime: true,
      timeLayout: 'input',
      // A shortcut that fits one day: singleDay filters out the ones that do not.
      presets: ['yesterday'],
    });
    document.querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();
    // singleDay is the same idea with a length of a day, and it is the older
    // of the two, so it wins everywhere rather than in the calendar alone --
    // which gave a field calling itself one day and holding forty-five minutes.
    expect(span(field.value)).not.toBe(45 * 60_000);
  });

  it('never arms an end the reader cannot fill', () => {
    // `update` deliberately leaves `armed` alone, so turning a fixed span on
    // while the end happened to be armed locked the edge the next click was
    // aimed at. Measured before the fix: the click changed nothing and
    // reported nothing, and only reopening the panel recovered.
    make({ maxSpan: { days: 2 }, showTime: true, timeLayout: 'input' });
    press('10');
    press('20');
    field.update({ fixedSpan: { minutes: 45 } });
    reports.length = 0;
    press('12');
    expect(reports).toHaveLength(1);
    expect(span(field.value)).toBe(45 * 60_000);
  });
});
