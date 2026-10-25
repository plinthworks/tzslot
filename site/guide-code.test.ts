// @vitest-environment node
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
// @ts-expect-error — a .mjs script with no types, read for its two functions.
import { check } from '../scripts/guide-code.mjs';

/**
 * Every code block in the guides, compiled against the packages' sources.
 *
 * `npm run docs:code` does the same thing with a readable report; this is here
 * so it runs with `npm test` and in CI, where nobody has to remember it.
 *
 * The guides hold 238 blocks across two languages. Before this, the only ones
 * ever compiled were React's — added after 2.1.0 shipped a guide section
 * asserting the opposite of what the field did, and a snippet telling a reader
 * to import something the package did not export. Both read perfectly well.
 *
 * Verified by planting defects rather than by trusting a green run: a
 * misspelt `createRangeFeild` and an option renamed to `titre` are both
 * reported, with the page and the line.
 */

interface Problem {
  page: string;
  line: number;
  at: number;
  code: string;
  message: string;
}
interface Block {
  page: string;
  line: number;
  exempt: string | null;
}

const { all, compiled, problems } = check() as {
  all: Block[];
  compiled: Block[];
  problems: Problem[];
};

describe('the guides compile', () => {
  it('every block that is not exempt', () => {
    const named = problems.map(
      (p) => `${p.page}:${p.line} (line ${p.at} of the block) ${p.code}: ${p.message}`,
    );
    expect(named).toEqual([]);
  });

  it('and most of them are not exempt', () => {
    /*
     * A ceiling on the exemptions, because the way a check like this dies is
     * one more `not-compiled` at a time until nothing is compiled and the run
     * is still green. 43 of 238 are exempt today — fragments showing one
     * option's shape, Angular bootstraps, a reader's own values. Raising this
     * number should take an argument, not a commit.
     */
    const exempt = all.filter((b) => b.exempt);
    expect(exempt.length).toBeLessThanOrEqual(45);
    expect(compiled.length).toBeGreaterThanOrEqual(190);
    // And every exemption says why, where the next person will read it.
    for (const block of exempt) {
      expect(block.exempt!.length, `${block.page}:${block.line} gives no reason`).toBeGreaterThan(
        10,
      );
    }
  });
});
