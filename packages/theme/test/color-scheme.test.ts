// @vitest-environment node
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Every widget that can stand on its own declares `color-scheme`.
 *
 * `light-dark()` picks its half from the `color-scheme` in force at the
 * element using the colour, and the theme declares it on the widgets rather
 * than the page — so importing the theme never repaints the page's own form
 * controls. The list was written by hand and three widgets were missing from
 * it: `.tz-dateinput`, `.tz-time` and `.tz-timeselect`.
 *
 * It went unseen because `color-scheme` is inherited, and on every
 * documentation page those three sit inside a field that has one. Dropped
 * into a form of their own on a dark page they had none, so every colour fell
 * to its light half and the control came out white. Measured in Chrome with
 * `html.dark`: `.tz-field` resolved `dark` and `rgb(24,24,27)`, while
 * `.tz-timeselect` and `.tz-time` resolved `normal` and `rgb(255,255,255)`.
 *
 * So the list is checked against the widgets that exist rather than trusted.
 */
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

const roots = (): string[] => {
  const dir = here('../../dom/src');
  const found = new Set<string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const source = readFileSync(`${dir}/${file}`, 'utf8');
    // `host.classList.add('tz-…')` — how each widget names its own root. The
    // host is the element the caller handed over, so the class goes on rather
    // than replacing what is there.
    for (const m of source.matchAll(/host\.classList\.add\('(tz-[a-z-]+)'\)/g)) found.add(m[1]!);
  }
  return [...found].sort();
};

describe('the colour scheme reaches every widget', () => {
  it('names each widget root in the rule that declares color-scheme', () => {
    const css = readFileSync(here('../tzslot.css'), 'utf8');
    const rule = css.slice(0, css.indexOf('color-scheme: var(--tz-color-scheme'));
    const selector = rule.slice(rule.lastIndexOf('}') + 1);

    const missing = roots().filter((root) => !selector.includes(`.${root},`) && !selector.includes(`.${root} `));
    expect(missing).toEqual([]);
  });

  it('found the widgets to check, rather than an empty list', () => {
    // A regex that stops matching would make the test above pass on nothing.
    expect(roots().length).toBeGreaterThanOrEqual(8);
    expect(roots()).toContain('tz-timeselect');
  });
});
