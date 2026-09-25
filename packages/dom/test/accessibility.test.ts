import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * What a screen reader is told.
 *
 * Four holes that compounded: the trigger's name was "Choose a range" whatever
 * it held, a day cell was called "21" with no month and no year, nothing said
 * which day was today, and the only live region in an open panel was the month
 * heading — so choosing a start, choosing an end and firing a shortcut were
 * all silent.
 */
let host: HTMLElement;
let field: RangeFieldInstance;
const week = {
  start: Temporal.Instant.from('2026-09-20T22:00:00Z'), // 21 Sept, 00:00 Paris
  end: Temporal.Instant.from('2026-09-25T22:00:00Z'), // 26 Sept, 00:00 — the 25th whole
};
const make = (options = {}) => {
  field = createRangeField(host, {
    timeZone: 'Europe/Paris',
    locale: 'fr-FR',
    messages: FR,
    today: Temporal.PlainDate.from('2026-09-21'),
    months: 1,
    ...options,
  });
};
const trigger = () => host.querySelector('.tz-field__trigger')!;
const cell = (iso: string) =>
  document.querySelector<HTMLButtonElement>(`.tz-field__panel .tz-range__day[data-date="${iso}"]`)!;

beforeEach(() => { host = document.createElement('div'); document.body.append(host); });
afterEach(() => { field?.destroy(); host.remove(); document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove()); });

describe('the trigger says what it holds', () => {
  it('names the subject when empty, and the value when there is one', () => {
    make({ title: 'Période du filtrage' });
    expect(trigger().getAttribute('aria-label')).toBe('Période du filtrage');
    field.update({ value: week });
    // aria-label overrides the contents, so without this the dates a sighted
    // reader can see were announced as "Période du filtrage" and nothing else.
    expect(trigger().getAttribute('aria-label')).toBe('Période du filtrage, 21/09/2026 – 25/09/2026');
  });
});

describe('a day cell says where it is', () => {
  it('carries the whole date, not the number alone', () => {
    make({ value: week });
    field.open();
    expect(cell('2026-09-23').getAttribute('aria-label')).toBe('mercredi 23 septembre 2026, dans la période');
    expect(cell('2026-09-21').getAttribute('aria-label')).toContain('début de la période');
    expect(cell('2026-09-25').getAttribute('aria-label')).toContain('fin de la période');
  });

  it('counts the days between as selected', () => {
    // They were announced as unselected: aria-selected was set on the two ends
    // alike and false on everything in between.
    make({ value: week });
    field.open();
    expect(cell('2026-09-23').getAttribute('aria-selected')).toBe('true');
    expect(cell('2026-09-28').getAttribute('aria-selected')).toBe('false');
  });

  it('says which day is today', () => {
    make({ value: week });
    field.open();
    expect(cell('2026-09-21').getAttribute('aria-current')).toBe('date');
    expect(cell('2026-09-22').getAttribute('aria-current')).toBe(null);
  });
});

describe('the panel says what it has just done', () => {
  it('holds a polite status that follows the value', () => {
    make();
    field.open();
    const status = document.querySelector('.tz-field__panel .tz-rangefield__status')!;
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('');
    cell('2026-09-21').click();
    expect(status.textContent).toBe('Sélection : 21/09/2026 – …');
    cell('2026-09-25').click();
    expect(status.textContent).toBe('Sélection : 21/09/2026 – 25/09/2026');
  });
});

describe('a limit that moves the other end says so', () => {
  it('names what holds the period, alongside the value', () => {
    // The clamp is right — a refusal leaves the reader guessing which end was
    // wrong — but it moved an end the reader had set and said nothing.
    make({ maxSpan: { days: 3 } });
    field.open();
    cell('2026-09-21').click();
    cell('2026-09-30').click();
    const status = document.querySelector('.tz-field__panel .tz-rangefield__status')!;
    // The touched end stays and the other moves: clicking the 30th as the end
    // pulls the start up to the 28th, three days back.
    expect(status.textContent).toContain('Sélection : 28/09/2026 – 30/09/2026');
    expect(status.textContent).toContain("L'autre borne a bougé");
  });
});

describe('a field can be emptied, and an arrow keeps confirm’s promise', () => {
  it('offers a Clear that empties the whole period', () => {
    // The cross inside each date lived behind openEnded, so a plain period
    // field could not be emptied at all — a filter nobody can take off.
    make({ value: week });
    field.open();
    const clear = document.querySelector<HTMLButtonElement>('.tz-field__panel .tz-rangefield__clear')!;
    expect(clear.textContent).toBe(FR.clear);
    clear.click();
    expect(field.value).toEqual({ start: null, end: null });
  });

  it('does not report from a closed field when confirm is on', () => {
    // confirm promises nothing is reported until Apply — "for searches that
    // cost" — and an arrow beside a closed field went straight to commit.
    const reported: unknown[] = [];
    field = createRangeField(host, {
      timeZone: 'Europe/Paris', locale: 'fr-FR', messages: FR, months: 1,
      today: Temporal.PlainDate.from('2026-09-21'), confirm: true, shift: true,
      value: week, onChange: (v) => reported.push(v),
    });
    host.querySelector<HTMLButtonElement>('.tz-field__shift--prev')!.click();
    expect(reported).toHaveLength(0);
    // It opens on the moved period instead, so the reader can see and apply it.
    expect(field.isOpen).toBe(true);
  });
});
