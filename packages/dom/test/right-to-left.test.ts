import { describe, it, expect, afterEach } from 'vitest';
import { createCalendar, createRangeField } from '../src/index.js';
import { AR } from '../src/messages.js';
import { readingKey } from '../src/cells.js';
import { Temporal } from '@tzslot/core';

/**
 * What the library owes a reader of Arabic, beyond the words.
 *
 * None of this existed: no file read the writing direction anywhere, the
 * stylesheet carried thirty-one physical declarations against four logical
 * ones, and the panel -- which lives on the body and so inherits nothing --
 * was never told which way it read.
 *
 * jsdom lays nothing out, so what is checked here is what it can see: that the
 * direction reaches the panel, and that an arrow key means the day a reader
 * is pointing at. The stylesheet is checked by reading it, which is weaker
 * than a screenshot and stronger than nothing.
 */
let cleanup: (() => void) | null = null;
afterEach(() => {
  cleanup?.();
  cleanup = null;
  document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove());
  document.documentElement.removeAttribute('dir');
});

describe('an arrow key means a day, not a side', () => {
  it('is left alone in a left-to-right grid', () => {
    const host = document.createElement('div');
    document.body.append(host);
    cleanup = () => host.remove();
    expect(readingKey('ArrowLeft', host)).toBe('ArrowLeft');
    expect(readingKey('ArrowRight', host)).toBe('ArrowRight');
  });

  it('swaps in a right-to-left one, where tomorrow is drawn to the left', () => {
    const host = document.createElement('div');
    host.style.direction = 'rtl';
    document.body.append(host);
    cleanup = () => host.remove();
    expect(readingKey('ArrowLeft', host)).toBe('ArrowRight');
    expect(readingKey('ArrowRight', host)).toBe('ArrowLeft');
  });

  it('leaves up and down alone: a week is below the one before it everywhere', () => {
    const host = document.createElement('div');
    host.style.direction = 'rtl';
    document.body.append(host);
    cleanup = () => host.remove();
    for (const key of ['ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter']) {
      expect(readingKey(key, host)).toBe(key);
    }
  });
});

describe('the panel is told which way it reads', () => {
  it('because it lives on the body and inherits nothing', () => {
    const host = document.createElement('div');
    host.style.direction = 'rtl';
    document.body.append(host);
    const field = createRangeField(host, {
      timeZone: 'Europe/Paris', locale: 'ar-EG', messages: AR,
      today: Temporal.PlainDate.from('2026-09-20'),
    });
    cleanup = () => { field.destroy(); host.remove(); };
    field.open();
    const panel = document.querySelector<HTMLElement>('.tz-field__panel')!;
    expect(panel.dir).toBe('rtl');
    // An application whose container is reversed while the page is not: the
    // panel is a sibling of <body>'s children, so nothing else would say so.
    expect(panel.parentElement).toBe(document.body);
  });

  it('and says ltr when the field is, rather than leaving it unset', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const field = createCalendar(host, { today: Temporal.PlainDate.from('2026-09-20') });
    cleanup = () => { field.destroy(); host.remove(); };
    const other = document.createElement('div');
    document.body.append(other);
    const dated = createRangeField(other, { timeZone: 'Europe/Paris' });
    dated.open();
    expect(document.querySelector<HTMLElement>('.tz-field__panel')!.dir).toBe('ltr');
    dated.destroy();
    other.remove();
  });
});

describe('a page holding two copies of Temporal', () => {
  /*
   * `instanceof` asks which copy a value came from, and a page can hold two:
   * the polyfill ships a basic entry and a full one, separate module graphs
   * with separate classes. A consumer importing one while the library imports
   * the other had every check between them answer false.
   *
   * Only where the platform has no Temporal of its own — Safari, and server
   * rendering — because elsewhere both entries resolve to the platform's and
   * the question never comes up. The two places hardest to notice it in.
   */
  it('reads an instant by its shape, not by its class', async () => {
    const { Temporal: other } = await import('temporal-polyfill');
    const { Temporal: ours } = await import('@tzslot/core');
    // The premise: two classes, and a value from one is not of the other.
    const foreign = other.Instant.from('2026-09-20T08:00:00Z');
    const mine = ours.Instant.from('2026-09-20T08:00:00Z');
    if (other.Instant !== ours.Instant) {
      expect(foreign instanceof ours.Instant).toBe(false);
    }

    const host = document.createElement('div');
    document.body.append(host);
    const said: unknown[] = [];
    const field = createRangeField(host, {
      timeZone: 'Europe/Paris',
      presets: [{ name: 'foreign', label: 'From elsewhere', range: () => ({ start: foreign, end: foreign.add({ hours: 2 }) }) }],
      onChange: (v) => said.push(v),
    });
    cleanup = () => { field.destroy(); host.remove(); };
    field.open();
    const shortcut = document.querySelector<HTMLButtonElement>('.tz-rangefield__preset');
    expect(shortcut).not.toBeNull();

    // It used to throw inside the handler and leave the field on its mask.
    expect(() => shortcut!.click()).not.toThrow();
    expect(host.querySelector('.tz-field__text')!.textContent).not.toBe('Start date – End date');
    expect(said.length).toBeGreaterThan(0);
    expect(mine.epochNanoseconds).toBe(foreign.epochNanoseconds);
  });
});
