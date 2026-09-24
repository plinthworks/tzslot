// @vitest-environment node
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * No backtick inside a CSS block.
 *
 * The stylesheets are template literals, so one backtick in a comment closes
 * the string and the file stops being JavaScript — the error lands dozens of
 * lines away (`Expected ";" but found "08"`) and the docs server goes down
 * with it. It has happened twice while writing comments about CSS properties,
 * which is exactly where the temptation to quote one is.
 */
describe('the CSS literals', () => {
  it('contain no backtick', () => {
    const source = readFileSync(fileURLToPath(new URL('../src/styles.ts', import.meta.url)), 'utf8');
    const blocks = [...source.matchAll(/export const (\w+_CSS) = `(.*?)\n`;/gs)];
    expect(blocks.length).toBeGreaterThan(8); // the regex still finds them
    expect(blocks.filter(([, , body]) => body!.includes('`')).map(([, name]) => name)).toEqual([]);
  });
});
