import { describe, it, expect, afterEach } from 'vitest';
import { Temporal } from '@tzslot/core';
import type { Instant, PlainDate } from '@tzslot/core';
import { createRangeField, type RangeFieldValue } from '../src/range-field.js';

/**
 * What a review of 1.1.0 found, each held by the case that exposed it.
 *
 * Three of these were introduced the same day they were caught, and two of
 * them were in examples shown as working. jsdom lays nothing out, so the one
 * that is a layout fault is asserted on the rule text.
 */
const paris = 'Europe/Paris';
let field: ReturnType<typeof createRangeField> | null = null;

const whole = {
  start: Temporal.Instant.from('2026-09-21T22:00:00Z'), // 22 Sept 00:00 Paris
  end: Temporal.Instant.from('2026-09-22T22:00:00Z'), // 23 Sept 00:00
};

const mount = (options: Record<string, unknown>) => {
  const host = document.createElement('div');
  document.body.append(host);
  field = createRangeField(host, { timeZone: paris, locale: 'fr-FR', ...options } as never);
  return { host, field };
};
const reads = (host: HTMLElement) => host.querySelector('.tz-field__text')!.textContent;
const forward = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('.tz-field__shift--next')!.click();
const panel = () => document.querySelector<HTMLElement>('.tz-field__panel')!;
const day = (iso: string) => panel().querySelector<HTMLButtonElement>(`.tz-range__day[data-date="${iso}"]`)!;
const dayOf = (at: unknown) => (at as Instant).toZonedDateTimeISO(paris).toPlainDate().toString();

afterEach(() => {
  field?.destroy();
  field = null;
  document.body.replaceChildren();
});

describe('a step carries both its parts', () => {
  it('a day and a half hour move a day and a half hour', () => {
    // PlainDate.add({ days: 1, minutes: 30 }) truncates to a day without a
    // word, so the remainder used to vanish — ten presses, still 00:00.
    const { host } = mount({ value: whole, shift: { days: 1, minutes: 30 } });
    forward(host);
    expect(reads(host)).toBe('23/09/2026 00:30 – 24/09/2026 00:30');
  });

  it('a month, an hour and three quarters keep all three', () => {
    const { host } = mount({ value: whole, shift: { months: 1, hours: 1, minutes: 45 } });
    forward(host);
    expect(reads(host)).toBe('22/10/2026 01:45 – 23/10/2026 01:45');
  });

  it('and the same setting behaves the same on the morning an hour is lost', () => {
    // 29 March in Paris is 23 hours long, so a total of "a day and a half
    // hour" falls under 24 and the old code took a different branch there.
    const { host } = mount({
      value: {
        start: Temporal.Instant.from('2026-03-28T23:00:00Z'), // 29 March 00:00
        end: Temporal.Instant.from('2026-03-29T22:00:00Z'), // 30 March 00:00
      },
      shift: { days: 1, minutes: 30 },
    });
    forward(host);
    expect(reads(host)).toBe('30/03/2026 00:30 – 31/03/2026 00:30');
  });
});

describe('shift: true follows what the field is choosing', () => {
  it('a day, where there are no hours on screen', () => {
    const { host } = mount({ value: whole, shift: true });
    forward(host);
    expect(reads(host)).toBe('23/09/2026');
  });

  it('an hour, where there are', () => {
    const { host } = mount({ value: whole, shift: true, showTime: true });
    forward(host);
    expect(reads(host)).toBe('22/09/2026 01:00 – 23/09/2026 01:00');
  });
});

describe('what the panel was about to do dies with its subject', () => {
  it('clearing forgets that the end was armed', () => {
    const { field: f } = mount({ singleDay: true, today: Temporal.PlainDate.from('2026-09-22') });
    f.open();
    day('2026-09-22').click();
    f.close();
    f.update({ singleDay: false });
    f.clear();
    f.open();
    day('2026-09-15').click();
    // The start, not the end: a cleared field has nothing to extend.
    expect(dayOf(f.value.start)).toBe('2026-09-15');
    expect(f.value.end).toBeNull();
  });

  it('a value from outside does too', () => {
    const { field: f } = mount({ singleDay: true, today: Temporal.PlainDate.from('2026-09-22') });
    f.open();
    day('2026-09-22').click();
    f.close();
    f.update({ singleDay: false });
    f.update({
      value: {
        start: Temporal.Instant.from('2026-01-04T23:00:00Z'), // 5 Jan
        end: Temporal.Instant.from('2026-01-09T23:00:00Z'), // 10 Jan
      },
    });
    f.open();
    day('2026-01-20').click();
    expect(dayOf(f.value.start)).toBe('2026-01-20');
  });
});

describe('one day chosen is one report', () => {
  it('and never a half-open period on the way', () => {
    const reported: RangeFieldValue[] = [];
    const { field: f } = mount({
      singleDay: true,
      today: Temporal.PlainDate.from('2026-09-22'),
      onChange: (v: RangeFieldValue) => reported.push(v),
    });
    f.open();
    day('2026-09-22').click();
    expect(reported).toHaveLength(1);
    expect(reported[0]!.end).not.toBeNull();
  });

  it('a whole day, even where the screen named office hours', () => {
    const { field: f } = mount({
      singleDay: true,
      showTime: true,
      defaultTimes: { start: '09:00', end: '18:00' },
      today: Temporal.PlainDate.from('2026-09-22'),
    });
    f.open();
    day('2026-09-22').click();
    expect(dayOf(f.value.end)).toBe('2026-09-23');
  });
});

describe('turning singleDay on over a period open at the start', () => {
  it('keeps the day rather than leaving a value nothing can reach', () => {
    const { host, field: f } = mount({
      openEnded: true,
      value: { start: null, end: Temporal.Instant.from('2026-09-25T22:00:00Z') },
    });
    f.update({ singleDay: true });
    expect(dayOf(f.value.start)).toBe('2026-09-25');
    expect(reads(host)).toBe('25/09/2026');
  });
});

describe('the two fields of the panel stand above their labels', () => {
  it('which a display on the box would have taken apart', () => {
    const { field: f } = mount({});
    f.open();
    const css = [...document.querySelectorAll<HTMLStyleElement>('style[data-tzslot="rangefield"]')]
      .map((sheet) => sheet.textContent ?? '')
      .join('');
    // The [hidden] rules are what singleDay needs; `display: contents` beside
    // them dissolved the box that stacks each label over its input, and jsdom
    // cannot see that.
    expect(css).toContain('.tz-rangefield__field[hidden],');
    expect(css).not.toContain('.tz-rangefield__field { display: contents; }');
  });
});
