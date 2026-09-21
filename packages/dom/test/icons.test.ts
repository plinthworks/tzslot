import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, createDateInput, icon, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * The mark inside a field.
 *
 * Every date field anyone has used carries a calendar, and its absence reads
 * as a text box that happens to want a date. Drawn here rather than taken
 * from an icon set, so nothing has to be installed for a field to render —
 * and replaceable, so an application that already has one keeps its own.
 */
let host: HTMLElement;
let field: RangeFieldInstance;
const panel = () => document.querySelector('.tz-field__panel')!;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((node) => node.remove());
});

describe('the drawing itself', () => {
  it('is an SVG that takes the colour and size of the text around it', () => {
    const drawn = icon('calendar');
    expect(drawn.tagName.toLowerCase()).toBe('svg');
    expect(drawn.getAttribute('stroke')).toBe('currentColor');
    expect(drawn.getAttribute('width')).toBe('1em');
    // Decoration: a screen reader has the field's own label to read.
    expect(drawn.getAttribute('aria-hidden')).toBe('true');
    expect(drawn.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('follows the drawing rules of the family it sits beside', () => {
    for (const name of ['calendar', 'clock', 'chevronLeft', 'chevronRight', 'x'] as const) {
      const drawn = icon(name);
      expect(drawn.getAttribute('viewBox')).toBe('0 0 24 24');
      expect(drawn.getAttribute('stroke-width')).toBe('2');
      expect(drawn.getAttribute('stroke-linecap')).toBe('round');
    }
  });
});

describe('inside a field', () => {
  it('a calendar, before the text, by default', () => {
    field = createRangeField(host, { timeZone: 'Europe/Paris', locale: 'en-GB' });
    field.open();
    const first = panel().querySelector('.tz-dateinput__row')!;
    const mark = first.querySelector('.tz-dateinput__icon')!;
    expect(mark.querySelector('svg.tz-icon--calendar')).not.toBeNull();
    // Before the input in the document, so a screen reader meets the field
    // itself rather than a picture of one.
    expect(mark.nextElementSibling!.classList.contains('tz-dateinput__input')).toBe(true);
    expect(first.classList.contains('tz-dateinput__row--icon-end')).toBe(false);
  });

  it('at the far end when asked, without moving the field', () => {
    field = createRangeField(host, { timeZone: 'Europe/Paris', fieldIconSide: 'end' });
    field.open();
    const row = panel().querySelector('.tz-dateinput__row')!;
    expect(row.classList.contains('tz-dateinput__row--icon-end')).toBe(true);
    const css = [...document.querySelectorAll('style[data-tzslot]')].map((n) => n.textContent).join('');
    // The mark moves by order, so the reading order is untouched.
    expect(css).toContain('.tz-dateinput__row--icon-end .tz-dateinput__icon { order: 9;');
  });

  it('a drawing of your own replaces it, and null removes it', () => {
    const own = document.createElement('i');
    own.className = 'my-icon';
    field = createRangeField(host, { timeZone: 'Europe/Paris', fieldIcon: own });
    field.open();
    expect(panel().querySelector('.tz-dateinput__icon .my-icon')).not.toBeNull();

    field.update({ fieldIcon: null });
    expect(panel().querySelector<HTMLElement>('.tz-dateinput__icon')!.hidden).toBe(true);
  });

  it('never takes the click a hand aimed at the field', () => {
    const css = [...document.querySelectorAll('style[data-tzslot]')].map((n) => n.textContent).join('');
    expect(css).toContain('pointer-events: none');
  });
});

describe('a field on its own', () => {
  it('carries the same mark', () => {
    const bare = createDateInput(host, { value: { date: Temporal.PlainDate.from('2026-09-21'), time: null } });
    expect(host.querySelector('.tz-dateinput__icon svg')).not.toBeNull();
    bare.destroy();
  });
});
