// @vitest-environment node
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { FIELD_CSS, RANGEFIELD_CSS } from '../src/styles.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * A panel that fits the window it is in.
 *
 * jsdom lays nothing out and knows no media queries, so the rules are what is
 * asserted here. The measurements are from Chrome at 375 x 667, the default
 * `months: 2`: the panel came out **466 x 785 at top -378** — 378px of it
 * above the fold, 99 past the right edge, and neither it nor the page
 * scrolled. The calendar was on the page and could not be reached.
 *
 * After: **359 x 651 at (8, 8)**, nothing off screen, scrolling inside, cells
 * at 43px against a 36px before.
 */
describe('the panel fits the window', () => {
  it('is capped at the viewport and scrolls inside', () => {
    expect(FIELD_CSS).toContain('max-width: calc(100vw - 16px)');
    // dvh, not vh: a phone's toolbars come and go and vh does not notice.
    expect(FIELD_CSS).toContain('max-height: calc(100dvh - 16px)');
    expect(FIELD_CSS).toMatch(/\.tz-field__panel\s*\{[^}]*overflow: auto/);
  });

  it('keeps its top edge on screen', () => {
    // place() chose above or below and never "and then fit", which is how a
    // top of -378 was arrived at.
    const source = readFileSync(fileURLToPath(new URL('../src/panel.ts', import.meta.url)), 'utf8');
    expect(source).toMatch(/const top = height >= room \? edge : Math\.max\(edge,/);
  });

  it('turns the row into a column under 30rem', () => {
    expect(RANGEFIELD_CSS).toContain('@media (max-width: 30rem)');
    expect(RANGEFIELD_CSS).toMatch(/@media[^@]*\.tz-rangefield__body\s*\{[^}]*flex-direction: column/s);
  });

  it('gives the day cells a thumb to aim at, without overflowing', () => {
    // 44px is the size everyone settled on; seven of them plus the week column
    // came to 336 in a 333 box, so it takes the width there is when there is
    // not enough.
    expect(RANGEFIELD_CSS).toContain('--tz-cal-cell-size: min(2.75rem, calc((100vw - 5.5rem) / 7))');
  });
});
