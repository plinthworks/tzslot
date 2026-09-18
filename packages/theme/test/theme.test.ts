// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile, compileString } from 'sass';

const dir = fileURLToPath(new URL('..', import.meta.url));
const build = () => compile(`${dir}tzslot.scss`, { style: 'expanded' }).css;
const withTheme = (source: string) => compileString(source, { loadPaths: [dir] }).css;

describe('one theme, not two', () => {
  it('tzslot.css is exactly what tzslot.scss compiles to', () => {
    // Edited by hand, the CSS would drift from the Sass and one of the two
    // would quietly be wrong. Run `npm run build:theme` after changing the scss.
    expect(readFileSync(`${dir}tzslot.css`, 'utf8').trim()).toBe(build().trim());
  });
});

describe('what Sass adds', () => {
  it('configures the palette at compile time, a pair becoming light-dark()', () => {
    const css = withTheme(`@use 'tzslot' with ($accent: (#be123c, #fb7185), $accent-fg: #fff);`);
    expect(css).toContain('--tz-accent: light-dark(#be123c, #fb7185);');
    expect(css).toContain('--tz-accent-fg: #fff;');
  });

  it('scopes a palette to a selector with a mixin', () => {
    const css = withTheme(`@use 'tzslot' as tz with ($emit: false);
      .brand { @include tz.palette((accent: #0f766e, bg: (#fff, #000))); }`);
    expect(css).toContain('--tz-accent: #0f766e;');
    expect(css).toContain('--tz-bg: light-dark(#fff, #000);');
    // $emit: false loads the tools without the whole theme.
    expect(css).not.toContain(':root');
  });
});
