import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance, type RangeFieldValue } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * A period with one end left open.
 *
 * `WHERE at >= :start` with no upper bound is an ordinary search, and until
 * now there was no way to ask for one: a single chosen day was a selection
 * half made, not an answer. "Until 20 September" could not be said at all.
 */
const paris = 'Europe/Paris';
const today = Temporal.PlainDate.from('2026-09-21');
let host: HTMLElement;
let field: RangeFieldInstance;
let reported: RangeFieldValue[];

const make = (options = {}) => {
  reported = [];
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    today,
    openEnded: true,
    onChange: (value) => reported.push(value),
    ...options,
  });
};
const shown = () => host.querySelector('.tz-field__text')!.textContent;
const panel = () => document.querySelector('.tz-field__panel')!;
const input = (edge: 0 | 1) =>
  panel().querySelectorAll<HTMLInputElement>('.tz-dateinput__input')[edge]!;
const cross = (edge: 0 | 1) =>
  panel().querySelectorAll<HTMLButtonElement>('.tz-dateinput__clear')[edge]!;
const armed = () =>
  [...panel().querySelectorAll('.tz-dateinput')].findIndex((n) => n.classList.contains('tz-dateinput--armed'));
const type = (edge: 0 | 1, text: string) => {
  const node = input(edge);
  node.focus();
  node.value = text;
  node.dispatchEvent(new Event('input', { bubbles: true }));
  node.dispatchEvent(new Event('blur'));
};
const day = (iso: string) => panel().querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
const paris_ = (value: RangeFieldValue) => ({
  start: value.start?.toZonedDateTimeISO(paris).toPlainDateTime().toString({ smallestUnit: 'minute' }) ?? null,
  end: value.end?.toZonedDateTimeISO(paris).toPlainDateTime().toString({ smallestUnit: 'minute' }) ?? null,
});

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((node) => node.remove());
});

describe('asking for one end only', () => {
  it('a start alone is a period, once the end is emptied', () => {
    make();
    field.open();
    day('2026-09-14').click();
    cross(1).click(); // no end

    expect(paris_(field.value)).toEqual({ start: '2026-09-14T00:00', end: null });
    expect(shown()).toBe('From 14/09/2026');
  });

  it('an end alone keeps the midnight after, so the day itself is included', () => {
    make();
    field.open();
    input(1).focus(); // arm the end
    day('2026-09-20').click();
    cross(0).click(); // no start

    expect(paris_(field.value)).toEqual({ start: null, end: '2026-09-21T00:00' });
    expect(shown()).toBe('Until 20/09/2026');
  });

  it('emptying one end leaves the other alone', () => {
    make();
    field.open();
    day('2026-09-14').click();
    day('2026-09-20').click();
    expect(shown()).toBe('14/09/2026 – 20/09/2026');

    cross(0).click();
    expect(shown()).toBe('Until 20/09/2026'); // the end is untouched
    expect(input(1).value).toBe('20/09/2026');
  });

  it('the cross says what it empties', () => {
    make({ messages: FR, locale: 'fr-FR' });
    field.open();
    expect(cross(0).getAttribute('aria-label')).toBe('Vider ce champ');
    expect([...panel().querySelectorAll('.tz-dateinput__label')].map((n) => n.textContent)).toEqual(['Du', 'Au']);
  });

  it('carries the hours when there are any', () => {
    make({ showTime: true });
    field.update({
      value: { start: Temporal.Instant.from('2026-09-14T07:00:00Z'), end: null },
    });
    expect(shown()).toBe('From 14/09/2026 09:00');
    field.open();
    expect(input(0).value).toBe('14/09/2026');
    const hour = panel().querySelector<HTMLSelectElement>('.tz-dateinput .tz-timeselect__menu')!;
    expect(hour.selectedOptions[0]!.textContent).toBe('09'); // its own control beside the day
  });

  it('an imposed step moves the single end, and “auto” falls back to a day', () => {
    make({ shift: { days: 7 } });
    field.update({
      value: { start: Temporal.Instant.from('2026-09-13T22:00:00Z'), end: null },
    });
    const arrows = () => host.querySelectorAll<HTMLButtonElement>('.tz-field__shift');
    expect(arrows()[1]!.disabled).toBe(false);
    arrows()[1]!.click();
    expect(shown()).toBe('From 21/09/2026');

    // There is no length to follow here, but refusing to move was worse than
    // choosing the unit the calendar itself works in.
    field.update({ shift: { days: 1 } });
    expect(arrows()[1]!.disabled).toBe(false);
    arrows()[1]!.click();
    expect(shown()).toBe('From 22/09/2026');
  });
});

describe('the two fields decide which end a click is about', () => {
  it('the first click fills the start and arms the end', () => {
    make();
    field.open();
    expect(armed()).toBe(0);
    day('2026-09-14').click();
    expect(armed()).toBe(1);
    day('2026-09-20').click();
    expect(shown()).toBe('14/09/2026 – 20/09/2026');
  });

  it('and correcting one date leaves the other where it was', () => {
    make();
    field.open();
    day('2026-09-14').click();
    day('2026-09-20').click();

    // Dispatched rather than called: the panel already focused this field when
    // it opened, and focus() on the focused element fires nothing. In a
    // browser the day cells take the focus in between, so the click back into
    // the field is a real focus event.
    input(0).dispatchEvent(new Event('focus'));
    day('2026-09-16').click();
    expect(shown()).toBe('16/09/2026 – 20/09/2026'); // the end survived
    expect(armed()).toBe(0); // and the end was not armed behind our back
  });

  it('survives the value being handed straight back, as a framework does', () => {
    make();
    field.open();
    day('2026-09-14').click();
    expect(armed()).toBe(1);
    // Angular writes the reported value back into the widget after every
    // change. That used to re-arm the start, and both clicks landed on it.
    field.update({ value: field.value });
    expect(armed()).toBe(1);
    day('2026-09-20').click();
    expect(shown()).toBe('14/09/2026 – 20/09/2026');
  });

  it('a date typed reaches the value, months away', () => {
    make();
    field.open();
    day('2026-09-14').click();
    type(1, '03/02/2028');
    expect(shown()).toBe('14/09/2026 – 03/02/2028');
    // and the calendar went there, so the next click is in the right month
    expect(panel().querySelector('.tz-range__month-title')!.textContent).toContain('February');
  });
});

describe('without openEnded', () => {
  it('there are no modes, and a half-made selection still reads as one', () => {
    make({ openEnded: false });
    field.open();
    expect(panel().querySelector<HTMLButtonElement>('.tz-dateinput__clear')!.hidden).toBe(true); // no way to empty one
    day('2026-09-14').click();
    expect(shown()).toBe('14/09/2026 – …'); // unfinished, and it looks unfinished
  });
});

describe('the interval, open at one end', () => {
  it('says what it means instead of going quiet', async () => {
    const { createDateTimeRange } = await import('../src/index.js');
    const widget = createDateTimeRange(host, {
      timeZone: paris,
      locale: 'en-GB',
      openEnded: true,
      value: { start: Temporal.Instant.from('2026-09-14T07:00:00Z'), end: null },
    });
    expect(host.querySelector('.tz-dtr__summary')!.textContent).toBe('From 14 Sept 2026, 09:00');

    widget.update({ value: { start: null, end: Temporal.Instant.from('2026-09-20T15:00:00Z') } });
    expect(host.querySelector('.tz-dtr__summary')!.textContent).toBe('Until 20 Sept 2026, 17:00');
    widget.destroy();
  });

  it('stays quiet when the screen never asked for it', async () => {
    const { createDateTimeRange } = await import('../src/index.js');
    const widget = createDateTimeRange(host, {
      timeZone: paris,
      locale: 'en-GB',
      value: { start: Temporal.Instant.from('2026-09-14T07:00:00Z'), end: null },
    });
    expect(host.querySelector('.tz-dtr__summary')).toBe(null); // half-made, and it shows
    widget.destroy();
  });
});

describe('the hours live in the two fields now', () => {
  it('so an end that does not exist has no hour to show either', () => {
    make({ showTime: true });
    field.open();
    day('2026-09-14').click();
    cross(1).click();

    expect(input(0).value).toBe('14/09/2026');
    expect(input(1).value).toBe('');
    // No separate row of hours any more: one field says the whole thing.
    expect(panel().querySelector('.tz-rangefield__times')).toBe(null);
    expect(panel().querySelector('.tz-dtr__allday')).toBe(null);
  });

  it('both fields carry an hour as soon as the screen asks for one', () => {
    make({ showTime: true });
    field.open();
    day('2026-09-14').click();
    day('2026-09-20').click();
    expect(input(0).value).toBe('14/09/2026'); // the day, in the text
    const hours = [...panel().querySelectorAll<HTMLElement>('.tz-dateinput__time')];
    expect(hours.map((h) => h.hidden)).toEqual([false, false]); // the hour, beside it
    // The day clicked as the end means all of it: the midnight opening the 21st.
    expect(field.value.end!.toZonedDateTimeISO('Europe/Paris').toPlainDate().toString()).toBe('2026-09-21');
  });
});

describe('moving a period that is open at one end', () => {
  const arrows = () => host.querySelectorAll<HTMLButtonElement>('.tz-field__shift');

  it('a day at a time, without reopening the calendar', () => {
    make({ shift: { days: 1 } });
    field.update({
      value: { start: Temporal.Instant.from('2026-09-17T22:00:00Z'), end: null }, // from 18 Sept
    });
    expect(shown()).toBe('From 18/09/2026');
    expect(arrows()[0]!.disabled).toBe(false); // it used to refuse

    arrows()[0]!.click();
    expect(shown()).toBe('From 17/09/2026');
    expect(field.isOpen).toBe(false); // and the panel never had to open
    arrows()[1]!.click();
    arrows()[1]!.click();
    expect(shown()).toBe('From 19/09/2026');
    expect(field.value.end).toBe(null); // still open at the other end
  });

  it('an imposed step wins, and a short one moves the moment', () => {
    make({ shift: { minutes: 15 }, showTime: true });
    field.update({
      value: { start: Temporal.Instant.from('2026-09-18T08:00:00Z'), end: null }, // 10:00
    });
    expect(shown()).toBe('From 18/09/2026 10:00');
    arrows()[0]!.click();
    expect(shown()).toBe('From 18/09/2026 09:45');
  });

  it('a month steps the month, and the hour stays put', () => {
    make({ shift: { months: 1 }, showTime: true });
    field.update({
      value: { start: null, end: Temporal.Instant.from('2026-09-20T15:00:00Z') }, // until 17:00
    });
    expect(shown()).toBe('Until 20/09/2026 17:00');
    arrows()[1]!.click();
    expect(shown()).toBe('Until 20/10/2026 17:00');
  });
});

describe('the interval’s sentence, on the morning an hour repeats', () => {
  it('says which reading it means', async () => {
    const { createDateTimeRange } = await import('../src/index.js');
    const widget = createDateTimeRange(host, {
      timeZone: paris,
      locale: 'en-GB',
      openEnded: true,
      value: { start: Temporal.Instant.from('2026-10-25T00:30:00Z'), end: null },
    });
    expect(host.querySelector('.tz-dtr__summary')!.textContent).toBe('From 25 Oct 2026, 02:30 (summer)');
    widget.update({ value: { start: Temporal.Instant.from('2026-10-25T01:30:00Z'), end: null } });
    expect(host.querySelector('.tz-dtr__summary')!.textContent).toBe('From 25 Oct 2026, 02:30 (winter)');
    widget.destroy();
  });
});
