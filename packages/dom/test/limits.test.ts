import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * The three things a real screen asked for and the library could not say:
 * a time held to a grid, a period held to a length, and one end the reader
 * may read but not move.
 */
const paris = 'Europe/Paris';
let host: HTMLElement;
let field: RangeFieldInstance;

const make = (options = {}) => {
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    today: Temporal.PlainDate.from('2026-09-21'),
    showTime: true,
    timeLayout: 'input',
    presets: [],
    ...options,
  });
};
const panel = () => document.querySelector('.tz-field__panel')!;
const shown = () => host.querySelector('.tz-field__text')!.textContent;
const setHour = (edge: 0 | 1, clock: string) => {
  const box = panel().querySelectorAll('.tz-dateinput')[edge]!;
  for (const [part, value] of [['hour', clock.slice(0, 2)], ['minute', clock.slice(3)]] as const) {
    const node = box.querySelector<HTMLInputElement>(`.tz-time__input[data-part="${part}"]`)!;
    node.focus();
    node.value = value;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }
};
const both = (start: string, end: string) => ({
  start: Temporal.Instant.from(start),
  end: Temporal.Instant.from(end),
  allDay: false,
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

describe('a time held to a grid', () => {
  it('a typed 10:07 becomes 10:00, and 10:08 becomes 10:15', () => {
    make({ snapMinutes: 15, value: both('2026-09-18T08:00:00Z', '2026-09-18T15:00:00Z') });
    field.open();
    setHour(0, '10:07');
    expect(shown()).toBe('18/09/2026 10:00 – 18/09/2026 17:00');
    setHour(0, '10:08');
    expect(shown()).toBe('18/09/2026 10:15 – 18/09/2026 17:00');
  });

  it('is off unless asked for: a screen that takes any minute keeps it', () => {
    make({ value: both('2026-09-18T08:00:00Z', '2026-09-18T15:00:00Z') });
    field.open();
    setHour(0, '10:07');
    expect(shown()).toBe('18/09/2026 10:07 – 18/09/2026 17:00');
  });
});

describe('a period held to a length', () => {
  it('moving the start pushes the end rather than refusing the move', () => {
    make({ maxSpan: '2h', value: both('2026-09-18T08:00:00Z', '2026-09-18T09:00:00Z') }); // 10:00–11:00
    field.open();
    setHour(0, '07:00');
    // Four hours would be too long, so the end came with it.
    expect(shown()).toBe('18/09/2026 07:00 – 18/09/2026 09:00');
  });

  it('and moving the end pulls the start', () => {
    make({ maxSpan: { hours: 2 }, value: both('2026-09-18T08:00:00Z', '2026-09-18T09:00:00Z') });
    field.open();
    setHour(1, '17:00');
    expect(shown()).toBe('18/09/2026 15:00 – 18/09/2026 17:00');
  });

  it('a minimum works the same way, in the other direction', () => {
    make({ minSpan: '2h', value: both('2026-09-18T08:00:00Z', '2026-09-18T15:00:00Z') }); // 10:00–17:00
    field.open();
    // The hour settles before the minutes, so this lands twice: 10:00 pulls
    // the start to 08:00, and 10:30 is then already long enough.
    setHour(1, '10:30');
    expect(shown()).toBe('18/09/2026 08:00 – 18/09/2026 10:30');
  });

  it('the second click sets the end and pulls the start, as a filter screen does', () => {
    make({ showTime: false, maxSpan: '2d', value: { start: null, end: null, allDay: true } });
    field.open();
    panel().querySelector<HTMLButtonElement>('[data-date="2026-10-24"]')!.click();
    panel().querySelector<HTMLButtonElement>('[data-date="2026-10-31"]')!.click();
    // Eight days asked for, two allowed: the end is what was just chosen, so
    // the start is what moves.
    expect(shown()).toBe('30/10/2026 – 31/10/2026');
  });

  it('a span in days is counted on the clocks, not in multiples of 24 hours', () => {
    make({
      showTime: false,
      maxSpan: '2d',
      value: {
        start: Temporal.Instant.from('2026-10-23T22:00:00Z'), // 24 Oct
        end: Temporal.Instant.from('2026-10-30T23:00:00Z'), // 31 Oct
        allDay: true,
      },
    });
    field.open();
    panel().querySelectorAll<HTMLInputElement>('.tz-dateinput__input')[0]!.dispatchEvent(new Event('focus'));
    panel().querySelector<HTMLButtonElement>('[data-date="2026-10-24"]')!.click();

    // Two days from the 24th is the 26th at midnight — and the clocks go back
    // in between, so that is 49 hours, not 48.
    expect(field.value.end!.toZonedDateTimeISO(paris).toPlainDate().toString()).toBe('2026-10-26');
    expect(field.value.end!.epochMilliseconds - field.value.start!.epochMilliseconds).toBe(49 * 3600_000);
  });
});

describe('one end the reader may read but not move', () => {
  it('is read-only, never armed, and no click in the calendar reaches it', () => {
    make({ disabled: { end: true }, value: both('2026-09-18T08:00:00Z', '2026-09-18T15:00:00Z') });
    field.open();
    const fields = panel().querySelectorAll<HTMLInputElement>('.tz-dateinput__input');
    // Read-only rather than disabled: still readable, still reachable by the
    // keyboard, just not editable.
    expect(fields[1]!.readOnly).toBe(true);
    expect(fields[1]!.disabled).toBe(false);
    expect(fields[0]!.readOnly).toBe(false);

    fields[1]!.dispatchEvent(new Event('focus'));
    const armed = [...panel().querySelectorAll('.tz-dateinput')].findIndex((n) =>
      n.classList.contains('tz-dateinput--armed'),
    );
    expect(armed).toBe(0); // focusing it did not arm it

    // 25 September is after the end, and the end is locked, so it cannot move
    // out of the way: the click is refused rather than emitting a period that
    // runs backwards. This test used to assert exactly that backwards period.
    panel().querySelector<HTMLButtonElement>('[data-date="2026-09-25"]')!.click();
    expect(shown()).toBe('18/09/2026 10:00 – 18/09/2026 17:00');

    // A day before the end moves the start and nothing else.
    panel().querySelector<HTMLButtonElement>('[data-date="2026-09-14"]')!.click();
    expect(shown()).toBe('14/09/2026 10:00 – 18/09/2026 17:00');
  });

  it('and a locked end is not pushed by a span limit either', () => {
    make({ disabled: { end: true }, maxSpan: '2h', value: both('2026-09-18T08:00:00Z', '2026-09-18T15:00:00Z') });
    field.open();
    setHour(0, '09:00');
    expect(shown()).toBe('18/09/2026 09:00 – 18/09/2026 17:00'); // eight hours, and left alone
  });

  it('the whole field still turns off the old way', () => {
    make({ disabled: true });
    expect(host.querySelector<HTMLButtonElement>('.tz-field__trigger')!.disabled).toBe(true);
  });
});
