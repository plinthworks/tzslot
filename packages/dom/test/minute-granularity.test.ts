import { describe, it, expect, afterEach } from 'vitest';
import { createDateTimeField, type DateTimeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * Three settings carry a minute granularity, and a consumer screen picked the
 * two that could not move its arrows.
 *
 * It asked for quarters with `minuteStep: 15` and `snapMinutes: 15`, and the
 * minute arrows went on stepping by thirty — `minuteStep` fills the menus of
 * `timeLayout: 'select'` and is inert on the default compact field, and
 * `snapMinutes` rounds a typed reading rather than moving anything. The one
 * that moves the arrows is `stepMinutes`, whose default is 30 and which was
 * the only one of the three with no documentation: the generated API table
 * borrowed another widget's sentence for it, "Minutes between the times
 * offered", which describes the slot list and not an arrow.
 *
 * So the three are pinned here, each to the layout it governs, because the
 * names alone do not say it.
 */
const zone = 'Europe/Paris';
let field: DateTimeFieldInstance;
let host: HTMLElement;

const open = (settings: Record<string, unknown>) => {
  host = document.createElement('div');
  document.body.append(host);
  field = createDateTimeField(host, {
    timeZone: zone,
    locale: 'fr-FR',
    value: Temporal.ZonedDateTime.from({
      year: 2026, month: 10, day: 9, hour: 10, minute: 0, timeZone: zone,
    }).toInstant(),
    ...settings,
  });
  host.querySelector<HTMLButtonElement>('.tz-field__trigger')!.click();
  return document.querySelector<HTMLElement>('.tz-field__panel')!;
};
const minutes = () =>
  field.value!.toZonedDateTimeISO(zone).toPlainTime().toString().slice(0, 5);
/** The second pair of arrows is the minute's; the first is the hour's. */
const minuteUp = (panel: HTMLElement) =>
  [...panel.querySelectorAll<HTMLButtonElement>('.tz-time__arrow--up')][1]!;

afterEach(() => {
  field?.destroy();
  host?.remove();
  document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove());
});

describe('which setting moves the minutes', () => {
  it('minuteStep and snapMinutes leave the arrows alone', () => {
    const panel = open({ minuteStep: 15, snapMinutes: 15 });
    minuteUp(panel).click();
    expect(minutes()).toBe('10:30'); // the default stepMinutes, not the 15 asked for
  });

  it('stepMinutes is the one the arrows read', () => {
    const panel = open({ stepMinutes: 15 });
    minuteUp(panel).click();
    expect(minutes()).toBe('10:15');
    minuteUp(panel).click();
    expect(minutes()).toBe('10:30');
  });

  it('and minuteStep fills the menus it was written for', () => {
    const panel = open({ minuteStep: 15, timeLayout: 'select' });
    const menus = [...panel.querySelectorAll<HTMLSelectElement>('.tz-timeselect__menu')];
    expect([...menus[menus.length - 1]!.options].map((o) => o.value)).toEqual([
      '0', '15', '30', '45',
    ]);
  });
});
