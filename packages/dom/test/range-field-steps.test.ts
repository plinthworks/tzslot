import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * The column that says how far one press of an arrow travels.
 *
 * It takes the place the shortcuts had, because a screen read by comparing
 * asks "how far" far more often than it asks for a named range. The arrows
 * moved with it: they stand either side of the two fields, which is what they
 * move, instead of on a line of their own naming a period the fields already
 * show.
 */
const paris = 'Europe/Paris';
const today = Temporal.PlainDate.from('2026-09-21');
let host: HTMLElement;
let field: RangeFieldInstance;

const steps = [
  { step: 15, label: '15 min' },
  { step: 60, label: '1 heure' },
  { step: 1440, label: '1 jour' },
  { step: 10080, label: '1 semaine' },
];

const make = (options = {}) => {
  field = createRangeField(host, { timeZone: paris, locale: 'fr-FR', messages: FR, today, ...options });
  field.open();
};
const panel = () => document.querySelector('.tz-field__panel')!;
const choices = () => [...panel().querySelectorAll<HTMLButtonElement>('.tz-rangefield__step-choice')];
const chosen = () => choices().find((b) => b.classList.contains('tz-rangefield__step-choice--on'))?.textContent;
const column = () => panel().querySelector<HTMLElement>('.tz-rangefield__steps');
const headArrows = () =>
  [...panel().querySelectorAll<HTMLButtonElement>('.tz-rangefield__head .tz-rangefield__shift-arrow')];

beforeEach(() => { host = document.createElement('div'); document.body.append(host); });
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove());
});

describe('the column of steps', () => {
  it('offers every step, and starts on the quarter of an hour', () => {
    make({ shift: steps, showTime: true });
    expect(choices().map((b) => b.textContent)).toEqual(['15 min', '1 heure', '1 jour', '1 semaine']);
    expect(chosen()).toBe('15 min');
  });

  it('starts on the day when the field holds one day', () => {
    // The shape decides before anyone has chosen: an hour inside a single day
    // turns 22/09/2026 into 22/09/2026 01:00 – 23/09/2026 01:00, over controls
    // the same setting has just taken off the screen.
    make({ shift: steps, singleDay: true });
    expect(chosen()).toBe('1 jour');
  });

  it('refuses the steps that are shorter than one day, and says why', () => {
    make({ shift: steps, singleDay: true });
    const [quarter, hour, day, week] = choices();
    expect([quarter!.disabled, hour!.disabled]).toEqual([true, true]);
    expect([day!.disabled, week!.disabled]).toEqual([false, false]);
    expect(quarter!.title).toBe(FR.stepTooShort);
  });

  it('keeps a step the reader chose, and moves the period by it', () => {
    make({
      shift: steps,
      showTime: true,
      value: {
        start: Temporal.Instant.from('2026-09-21T22:00:00Z'),
        end: Temporal.Instant.from('2026-09-22T22:00:00Z'),
      },
    });
    choices()[2]!.click(); // un jour
    expect(chosen()).toBe('1 jour');
    headArrows()[1]!.click(); // en avant
    expect(field.value.start!.toZonedDateTimeISO(paris).toPlainDate().toString()).toBe('2026-09-23');
  });

  it('says the same step on the trigger as in the column', () => {
    // They read the same list from two places, and only the column had been
    // taught that the shape decides before anyone chooses: a field holding one
    // day filled in '1 jour' inside and showed '15 min' on its own button.
    make({ shift: steps, singleDay: true });
    expect(chosen()).toBe('1 jour');
    expect(host.querySelector('.tz-field__step')!.textContent).toBe('1 jour');
  });

  it('is put away by showStep: false, arrows kept', () => {
    make({ shift: steps, showTime: true, showStep: false });
    expect(column()).toBe(null);
    expect(headArrows()).toHaveLength(2);
  });

  it('is absent altogether when there is no shift', () => {
    make({ shift: false, showTime: true });
    expect(column()).toBe(null);
    expect(headArrows()).toHaveLength(0);
  });
});
