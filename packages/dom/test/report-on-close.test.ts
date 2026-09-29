import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance, type RangeFieldValue } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * Holding the report, not the value.
 *
 * A screen that pays for every query wants one request per visit to the panel,
 * not one per click. `confirm` already waits, but it waits by keeping the value
 * to itself: close without pressing Apply and the reader's choice is gone. This
 * holds only the outward word — the field and the panel show every change as it
 * happens, and the screen hears once, on the way out.
 */
const paris = 'Europe/Paris';
let host: HTMLElement;
let field: RangeFieldInstance;
const reports: RangeFieldValue[] = [];

const make = (options = {}) => {
  reports.length = 0;
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    today: Temporal.PlainDate.from('2026-09-21'),
    presets: [],
    reportOn: 'close',
    onChange: (v) => reports.push(v),
    ...options,
  });
};
const press = (label: string) => {
  const cell = [...document.querySelectorAll<HTMLButtonElement>('.tz-range__day')].find(
    (c) => c.textContent === label && !c.className.includes('outside'),
  );
  if (!cell) throw new Error(`no day cell "${label}"`);
  cell.click();
};
const escape = () =>
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
const outside = () =>
  document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
const days = (v: RangeFieldValue) =>
  `${v.start ? v.start.toZonedDateTimeISO(paris).toPlainDate().toString() : '-'}..${
    v.end ? v.end.toZonedDateTimeISO(paris).toPlainDate().toString() : '-'
  }`;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
});

describe('reportOn: close', () => {
  it('says nothing while choosing, and once on the way out', () => {
    make();
    field.open();
    press('10');
    press('14');
    // Two clicks, and the screen has not been told anything yet.
    expect(reports).toHaveLength(0);
    // But the field shows them: nothing is held back from the reader.
    expect(days(field.value)).toBe('2026-09-10..2026-09-15');

    outside();
    expect(reports).toHaveLength(1);
    expect(days(reports[0]!)).toBe('2026-09-10..2026-09-15');
  });

  it('says nothing at all when nothing moved', () => {
    make();
    field.open();
    outside();
    // Opening and closing a panel is not a change, and `commit` has no
    // equality guard of its own — this is the one that stops the empty query.
    expect(reports).toHaveLength(0);
  });

  it('hands the value back on Escape, and stays silent', () => {
    make({ value: { start: Temporal.Instant.from('2026-09-01T00:00:00Z'), end: null } });
    field.open();
    press('10');
    expect(days(field.value)).toBe('2026-09-10..-');

    escape();
    // Silent, and back to what the screen last saw: the two cannot drift apart.
    expect(reports).toHaveLength(0);
    expect(field.value.start!.toString()).toBe('2026-09-01T00:00:00Z');
  });

  it('offers Apply, which says it and closes', () => {
    make();
    field.open();
    press('10');
    const apply = document.querySelector<HTMLButtonElement>('.tz-rangefield__apply');
    if (!apply) throw new Error('no Apply button');
    apply.click();
    expect(reports).toHaveLength(1);
    expect(field.isOpen).toBe(false);
  });

  it('offers Cancel, which hands the value back like Escape', () => {
    make({ value: { start: Temporal.Instant.from('2026-09-01T00:00:00Z'), end: null } });
    field.open();
    press('10');
    document.querySelector<HTMLButtonElement>('.tz-rangefield__cancel')!.click();
    expect(reports).toHaveLength(0);
    expect(field.value.start!.toString()).toBe('2026-09-01T00:00:00Z');
  });

  it('reports at once when the panel is not open', () => {
    // An arrow beside a closed field has no closing to wait for.
    make({ shift: { days: 1 }, value: { start: Temporal.Instant.from('2026-09-10T00:00:00Z'), end: null } });
    document.querySelector<HTMLButtonElement>('.tz-field__shift--next')!.click();
    expect(reports).toHaveLength(1);
  });

  it('leaves confirm alone, which holds the value rather than the word', () => {
    make({ confirm: true });
    field.open();
    press('10');
    press('14');
    expect(reports).toHaveLength(0);
    // confirm keeps the value to itself until Apply — closing loses it.
    expect(field.value.start).toBeNull();
    outside();
    expect(reports).toHaveLength(0);
  });

  it('reports every change when asked to, which is still the default', () => {
    make({ reportOn: 'change' });
    field.open();
    press('10');
    press('14');
    expect(reports).toHaveLength(2);
  });
});

describe('what the second review found', () => {
  const live = () =>
    document.querySelector('.tz-rangefield__status')?.textContent?.trim() ?? '';

  it('says nothing on open and close when a shortcut name is in hand', () => {
    // Every test above had `preset` unset, so the name the field reports
    // (`cameFrom`) and the name it remembered reporting agreed by accident.
    // Given one, they disagreed from the first instant: no gesture at all
    // reported, and reported `preset: null`, wiping the stored name off a
    // screen doing the saved-filter round trip.
    make({ preset: 'last7Days', presets: ['last7Days'] });
    field.open();
    outside();
    expect(reports).toHaveLength(0);
  });

  it('hands the value back rather than reporting it when destroyed', () => {
    // A widget being torn down is not a reader finishing. Reporting here fired
    // into a half-dead Angular component — `NG0953` — and lost the change all
    // the same.
    make({ value: { start: Temporal.Instant.from('2026-09-01T00:00:00Z'), end: null } });
    field.open();
    press('10');
    field.destroy();
    expect(reports).toHaveLength(0);
  });

  it('says a held change before the mode changes under it', () => {
    make();
    field.open();
    press('10');
    expect(reports).toHaveLength(0);
    // Back to reporting on every change: `onClose` would no longer be holding,
    // so nothing would ever have said this one.
    field.update({ reportOn: 'change' });
    expect(reports).toHaveLength(1);
    expect(days(reports[0]!)).toBe('2026-09-10..-');
  });

  it('says a held change before confirm takes the value hostage', () => {
    make();
    field.open();
    press('10');
    field.update({ confirm: true });
    expect(reports).toHaveLength(1);
  });

  it('says a held change before the shape is crossed over', () => {
    make();
    field.open();
    press('10');
    field.update({ singleDay: true });
    // The held change describes the old shape; reshaping it in silence would
    // hand the screen a period it never agreed to.
    expect(reports.length).toBeGreaterThanOrEqual(1);
    expect(days(reports[0]!)).toBe('2026-09-10..-');
  });

  it('obeys clear() at once, whatever the reader does next', () => {
    make({ value: { start: Temporal.Instant.from('2026-09-01T00:00:00Z'), end: null } });
    field.open();
    field.clear();
    // A screen calling this has already decided. Held, its effect depended on
    // how the reader happened to leave the panel — Escape undid it.
    expect(reports).toHaveLength(1);
    escape();
    expect(reports).toHaveLength(1);
    expect(field.value.start).toBeNull();
  });

  it('takes the clamp message away with the period it explained', () => {
    make({ maxSpan: { days: 5 } });
    field.open();
    press('5');
    press('25');
    expect(live()).toContain('5d');
    escape();
    field.open();
    // Reopening an empty field and being told it was shortened to fit.
    expect(live()).not.toContain('5d');
  });

  it('reports what Apply applied, not merely that something closed', () => {
    // The first version asserted only a count and `isOpen`, so it passed with
    // the button's handler deleted — any close flushes.
    make();
    field.open();
    press('10');
    press('14');
    document.querySelector<HTMLButtonElement>('.tz-rangefield__apply')!.click();
    expect(reports).toHaveLength(1);
    expect(days(reports[0]!)).toBe('2026-09-10..2026-09-15');
    expect(field.isOpen).toBe(false);
  });
});
