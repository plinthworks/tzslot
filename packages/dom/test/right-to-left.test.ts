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
