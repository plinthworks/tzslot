// @vitest-environment node
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * A package must reach its neighbours by name.
 *
 * A single `'../../dom/src/index.js'` pulled the whole DOM package into the
 * Angular library's compilation and crashed ng-packagr with a message about
 * `referencedFiles` that named nothing. The tests stayed green throughout,
 * because vitest resolves either spelling happily.
 */
const packages = fileURLToPath(new URL('../..', import.meta.url));

const sources = (name: string) =>
  readdirSync(`${packages}${name}/src`)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => [`${name}/src/${file}`, readFileSync(`${packages}${name}/src/${file}`, 'utf8')] as const);

describe('how the packages reach each other', () => {
  it('by name, never by a path into another package’s sources', () => {
    const reaching = ['core', 'dom', 'angular']
      .flatMap((name) => sources(name))
      .filter(([, text]) => /from '\.\.\/\.\.\/(core|dom|angular)\/src/.test(text))
      .map(([file]) => file);

    expect(reaching).toEqual([]);
  });
});
