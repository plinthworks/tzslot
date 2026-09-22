import { describe, it, expect, afterEach } from 'vitest';
import { createDateField } from '../src/date-field.js';

/**
 * A date field on a page of its own.
 *
 * Its panel is drawn on the body, and the calendar inside it is told not to
 * inject its own layout — the field was meant to declare it there and never
 * did. On any page where another widget happened to inject the same sheet it
 * looked fine, which is why it shipped: the documentation pages all have
 * several widgets on them.
 */
let field: { destroy(): void; open(): void } | null = null;

afterEach(() => {
  field?.destroy();
  field = null;
  document.body.replaceChildren();
  for (const style of document.head.querySelectorAll('style[data-tzslot]')) style.remove();
});

const sheets = () =>
  [...document.querySelectorAll<HTMLStyleElement>('style[data-tzslot]')].map((s) => s.dataset['tzslot']);

describe('a date field brings its own layout', () => {
  it('declares the calendar grid when the panel opens', () => {
    const host = document.createElement('div');
    document.body.append(host);
    field = createDateField(host, { locale: 'en-GB' });
    field.open();
    expect(sheets()).toContain('calendar');
    expect(sheets()).toContain('field');
  });

  it('and the grid is a grid, not a column of buttons', () => {
    const host = document.createElement('div');
    document.body.append(host);
    field = createDateField(host, { locale: 'en-GB' });
    field.open();
    const css = [...document.querySelectorAll<HTMLStyleElement>('style[data-tzslot="calendar"]')]
      .map((s) => s.textContent ?? '')
      .join('');
    // jsdom lays nothing out, so the rule itself is what can be asserted.
    expect(css).toMatch(/\.tz-cal__week[^}]*display:\s*grid/);
  });

  it('stays out of the way when the page asked it to', () => {
    const host = document.createElement('div');
    document.body.append(host);
    field = createDateField(host, { locale: 'en-GB', injectStyles: false });
    field.open();
    expect(sheets()).not.toContain('calendar');
  });
});
