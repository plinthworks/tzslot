import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, createDateRange, type RangeFieldInstance } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * What a review found in 1.3.0, before it went out.
 *
 * The theme is one hole seen from several sides: the panel drew a step as
 * refused while the arrows went on moving by it. A guard that only paints is
 * not a guard.
 */
const paris = 'Europe/Paris';
const today = Temporal.PlainDate.from('2026-09-21');
let host: HTMLElement;
let field: RangeFieldInstance;

const day = { start: Temporal.Instant.from('2026-09-21T22:00:00Z'), end: Temporal.Instant.from('2026-09-22T22:00:00Z') };
const make = (options = {}) => {
  field = createRangeField(host, { timeZone: paris, locale: 'fr-FR', messages: FR, today, ...options });
  field.open();
};
const panel = () => document.querySelector('.tz-field__panel')!;
const arrows = () => [...panel().querySelectorAll<HTMLButtonElement>('.tz-rangefield__head .tz-rangefield__shift-arrow')];
const live = () => arrows().filter((a) => !a.hidden && !a.disabled);
const choices = () => [...panel().querySelectorAll<HTMLButtonElement>('.tz-rangefield__step-choice')];
const startOf = () => field.value.start!.toZonedDateTimeISO(paris).toPlainDateTime().toString();

beforeEach(() => { host = document.createElement('div'); document.body.append(host); });
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove());
});

describe('a step the field refuses is never in force', () => {
  it('takes the arrows away when the whole menu is refused', () => {
    // Every entry shorter than the day this field holds. The old rule fell
    // back to entry zero and moved by it: 22/09/2026 became 23:00 the day
    // before, over controls that cannot show an hour.
    make({ singleDay: true, shift: [{ step: 60, label: '1 h' }, { step: 15, label: '15 min' }], value: day });
    expect(choices().every((c) => c.disabled)).toBe(true);
    expect(live()).toHaveLength(0);
    expect(startOf()).toBe('2026-09-22T00:00:00');
  });

  it("drops a reader's choice once the shape can no longer take it", () => {
    make({ showTime: true, shift: [{ step: 15, label: '15 min' }, { step: 1440, label: '1 jour' }], value: day });
    choices()[0]!.click();
    field.update({ singleDay: true });
    // The choice was made when the hours were on screen; turning one day on
    // took them off, and the quarter hour with them.
    expect(choices()[0]!.disabled).toBe(true);
    expect(choices()[0]!.getAttribute('aria-pressed')).toBe('false');
    expect(choices()[1]!.getAttribute('aria-pressed')).toBe('true');
    live()[1]!.click();
    expect(startOf()).toBe('2026-09-23T00:00:00');
  });

  it('refuses a step longer than a day that is not whole days', () => {
    // { days: 1, minutes: 30 } is longer than a day and still turns 22/09
    // into 00:30 on the 23rd. The old rule compared totals, so it passed.
    make({ singleDay: true, shift: [{ step: { days: 1, minutes: 30 }, label: 'un jour et demi-heure' }], value: day });
    expect(choices()[0]!.disabled).toBe(true);
    expect(live()).toHaveLength(0);
  });

  it('skips a step it cannot read rather than making it the default', () => {
    make({ showTime: true, shift: [{ step: 'quinzaine', label: '?' }, { step: 60, label: '1 h' }], value: day });
    const on = choices().find((c) => c.getAttribute('aria-pressed') === 'true');
    expect(on?.textContent).toBe('1 h');
    expect(live()).toHaveLength(2);
  });

  it('counts a half hour written in seconds as a half hour', () => {
    // PT1800S: the minute count dropped seconds, so it read as zero.
    make({ showTime: true, shift: [{ step: 'PT1800S', label: 'demi-heure' }], value: day });
    expect(choices()[0]!.disabled).toBe(false);
    live()[1]!.click();
    expect(startOf()).toBe('2026-09-22T00:30:00');
  });
});

describe('a calendar hands its host back as it found it', () => {
  it('leaves no month grid behind after the picker has been opened', () => {
    const box = document.createElement('div');
    document.body.append(box);
    const range = createDateRange(box, { locale: 'fr-FR', messages: FR, today });
    box.querySelector<HTMLButtonElement>('.tz-range__title')!.click();
    range.destroy();
    expect(box.querySelectorAll('.tz-range__coarse-cell')).toHaveLength(0);
    expect(box.querySelectorAll('.tz-range__views')).toHaveLength(0);
    expect(box.className).toBe('');
    box.remove();
  });
});

describe('the months grid takes the keyboard', () => {
  it('is one tab stop, and the arrows move inside it', () => {
    const box = document.createElement('div');
    document.body.append(box);
    const range = createDateRange(box, { locale: 'fr-FR', messages: FR, today });
    box.querySelector<HTMLButtonElement>('.tz-range__title')!.click();
    const cells = [...box.querySelectorAll<HTMLButtonElement>('.tz-range__coarse-cell')];
    expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1);
    cells[0]!.focus();
    cells[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(cells[1]);
    cells[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(cells[5]);
    range.destroy();
    box.remove();
  });
});
