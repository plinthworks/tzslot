import { describe, it, expect } from 'vitest';
import { TIMESELECT_CSS, TIME_CSS } from '../src/styles.js';

/**
 * How wide a menu is, and how tall a menu and a field are together.
 *
 * jsdom lays nothing out, so what can be asserted here is the rule text. The
 * measurements that justify it were taken in Chrome: before this, the hour
 * menu on one documentation page came out 29.8, 34.8, 35.8, 42.8 and 120.8
 * pixels wide depending on what its widest option happened to be — so the two
 * menus disagreed with each other, and the same widget changed width between
 * an ordinary day and the morning the clocks go back.
 */
describe('the two time controls are sized together', () => {
  it('holds every menu to one floor, so hour and minute match', () => {
    expect(TIMESELECT_CSS).toContain('min-width: var(--tz-time-menu-width, 3.25rem)');
    // 3.25rem is 52px, and '02*' measured 42.8px: the star fits inside the
    // floor rather than pushing past it.
  });

  it('gives a menu and a field the same vertical padding', () => {
    // Measured in Chrome after the change: select 38px, field 38px. Before it,
    // 37.2 and 38 — a misalignment of eight tenths of a pixel in every form
    // that put one beside the other.
    const pad = 'var(--tz-time-pad-y, 0.375rem)';
    expect(TIMESELECT_CSS).toContain(`padding: ${pad} 0.4rem`);
    expect(TIME_CSS).toContain(`padding: ${pad} 0.25rem`);
    expect(TIME_CSS).toContain(`padding: ${pad} 0.5rem`);
  });

  it('lets the arrow glyphs be sized without touching the field', () => {
    expect(TIME_CSS).toContain('font-size: var(--tz-time-arrow-size, 0.6rem)');
  });
});

/**
 * The range panel's two fields, and the arrows beside them.
 *
 * Measured in Chrome each time: the arrows sat 12px above the middle of the
 * line they move, FROM and TO were barely legible at 0.6 of the text colour
 * and a normal weight, the row was 42px tall for a date and two short menus,
 * and the date box was 104px for a date that needs 109 — so the last digit of
 * the year was cut off.
 */
describe('the two fields inside a range panel', () => {
  it('centres the arrows on the line of the fields', async () => {
    const { RANGEFIELD_CSS } = await import('../src/styles.js');
    expect(RANGEFIELD_CSS).toContain('align-self: center');
    expect(RANGEFIELD_CSS).toContain('margin-top: var(--tz-rangefield-label-block, 1.7rem)');
  });

  it('gives the date box room for the year', async () => {
    const { RANGEFIELD_CSS } = await import('../src/styles.js');
    expect(RANGEFIELD_CSS).toContain('width: var(--tz-rangefield-date-width, 7.25rem)');
  });

  it('brings the row and the menus down together', async () => {
    const { RANGEFIELD_CSS } = await import('../src/styles.js');
    const pad = 'var(--tz-rangefield-field-pad, 0.3rem)';
    expect(RANGEFIELD_CSS).toContain(`padding-block: ${pad}`);
    // The menus follow the same lever, so the row keeps one height instead of
    // growing around the tallest thing in it.
    expect(RANGEFIELD_CSS).toContain(`--tz-time-pad-y: ${pad}`);
  });

  it('makes the two labels legible', async () => {
    const { DATEINPUT_CSS } = await import('../src/styles.js');
    expect(DATEINPUT_CSS).toContain('font-weight: 600');
    expect(DATEINPUT_CSS).toContain('opacity: 0.8');
  });
});
