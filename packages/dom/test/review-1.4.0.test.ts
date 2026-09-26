import { describe, it, expect } from 'vitest';
import { createRangeField, type RangeFieldValue } from '../src/range-field.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

const zone = 'Europe/Paris';
const day = (d: number, m = 9) =>
  Temporal.ZonedDateTime.from({ year: 2026, month: m, day: d, timeZone: zone }).startOfDay();
const span = (from: number, to: number, m = 9): RangeFieldValue => ({
  start: day(from, m).toInstant(),
  end: day(to, m).toInstant(),
});

function make(opts: Record<string, unknown> = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const said: RangeFieldValue[] = [];
  const field = createRangeField(host, {
    timeZone: zone, locale: 'fr-FR', messages: FR, months: 1,
    today: Temporal.PlainDate.from('2026-09-26'),
    onChange: (v) => said.push(v), ...opts,
  });
  return {
    host, field, said,
    text: () => host.querySelector('.tz-field__text')?.textContent ?? '',
    open: () => host.querySelector<HTMLButtonElement>('.tz-field__trigger')!.click(),
    panel: () => document.querySelector<HTMLElement>('.tz-field__panel')!,
    status: () => document.querySelector('.tz-rangefield__status')?.textContent ?? '',
    done: () => { field.destroy(); host.remove(); },
  };
}

describe('update() is silent when it changes nothing', () => {
  it('singleDay over a value that is already that day reports nothing', () => {
    const w = make({ value: span(26, 27), showTime: false });
    w.said.length = 0;
    w.field.update({ singleDay: true });
    expect(w.said).toEqual([]);
    expect(w.text()).toBe('26/09/2026');
    w.done();
  });

  it('but a reshape that really moves the value is still reported', () => {
    // Seven days cannot be shown as one: the value has to change, and a
    // consumer holding it has to be told, or its copy silently diverges.
    const w = make({ value: span(19, 26), showTime: false });
    w.said.length = 0;
    w.field.update({ singleDay: true });
    expect(w.said).toHaveLength(1);
    expect(w.said[0]!.start!.toString()).toBe(day(19).toInstant().toString());
    w.done();
  });

  it('and leaving singleDay reports nothing by itself', () => {
    const w = make({ value: span(26, 27), singleDay: true, showTime: false });
    w.said.length = 0;
    w.field.update({ singleDay: false });
    expect(w.said).toEqual([]);
    w.done();
  });
});

describe('a shortcut obeys maxSpan', () => {
  it('this quarter cannot outrun a thirty-day ceiling', () => {
    const w = make({ maxSpan: { days: 30 }, presets: ['thisQuarter'] });
    w.open();
    w.panel().querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();
    const v = w.said.at(-1)!;
    const length = (v.end!.epochMilliseconds - v.start!.epochMilliseconds) / 864e5;
    expect(length).toBeLessThanOrEqual(30);
    // The panel stays open when a shortcut had to be pulled in, so the reader
    // both sees the period they actually got and hears why.
    expect(w.field.isOpen).toBe(true);
    expect(w.status()).toContain('30');
    w.done();
  });

  it('a shortcut that fits is untouched', () => {
    const w = make({ maxSpan: { days: 30 }, presets: ['last7Days'] });
    w.open();
    w.panel().querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();
    const v = w.said.at(-1)!;
    expect((v.end!.epochMilliseconds - v.start!.epochMilliseconds) / 864e5).toBe(7);
    // Nothing moved, so the shortcut behaves as it always has and closes.
    expect(w.field.isOpen).toBe(false);
    w.done();
  });
});

describe('a period of no length is never reported', () => {
  it('clicking the day before the start does not collapse the period', () => {
    const w = make({ value: span(10, 16), showTime: false });
    w.open();
    const cell = (d: string) =>
      [...w.panel().querySelectorAll<HTMLButtonElement>('.tz-range__day')]
        .find((b) => b.textContent?.trim() === d && !b.classList.contains('tz-range__day--outside'));
    // The end is armed after a complete range; clicking the 9th makes the end
    // land exactly on the start, because a whole day ends at the next midnight.
    cell('9')?.click();
    const v = w.said.at(-1)!;
    const zero = v.start !== null && v.end !== null
      && v.start.epochMilliseconds === v.end.epochMilliseconds;
    expect(zero).toBe(false);
    w.done();
  });
});
