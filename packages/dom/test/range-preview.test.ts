import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * The run under the pointer, and under the keyboard.
 *
 * The panel folded a selection in progress into a closed range of one day
 * before handing it to the calendar, so the calendar never learned a second
 * click was coming. Its preview — which has been there all along — could not
 * fire, the day just clicked carried start, end *and* within at once, and
 * hovering anywhere else painted nothing. The docs claimed the opposite twice.
 */
let host: HTMLElement;
let field: RangeFieldInstance;
const make = (options = {}) => {
  field = createRangeField(host, {
    timeZone: 'Europe/Paris',
    locale: 'fr-FR',
    messages: FR,
    today: Temporal.PlainDate.from('2026-09-21'),
    months: 1,
    ...options,
  });
  field.open();
};
const day = (iso: string) =>
  document.querySelector<HTMLButtonElement>(`.tz-field__panel .tz-range__day[data-date="${iso}"]`)!;
const painted = (mark: string) =>
  [...document.querySelectorAll(`.tz-field__panel .tz-range__day--${mark}`)].map((e) => e.textContent);

beforeEach(() => { host = document.createElement('div'); document.body.append(host); });
afterEach(() => { field?.destroy(); host.remove(); document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove()); });

describe('a selection in progress', () => {
  it('is not drawn as a finished day', () => {
    make();
    day('2026-09-07').click();
    // The start alone. Before, the same cell was start, end and within.
    expect(painted('start')).toEqual(['7']);
    expect(painted('end')).toEqual([]);
    expect(painted('within')).toEqual([]);
  });

  it('previews the run under the pointer', () => {
    make();
    day('2026-09-07').click();
    day('2026-09-16').dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    // The run, the start included — the calendar marks every day it covers.
    expect(painted('within')).toEqual(['7', '8', '9', '10', '11', '12', '13', '14', '15', '16']);
    expect(painted('end')).toEqual(['16']);
  });

  it('and the run under the keyboard', () => {
    make();
    day('2026-09-07').click();
    const from = day('2026-09-07');
    from.focus();
    for (let i = 0; i < 3; i += 1) {
      document
        .querySelector('.tz-field__panel .tz-range__grid')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    }
    expect(painted('end')).toEqual(['10']);
  });

  it('leaves an open-ended period as the single mark it is', () => {
    // Nothing is coming: there is no second click to wait for.
    make({ openEnded: true });
    day('2026-09-07').click();
    expect(painted('start')).toEqual(['7']);
    expect(painted('within')).toEqual(['7']);
  });

  it('and a single day is chosen outright, with nothing to preview', () => {
    // One click is the whole answer there, so the panel closes on it — there
    // is no second click for a preview to anticipate.
    make({ singleDay: true });
    day('2026-09-07').click();
    expect(field.isOpen).toBe(false);
    expect(field.value.start!.toZonedDateTimeISO('Europe/Paris').toPlainDate().toString()).toBe('2026-09-07');
  });
});
