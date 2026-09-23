import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance, type RangeFieldValue } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * The arrows that step a period.
 *
 * A filter screen is read by comparing: this quarter against the last, this
 * week against the one before. The arrows make that one click instead of
 * four, and they are off by default because a field that means one chosen day
 * has nothing to step through.
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
    onChange: (value) => reported.push(value),
    ...options,
  });
};
const shown = () => host.querySelector('.tz-field__text')!.textContent;
const arrows = () => host.querySelectorAll<HTMLButtonElement>('.tz-field__shift');
const panel = () => document.querySelector('.tz-field__panel')!;
/** What the two fields in the panel read, which is where the period now shows. */
const panelDates = () =>
  [...panel().querySelectorAll<HTMLInputElement>('.tz-rangefield__field .tz-dateinput__input')].map(
    (i) => i.value,
  );

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((node) => node.remove());
});

describe('by default', () => {
  it('there are no arrows at all', () => {
    make();
    expect([...arrows()].every((a) => a.hidden)).toBe(true);
  });
});

describe('with shift on', () => {
  it('a quarter steps to the quarter before, and back', () => {
    make({ shift: { months: 3 }, presets: ['thisQuarter', 'lastQuarter'] });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-06-30T22:00:00Z'), // 1 July, Paris
        end: Temporal.Instant.from('2026-09-30T22:00:00Z'), // midnight after 30 Sept
      },
    });
    expect(shown()).toBe('01/07/2026 – 30/09/2026');

    arrows()[0]!.click();
    expect(shown()).toBe('01/04/2026 – 30/06/2026');
    arrows()[1]!.click();
    expect(shown()).toBe('01/07/2026 – 30/09/2026'); // exactly where it started
    expect(reported).toHaveLength(2);
  });

  it('reports whole days, still ending at the midnight after the last one', () => {
    make({ shift: { days: 7 } });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-13T22:00:00Z'),
        end: Temporal.Instant.from('2026-09-20T22:00:00Z'),
      },
    });
    arrows()[1]!.click();
    const value = reported.at(-1)!;
    expect(value.start!.toZonedDateTimeISO(paris).toPlainDate().toString()).toBe('2026-09-21');
    expect(value.end!.toZonedDateTimeISO(paris).toPlainTime().toString({ smallestUnit: 'minute' })).toBe('00:00');
  });

  it('a week that crosses the clocks change keeps its days and gains an hour', () => {
    make({ shift: { days: 7 } });
    // 12–18 October, then one step forward: 19–25 October, the week the clocks
    // go back in Paris. Still seven whole days — and 169 hours, not 168.
    field.update({
      value: {
        start: Temporal.Instant.from('2026-10-11T22:00:00Z'),
        end: Temporal.Instant.from('2026-10-18T22:00:00Z'),
      },
    });
    arrows()[1]!.click();
    const value = reported.at(-1)!;
    expect(shown()).toBe('19/10/2026 – 25/10/2026');
    expect(value.end!.epochMilliseconds - value.start!.epochMilliseconds).toBe(169 * 3600_000);
  });

  it('an imposed step ignores what is selected', () => {
    make({ shift: { months: 1 } });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-13T22:00:00Z'), // 14 Sept
        end: Temporal.Instant.from('2026-09-16T22:00:00Z'), // 15 Sept inclusive
      },
    });
    arrows()[0]!.click();
    expect(shown()).toBe('14/08/2026 – 16/08/2026'); // three days, a month earlier
  });

  it('keeps the hours when the period has them', () => {
    make({ shift: { days: 2 }, showTime: true });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-14T07:00:00Z'), // 09:00 Paris
        end: Temporal.Instant.from('2026-09-15T15:00:00Z'), // 17:00 Paris
      },
    });
    arrows()[1]!.click();
    const value = reported.at(-1)!;
    expect(value.start!.toZonedDateTimeISO(paris).toPlainTime().toString({ smallestUnit: 'minute' })).toBe('09:00');
    expect(value.end!.toZonedDateTimeISO(paris).toPlainTime().toString({ smallestUnit: 'minute' })).toBe('17:00');
    expect(shown()).toBe('16/09/2026 09:00 – 17/09/2026 17:00');
  });

  it('is dead while there is nothing to move', () => {
    make({ shift: { days: 1 } });
    expect([...arrows()].every((a) => a.disabled)).toBe(true);
    arrows()[0]!.click();
    expect(reported).toHaveLength(0);
  });

  it('is in the panel too, on the line of the two fields it moves', () => {
    make({ shift: { months: 3 }, messages: FR, locale: 'fr-FR' });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-06-30T22:00:00Z'),
        end: Temporal.Instant.from('2026-09-30T22:00:00Z'),
      },
    });
    field.open();
    // The arrows stand inside the head, either side of the fields. There is no
    // line naming the period over them any more: the two fields say it, and a
    // row repeating it underneath said nothing they did not.
    const head = panel().querySelector('.tz-rangefield__head')!;
    const inPanel = [...head.querySelectorAll<HTMLButtonElement>('.tz-rangefield__shift-arrow')];
    expect(inPanel).toHaveLength(2);
    expect(head.querySelector('.tz-rangefield__shift-label')).toBe(null);
    expect(panelDates()).toEqual(['01/07/2026', '30/09/2026']);
    inPanel[0]!.click();
    expect(panelDates()).toEqual(['01/04/2026', '30/06/2026']);
    expect(shown()).toBe('01/04/2026 – 30/06/2026');
    expect(field.isOpen).toBe(true); // stepping is not choosing: the panel stays
  });

  it('the quarter presets are offered, and tick when they match', () => {
    make({ shift: { months: 3 }, presets: ['lastQuarter', 'thisQuarter', 'nextQuarter'], messages: FR });
    field.open();
    const labels = [...panel().querySelectorAll('.tz-rangefield__preset')].map((b) => b.textContent);
    expect(labels).toEqual(['Le trimestre dernier', 'Ce trimestre', 'Le trimestre prochain']);
    panel().querySelectorAll<HTMLButtonElement>('.tz-rangefield__preset')[1]!.click();
    expect(shown()).toBe('01/07/2026 – 30/09/2026');
  });
});

describe('a single moment steps too', () => {
  it('by the step the screen imposes, on the zone’s clocks', async () => {
    const { createDateTimeField } = await import('../src/index.js');
    const moments: (unknown | null)[] = [];
    const field = createDateTimeField(host, {
      timeZone: paris,
      locale: 'en-GB',
      shift: { hours: 1 },
      value: Temporal.Instant.from('2026-10-25T00:30:00Z'), // the first 02:30 in Paris
      onChange: (value) => moments.push(value),
    });
    const arrow = (index: number) => host.querySelectorAll<HTMLButtonElement>('.tz-field__shift')[index]!;

    arrow(1).click();
    // An hour later is the *second* 02:30, not 03:30: the clocks went back.
    expect(host.querySelector<HTMLInputElement>('.tz-field__trigger')!.value).toContain('02:30');
    expect(field.value!.toString()).toBe('2026-10-25T01:30:00Z');

    arrow(1).click();
    expect(host.querySelector<HTMLInputElement>('.tz-field__trigger')!.value).toContain('03:30');
    expect(moments).toHaveLength(2);
    field.destroy();
  });

  it('has no arrows unless a step is given', async () => {
    const { createDateTimeField } = await import('../src/index.js');
    const field = createDateTimeField(host, { timeZone: paris, locale: 'en-GB' });
    expect([...host.querySelectorAll<HTMLButtonElement>('.tz-field__shift')].every((a) => a.hidden)).toBe(true);
    field.destroy();
  });
});

describe('a step in minutes', () => {
  it('moves by quarter hours, and over the hour that does not happen', async () => {
    const { createDateTimeField } = await import('../src/index.js');
    const field = createDateTimeField(host, {
      timeZone: paris,
      locale: 'en-GB',
      shift: { minutes: 15 },
      // 29 March 2026, 01:45 in Paris: at 02:00 the clocks jump to 03:00.
      value: Temporal.Instant.from('2026-03-29T00:45:00Z'),
    });
    const next = () => host.querySelectorAll<HTMLButtonElement>('.tz-field__shift')[1]!;
    const reads = () => host.querySelector<HTMLInputElement>('.tz-field__trigger')!.value;

    expect(reads()).toContain('01:45');
    next().click();
    // A quarter of an hour later the clock says 03:00: 02:00 never happens.
    expect(reads()).toContain('03:00');
    next().click();
    expect(reads()).toContain('03:15');
    field.destroy();
  });
});

describe('a menu of steps, when the reader chooses', () => {
  it('appears only for a list, and one press moves by what is picked', () => {
    make({
      shift: [
        { step: { days: 7 }, label: '7 days' },
        { step: { months: 1 }, label: 'a month' },
        { step: { days: 3 }, label: 'three days' },
      ],
    });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-13T22:00:00Z'), // 14 Sept
        end: Temporal.Instant.from('2026-09-16T22:00:00Z'), // 16 Sept, whole days
      },
    });
    const picker = host.querySelector<HTMLButtonElement>('.tz-field__step')!;
    expect(picker.hidden).toBe(false);
    expect(picker.textContent).toBe('7 days'); // the current one, always readable

    const arrows = () => host.querySelectorAll<HTMLButtonElement>('.tz-field__shift');
    arrows()[1]!.click();
    expect(shown()).toBe('21/09/2026 – 23/09/2026'); // seven days on

    picker.click(); // one press moves to the next step
    expect(picker.textContent).toBe('a month');
    arrows()[1]!.click();
    expect(shown()).toBe('21/10/2026 – 23/10/2026'); // a month on

    picker.click();
    expect(picker.textContent).toBe('three days');
    arrows()[1]!.click();
    expect(shown()).toBe('24/10/2026 – 26/10/2026'); // three days on
  });

  it('a single duration draws no menu at all', () => {
    make({ shift: { days: 7 } });
    expect(host.querySelector<HTMLButtonElement>('.tz-field__step')!.hidden).toBe(true);
  });

  it('a moment gets the same menu, and cycles back round it', async () => {
    const { createDateTimeField } = await import('../src/index.js');
    const widget = createDateTimeField(host, {
      timeZone: paris,
      locale: 'en-GB',
      value: Temporal.Instant.from('2026-09-23T12:30:00Z'),
      shift: [
        { step: { minutes: 15 }, label: '15 min' },
        { step: { days: 1 }, label: 'a day' },
      ],
    });
    const reads = () => host.querySelector<HTMLInputElement>('.tz-field__trigger')!.value;
    const picker = host.querySelector<HTMLButtonElement>('.tz-field__step')!;
    const next = () => host.querySelectorAll<HTMLButtonElement>('.tz-field__shift')[1]!;

    next().click();
    expect(reads()).toContain('14:45');

    picker.click();
    next().click();
    expect(reads()).toContain('24/09/2026 14:45');

    // Past the end of the menu it starts again, and every entry is usable:
    // there is no longer an entry that means "follow the selection", which a
    // single moment had nothing to answer.
    picker.click();
    expect(picker.textContent).toBe('15 min');
    expect(next().hidden).toBe(false);
    widget.destroy();
  });
});

describe('the row that holds a field, its step and its arrows', () => {
  it('keeps the field, its step and its arrows on one line', () => {
    make({ shift: [{ step: { days: 7 }, label: '7 days' }] });
    const css = [...document.querySelectorAll('style[data-tzslot]')].map((n) => n.textContent).join('');
    /*
     * The row wrapped, once, so a narrow column would not push the forward
     * arrow off the edge. An inline-flex box is sized on its items' basis and
     * not on their content, so the moment the field held a date the box came
     * out at that basis and the arrow dropped to a line of its own — at every
     * width, on a page with room to spare. It shrinks instead.
     *
     * Neither the wrap nor the overflow is visible to jsdom, so the rules
     * themselves are what is checked.
     */
    expect(css).toContain('flex-wrap: nowrap');
    expect(css).toContain('.tz-field--shift .tz-field__trigger,\n.tz-field--shift .tz-field__wrap { min-width: 0; }');
  });
});
