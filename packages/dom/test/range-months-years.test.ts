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
/**
 * Which of the two is on show.
 *
 * They share one cell and swap by visibility, not by display, so the calendar
 * keeps its size when the title is pressed — a months grid sized on its own
 * grew the panel by 24px on one month and would have shrunk it on two.
 */
const showing = () => ({
  jours: !host.classList.contains('tz-range--picking'),
  grossiere: host.classList.contains('tz-range--picking'),
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
    // Two months on screen: each block names itself above its own grid, so the
    // header says the year rather than repeating them. Never nothing: an empty
    // title is a four-pixel button nobody can press, and the header grew by
    // those four pixels the moment the picker put a year in it.
    expect(title().textContent).toBe('2026');
    title().click();
    expect(title().textContent).toBe('2026');
    cells()[0]!.click(); // janvier
    const names = [...host.querySelectorAll('.tz-range__month-title')].map((n) => n.textContent);
    expect(names).toEqual(['janvier 2026', 'février 2026']);
  });
});

/**
 * Pressing the title must change what is drawn and never what it measures.
 *
 * jsdom lays nothing out, so what is asserted here is the rule text; the
 * measurements are from Chrome. Sized on its own, a months grid built to the
 * width of one month made the panel 24px wider on a single month (438 → 462)
 * and would have shrunk it on two. And with two months the title was empty in
 * the days view, so the header grew by 4px the moment the picker put a year
 * in it — 529 → 533.
 */
describe('the calendar keeps its size when the title is pressed', () => {
  it('lays the months over the days instead of beside them', async () => {
    const { RANGE_CSS } = await import('../src/styles.js');
    expect(RANGE_CSS).toMatch(/\.tz-range__views\s*\{[^}]*position: relative/);
    expect(RANGE_CSS).toMatch(/\.tz-range__coarse\s*\{[^}]*position: absolute/);
    // Swapped by visibility: display would take the day grid out of the flow
    // and the box would collapse onto the months.
    expect(RANGE_CSS).toContain('.tz-range--picking .tz-range__grid { visibility: hidden; }');
  });

  it('never leaves the title empty, in any view', () => {
    for (const months of [1, 2]) {
      make({ months });
      expect(title().textContent).not.toBe('');
      title().click();
      expect(title().textContent).not.toBe('');
      title().click();
      expect(title().textContent).not.toBe('');
      range.destroy();
      host.replaceChildren();
    }
  });
});
