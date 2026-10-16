// @vitest-environment node
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The stylesheet stays logical, so a right-to-left reader keeps what was fixed.
 *
 * There were thirty-one physical directional declarations against four
 * logical ones, and the four were an island: a comment on one of them says
 * "Logical, so it follows the writing direction", which was true of that rule
 * and of nothing around it. Every other border, margin and padding named a
 * side of the screen rather than a side of the text.
 *
 * Checked by reading the file rather than trusted, because nothing else can:
 * jsdom lays nothing out, so no test can see a border on the wrong side. This
 * is the only guard the change has, which is why it is a list of forbidden
 * spellings and not a sample.
 */
/**
 * The stylesheet with its prose taken out.
 *
 * The comments explain sides in words -- "Clear on the left, Apply on the
 * right:" -- and a guard looking for `right:` found that and called it a
 * declaration. Stripping the comments is what separates what the stylesheet
 * *says* from what it *does*.
 */
const withoutComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, ' ');

/**
 * The CSS a file holds, and nothing else it happens to say.
 *
 * Sweeping whole TypeScript files flagged the message catalogue, where
 * `clear: 'مسح'` is an object key and not a declaration. A `.ts` file carries
 * its stylesheets in backtick literals, so those are what gets read; a `.css`
 * or `.scss` file is stylesheet throughout.
 */
const cssOf = (file: string, text: string): string => {
  const body = /\.(css|scss)$/.test(file)
    ? text
    : [...text.matchAll(/`[^`]*`/g)]
        .map(([block]) => block)
        .filter((block) => block.includes('{') && block.includes('}'))
        .join('\n');
  return withoutComments(body);
};

const src = withoutComments(
  readFileSync(fileURLToPath(new URL('../src/styles.ts', import.meta.url)), 'utf8'),
);

/**
 * A declaration, not a word in prose: the colon is what makes it one.
 *
 * The first version of this list had holes a review walked straight through:
 * it watched the three border/margin/padding families and nothing else, so
 * `left:`, the physical corner radii and the four-value `border-radius`
 * shorthand were all free to come back. A guard with holes is worse than none,
 * because it is read as a promise.
 */
const FORBIDDEN = [
  /\bborder-(left|right)(-color|-width|-style)?\s*:/g,
  /\bmargin-(left|right)\s*:/g,
  /\bpadding-(left|right)\s*:/g,
  /\bborder-(top|bottom)-(left|right)-radius\s*:/g,
  /\btext-align\s*:\s*(left|right)\b/g,
  // `clear` needs the word boundary on its left too: `.tz-…__end-clear:hover`
  // is a class name and a pseudo-class, not a declaration.
  /(?<![-\w])(float|clear)\s*:/g,
  /\bscroll-(margin|padding)-(left|right)\s*:/g,
  /\btransform\s*:[^;{}]*\btranslateX\(/g,
  /\bbackground-position\s*:\s*(left|right)\b/g,
  // `left:` and `right:` on their own, except the two symmetric spellings the
  // stylesheet uses on purpose: a dialog centred with a translate, and the
  // shorthand `inset: 0`.
  // The lookahead sits against the colon, not after a run of spaces: written
  // the other way the engine backtracks the spaces to nothing and the
  // lookahead passes, which is how `left: 50%` slipped through the first
  // version of this line.
  /(?<![-\w])(left|right)\s*:(?!\s*50%)/g,
];

describe('the stylesheet speaks in logical sides', () => {
  it('names no physical one', () => {
    const found: string[] = [];
    for (const pattern of FORBIDDEN) {
      for (const match of src.matchAll(pattern)) {
        const line = src.slice(0, match.index).split('\n').length;
        found.push(`styles.ts:${line}  ${match[0]}`);
      }
    }
    expect(found).toEqual([]);
  });

  it('and the check can actually find one', () => {
    // A guard that matches nothing would pass on an empty file too, so each
    // spelling it claims to watch is planted and counted.
    const planted = [
      'a { border-left: 1px solid red; }',
      'a { margin-right: 1px; }',
      'a { padding-left: 1px; }',
      'a { border-top-left-radius: 1px; }',
      'a { text-align: right; }',
      'a { float: left; }',
      'a { clear: right; }',
      'a { scroll-padding-left: 1px; }',
      'a { transform: translateX(1px); }',
      'a { background-position: right center; }',
      'a { left: 0; }',
      'a { right: 8px; }',
    ];
    for (const rule of planted) {
      const hits = FORBIDDEN.flatMap((p) => [...rule.matchAll(p)]);
      expect(hits.length, rule).toBeGreaterThan(0);
    }
    // And it does not cry wolf over the logical spellings or the symmetric
    // ones the stylesheet uses on purpose.
    for (const fine of [
      'a { inset-inline-start: 0; }',
      'a { padding-inline-end: 1px; }',
      'a { border-start-start-radius: 1px; }',
      'a { text-align: start; }',
      'a { inset: 0; }',
      'a { left: 50%; transform: translate(-50%, -50%); }',
      'a { transform: translateY(-50%); }',
    ]) {
      expect(FORBIDDEN.flatMap((p) => [...fine.matchAll(p)]).length, fine).toBe(0);
    }
  });

  it('leaves the four-value shorthands alone, which also name sides', () => {
    // `padding: a b c d` is as physical as `padding-left`, and silent about it.
    // Three values are safe: the middle one is both inline sides at once.
    //
    // Counted at the top level, because a value may hold spaces of its own --
    // `margin: 0 0 var(--gap, 0.5rem)` is three, and splitting on whitespace
    // called it four. The first run of this test failed on exactly that, which
    // is the shape of a guard that would have cried wolf for ever.
    const top = (value: string): number => {
      let depth = 0;
      let count = 0;
      let inside = false;
      for (const ch of value.trim()) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (depth === 0 && /\s/.test(ch)) inside = false;
        else if (!inside) {
          inside = true;
          count++;
        }
      }
      return count;
    };
    const shorthands = [...src.matchAll(/\b(padding|margin)\s*:\s*([^;{}]+);/g)]
      .filter(([, , value]) => top(value!) === 4)
      .map(([whole]) => whole.trim());
    expect(shorthands).toEqual([]);

    // `border-radius: a b c d` names corners by screen side just as plainly.
    const radii = [...src.matchAll(/\bborder-radius\s*:\s*([^;{}]+);/g)]
      .filter(([, value]) => top(value!) >= 3)
      .map(([whole]) => whole.trim());
    expect(radii).toEqual([]);

    // And the counter can tell three from four.
    expect(top('0 0 var(--gap, 0.5rem)')).toBe(3);
    expect(top('0.2rem 0.2rem 0.2rem 0.5rem')).toBe(4);
  });

  it('covers every stylesheet the packages ship, not just this one', () => {
    // The first version swept one directory with a reduced pattern, so the
    // theme's own CSS and the Angular package were never looked at.
    const roots = [
      fileURLToPath(new URL('../src', import.meta.url)),
      fileURLToPath(new URL('../../core/src', import.meta.url)),
      fileURLToPath(new URL('../../angular/src', import.meta.url)),
      fileURLToPath(new URL('../../theme', import.meta.url)),
    ];
    const carrying: string[] = [];
    for (const dir of roots) {
      for (const file of readdirSync(dir)) {
        if (!/\.(ts|css|scss)$/.test(file)) continue;
        const body = cssOf(file, readFileSync(`${dir}/${file}`, 'utf8'));
        for (const pattern of FORBIDDEN) {
          if ([...body.matchAll(pattern)].length > 0) carrying.push(`${dir}/${file}`);
        }
      }
    }
    expect([...new Set(carrying)]).toEqual([]);
  });
});
