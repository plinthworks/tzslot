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
const input = (edge: 0 | 1) =>
  panel().querySelectorAll<HTMLInputElement>('.tz-dateinput__input')[edge]!;
/** Typing into one of the two fields, the way a reader does. */
const type = (edge: 0 | 1, text: string) => {
  const node = input(edge);
  node.focus();
  node.value = text;
  node.dispatchEvent(new Event('input', { bubbles: true }));
  node.dispatchEvent(new Event('blur'));
};
const readings = () =>
  [...panel().querySelectorAll<HTMLElement>('.tz-dateinput__extra')].map((box) =>
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

    type(0, '25/10/2026 01:00');
    expect(readings()[0]).toEqual([]);
    type(0, '25/10/2026 02:00'); // and there are two of those
    expect(readings()[0]).toEqual(['été', 'hiver']);
    expect(startAt()).toBe('2026-10-25T02:00+02:00[Europe/Paris]'); // summer, offered first

    panel().querySelectorAll<HTMLButtonElement>('.tz-dateinput__extra button')[1]!.click();
    expect(startAt()).toBe('2026-10-25T02:00+01:00[Europe/Paris]'); // winter, chosen
    expect(readings()[0]).toEqual(['été', 'hiver']); // and the choice stays on screen

    type(0, '25/10/2026 03:00'); // ordinary again
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
    const before = field.value.start!.epochMilliseconds;
    panel().querySelectorAll<HTMLButtonElement>('.tz-dateinput__extra button')[1]!.click();
    expect(field.value.start!.epochMilliseconds - before).toBe(3600_000);
  });
});

describe('the morning an hour does not happen', () => {
  it('cannot land on it: the later time is what is stored', () => {
    make('2026-03-29', {
      value: {
        start: Temporal.Instant.from('2026-03-29T00:00:00Z'), // 01:00 Paris
        end: Temporal.Instant.from('2026-03-29T22:00:00Z'),
        allDay: false,
      },
    });
    field.open();
    expect(startAt()).toBe('2026-03-29T01:00+01:00[Europe/Paris]');

    type(0, '29/03/2026 02:00'); // never happens that morning
    expect(startAt()).toBe('2026-03-29T03:00+02:00[Europe/Paris]');
    expect(readings()[0]).toEqual([]);
  });
});

describe('once the panel is closed', () => {
  it('the field still says which 02:30 it is', () => {
    make('2026-10-25', {
      messages: FR,
      locale: 'fr-FR',
      value: {
        start: Temporal.Instant.from('2026-10-24T22:00:00Z'), // 00:00
        end: Temporal.Instant.from('2026-10-25T00:30:00Z'), // 02:30 summer
        allDay: false,
      },
    });
    const shown = () => host.querySelector('.tz-field__text')!.textContent;
    expect(shown()).toBe('25/10/2026 00:00 – 25/10/2026 02:30 (été)');

    // The other reading is an hour later and reads differently, which is the
    // whole point: two identical clock faces, two different fields.
    field.update({
      value: {
        start: Temporal.Instant.from('2026-10-24T22:00:00Z'),
        end: Temporal.Instant.from('2026-10-25T01:30:00Z'),
        allDay: false,
      },
    });
    expect(shown()).toBe('25/10/2026 00:00 – 25/10/2026 02:30 (hiver)');
  });

  it('and says it for a period open at one end', () => {
    make('2026-10-25', {
      messages: FR,
      locale: 'fr-FR',
      openEnded: true,
      value: { start: Temporal.Instant.from('2026-10-25T00:15:00Z'), end: null, allDay: false },
    });
    // Seen on the screen as "À partir du 25/10/2026 02:15", which of the two
    // being anyone's guess.
    expect(host.querySelector('.tz-field__text')!.textContent).toBe('À partir du 25/10/2026 02:15 (été)');
  });

  it('says nothing on an ordinary day, and nothing for whole days', () => {
    make('2026-09-21', {
      value: {
        start: Temporal.Instant.from('2026-09-21T07:00:00Z'),
        end: Temporal.Instant.from('2026-09-21T15:00:00Z'),
        allDay: false,
      },
    });
    expect(host.querySelector('.tz-field__text')!.textContent).toBe('21/09/2026 09:00 – 21/09/2026 17:00');

    field.update({
      value: {
        start: Temporal.Instant.from('2026-10-24T22:00:00Z'),
        end: Temporal.Instant.from('2026-10-25T23:00:00Z'),
        allDay: true,
      },
    });
    expect(host.querySelector('.tz-field__text')!.textContent).toBe('25/10/2026');
  });
});
