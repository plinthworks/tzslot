import { describe, it, expect, afterEach } from 'vitest';
import { createDateTimeField, createRangeField } from '../src/index.js';
import { FR, type TzslotMessages } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * The menus mark the second reading of a repeated hour; they do not name it.
 *
 * A period field had always marked it and a moment field named it, so one
 * screen carrying both showed "02" and "02*" in one list and "02 — été" and
 * "02 — hiver" in the other, for the same hour of the same morning.
 *
 * The mark comes from the catalogue rather than a setting, because a screen
 * already hands the catalogue over and what it hands over wins -- no second
 * mechanism for the same thing. The legend under the menus is optional and
 * drawn only where there is something to explain.
 *
 * Only the menus. The compact field keeps its reading buttons, which say the
 * words in full and have the room to.
 */
const zone = 'Europe/Paris';
/** Two o'clock on the Sunday the clocks go back: an hour that happens twice. */
const twice = Temporal.ZonedDateTime.from({
  year: 2026, month: 10, day: 25, hour: 2, minute: 0, timeZone: zone,
}).toInstant();
const ordinary = Temporal.ZonedDateTime.from({
  year: 2026, month: 10, day: 14, hour: 10, minute: 0, timeZone: zone,
}).toInstant();

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
  document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove());
});

const openMoment = (value = twice, messages: TzslotMessages = FR) => {
  const host = document.createElement('div');
  document.body.append(host);
  const field = createDateTimeField(host, {
    timeZone: zone, locale: 'fr-FR', messages, timeLayout: 'select', value,
  });
  destroy = () => { field.destroy(); host.remove(); };
  host.querySelector<HTMLButtonElement>('.tz-field__trigger')!.click();
  return document.querySelector<HTMLElement>('.tz-field__panel')!;
};
const hours = (panel: HTMLElement) =>
  [...panel.querySelectorAll<HTMLSelectElement>('.tz-timeselect__menu')[0]!.options]
    .filter((o) => o.value.startsWith('2|'))
    .map((o) => o.textContent);
const legend = (panel: HTMLElement) => {
  const line = panel.querySelector<HTMLElement>('.tz-timeselect__legend')!;
  return line.hidden ? null : line.textContent;
};

describe('the hour that happens twice', () => {
  it('is marked, not named, in a moment field', () => {
    expect(hours(openMoment())).toEqual(['02', '02*']);
  });

  it('is marked the same way in a period field, which always did', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const field = createRangeField(host, {
      timeZone: zone, locale: 'fr-FR', messages: FR,
      showTime: true, timeLayout: 'select', value: { start: twice, end: null },
    });
    destroy = () => { field.destroy(); host.remove(); };
    field.open();
    expect(hours(document.querySelector<HTMLElement>('.tz-field__panel')!)).toEqual(['02', '02*']);
  });

  it('takes the mark the screen hands over, not a hard-coded star', () => {
    const panel = openMoment(twice, { ...FR, winterMark: ' (H)' });
    expect(hours(panel)).toEqual(['02', '02 (H)']);
  });

  it('explains the mark only when a screen asks for a legend', () => {
    expect(legend(openMoment())).toBeNull();
    destroy?.();
    document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove());

    const panel = openMoment(twice, {
      ...FR,
      readingLegend: ({ mark, winter }) => `${mark} : heure d'${winter}`,
    });
    expect(legend(panel)).toBe("* : heure d'hiver");
  });

  it('says nothing on a day where no hour repeats', () => {
    const panel = openMoment(ordinary, {
      ...FR,
      readingLegend: ({ mark, winter }) => `${mark} : heure d'${winter}`,
    });
    expect(hours(panel)).toEqual(['02']); // one reading, no mark
    expect(legend(panel)).toBeNull(); // and nothing to explain
  });
});
