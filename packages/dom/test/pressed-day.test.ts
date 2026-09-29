import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDateRange, createRangeField, type DateRangeInstance, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * Which day the reader pressed, when the pair cannot say.
 *
 * The range calendar swaps its ends: holding the 16th and pressing the 3rd, it
 * reports 3 – 16, because a click before the start moves the start rather than
 * making a backwards range. A caller deducing the pressed day from the pair
 * reads the *other* end, and acts on a day nobody touched.
 *
 * A filter screen found it: an end held at a fixed length from the start froze
 * from the second press on, and every later click sent a request for an
 * unchanged period.
 */
const paris = 'Europe/Paris';
let host: HTMLElement;
let cal: DateRangeInstance | undefined;
let field: RangeFieldInstance | undefined;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  cal?.destroy();
  field?.destroy();
  cal = field = undefined;
  host.remove();
});

const cells = (where: ParentNode = document) => [
  ...where.querySelectorAll<HTMLButtonElement>('.tz-range__day'),
];
const press = (label: string, where: ParentNode = document) => {
  const cell = cells(where).find(
    (c) => c.textContent === label && !c.className.includes('outside'),
  );
  if (!cell) throw new Error(`no day cell "${label}"`);
  cell.click();
};

describe('the calendar says which day was pressed', () => {
  it('names the pressed day even when it swaps the ends', () => {
    const seen: { pair: string; pressed: string | null }[] = [];
    cal = createDateRange(host, {
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      value: { start: Temporal.PlainDate.from('2026-09-16'), end: null },
      onChange: ({ start, end }, { pressed }) =>
        seen.push({
          pair: `${start?.toString() ?? '-'}..${end?.toString() ?? '-'}`,
          pressed: pressed?.toString() ?? null,
        }),
    });

    press('3', host);

    // The pair is swapped, and `pressed` is the day under the cursor.
    expect(seen).toEqual([{ pair: '2026-09-03..2026-09-16', pressed: '2026-09-03' }]);
  });

  it('names it on the ordinary two presses as well', () => {
    const pressed: (string | null)[] = [];
    cal = createDateRange(host, {
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      onChange: (_v, from) => pressed.push(from.pressed?.toString() ?? null),
    });
    press('10', host);
    press('14', host);
    // The second press ends the range, so here the deduction happened to agree.
    expect(pressed).toEqual(['2026-09-10', '2026-09-14']);
  });
});

describe('a field whose end the reader cannot choose', () => {
  it('moves the start backwards, where the deduction moved nothing', () => {
    const starts: string[] = [];
    field = createRangeField(host, {
      timeZone: paris,
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: [],
      showTime: true,
      timeLayout: 'input',
      // With the end locked the start stays armed, so every press is a start.
      disabled: { end: true },
      onChange: (value) => {
        if (value.start) {
          starts.push(value.start.toZonedDateTimeISO(paris).toPlainDate().toString());
        }
      },
    });

    field.open();
    press('10');
    // A press before the start: the grid swaps its ends and reports 3 - 10, so
    // `end ?? start` read the 10th -- the start it already held. Nothing moved,
    // and the unchanged period was reported again.
    press('3');

    expect(starts).toEqual(['2026-09-10', '2026-09-03']);
  });
});

describe('a press before the start, with no end yet', () => {
  it('moves the start and leaves the end armed', () => {
    const seen: string[] = [];
    field = createRangeField(host, {
      timeZone: paris,
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: [],
      showTime: true,
      timeLayout: 'input',
      onChange: (v) =>
        seen.push(
          `${v.start ? v.start.toZonedDateTimeISO(paris).toPlainDate().toString() : '-'}..${
            v.end ? v.end.toZonedDateTimeISO(paris).toPlainDate().toString() : '-'
          }`,
        ),
    });

    field.open();
    press('10');
    // A correction, not an end before the start. It used to throw the start
    // away: `ordered` had to break up the backwards period it was handed.
    press('3');
    // The end is still what needs filling, so this one lands there.
    press('7');

    expect(seen).toEqual(['2026-09-10..-', '2026-09-03..-', '2026-09-03..2026-09-08']);
  });
});
