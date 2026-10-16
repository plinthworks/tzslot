import { describe, it, expect, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';
import type { Instant } from '@tzslot/core';

/**
 * A date box and the hours beside it name the same moment.
 *
 * They did not. The date came from the whole-day reading, where an end at
 * midnight closes the day before; the hours came from the instant itself. So
 * a period ending on 25 October at midnight filled the end box with
 * `24/10/2026` and `00:00` side by side — a date from one convention next to
 * an hour from the other, naming a moment eight days after the start, while
 * the calendar painted nine days and the summary said `9d`.
 *
 * A reader with all three in front of them could not reconcile them, and was
 * right: "on voit bien de 16 minuit au 24 minuit alors que le calendrier
 * inclut le 24". Found by looking, not by any of the 965 tests.
 *
 * The box is editable, which is what settles it: a reader can type into it and
 * press Enter, so it has to name the moment it holds. The calendar, the
 * summary and the closed trigger go on speaking in days covered — that is
 * their job and six tests say so.
 */
const zone = 'Europe/Paris';
const at = (day: string, time: string) =>
  Temporal.ZonedDateTime.from(`${day}T${time}[${zone}]`).toInstant();

let field: RangeFieldInstance | null = null;
let host: HTMLElement | null = null;
afterEach(() => {
  field?.destroy();
  host?.remove();
  field = null;
  host = null;
  document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove());
});

const open = (value: { start: Instant; end: Instant }, settings = {}) => {
  host = document.createElement('div');
  document.body.append(host);
  field = createRangeField(host, {
    timeZone: zone, locale: 'fr-FR', messages: FR, showTime: true, months: 2,
    today: Temporal.PlainDate.from('2026-10-16'),
    value, ...settings,
  });
  field.open();
  return document.querySelector<HTMLElement>('.tz-field__panel')!;
};
const dateIn = (panel: HTMLElement, edge: 'start' | 'end') =>
  panel.querySelector<HTMLInputElement>(`.tz-rangefield__field--${edge} .tz-dateinput__input`)!.value;

describe('the end box, on a field showing hours', () => {
  it('names the instant it holds, not the day before it', () => {
    // Nine days: the 16th through the 24th, so the exclusive end is the 25th.
    const panel = open({ start: at('2026-10-16', '00:00'), end: at('2026-10-25', '00:00') });
    expect(dateIn(panel, 'start')).toBe('16/10/2026');
    expect(dateIn(panel, 'end')).toBe('25/10/2026'); // was 24/10/2026, beside 00:00
  });

  it('while the calendar and the summary go on counting days covered', () => {
    const panel = open({ start: at('2026-10-16', '00:00'), end: at('2026-10-25', '00:00') });
    expect(panel.querySelector('[data-date="2026-10-24"].tz-range__day--end')).not.toBeNull();
    expect(panel.querySelector('.tz-rangefield__summary')!.textContent).toContain('9d');
    expect(host!.querySelector('.tz-field__text')!.textContent).toBe('16/10/2026 – 24/10/2026');
  });

  it('and an end with an hour of its own was never pulled back', () => {
    const panel = open({ start: at('2026-10-16', '09:00'), end: at('2026-10-24', '17:00') });
    expect(dateIn(panel, 'end')).toBe('24/10/2026');
  });

  it('with the hours off screen, the box is a day and says so', () => {
    // No time beside it to contradict, so the day the period covers is the
    // whole of what the box claims — unchanged, and six tests rest on it.
    const panel = open(
      { start: at('2026-10-16', '00:00'), end: at('2026-10-25', '00:00') },
      { showTime: false },
    );
    expect(dateIn(panel, 'end')).toBe('24/10/2026');
  });
});
