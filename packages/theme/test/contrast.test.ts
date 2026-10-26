import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The palette, measured against WCAG's 4.5:1 for text.
 *
 * A consumer's axe sweep found `color-contrast` on the days of a neighbouring
 * month, faded with `opacity: 0.35`. Ours cannot: the rule needs to know what
 * is painted where, and jsdom has no layout — axe returns it as inapplicable
 * rather than as a pass, so the failure was invisible here and stayed
 * invisible through four releases.
 *
 * It does not need layout to be computed. The theme declares nine colours as
 * `light-dark(light, dark)` pairs, and a ratio is arithmetic over two of them.
 * So this reads the compiled stylesheet — the one that ships — and checks every
 * pair a widget actually puts together.
 *
 * What it still cannot see: a colour an application sets itself, and a
 * composite an opacity makes. The outside-day fade was the second of those,
 * which is why that opacity is gone rather than tuned: 4.5:1 would have needed
 * 0.59 in light, barely faded at all.
 */

const css = readFileSync(join(process.cwd(), 'packages', 'theme', 'tzslot.css'), 'utf8');

/** The two halves of every `--tz-x: light-dark(a, b)` the theme declares. */
function palette(): Record<string, { light: string; dark: string }> {
  const found: Record<string, { light: string; dark: string }> = {};
  for (const match of css.matchAll(
    /--(tz-[\w-]+):\s*light-dark\(\s*(#[0-9a-fA-F]{3,8})\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)/g,
  )) {
    found[match[1]!] = { light: match[2]!, dark: match[3]! };
  }
  return found;
}

const channels = (hex: string): [number, number, number] => {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex.slice(0, 7);
  return [1, 3, 5].map((at) => parseInt(full.slice(at, at + 2), 16)) as [number, number, number];
};

/** WCAG 2.x relative luminance, and the ratio between two colours. */
const luminance = (rgb: readonly number[]): number => {
  const linear = rgb.map((value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
};
const ratio = (a: string, b: string): number => {
  const [x, y] = [luminance(channels(a)), luminance(channels(b))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Text on a surface, as the widgets put them together. */
const PAIRS: ReadonlyArray<{ what: string; fg: string; bg: string }> = [
  { what: 'body text on the page', fg: 'tz-fg', bg: 'tz-bg' },
  { what: 'body text on a raised surface', fg: 'tz-fg', bg: 'tz-bg-raised' },
  { what: 'a muted label on the page', fg: 'tz-fg-muted', bg: 'tz-bg' },
  { what: 'a muted label on a raised surface', fg: 'tz-fg-muted', bg: 'tz-bg-raised' },
  { what: 'a neighbouring month on the page', fg: 'tz-fg-muted', bg: 'tz-bg' },
  { what: 'a neighbouring month in a panel', fg: 'tz-fg-muted', bg: 'tz-bg-raised' },
  { what: 'a selected day', fg: 'tz-accent-fg', bg: 'tz-accent' },
  { what: 'a problem, on the page', fg: 'tz-danger', bg: 'tz-bg' },
  { what: 'a problem, in a panel', fg: 'tz-danger', bg: 'tz-bg-raised' },
  { what: 'a warning, on the page', fg: 'tz-warning', bg: 'tz-bg' },
  { what: 'a warning, in a panel', fg: 'tz-warning', bg: 'tz-bg-raised' },
];

const AA_TEXT = 4.5;

describe('the theme meets 4.5:1 for text', () => {
  const colours = palette();

  it('read the palette at all', () => {
    // A guard on the guard. A theme rewritten to declare its colours another
    // way would leave this file comparing nothing, in silence.
    expect(Object.keys(colours).length).toBeGreaterThanOrEqual(8);
    for (const pair of PAIRS) {
      expect(colours[pair.fg], `${pair.fg} is not in the compiled theme`).toBeTruthy();
      expect(colours[pair.bg], `${pair.bg} is not in the compiled theme`).toBeTruthy();
    }
  });

  for (const scheme of ['light', 'dark'] as const) {
    for (const pair of PAIRS) {
      it(`${scheme}: ${pair.what}`, () => {
        const fg = colours[pair.fg]![scheme];
        const bg = colours[pair.bg]![scheme];
        const measured = ratio(fg, bg);
        expect(
          measured,
          `${pair.fg} ${fg} on ${pair.bg} ${bg} is ${measured.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(AA_TEXT);
      });
    }
  }

  it('and the arithmetic itself is right', () => {
    // Two known answers, so a bug in the luminance above cannot make every
    // pair above pass. White on black is 21:1 and a colour on itself is 1:1.
    expect(ratio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(ratio('#2563eb', '#2563eb')).toBeCloseTo(1, 5);
    // And the value the consumer reported, reproduced: the old fade composed
    // #18181b onto #ffffff at 0.35.
    const faded = channels('#18181b').map((c, i) => c * 0.35 + channels('#ffffff')[i]! * 0.65);
    const asHex = `#${faded.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
    expect(ratio(asHex, '#ffffff')).toBeLessThan(2.5);
  });
});
