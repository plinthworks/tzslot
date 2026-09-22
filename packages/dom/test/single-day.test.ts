import { describe, it, expect, afterEach } from 'vitest';
import { Temporal } from '@tzslot/core';
import type { Instant } from '@tzslot/core';
import { createRangeField } from '../src/range-field.js';

/**
 * One field instead of two.
 *
 * The value is a period either way — a day's first instant to the next day's —
 * so a screen can turn this on and off without what it is bound to ever
 * changing shape. It is the same period their old screen sent: midnight to
 * midnight, computed by hand, with a checkbox to switch.
 */
const paris = 'Europe/Paris';
let field: ReturnType<typeof createRangeField> | null = null;

const mount = (options: Record<string, unknown> = {}) => {
  const host = document.createElement('div');
  document.body.append(host);
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    today: Temporal.PlainDate.from('2026-09-22'),
    ...options,
  });
  return { host, field };
};

const panel = () => document.querySelector<HTMLElement>('.tz-field__panel')!;
const day = (iso: string) => panel().querySelector<HTMLButtonElement>(`.tz-range__day[data-date="${iso}"]`)!;
const reads = (host: HTMLElement) => host.querySelector('.tz-field__text')!.textContent;
const endField = () => panel().querySelector<HTMLElement>('.tz-rangefield__field--end')!;
const shortcuts = () => [...panel().querySelectorAll('.tz-rangefield__preset')].map((b) => b.textContent);
const iso = (at: unknown) => (at as Instant).toZonedDateTimeISO(paris).toPlainDate().toString();

afterEach(() => {
  field?.destroy();
  field = null;
  document.body.replaceChildren();
});

describe('singleDay', () => {
  it('shows one field, not two', () => {
    const { field: f } = mount({ singleDay: true });
    f.open();
    expect(endField().hidden).toBe(true);
  });

  it('a click is the whole day: its first instant to the next day’s', () => {
    const { host, field: f } = mount({ singleDay: true });
    f.open();
    day('2026-09-22').click();
    expect(iso(f.value.start)).toBe('2026-09-22');
    expect(iso(f.value.end)).toBe('2026-09-23');
    expect(reads(host)).toBe('22/09/2026');
  });

  it('leaves out the shortcuts that need more than a day', () => {
    const { field: f } = mount({
      singleDay: true,
      presets: ['yesterday', 'today', 'tomorrow', 'last7Days', 'thisMonth'],
    });
    f.open();
    expect(shortcuts()).toEqual(['Yesterday', 'Today', 'Tomorrow']);
  });

  it('and brings them back when it is turned off', () => {
    const { field: f } = mount({
      singleDay: true,
      presets: ['today', 'last7Days', 'thisMonth'],
    });
    f.open();
    expect(shortcuts()).toEqual(['Today']);
    f.update({ singleDay: false });
    expect(shortcuts()).toEqual(['Today', 'Last 7 days', 'This month']);
  });

  it('keeps the start day when a period becomes one day', () => {
    const { host, field: f } = mount({
      value: {
        start: Temporal.Instant.from('2026-09-21T22:00:00Z'), // 22 Sept
        end: Temporal.Instant.from('2026-09-27T22:00:00Z'), // 28 Sept
      },
    });
    f.update({ singleDay: true });
    expect(iso(f.value.start)).toBe('2026-09-22');
    expect(iso(f.value.end)).toBe('2026-09-23');
    expect(reads(host)).toBe('22/09/2026');
  });

  it('arms the end coming back, so the next click extends rather than restarts', () => {
    const { host, field: f } = mount({ singleDay: true });
    f.open();
    day('2026-09-22').click();
    // The switch lives outside the panel, so pressing it closes it. The test
    // said nothing about that and passed while the browser did not.
    f.close();
    f.update({ singleDay: false });
    f.open();
    day('2026-09-25').click();
    // The 22nd survived: without arming the end it would have become the start
    // of a fresh selection and the day chosen a moment ago would be gone.
    expect(iso(f.value.start)).toBe('2026-09-22');
    expect(reads(host)).toBe('22/09/2026 – 25/09/2026');
  });

  it('the attribute is obeyed — a display on the element would beat it', () => {
    const { field: f } = mount({ singleDay: true });
    f.open();
    const css = [...document.querySelectorAll<HTMLStyleElement>('style[data-tzslot="rangefield"]')]
      .map((sheet) => sheet.textContent ?? '')
      .join('');
    expect(css).toContain('.tz-rangefield__field[hidden],');
  });
});
