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
const src = readFileSync(
  fileURLToPath(new URL('../src/styles.ts', import.meta.url)),
  'utf8',
);

/** A declaration, not a word in prose: the colon is what makes it one. */
const FORBIDDEN = [
  /\bborder-(left|right)(-color|-width|-style)?\s*:/g,
  /\bmargin-(left|right)\s*:/g,
  /\bpadding-(left|right)\s*:/g,
  /\btext-align\s*:\s*(left|right)\b/g,
  /\bfloat\s*:/g,
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
    // A guard that matches nothing would pass on an empty file too.
    const planted = 'a { border-left: 1px solid red; text-align: right; }';
    const hits = FORBIDDEN.flatMap((p) => [...planted.matchAll(p)]);
    expect(hits.length).toBe(2);
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

    // And the counter can tell three from four.
    expect(top('0 0 var(--gap, 0.5rem)')).toBe(3);
    expect(top('0.2rem 0.2rem 0.2rem 0.5rem')).toBe(4);
  });

  it('covers every stylesheet the package ships, not just this one', () => {
    const dir = fileURLToPath(new URL('../src', import.meta.url));
    const carrying = readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => /border-(left|right)\s*:|text-align\s*:\s*(left|right)/.test(
        readFileSync(`${dir}/${f}`, 'utf8'),
      ));
    expect(carrying).toEqual([]);
  });
});
