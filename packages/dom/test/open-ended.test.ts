import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance, type RangeFieldValue } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * A period with one end left open.
 *
 * `WHERE at >= :start` with no upper bound is an ordinary search, and until
 * now there was no way to ask for one: a single chosen day was a selection
 * half made, not an answer. "Until 20 September" could not be said at all.
 */
const paris = 'Europe/Paris';
const today = Temporal.PlainDate.from('2026-09-21');
let host: HTMLElement;
let field: RangeFieldInstance;
let reported: RangeFieldValue[];

const make = (options = {}) => {
  reported = [];
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    today,
    openEnded: true,
    onChange: (value) => reported.push(value),
    ...options,
  });
};
const shown = () => host.querySelector('.tz-field__text')!.textContent;
const panel = () => document.querySelector('.tz-field__panel')!;
const mode = (label: string) =>
  [...panel().querySelectorAll<HTMLButtonElement>('.tz-rangefield__bound')].find((b) => b.textContent === label)!;
const day = (iso: string) => panel().querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
const paris_ = (value: RangeFieldValue) => ({
  start: value.start?.toZonedDateTimeISO(paris).toPlainDateTime().toString({ smallestUnit: 'minute' }) ?? null,
  end: value.end?.toZonedDateTimeISO(paris).toPlainDateTime().toString({ smallestUnit: 'minute' }) ?? null,
});

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((node) => node.remove());
});

describe('asking for one end only', () => {
  it('“From” takes one click and leaves the end null', () => {
    make();
    field.open();
    mode('From').click();
    day('2026-09-14').click();

    expect(paris_(field.value)).toEqual({ start: '2026-09-14T00:00', end: null });
    expect(shown()).toBe('From 14/09/2026');
  });

  it('“Until” fills the end and leaves the start null — still the midnight after', () => {
    make();
    field.open();
    mode('Until').click();
    day('2026-09-20').click();

    // The 21st at 00:00, so `at < :end` includes everything on the 20th.
    expect(paris_(field.value)).toEqual({ start: null, end: '2026-09-21T00:00' });
    expect(shown()).toBe('Until 20/09/2026');
  });

  it('keeps the end that still makes sense when the mode changes', () => {
    make();
    field.open();
    day('2026-09-14').click();
    day('2026-09-20').click();
    expect(shown()).toBe('14/09/2026 – 20/09/2026');
    expect(field.isOpen).toBe(false); // a finished range closes the panel
    field.open();

    mode('From').click();
    expect(shown()).toBe('From 14/09/2026'); // the start is kept, not asked for again
    mode('Between').click();
    expect(shown()).toBe('From 14/09/2026'); // and still there, waiting for the other end
    day('2026-09-25').click();
    expect(shown()).toBe('14/09/2026 – 25/09/2026');
  });

  it('the cross on an end drops it, which is the same as opening that side', () => {
    make({ messages: FR, locale: 'fr-FR' });
    field.open();
    day('2026-09-14').click();
    day('2026-09-20').click();
    field.open();
    const crosses = panel().querySelectorAll<HTMLButtonElement>('.tz-rangefield__end-clear');
    expect(crosses[0]!.getAttribute('aria-label')).toBe('Sans début');

    crosses[0]!.click(); // no start
    expect(shown()).toBe("Jusqu'au 20/09/2026");
    expect(paris_(field.value)).toEqual({ start: null, end: '2026-09-21T00:00' });
    expect(panel().querySelector('.tz-rangefield__bound--on')!.textContent).toBe("Jusqu'au");
  });

  it('shows a chip only for an end there is', () => {
    make();
    field.open();
    mode('From').click();
    day('2026-09-14').click();
    expect(field.isOpen).toBe(false); // one click is the whole answer
    field.open();
    const chips = [...panel().querySelectorAll<HTMLElement>('.tz-rangefield__end')];
    expect(chips.map((c) => c.hidden)).toEqual([false, true]);
    expect(chips[0]!.textContent).toContain('14/09/2026');
    // …and hidden has to win over the chip's own display, or an empty chip
    // with a cross in it sits there being clickable.
    const css = [...document.querySelectorAll('style[data-tzslot]')].map((n) => n.textContent).join('');
    expect(css).toContain('.tz-rangefield__end[hidden] { display: none; }');
  });

  it('carries the hours when there are any', () => {
    make({ showTime: true });
    field.open();
    mode('From').click();
    day('2026-09-14').click();
    field.update({
      value: { start: Temporal.Instant.from('2026-09-14T07:00:00Z'), end: null, allDay: false },
    });
    expect(shown()).toBe('From 14/09/2026 09:00');
  });

  it('an imposed step moves the single end, and “auto” falls back to a day', () => {
    make({ shift: { days: 7 } });
    field.update({
      value: { start: Temporal.Instant.from('2026-09-13T22:00:00Z'), end: null, allDay: true },
    });
    const arrows = () => host.querySelectorAll<HTMLButtonElement>('.tz-field__shift');
    expect(arrows()[1]!.disabled).toBe(false);
    arrows()[1]!.click();
    expect(shown()).toBe('From 21/09/2026');

    // There is no length to follow here, but refusing to move was worse than
    // choosing the unit the calendar itself works in.
    field.update({ shift: 'auto' });
    expect(arrows()[1]!.disabled).toBe(false);
    arrows()[1]!.click();
    expect(shown()).toBe('From 22/09/2026');
  });
});

describe('without openEnded', () => {
  it('there are no modes, and a half-made selection still reads as one', () => {
    make({ openEnded: false });
    field.open();
    expect(panel().querySelector('.tz-rangefield__bounds')).toBe(null);
    day('2026-09-14').click();
    expect(shown()).toBe('14/09/2026 – …'); // unfinished, and it looks unfinished
  });
});

describe('the interval, open at one end', () => {
  it('says what it means instead of going quiet', async () => {
    const { createDateTimeRange } = await import('../src/index.js');
    const widget = createDateTimeRange(host, {
      timeZone: paris,
      locale: 'en-GB',
      openEnded: true,
      value: { start: Temporal.Instant.from('2026-09-14T07:00:00Z'), end: null, allDay: false },
    });
    expect(host.querySelector('.tz-dtr__summary')!.textContent).toBe('From 14 Sept 2026, 09:00');

    widget.update({ value: { start: null, end: Temporal.Instant.from('2026-09-20T15:00:00Z'), allDay: false } });
    expect(host.querySelector('.tz-dtr__summary')!.textContent).toBe('Until 20 Sept 2026, 17:00');
    widget.destroy();
  });

  it('stays quiet when the screen never asked for it', async () => {
    const { createDateTimeRange } = await import('../src/index.js');
    const widget = createDateTimeRange(host, {
      timeZone: paris,
      locale: 'en-GB',
      value: { start: Temporal.Instant.from('2026-09-14T07:00:00Z'), end: null },
    });
    expect(host.querySelector('.tz-dtr__summary')).toBe(null); // half-made, and it shows
    widget.destroy();
  });
});

describe('the panel drops what cannot apply', () => {
  it('hides the hour of an end the period does not have', () => {
    make({ showTime: true });
    field.open();
    const columns = () => [...panel().querySelectorAll<HTMLElement>('.tz-rangefield__time')].map((c) => c.hidden);
    expect(columns()).toEqual([false, false]);

    mode('From').click();
    expect(columns()).toEqual([false, true]);
    mode('Until').click();
    expect(columns()).toEqual([true, false]);
    mode('Between').click();
    expect(columns()).toEqual([false, false]);
  });
});

describe('moving a period that is open at one end', () => {
  const arrows = () => host.querySelectorAll<HTMLButtonElement>('.tz-field__shift');

  it('a day at a time, without reopening the calendar', () => {
    make({ shift: 'auto' });
    field.update({
      value: { start: Temporal.Instant.from('2026-09-17T22:00:00Z'), end: null, allDay: true }, // from 18 Sept
    });
    expect(shown()).toBe('From 18/09/2026');
    expect(arrows()[0]!.disabled).toBe(false); // it used to refuse

    arrows()[0]!.click();
    expect(shown()).toBe('From 17/09/2026');
    expect(field.isOpen).toBe(false); // and the panel never had to open
    arrows()[1]!.click();
    arrows()[1]!.click();
    expect(shown()).toBe('From 19/09/2026');
    expect(field.value.end).toBe(null); // still open at the other end
  });

  it('an imposed step wins, and a short one moves the moment', () => {
    make({ shift: { minutes: 15 }, showTime: true });
    field.update({
      value: { start: Temporal.Instant.from('2026-09-18T08:00:00Z'), end: null, allDay: false }, // 10:00
    });
    expect(shown()).toBe('From 18/09/2026 10:00');
    arrows()[0]!.click();
    expect(shown()).toBe('From 18/09/2026 09:45');
  });

  it('a month steps the month, and the hour stays put', () => {
    make({ shift: { months: 1 }, showTime: true });
    field.update({
      value: { start: null, end: Temporal.Instant.from('2026-09-20T15:00:00Z'), allDay: false }, // until 17:00
    });
    expect(shown()).toBe('Until 20/09/2026 17:00');
    arrows()[1]!.click();
    expect(shown()).toBe('Until 20/10/2026 17:00');
  });
});
