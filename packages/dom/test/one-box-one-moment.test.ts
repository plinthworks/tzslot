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
