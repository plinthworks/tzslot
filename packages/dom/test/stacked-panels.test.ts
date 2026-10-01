import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDateTimeField, type DateTimeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * Two panels open at once, which a screen with two fields has whenever a
 * reader opens one before the other has finished closing.
 *
 * Escape belongs to the topmost: its handler sits on the document, so one
 * press used to close every open panel — and with `reportOn: 'close'` that
 * meant leaving one field abandoned the other's held change.
 *
 * And the scroll lock belongs to whoever took it. A popup saved the page's
 * `overflow` as well and handed it back on the way out, so a dialog opening
 * first, then a popup, then both closing in that order left the page locked
 * for good with nothing on screen to explain it.
 */
let a: HTMLElement;
let b: HTMLElement;
let one: DateTimeFieldInstance;
let two: DateTimeFieldInstance;

const make = (host: HTMLElement, mode: 'popup' | 'dialog' = 'popup') =>
  createDateTimeField(host, {
    timeZone: 'Europe/Paris',
    locale: 'en-GB',
    today: Temporal.PlainDate.from('2026-09-21'),
    mode,
  });

beforeEach(() => {
  a = document.createElement('div');
  b = document.createElement('div');
  document.body.append(a, b);
});
afterEach(() => {
  one?.destroy();
  two?.destroy();
  a.remove();
  b.remove();
  document.documentElement.style.overflow = '';
});

describe('two panels at once', () => {
  it('lets Escape close the top one only', () => {
    one = make(a);
    two = make(b);
    one.open();
    two.open();
    expect([one.isOpen, two.isOpen]).toEqual([true, true]);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect([one.isOpen, two.isOpen]).toEqual([true, false]);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect([one.isOpen, two.isOpen]).toEqual([false, false]);
  });

  it('gives the page back its scrolling', () => {
    const atRest = document.documentElement.style.overflow;
    one = make(a, 'dialog');
    two = make(b, 'popup');
    one.open();
    expect(document.documentElement.style.overflow).toBe('hidden');
    two.open();
    one.close();
    two.close();
    expect(document.documentElement.style.overflow).toBe(atRest);
  });
});
