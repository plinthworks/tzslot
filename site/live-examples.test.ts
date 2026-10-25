import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as tzslot from '@tzslot/dom';
import { Temporal } from '@tzslot/core';
import { EN, FR, AR, icon } from '@tzslot/dom';

/**
 * Every live example on the site, built the way the page builds it.
 *
 * There are 356 of them, across eleven guides and two languages, and until
 * this file nothing looked at any of them. They are Vue tags whose props are
 * expressions — `:options="{ timeZone: 'Europe/Paris', months: 2 }"` — which
 * means a renamed option, a control calling a method that no longer exists,
 * or a widget that was never exported all read perfectly well in Markdown and
 * fail only in a browser, on a page nobody happened to open.
 *
 * That is not hypothetical. The 2.1.0 changelog records a guide section that
 * asserted the opposite of what the field did for two commits, and a Hijri
 * snippet telling a reader to import something the package did not export.
 * The React guide's examples have been compiled as tests ever since; the other
 * 350 were not, and today's four defects were all found by consumers rather
 * than by the 1 029 tests.
 *
 * So this does what `Live.vue` does: read the tag, evaluate its props with the
 * same values the page gives them, call the factory, press every control. It
 * does not check what the widget looks like — no test here can — but it does
 * check that the code a reader copies is code that runs.
 */

/*
 * The pages, from the working directory rather than from `import.meta.url`.
 *
 * This test needs a document, so it runs in jsdom — where `import.meta.url`
 * is an http: URL and `fileURLToPath` refuses it. Vitest runs from the
 * repository root, where its config lives.
 */
const site = join(process.cwd(), 'site') + '/';

/** One `<Live …>` tag, where it was found. */
interface Example {
  readonly page: string;
  readonly line: number;
  readonly tag: string;
}

/**
 * Every tag in a page, respecting quotes.
 *
 * A regex ending at the first `>` cuts a tag in half, because the props hold
 * arrow functions: `run: (w) => w.open()`. The scanner below tracks which
 * quote it is inside, so `>` only ends a tag when it is outside one.
 */
function tagsIn(text: string, page: string): Example[] {
  const found: Example[] = [];
  for (const start of [...text.matchAll(/<Live\b/g)].map((m) => m.index!)) {
    let i = start + 5;
    let quote: string | null = null;
    while (i < text.length) {
      const c = text[i]!;
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '>') break;
      i++;
    }
    found.push({
      page,
      line: text.slice(0, start).split('\n').length,
      tag: text.slice(start, i + 1),
    });
  }
  return found;
}

function pages(): Example[] {
  const found: Example[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== 'node_modules' && !entry.startsWith('.')) walk(path);
      } else if (entry.endsWith('.md')) {
        found.push(...tagsIn(readFileSync(path, 'utf8'), path.slice(site.length)));
      }
    }
  };
  walk(site);
  return found;
}

/** A plain attribute: `widget="RangeField"`, `dir="rtl"`. */
const plain = (tag: string, name: string): string | undefined =>
  new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag)?.[1];

/**
 * A bound attribute's expression, as written.
 *
 * Vue's `:options="…"` holds JavaScript, not a string, and the page evaluates
 * it with `Temporal`, `EN`, `FR`, `AR` and `icon` in scope — registered as
 * globals in the VitePress theme. The same five are handed to it here, so an
 * example that reads `Temporal.PlainDate.from('2026-10-08')` means here what
 * it means there.
 */
function bound(tag: string, name: string): unknown {
  const match = new RegExp(`(?:^|\\s):${name}="([\\s\\S]*?)"(?=\\s|/?>)`).exec(tag);
  if (!match) return undefined;
  const source = match[1]!;
  try {
    return new Function('Temporal', 'EN', 'FR', 'AR', 'icon', `return (${source});`)(
      Temporal,
      EN,
      FR,
      AR,
      icon,
    );
  } catch (error) {
    throw new Error(`:${name} does not evaluate — ${(error as Error).message}\n  ${source}`);
  }
}

type Control = { label: string; run: (widget: unknown) => void };

const examples = pages();

describe('every live example on the site', () => {
  it('there are examples to check, and they were all read', () => {
    // A guard on the guard. A scanner that silently matches nothing would let
    // this whole file pass while checking nothing at all, which is the failure
    // mode of every test that counts things.
    expect(examples.length).toBeGreaterThan(300);
    for (const { page, line, tag } of examples) {
      expect(tag.endsWith('>'), `${page}:${line} — unterminated <Live> tag`).toBe(true);
      expect(plain(tag, 'widget'), `${page}:${line} — no widget="…"`).toBeTruthy();
    }
  });

  for (const example of examples) {
    const { page, line, tag } = example;
    const widget = plain(tag, 'widget') ?? '?';
    // Named by where it is, so a failure says which example to go and look at
    // rather than which of 356 it was.
    it(`${page}:${line} <Live widget="${widget}">`, () => {
      const create = (tzslot as Record<string, unknown>)[`create${widget}`];
      expect(typeof create, `@tzslot/dom exports no create${widget}`).toBe('function');

      const options = (bound(tag, 'options') ?? {}) as Record<string, unknown>;
      const controls = (bound(tag, 'controls') ?? []) as Control[];
      const show = bound(tag, 'show');
      const theme = bound(tag, 'theme');

      if (show !== undefined) expect(typeof show, ':show is not a function').toBe('function');
      if (theme !== undefined) expect(typeof theme, ':theme is not an object').toBe('object');
      for (const control of controls) {
        expect(typeof control?.label, 'a control has no label').toBe('string');
        expect(typeof control?.run, `control "${control?.label}" has no run`).toBe('function');
      }

      /*
       * Errors thrown inside a listener, which otherwise vanish.
       *
       * A third version of this test pressed a day and a broken
       * `timeZone: 'Pacifique/Auckland'` *did* throw — `RangeError: Invalid
       * time zone specified` — and the test still passed. The throw happened
       * inside a click handler, where jsdom reports it to `window` and logs it
       * rather than failing anything. A browser does the same: the example
       * breaks in the console and the page looks fine.
       *
       * That is the exact failure mode worth catching here, so every uncaught
       * error raised while this example is alive is collected and fails it.
       */
      const escaped: Error[] = [];
      const catchEscaped = (event: ErrorEvent) => {
        escaped.push((event.error as Error) ?? new Error(event.message));
        event.preventDefault();
      };
      window.addEventListener('error', catchEscaped);

      const host = document.createElement('div');
      document.body.append(host);
      // The language of the page, as `Live.vue` decides it from the URL: an
      // English page showing "septembre 2026" is the example demonstrating the
      // wrong thing, and a French one labelled "From / To" is worse.
      const french = page.startsWith('fr/');
      const instance = (
        create as (host: HTMLElement, options: unknown) => { destroy(): void }
      )(host, {
        ...(french ? { locale: 'fr-FR', messages: FR } : { locale: 'en-GB' }),
        ...options,
        onChange: () => {},
      });

      try {
        expect(typeof instance?.destroy, 'the widget handed back nothing to destroy').toBe(
          'function',
        );
        expect(host.childElementCount, 'the widget drew nothing').toBeGreaterThan(0);

        /*
         * And the panel opened, where most of a field actually is.
         *
         * Building a field draws a trigger and little else: the calendar, the
         * date boxes, the hour menus and the shortcut column are all made when
         * it opens. A first version of this test stopped at construction, and
         * a deliberately broken `timeZone: 'Pacifique/Auckland'` passed —
         * `Intl` and `Temporal` both refuse that zone with a RangeError, but
         * nothing had asked either of them yet. Most of the surface a reader
         * sees was unchecked.
         *
         * A disabled example will not open, and that is its point rather than
         * a failure, so the panel is only required to have drawn when the
         * widget says it opened.
         */
        const field = instance as { open?: () => void; isOpen?: boolean; close?: () => void };
        if (typeof field.open === 'function') {
          field.open();
          if (field.isOpen) {
            const panel = document.querySelector('.tz-field__panel');
            expect(panel, 'the field says it is open and drew no panel').not.toBeNull();
            expect(panel!.childElementCount, 'the panel drew nothing').toBeGreaterThan(0);
          }
          /*
           * And a day pressed, because opening is not using.
           *
           * A second version stopped at the open panel, and a deliberately
           * broken `timeZone: 'Pacifique/Auckland'` still passed: the zone is
           * not consulted until a value exists, so the field built, opened and
           * drew a calendar without ever asking Temporal about it. Choosing a
           * day is what makes an example's options mean anything — it is also
           * the first thing a reader does.
           *
           * A cell that is disabled, or an example with none, is left alone:
           * bounds are what several of these pages are demonstrating.
           */
          const day = document.querySelector<HTMLButtonElement>(
            '.tz-field__panel [data-date]:not([disabled])',
          );
          day?.click();

          field.close?.();
        }

        // Every button beside the example, pressed. A control calling a method
        // a release removed is exactly the kind of thing that reads fine.
        for (const control of controls) control.run(instance);
        expect(
          escaped.map((e) => e.message),
          'an error escaped into a listener while this example ran',
        ).toEqual([]);
      } finally {
        window.removeEventListener('error', catchEscaped);
        instance?.destroy();
        host.remove();
      }
    });
  }
});
