import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance, type RangeFieldValue } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * A period may run backwards, and the field does not pretend otherwise.
 *
 * It used to be impossible: arming a field and clicking past the other end
 * made the field drop that other end and ask for it again. The intention was
 * to spare the reader a period that matches nothing. The price was their own
 * work — a start set on purpose, an end brought back behind it, and the start
 * gone with nothing said.
 *
 * So both ends stand now. A consumer's `at >= :from AND at < :to` returns no
 * rows, which the reader can see, and the panel says why rather than going
 * quiet: the summary line reads the words the catalogue already had. What the
 * calendar must *not* do is paint it as an ordinary band — that is tested
 * here too, because it is the claim the whole change rests on.
 */
const paris = 'Europe/Paris';
let host: HTMLElement;
let field: RangeFieldInstance;
let reported: RangeFieldValue[];

const make = (options = {}) => {
  reported = [];
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    today: Temporal.PlainDate.from('2026-09-21'),
    presets: [],
    onChange: (value) => reported.push(value),
    ...options,
  });
};
const panel = () => document.querySelector('.tz-field__panel')!;
const shown = () => host.querySelector('.tz-field__text')!.textContent;
const day = (iso: string) => panel().querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
const armStart = () =>
  panel().querySelectorAll<HTMLInputElement>('.tz-dateinput__input')[0]!.dispatchEvent(new Event('focus'));
const inOrder = () => {
  const { start, end } = field.value;
  return !start || !end || Temporal.Instant.compare(start, end) <= 0;
};
/** What the consumer was handed, as two days. */
const inReport = (value: RangeFieldValue) => {
  const day_ = (i: RangeFieldValue['start']) =>
    i ? i.toZonedDateTimeISO(paris).toPlainDate().toString() : '-';
  return `${day_(value.start)} .. ${day_(value.end)}`;
};
/** The days the grid paints as inside the period. */
const banded = () =>
  [...panel().querySelectorAll<HTMLElement>('.tz-range__day--within')].map((c) => c.dataset['date']);
/** The days it marks as an end of it, either one. */
const marked = () =>
  [...panel().querySelectorAll<HTMLElement>('.tz-range__day--start, .tz-range__day--end')]
    .map((c) => c.dataset['date'])
    .sort();

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((node) => node.remove());
});

describe('a start pushed past the end', () => {
  it('keeps the end it has just run past, and lets the reader sort it out', () => {
    make();
    field.open();
    day('2026-09-10').click();
    day('2026-09-20').click();
    field.open();

    armStart();
    day('2026-09-25').click();

    // It used to drop the end and ask for it again, which cost the reader the
    // end they had already chosen, in silence.
    expect(field.value.start!.toZonedDateTimeISO(paris).toPlainDate().toString()).toBe('2026-09-25');
    expect(field.value.end!.toZonedDateTimeISO(paris).toPlainDate().toString()).toBe('2026-09-21');
    expect(inOrder()).toBe(false);

    // The two assertions that make this load-bearing, and that the first
    // rewrite dropped: what the field shows, and what the consumer is handed.
    // The whole argument for the change is that the screen queries and gets
    // nothing back — which only holds if the backwards period is reported.
    // 21 Sept at midnight *closes* the 20th, so that is the day both the
    // trigger and the grid name — the exclusive end, as everywhere else.
    expect(shown()).toBe('25/09/2026 – 20/09/2026');
    expect(inReport(reported.at(-1)!)).toBe('2026-09-25 .. 2026-09-21');

    // And the claim the change rests on: no band over a period that cannot be.
    expect(banded()).toEqual([]);
    expect(marked()).toEqual(['2026-09-20', '2026-09-25']);
  });

  it('and an end pulled before the start keeps the start', () => {
    make();
    field.open();
    day('2026-09-10').click();
    day('2026-09-20').click();
    field.open();

    panel().querySelectorAll<HTMLInputElement>('.tz-dateinput__input')[1]!.dispatchEvent(new Event('focus'));
    day('2026-09-05').click();
    // The gesture the screen's reader complained about: a start set on
    // purpose, an end brought back behind it, and the start gone.
    expect(field.value.start!.toZonedDateTimeISO(paris).toPlainDate().toString()).toBe('2026-09-10');
    expect(field.value.end!.toZonedDateTimeISO(paris).toPlainDate().toString()).toBe('2026-09-06');
  });

  it('with hours, the same: both ends stand', () => {
    make({ showTime: true, timeLayout: 'input' });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-18T08:00:00Z'), // 10:00
        end: Temporal.Instant.from('2026-09-18T15:00:00Z'), // 17:00
      },
    });
    field.open();
    armStart();
    day('2026-09-25').click();

    expect(inOrder()).toBe(false);
    expect(field.value.end).not.toBe(null);
    expect(shown()).toBe('25/09/2026 10:00 – 18/09/2026 17:00');
  });

  it('a locked end refuses the move instead of running backwards', () => {
    make({ disabled: { end: true } });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-09T22:00:00Z'), // 10 Sept
        end: Temporal.Instant.from('2026-09-20T22:00:00Z'), // 20 Sept
      },
    });
    field.open();
    armStart();
    day('2026-09-25').click();

    expect(shown()).toBe('10/09/2026 – 20/09/2026'); // unchanged
    expect(inOrder()).toBe(true);
  });
});
