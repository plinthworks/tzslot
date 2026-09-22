// @vitest-environment node
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import atImport from 'postcss-import';
import tailwind3 from 'tailwindcss3';

/**
 * Compiled with the real Tailwind v3, for the same reason as the v4 bridge:
 * theme() is resolved by PostCSS at build time, and a file that never goes
 * through it comes out of the browser colourless without a word of warning.
 */
const theme = fileURLToPath(new URL('../', import.meta.url));

async function build(css: string, config: Record<string, unknown> = {}): Promise<string> {
  const result = await postcss([
    atImport(),
    tailwind3({ content: [{ raw: '' }], darkMode: 'class', ...config }) as never,
  ]).process(css, { from: theme + 'entry.css' });
  return result.css;
}

const entry = (extra = '') => `
  @import "tailwindcss3/utilities";
  @import "./tailwind3.css";
  ${extra}`;

describe('the Tailwind v3 bridge', () => {
  it('resolves every colour through theme(), so the browser gets hex', async () => {
    const css = await build(entry());
    expect(css).toContain('--tz-bg: light-dark(#fff, #18181b)');
    expect(css).toContain('--tz-fg: light-dark(#18181b, #f4f4f5)');
    expect(css).toContain('--tz-border: light-dark(#d4d4d8, #3f3f46)');
    expect(css).toContain('--tz-radius: 0.375rem');
    // Outside the comments, which quote theme() to explain it.
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toContain('theme(');
  });

  it('falls back to blue when the config has no brand colour', async () => {
    const css = await build(entry());
    expect(css).toContain('#2563eb');
  });

  it('follows the brand colour when the config has one', async () => {
    const css = await build(entry(), {
      theme: { extend: { colors: { primary: { 600: '#e11d48', 400: '#fb7185' } } } },
    });
    expect(css).toContain('#e11d48');
    expect(css).toContain('#fb7185');
  });

  it('carries the class strategy, and :not() outweighs it', async () => {
    const css = await build(entry(`:root:not(.dark) { --tz-color-scheme: light; }`));
    expect(css).toMatch(/\.dark\s*\{\s*--tz-color-scheme:\s*dark/);
    expect(css).toContain(':root:not(.dark)');
  });

  it('the v4 bridge pointed at v3 yields nothing, silently', async () => {
    // The trap this file exists to avoid: it compiles, and no colour arrives.
    const css = await build(`
      @import "tailwindcss3/utilities";
      @import "./tailwind.css";`);
    expect(css).not.toContain('#18181b');
    expect(css).toContain('var(--color-zinc-900)'); // left as written, meaningless to v3
  });
});
