// @vitest-environment node
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { compile } from 'tailwindcss';

/**
 * Compiled with the real Tailwind, because the bridge depends on a behaviour
 * that is easy to get wrong from memory: v4 emits only the theme variables
 * something references.
 */
const theme = fileURLToPath(new URL('..', import.meta.url));
const tailwind = createRequire(import.meta.url).resolve('tailwindcss/index.css');

async function build(entry: string): Promise<string> {
  const compiler = await compile(entry, {
    base: theme,
    loadStylesheet: async (id: string, base: string) => {
      const path =
        id === 'tailwindcss' ? tailwind : id.startsWith('@tzslot/theme/') ? theme + id.slice(14) : id;
      return { path, base, content: readFileSync(path, 'utf8') };
    },
  });
  return compiler.build([]);
}

const defines = (css: string, name: string) => new RegExp(`${name}:\\s`).test(css);

describe('the Tailwind bridge', () => {
  it('makes Tailwind emit every colour it points at', async () => {
    const css = await build(`@import "tailwindcss"; @import "@tzslot/theme/tailwind.css";`);
    for (const name of [
      '--color-white', '--color-zinc-100', '--color-zinc-900', '--color-blue-600',
      '--color-blue-400', '--color-red-700', '--color-amber-400', '--font-sans', '--radius-md',
    ]) {
      expect(defines(css, name), `${name} should be emitted`).toBe(true);
    }
    expect(css).toContain('--tz-accent: light-dark(');
  });

  it('follows the brand colour when the theme has one', async () => {
    const css = await build(`@import "tailwindcss";
      @theme { --color-primary-600: #e11d48; --color-primary-400: #fb7185; }
      @import "@tzslot/theme/tailwind.css";`);
    expect(defines(css, '--color-primary-600')).toBe(true);
    expect(css).toContain('#e11d48');
  });

  it('without the bridge going through Tailwind, those colours would not exist', async () => {
    // The reason the docs insist on importing it after tailwindcss.
    const css = await build(`@import "tailwindcss";`);
    expect(defines(css, '--color-zinc-100')).toBe(false);
  });
});
