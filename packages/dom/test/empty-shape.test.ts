import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * What an empty field says.
 *
 * A day, a period and a period with hours all read "Choose a range", so the
 * three shapes were indistinguishable until someone opened the panel. A mask
 * shows how many dates are wanted, whether the hours count, and the order the
 * locale writes them in — which helps the typing as well as the reading.
 */
let host: HTMLElement;
let field: RangeFieldInstance;
const lu = () => host.querySelector('.tz-field__text')!.textContent;
const make = (options = {}) => {
  field = createRangeField(host, {
    timeZone: 'Europe/Paris',
    locale: 'fr-FR',
    messages: FR,
    today: Temporal.PlainDate.from('2026-09-24'),
    ...options,
  });
};

beforeEach(() => { host = document.createElement('div'); document.body.append(host); });
afterEach(() => { field?.destroy(); host.remove(); document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove()); });

describe('an empty field names what it wants', () => {
  it('one date for one day', () => {
    make({ singleDay: true });
    expect(lu()).toBe('Date');
  });

  it('two, named, for a period', () => {
    // A mask of dashes said this too, in twelve characters of noise. The
    // format and the hours are the panel's business, and the panel has its
    // own masks for them; a closed line owes the reader the question.
    make();
    expect(lu()).toBe('Date de début – Date de fin');
  });

  it('says the same whether or not the hours are on screen', () => {
    make({ showTime: true });
    expect(lu()).toBe('Date de début – Date de fin');
  });

  it('gives way to a placeholder the screen wrote itself', () => {
    make({ placeholder: 'choisir une période' });
    expect(lu()).toBe('choisir une période');
  });

  it('is gone as soon as there is a value', () => {
    make();
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-22T22:00:00Z'),
        end: Temporal.Instant.from('2026-09-24T22:00:00Z'),
      },
    });
    expect(lu()).toBe('23/09/2026 – 24/09/2026');
  });
});

describe('a calendar at the head of the line', () => {
  it('is drawn by default, before the words', () => {
    make();
    const trigger = host.querySelector('.tz-field__trigger')!;
    // Before the text, not after it: it was a caret at the tail saying the
    // button could be pressed, which a button already says.
    expect(trigger.firstElementChild!.className).toBe('tz-field__icon');
    expect(trigger.querySelector('.tz-field__icon svg')).not.toBe(null);
  });

  it('takes a mark of the screen’s own instead', () => {
    field = createRangeField(host, { timeZone: 'Europe/Paris', locale: 'fr-FR', icon: '▾' });
    expect(host.querySelector('.tz-field__icon')!.textContent).toBe('▾');
  });

  it('and an empty string takes it away without leaving a gap', async () => {
    field = createRangeField(host, { timeZone: 'Europe/Paris', locale: 'fr-FR', icon: '' });
    expect(host.querySelector('.tz-field__icon')!.textContent).toBe('');
    const { FIELD_CSS } = await import('../src/styles.js');
    expect(FIELD_CSS).toContain('.tz-field__icon:empty { display: none; }');
  });
});

describe('what a review found in 1.4.0', () => {
  it('writes each end for itself, so one default hour does not bring back the other', () => {
    // Decided for the pair, `defaultTimes: { start: '09:00' }` and a click on
    // the 26th read "24/09 09:00 – 27/09 00:00" — the exclusive end back on
    // screen, which is the thing this release set out to abolish.
    make({ showTime: true, defaultTimes: { start: '09:00' } });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-24T07:00:00Z'),
        end: Temporal.Instant.from('2026-09-26T22:00:00Z'),
      },
    });
    expect(lu()).toBe('24/09/2026 09:00 – 26/09/2026');
  });

  it('does not write a period of no length backwards', () => {
    // Both ends at the same midnight. Read inclusively the end is the day
    // before the start: "24/09/2026 – 23/09/2026", a period running backwards
    // over a day nobody touched.
    const at = Temporal.Instant.from('2026-09-23T22:00:00Z');
    make({ showTime: true });
    field.update({ value: { start: at, end: at } });
    // Said once, since both ends are the same moment — not twice, and not
    // backwards.
    expect(lu()).toBe('24/09/2026 00:00');
  });

  it('survives a catalogue that predates the words it needs', () => {
    // TypeScript refuses an incomplete catalogue; JavaScript does not, and a
    // catalogue carried over from 1.3.0 rendered "undefined – undefined".
    const stale = { ...FR } as Record<string, unknown>;
    delete stale['startDate'];
    delete stale['endDate'];
    make({ messages: stale as never });
    expect(lu()).toBe('Start date – End date');
  });
});
