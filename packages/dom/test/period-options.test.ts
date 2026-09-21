import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * Three things a screen decides for itself: what the period is called, how an
 * hour is asked for, and whether a typed length fills a date or only tells
 * the arrows how far to go.
 */
const paris = 'Europe/Paris';
const now = Temporal.Instant.from('2026-09-21T09:07:32Z'); // 11:07 in Paris
let host: HTMLElement;
let field: RangeFieldInstance;

const make = (options = {}) => {
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    today: Temporal.PlainDate.from('2026-09-21'),
    now,
    presets: [],
    ...options,
  });
};
const panel = () => document.querySelector('.tz-field__panel')!;
const shown = () => host.querySelector('.tz-field__text')!.textContent;
const enter = (text: string) => {
  const node = panel().querySelector<HTMLInputElement>('.tz-rangefield__length-input')!;
  node.value = text;
  node.dispatchEvent(new Event('input', { bubbles: true }));
  node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
};

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((node) => node.remove());
});

describe('a title', () => {
  it('says what is being chosen, on screen and to a screen reader', () => {
    make({ title: 'Travel dates' });
    expect(host.querySelector('.tz-field__trigger')!.getAttribute('aria-label')).toBe('Travel dates');
    field.open();
    expect(panel().querySelector('.tz-rangefield__title')!.textContent).toBe('Travel dates');
  });

  it('is absent when nothing was said', () => {
    make();
    field.open();
    expect(panel().querySelector('.tz-rangefield__title')).toBe(null);
  });
});

describe('how an hour is asked for', () => {
  const withHours = (options = {}) => {
    make({ showTime: true, ...options });
    field.update({
      value: { start: Temporal.Instant.from('2026-09-18T08:00:00Z'), end: null, allDay: false },
    });
    field.open();
  };

  it('figures with arrows by default', () => {
    withHours();
    expect(panel().querySelector('.tz-dateinput__time.tz-time')).not.toBeNull();
    expect(panel().querySelector('.tz-dateinput__time.tz-timeselect')).toBe(null);
  });

  it('two menus when the screen prefers them', () => {
    withHours({ timeLayout: 'select' });
    const first = panel().querySelector('.tz-dateinput')!;
    const menus = first.querySelectorAll<HTMLSelectElement>('.tz-dateinput__time .tz-timeselect__menu');
    expect(menus.length).toBe(2); // one for the hour, one for the minutes
    // The menu's own value carries which reading it is; what matters here is
    // that it opens on the hour the period holds.
    expect(menus[0]!.selectedOptions[0]!.textContent).toBe('10');
  });

  it('and changing its mind rebuilds it rather than stacking the two', () => {
    withHours();
    field.update({ timeLayout: 'select' });
    const first = panel().querySelector('.tz-dateinput')!;
    expect(first.querySelectorAll('.tz-dateinput__time .tz-timeselect__menu').length).toBe(2);
    expect(first.querySelectorAll('.tz-dateinput__time .tz-time__input').length).toBe(0);
  });
});

describe('what a typed length means', () => {
  it('by default it is the length of the period, filling the end', () => {
    make({ lengthBox: true, showTime: true });
    field.update({
      value: { start: Temporal.Instant.from('2026-09-18T08:00:00Z'), end: null, allDay: false }, // 10:00
    });
    field.open();
    enter('1h');
    expect(shown()).toBe('18/09/2026 10:00 – 18/09/2026 11:00');
  });

  it("'step' leaves the dates alone and only moves the arrows by it", () => {
    make({ lengthBox: true, showTime: true, lengthMeans: 'step', shift: 'auto', openEnded: true });
    field.update({
      value: { start: Temporal.Instant.from('2026-09-18T08:00:00Z'), end: null, allDay: false },
    });
    field.open();
    enter('15mn');

    // Still one date, still open at the other end.
    expect(shown()).toBe('From 18/09/2026 10:00');
    expect(field.value.end).toBe(null);

    const arrows = host.querySelectorAll<HTMLButtonElement>('.tz-field__shift');
    arrows[1]!.click();
    expect(shown()).toBe('From 18/09/2026 10:15');
    arrows[0]!.click();
    arrows[0]!.click();
    expect(shown()).toBe('From 18/09/2026 09:45');
  });

  it('and emptying an end keeps that step rather than forgetting it', () => {
    make({ lengthBox: true, showTime: true, shift: 'auto', openEnded: true });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-18T08:00:00Z'),
        end: Temporal.Instant.from('2026-09-18T09:00:00Z'),
        allDay: false,
      },
    });
    field.open();
    enter('15mn'); // both ends, fifteen minutes apart
    panel().querySelectorAll<HTMLButtonElement>('.tz-dateinput__clear')[1]!.click();
    expect(field.value.end).toBe(null);

    host.querySelectorAll<HTMLButtonElement>('.tz-field__shift')[1]!.click();
    expect(shown()).toBe('From 18/09/2026 10:15'); // fifteen minutes, not a day
  });
});
