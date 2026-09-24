import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDateRange, type DateRangeInstance } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * The months and years behind the calendar's title.
 *
 * The single calendar has had them since the start; the range one carried a
 * plain span, so the only way out of September was the arrows, one month at a
 * time. Reaching March of last year took fifteen presses.
 */
const today = Temporal.PlainDate.from('2026-09-24');
let host: HTMLElement;
let range: DateRangeInstance;

const make = (options = {}) => {
  range = createDateRange(host, { locale: 'fr-FR', messages: FR, today, ...options });
};
const title = () => host.querySelector<HTMLButtonElement>('.tz-range__title')!;
const cells = () => [...host.querySelectorAll<HTMLButtonElement>('.tz-range__coarse-cell')];
const labels = () => cells().map((c) => c.textContent);
const chosen = () =>
  cells().find((c) => c.classList.contains('tz-range__coarse-cell--selected'))?.textContent;
const showing = () => ({
  jours: !host.querySelector<HTMLElement>('.tz-range__grid')!.hidden,
  grossiere: !host.querySelector<HTMLElement>('.tz-range__coarse')!.hidden,
});

beforeEach(() => { host = document.createElement('div'); document.body.append(host); });
afterEach(() => { range?.destroy(); host.remove(); });

describe('the title opens the months, then the years', () => {
  it('is a button, not a caption', () => {
    make();
    expect(title().tagName).toBe('BUTTON');
    expect(showing()).toEqual({ jours: true, grossiere: false });
  });

  it('shows twelve months with the one on screen picked out', () => {
    make();
    title().click();
    expect(showing()).toEqual({ jours: false, grossiere: true });
    expect(title().textContent).toBe('2026');
    expect(labels()).toHaveLength(12);
    expect(chosen()).toBe(labels()[8]); // septembre
  });

  it('then a decade, and refuses to go deeper', () => {
    make();
    title().click();
    title().click();
    expect(title().textContent).toBe('2020 – 2029');
    expect(labels()[0]).toBe('2019'); // borrowed from the decade before
    expect(labels()[11]).toBe('2030');
    expect(cells()[0]!.classList.contains('tz-range__coarse-cell--outside')).toBe(true);
    expect(chosen()).toBe('2026');
    expect(title().disabled).toBe(true); // a decade is deep enough
  });

  it('walks back down: a year lands on its months, a month on its days', () => {
    make();
    title().click();
    title().click();
    cells()[3]!.click(); // 2022
    expect(showing()).toEqual({ jours: false, grossiere: true });
    expect(title().textContent).toBe('2022');
    cells()[0]!.click(); // janvier
    expect(showing()).toEqual({ jours: true, grossiere: false });
    expect(title().textContent).toBe('janvier 2022');
  });

  it('steps by a screenful of whatever is shown', () => {
    make();
    const prev = host.querySelectorAll<HTMLButtonElement>('.tz-range__nav')[0]!;
    prev.click();
    expect(title().textContent).toBe('août 2026'); // a month among days
    title().click();
    prev.click();
    expect(title().textContent).toBe('2025'); // a year among months
    title().click();
    prev.click();
    expect(title().textContent).toBe('2010 – 2019'); // a decade among years
  });

  it('is one picker for two months, and the second follows the first', () => {
    make({ months: 2 });
    // Two months on screen: each block carries its own name, so the header has
    // nothing to say until the picker is open.
    expect(title().textContent).toBe('');
    title().click();
    expect(title().textContent).toBe('2026');
    cells()[0]!.click(); // janvier
    const names = [...host.querySelectorAll('.tz-range__month-title')].map((n) => n.textContent);
    expect(names).toEqual(['janvier 2026', 'février 2026']);
  });
});
