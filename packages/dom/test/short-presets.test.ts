import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance, type RangeFieldValue } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';
import type { Instant, PlainDate } from '@tzslot/core';

/**
 * Named ranges shorter than a day, and the rule they leave behind.
 *
 * A screen that watches something live asks for the quarter hour that is
 * running, then steps back through the ones before it. The arrows have to
 * move by a quarter of an hour for that to work — and the only thing that
 * knows they should is the shortcut just pressed.
 */
const paris = 'Europe/Paris';
const today = Temporal.PlainDate.from('2026-09-21');
const now = Temporal.Instant.from('2026-09-21T09:07:32Z'); // 11:07:32 in Paris
let host: HTMLElement;
let field: RangeFieldInstance;
let reported: RangeFieldValue[];

const make = (options = {}) => {
  reported = [];
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    today,
    now,
    shift: 'auto',
    presets: ['thisQuarterHour', 'thisHour', 'thisQuarter', 'last7Days'],
    onChange: (value) => reported.push(value),
    ...options,
  });
};
const shown = () => host.querySelector('.tz-field__text')!.textContent;
const panel = () => document.querySelector('.tz-field__panel')!;
const preset = (label: string) =>
  [...panel().querySelectorAll<HTMLButtonElement>('.tz-rangefield__preset')].find((b) => b.textContent === label)!;
const arrows = () => host.querySelectorAll<HTMLButtonElement>('.tz-field__shift');
const clock = (value: Instant | null) =>
  value!.toZonedDateTimeISO(paris).toPlainTime().toString({ smallestUnit: 'minute' });

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((node) => node.remove());
});

describe('the quarter hour that is running', () => {
  it('is two moments on one day, not a day', () => {
    make();
    field.open();
    preset('This quarter hour').click();

    expect(field.value.allDay).toBe(false);
    expect([clock(field.value.start), clock(field.value.end)]).toEqual(['11:00', '11:15']);
    expect(shown()).toBe('21/09/2026 11:00 – 21/09/2026 11:15');
  });

  it('and the arrows then move by a quarter of an hour', () => {
    make();
    field.open();
    preset('This quarter hour').click();
    field.open();

    arrows()[0]!.click();
    expect([clock(field.value.start), clock(field.value.end)]).toEqual(['10:45', '11:00']);
    arrows()[0]!.click();
    expect([clock(field.value.start), clock(field.value.end)]).toEqual(['10:30', '10:45']);
    arrows()[1]!.click();
    arrows()[1]!.click();
    expect([clock(field.value.start), clock(field.value.end)]).toEqual(['11:00', '11:15']);
  });

  it('the hour does the same, an hour at a time', () => {
    make();
    field.open();
    preset('This hour').click();
    expect([clock(field.value.start), clock(field.value.end)]).toEqual(['11:00', '12:00']);

    field.open();
    arrows()[0]!.click();
    expect([clock(field.value.start), clock(field.value.end)]).toEqual(['10:00', '11:00']);
  });

  it('a quarter of a year still moves by a quarter', () => {
    make();
    field.open();
    preset('This quarter').click();
    expect(shown()).toBe('01/07/2026 – 30/09/2026');
    field.open();
    arrows()[0]!.click();
    expect(shown()).toBe('01/04/2026 – 30/06/2026');
  });

  it('choosing days by hand drops the rule the shortcut left', () => {
    make();
    field.open();
    preset('This quarter hour').click();
    field.open();
    panel().querySelector<HTMLButtonElement>('[data-date="2026-09-14"]')!.click();
    panel().querySelector<HTMLButtonElement>('[data-date="2026-09-16"]')!.click();
    expect(shown()).toBe('14/09/2026 – 16/09/2026');

    field.open();
    arrows()[1]!.click();
    // Three days on, not fifteen minutes.
    expect(shown()).toBe('17/09/2026 – 19/09/2026');
  });

  it('is ticked while it is what is chosen', () => {
    make({ messages: FR, locale: 'fr-FR' });
    field.open();
    preset("Le quart d'heure courant").click();
    field.open();
    expect(panel().querySelector('.tz-rangefield__preset--on')!.textContent).toBe("Le quart d'heure courant");
  });
});

describe('a shortcut of your own', () => {
  it('can be two moments, and can name its own step', () => {
    make({
      presets: [
        {
          name: 'lastFiveMinutes',
          label: 'Last 5 minutes',
          step: { minutes: 5 },
          range: (_today: PlainDate, at: { now: Instant }) => ({
            start: at.now.subtract({ minutes: 5 }),
            end: at.now,
          }),
        },
      ],
    });
    field.open();
    preset('Last 5 minutes').click();
    expect([clock(field.value.start), clock(field.value.end)]).toEqual(['11:02', '11:07']);

    field.open();
    arrows()[0]!.click();
    expect([clock(field.value.start), clock(field.value.end)]).toEqual(['10:57', '11:02']);
  });
});

describe('going back from a short range to a long one', () => {
  it('a shortcut named in days means whole days, not the hours left behind', () => {
    make({ showTime: true });
    field.open();
    preset('This quarter hour').click(); // 11:00–11:15
    field.open();
    preset('This quarter').click();

    // Seen in a browser as "01/07/2026 10:45 – 30/09/2026 11:00".
    expect(field.value.allDay).toBe(true);
    expect(shown()).toBe('01/07/2026 – 30/09/2026');
    expect(clock(field.value.start)).toBe('00:00');
  });
});

describe('a range chosen by hand, moved by a quarter of an hour', () => {
  it('moves both ends by fifteen minutes, days apart though they are', () => {
    // The case from the screen: 18/09 10:00 to 21/09 05:00, stepped by 15 min.
    make({
      showTime: true,
      shift: { minutes: 15 },
      presets: [],
      value: {
        start: Temporal.Instant.from('2026-09-18T08:00:00Z'), // 10:00 Paris
        end: Temporal.Instant.from('2026-09-21T03:00:00Z'), // 05:00 Paris
        allDay: false,
      },
    });
    expect(shown()).toBe('18/09/2026 10:00 – 21/09/2026 05:00');

    arrows()[1]!.click();
    expect(shown()).toBe('18/09/2026 10:15 – 21/09/2026 05:15');
    arrows()[0]!.click();
    arrows()[0]!.click();
    expect(shown()).toBe('18/09/2026 09:45 – 21/09/2026 04:45');
    // The distance between the two ends never changes.
    const { start, end } = field.value;
    expect(start!.until(end!).total({ unit: 'hour' })).toBe(67);
  });

  it('and the menu lets the reader swap that step for a day', () => {
    make({
      showTime: true,
      presets: [],
      shift: [
        { step: { minutes: 15 }, label: '15 min' },
        { step: { days: 1 }, label: '1 day' },
      ],
      value: {
        start: Temporal.Instant.from('2026-09-18T08:00:00Z'),
        end: Temporal.Instant.from('2026-09-21T03:00:00Z'),
        allDay: false,
      },
    });
    const picker = host.querySelector<HTMLButtonElement>('.tz-field__step')!;
    expect(picker.textContent).toBe('15 min');
    arrows()[1]!.click();
    expect(shown()).toBe('18/09/2026 10:15 – 21/09/2026 05:15');

    picker.click();
    expect(picker.textContent).toBe('1 day');
    arrows()[1]!.click();
    expect(shown()).toBe('19/09/2026 10:15 – 22/09/2026 05:15');
  });
});
