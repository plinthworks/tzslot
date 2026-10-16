import { describe, it, expect, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import type { Instant } from '@tzslot/core';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * A field that shows hours shows them, and a box names one moment.
 *
 * Two faults, one cause: a midnight end was read as closing the day before,
 * and that reading was mixed with the raw one in the same breath.
 *
 * In the panel, the date came from the whole-day reading and the time from
 * the instant. A period ending 25 October at midnight filled the end box with
 * `24/10/2026` and `00:00` side by side — eight days from the start, while
 * the calendar painted nine and the summary said `9d`. A reader with all
 * three in front of them could not reconcile them: "on voit bien de 16 minuit
 * au 24 minuit alors que le calendrier inclut le 24".
 *
 * On the trigger it produced `20/09/2026 09:00 – 23/09/2026`, a moment at one
 * end and a day at the other with nothing to say which was which.
 *
 * So, decided: with `showTime` on, midnight is a time the reader chose and is
 * written out. Six tests asserted the old reading and were changed on
 * purpose, not drifted into.
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
const trigger = () => host!.querySelector('.tz-field__text')!.textContent;

describe('the reader’s case, as reported', () => {
  // Nine days: the 16th through the 24th, so the exclusive end is the 25th.
  const NINE = { start: at('2026-10-16', '00:00'), end: at('2026-10-25', '00:00') };

  it('the end box names the instant it holds, not the day before it', () => {
    const panel = open(NINE);
    expect(dateIn(panel, 'start')).toBe('16/10/2026');
    expect(dateIn(panel, 'end')).toBe('25/10/2026'); // was 24/10/2026, beside 00:00
  });

  it('and the trigger agrees with it', () => {
    open(NINE);
    expect(trigger()).toBe('16/10/2026 00:00 – 25/10/2026 00:00');
  });

  it('and the calendar marks the day the end falls on, which is the one clicked', () => {
    /*
     * It marked the 24th while the box beside it read 25: `days()` pulls an
     * end at midnight back to the day before, and that pull-back is the
     * arithmetic the shift arrows round-trip through -- undoing it there made
     * a week grow by a day on every press, 168h to 192 to 216. So it is undone
     * for the grid alone, where the instant is already on screen as an instant.
     */
    const panel = open(NINE);
    expect(panel.querySelector('[data-date="2026-10-25"].tz-range__day--end')).not.toBeNull();
    expect(panel.querySelector('.tz-rangefield__summary')!.textContent).toContain('9d');
  });

  it('no longer writes one period in two conventions', () => {
    open({ start: at('2026-09-20', '09:00'), end: at('2026-09-24', '00:00') });
    expect(trigger()).toBe('20/09/2026 09:00 – 24/09/2026 00:00');
  });

  it('and one minute later reads the same way, which it did not', () => {
    // `00:00` collapsed to a bare date and `00:01` did not, so the field's
    // reading of the same gesture turned on a minute.
    open({ start: at('2026-09-20', '00:00'), end: at('2026-09-24', '00:01') });
    expect(trigger()).toBe('20/09/2026 00:00 – 24/09/2026 00:01');
  });

  it('with the hours off, nothing changes: there is no time to contradict', () => {
    const panel = open(NINE, { showTime: false });
    expect(dateIn(panel, 'end')).toBe('24/10/2026');
    expect(trigger()).toBe('16/10/2026 – 24/10/2026');
  });
});

describe('a whole day is still a whole day', () => {
  it('with singleDay, hours on screen or off', () => {
    for (const showTime of [true, false]) {
      const panel = open(
        { start: at('2026-10-08', '00:00'), end: at('2026-10-09', '00:00') },
        { singleDay: true, showTime },
      );
      expect(panel).not.toBeNull();
      const hours =
        (field!.value.end!.epochMilliseconds - field!.value.start!.epochMilliseconds) / 3_600_000;
      expect(hours).toBe(24);
      field!.destroy();
      host!.remove();
      document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove());
    }
  });

  it('and clicking one day twice on a field with no hours', () => {
    host = document.createElement('div');
    document.body.append(host);
    field = createRangeField(host, {
      timeZone: zone, locale: 'fr-FR', messages: FR, showTime: false, months: 1,
      today: Temporal.PlainDate.from('2026-10-08'),
    });
    field.open();
    const panel = document.querySelector<HTMLElement>('.tz-field__panel')!;
    panel.querySelector<HTMLButtonElement>('[data-date="2026-10-08"]')!.click();
    document
      .querySelector<HTMLElement>('.tz-field__panel')!
      .querySelector<HTMLButtonElement>('[data-date="2026-10-08"]')!
      .click();
    const hours =
      (field.value.end!.epochMilliseconds - field.value.start!.epochMilliseconds) / 3_600_000;
    expect(hours).toBe(24);
  });

  it('while the same two clicks with hours give a period of no length, and say so', () => {
    // The consequence of "the day you click is the day you get": the second
    // click means the 8th at 00:00, which is where the first one already was.
    // 24 hours before 2.1.1, and the summary line now explains it rather than
    // the field going quiet.
    host = document.createElement('div');
    document.body.append(host);
    field = createRangeField(host, {
      timeZone: zone, locale: 'fr-FR', messages: FR, showTime: true, months: 1,
      today: Temporal.PlainDate.from('2026-10-08'),
    });
    field.open();
    for (let i = 0; i < 2; i++) {
      document
        .querySelector<HTMLElement>('.tz-field__panel')!
        .querySelector<HTMLButtonElement>('[data-date="2026-10-08"]')!
        .click();
    }
    expect(field.value.start!.epochMilliseconds).toBe(field.value.end!.epochMilliseconds);
    expect(
      document.querySelector('.tz-field__panel')!.querySelector('.tz-rangefield__summary')!
        .textContent,
    ).toBe(FR.emptyPeriod);
  });
});

describe('a period of no length', () => {
  it('lights no shortcut, whatever day it sits on', () => {
    /*
     * Two clicks on the same day hold `16/10 00:00` to `16/10 00:00`. The
     * shortcut column compares days, and the day an empty period sits on is
     * the same day Today gives — so Today lit up as though it had been
     * pressed, while the summary line underneath said the period was empty.
     *
     * The reader's own choice stands: two clicks on one day with the hours on
     * screen give a period of no length, and that is theirs to make. What the
     * panel must not do is answer a different question in the next column.
     */
    host = document.createElement('div');
    document.body.append(host);
    field = createRangeField(host, {
      timeZone: zone, locale: 'fr-FR', messages: FR, showTime: true, months: 1,
      today: Temporal.PlainDate.from('2026-10-16'),
      now: Temporal.ZonedDateTime.from('2026-10-16T10:00[Europe/Paris]').toInstant(),
      presets: ['today', 'yesterday', 'last7Days'],
    });
    field.open();
    for (let i = 0; i < 2; i++) {
      document
        .querySelector<HTMLElement>('.tz-field__panel')!
        .querySelector<HTMLButtonElement>('[data-date="2026-10-16"]')!
        .click();
    }
    const panel = document.querySelector<HTMLElement>('.tz-field__panel')!;
    const lit = [...panel.querySelectorAll<HTMLButtonElement>('.tz-rangefield__preset')]
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.textContent);
    expect(lit).toEqual([]);
    expect(panel.querySelector('.tz-rangefield__summary')!.textContent).toBe(FR.emptyPeriod);
  });

  it('while a real whole day still lights Today', () => {
    host = document.createElement('div');
    document.body.append(host);
    field = createRangeField(host, {
      timeZone: zone, locale: 'fr-FR', messages: FR, showTime: true, months: 1,
      today: Temporal.PlainDate.from('2026-10-16'),
      now: Temporal.ZonedDateTime.from('2026-10-16T10:00[Europe/Paris]').toInstant(),
      presets: ['today', 'yesterday'],
      value: { start: at('2026-10-16', '00:00'), end: at('2026-10-17', '00:00') },
    });
    field.open();
    const panel = document.querySelector<HTMLElement>('.tz-field__panel')!;
    const lit = [...panel.querySelectorAll<HTMLButtonElement>('.tz-rangefield__preset')]
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.textContent);
    expect(lit).toEqual(["Aujourd'hui"]);
  });
});
