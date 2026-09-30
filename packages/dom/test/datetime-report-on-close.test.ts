import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDateTimeField, type DateTimeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';
import type { Instant } from '@tzslot/core';

/**
 * Holding the report on a field that takes a day and a time.
 *
 * A session here is three gestures — a day, an hour, a minute — so a screen
 * that queries on each one queries three times for a single decision. The
 * range field got this first; the moment field is where it bites hardest,
 * because its panel deliberately stays open between the day and the time.
 */
const paris = 'Europe/Paris';
let host: HTMLElement;
let field: DateTimeFieldInstance;
const reports: (Instant | null)[] = [];

const mount = (o = {}) => {
  reports.length = 0;
  field = createDateTimeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    today: Temporal.PlainDate.from('2026-09-21'),
    reportOn: 'close',
    onChange: (v) => reports.push(v),
    ...o,
  });
};
const panel = () => document.querySelector<HTMLElement>('.tz-field__panel');
const day = (iso: string) => panel()!.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
const typeTime = (part: 'hour' | 'minute', text: string) => {
  const b = panel()!.querySelector<HTMLInputElement>(`[data-part="${part}"].tz-time__input`)!;
  b.focus();
  b.value = text;
  b.dispatchEvent(new Event('input', { bubbles: true }));
  b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
};
const escape = () =>
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
const outside = () => document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
});

describe('a moment field told once', () => {
  it('holds a day and a time, and says one thing on the way out', () => {
    mount();
    field.open();
    day('2026-09-10').click();
    typeTime('hour', '14');
    typeTime('minute', '30');
    // Three gestures, and the screen has heard nothing.
    expect(reports).toHaveLength(0);
    // The field shows all three: held, not hidden.
    expect(field.value!.toZonedDateTimeISO(paris).toPlainDateTime().toString()).toBe(
      '2026-09-10T14:30:00',
    );

    outside();
    expect(reports).toHaveLength(1);
    expect(reports[0]!.toZonedDateTimeISO(paris).toPlainDateTime().toString()).toBe(
      '2026-09-10T14:30:00',
    );
  });

  it('says nothing when nothing moved', () => {
    mount({ value: Temporal.Instant.from('2026-09-10T08:00:00Z') });
    field.open();
    outside();
    expect(reports).toHaveLength(0);
  });

  it('hands the moment back on Escape, and stays silent', () => {
    mount({ value: Temporal.Instant.from('2026-09-01T08:00:00Z') });
    field.open();
    day('2026-09-10').click();
    escape();
    expect(reports).toHaveLength(0);
    expect(field.value!.toString()).toBe('2026-09-01T08:00:00Z');
  });

  it('hands it back rather than reporting it when destroyed', () => {
    mount({ value: Temporal.Instant.from('2026-09-01T08:00:00Z') });
    field.open();
    day('2026-09-10').click();
    field.destroy();
    expect(reports).toHaveLength(0);
  });

  it('says a held change before the mode changes under it', () => {
    mount();
    field.open();
    day('2026-09-10').click();
    expect(reports).toHaveLength(0);
    field.update({ reportOn: 'change' });
    expect(reports).toHaveLength(1);
  });

  it('obeys clear() at once, whatever the reader does next', () => {
    mount({ value: Temporal.Instant.from('2026-09-01T08:00:00Z') });
    field.open();
    field.clear();
    expect(reports).toHaveLength(1);
    escape();
    expect(reports).toHaveLength(1);
    expect(field.value).toBeNull();
  });

  it('reports every gesture when asked to, which is still the default', () => {
    mount({ reportOn: 'change' });
    field.open();
    day('2026-09-10').click();
    typeTime('hour', '14');
    expect(reports.length).toBeGreaterThanOrEqual(2);
  });
});

describe('what the review found', () => {
  const trigger = () =>
    host.querySelector<HTMLInputElement>('input.tz-field__trigger')!;
  const note = () => panel()?.querySelector<HTMLElement>('.tz-datetime__note');
  const chosenDay = () =>
    [...(panel()?.querySelectorAll<HTMLElement>('.tz-cal__day--selected') ?? [])].map(
      (d) => d.dataset['date'],
    );

  it('keeps the reader half-finished moment when the value is echoed back', () => {
    const known = Temporal.Instant.from('2026-09-01T08:00:00Z');
    mount({ value: known });
    field.open();
    day('2026-09-10').click();
    // Any unrelated input changing pushes the whole settings object down, and
    // the consumer's copy is the last thing it was told.
    field.update({ value: known, placeholder: 'something else' });
    expect(field.value!.toZonedDateTimeISO(paris).toPlainDate().toString()).toBe('2026-09-10');
    outside();
    expect(reports).toHaveLength(1);
  });

  it('rewrites the text on Escape even when the focus never left it', () => {
    // `onClose` runs before the panel restores focus, so the trigger was still
    // the active element and `render` skipped rewriting it: the field went on
    // showing the abandoned moment, and the next blur resurrected and reported
    // it — the one state the docs call worse than either.
    mount({ value: Temporal.Instant.from('2026-09-01T08:00:00Z') });
    const box = trigger();
    box.focus();
    field.open();
    day('2026-09-10').click();
    escape();
    expect(box.value).not.toContain('10/09/2026');
    box.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(reports).toHaveLength(0);
    expect(field.value!.toString()).toBe('2026-09-01T08:00:00Z');
  });

  it('hands the panel back too, not only the value', () => {
    // The panel is rebuilt from a draft, not from the value. Restoring one and
    // not the other left the calendar on the abandoned day, and the next
    // gesture committed it.
    mount({ value: Temporal.Instant.from('2026-09-01T08:00:00Z'), editable: false });
    field.open();
    day('2026-09-10').click();
    escape();
    field.open();
    expect(chosenDay()).toEqual(['2026-09-01']);
  });

  it('forgets which reading of a repeated hour was picked', () => {
    // Paris, the morning 02:00 happens twice.
    mount({ today: Temporal.PlainDate.from('2026-10-25'), editable: false });
    field.open();
    day('2026-10-25').click();
    typeTime('hour', '02');
    const both = panel()!.querySelectorAll<HTMLButtonElement>('.tz-datetime__reading');
    expect(both).toHaveLength(2);
    both[1]!.click();
    escape();
    field.open();
    // An empty field asking which of two readings of an hour it is.
    expect(field.value).toBeNull();
    expect(note()?.hidden ?? true).toBe(true);
  });

  it('says Clear even on a field that was already empty', () => {
    // The documented contract, and `flush` alone cannot keep it: nothing moved
    // for it to compare.
    mount({ value: null });
    field.open();
    field.clear();
    expect(reports).toEqual([null]);
  });
});
