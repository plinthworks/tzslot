import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * A framework hands the value straight back, and a shortcut must survive that.
 *
 * Every framework wrapper here reports a change by writing to state the same
 * pass then pushes the whole settings object back down — that is what
 * `update` is for, and its contract is that it never reports. A shortcut broke
 * the contract: the name stayed in the settings, so each push resolved it
 * again, committed a fresh range object, reported it, and the wrapper pushed
 * again. It did not settle, and the browser stopped answering.
 */
const paris = 'Europe/Paris';
let host: HTMLElement;
let field: RangeFieldInstance;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
});

describe('a shortcut handed back', () => {
  it('settles instead of reporting for ever', () => {
    let reports = 0;
    field = createRangeField(host, {
      timeZone: paris,
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: ['last7Days', 'thisMonth'],
      onChange: (value, from) => {
        reports += 1;
        // A cap, not a hang: an unbounded loop would take the runner with it.
        if (reports > 40) throw new Error(`no fixed point: ${reports} reports`);
        // Exactly what the Angular wrapper's effect does after writing both
        // signals — value and the shortcut's name, together.
        field.update({ value, preset: from.preset });
      },
    });

    field.open();
    const shortcut = document.querySelector<HTMLButtonElement>('.tz-rangefield__preset')!;
    shortcut.click();

    expect(reports).toBe(1);
  });

  it('is still resolved again when it arrives from outside', () => {
    // The reason the block exists: a filter saved on Monday as "the last seven
    // days" is Friday's seven days when it is reopened, not Monday's.
    const seen: string[] = [];
    field = createRangeField(host, {
      timeZone: paris,
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: ['last7Days'],
      onChange: (value) => seen.push(value.start!.toString()),
    });
    field.update({ preset: 'last7Days' });
    expect(seen).toHaveLength(1);
  });
});

/**
 * The contract, checked on the other shapes.
 *
 * `update` never reports. A wrapper that pushes the settings back after every
 * change depends on it, and one shape had broken it — so the others are asked
 * the same question rather than assumed innocent.
 */
describe('update never reports', () => {
  it('holds for the range field, whatever is pushed back', () => {
    const reports: unknown[] = [];
    field = createRangeField(host, {
      timeZone: paris,
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      presets: ['last7Days'],
      onChange: (value) => reports.push(value),
    });
    field.open();
    document.querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();
    const after = reports.length;

    // Every setting a wrapper's effect carries, pushed back at once.
    const value = reports[after - 1] as never;
    field.update({ value, preset: 'last7Days', singleDay: false, showTime: true, timeZone: paris });
    field.update({ value, preset: 'last7Days' });
    field.update({ value });

    expect(reports.length).toBe(after);
  });
});
