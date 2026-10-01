import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * Tab stays inside an open panel — including the stops it cannot see.
 *
 * A field hides one whole end by putting `hidden` on the wrapper, not on the
 * input. The trap tested the attribute on the node itself, so that input
 * counted as a stop, sat last in the list, and — being unfocusable — never
 * matched the wrap-around test. Tab walked straight out of the panel.
 */
let host: HTMLElement;
let field: RangeFieldInstance;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
});

const panel = () => document.querySelector<HTMLElement>('.tz-field__panel')!;
const stops = () =>
  [...panel().querySelectorAll<HTMLElement>(
    'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]',
  )].filter((n) => n.getAttribute('tabindex') !== '-1');
const insideHidden = (node: HTMLElement) => {
  for (let at: HTMLElement | null = node; at && at !== panel(); at = at.parentElement) {
    if (at.hasAttribute('hidden')) return true;
  }
  return false;
};

describe('a panel with one end hidden', () => {
  it('wraps Tab round instead of letting it out', () => {
    field = createRangeField(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: [],
      singleDay: true,
      showTime: true,
      timeLayout: 'select',
    });
    field.open();

    // The shape that broke it: a stop living inside a hidden wrapper.
    const buried = stops().filter(insideHidden);
    expect(buried.length).toBeGreaterThan(0);

    const visible = stops().filter((n) => !insideHidden(n));
    const last = visible[visible.length - 1]!;
    last.focus();
    expect(document.activeElement).toBe(last);

    panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    // Back to the head of the panel, not out of it.
    expect(document.activeElement).toBe(visible[0]);
  });
});
