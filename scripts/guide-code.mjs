/**
 * `npm run docs:code`: every code block in the guides, compiled against the
 * packages' sources.
 *
 * The guides hold 238 code blocks across two languages, and the only ones ever
 * checked were React's — compiled as tests after the 2.1.0 release shipped a
 * guide section asserting the opposite of what the field did, and a snippet
 * telling a reader to import something the package did not export. Both read
 * perfectly well. The other 230 were read and never compiled.
 *
 * Every block tagged as TypeScript, JavaScript or TSX is compiled. A block
 * that cannot be — a property fragment showing one option's shape, a value
 * rather than a program — must say so on the line above it:
 *
 *     <!-- not-compiled: a property fragment, not a program -->
 *     ```js
 *     shift: { days: 1, minutes: 30 }
 *     ```
 *
 * An HTML comment renders as nothing, so a reader sees no difference, and the
 * exemption carries its reason where the next person will read it. The count
 * of exempt blocks is printed on every run: a number that climbs is the
 * documentation drifting out from under this check, which is how the last
 * guard of this kind was quietly emptied.
 */
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['site/guide', 'site/fr/guide'];
/** A fence's language → how it is compiled. Anything else is prose, not code. */
const AS = { ts: 'ts', typescript: 'ts', tsx: 'tsx', js: 'ts', jsx: 'tsx' };
const EXEMPT = /<!--\s*not-compiled:\s*(.+?)\s*-->/;

/** Every code block of every guide: what it is, where it is, and whether it is exempt. */
export function blocks() {
  const found = [];
  for (const dir of DIRS) {
    const where = join(root, dir);
    if (!existsSync(where)) continue;
    for (const file of readdirSync(where).filter((f) => f.endsWith('.md'))) {
      const text = readFileSync(join(where, file), 'utf8');
      let index = 0;
      for (const match of text.matchAll(/^```(\w+)([^\n]*)\n([\s\S]*?)^```/gm)) {
        const [, lang, , code] = match;
        if (!AS[lang]) continue;
        index++;
        const before = text.slice(0, match.index);
        const line = before.split('\n').length;
        // The line above the fence, which is where an exemption is written.
        const previous = before.split('\n').slice(-2, -1)[0] ?? '';
        found.push({
          page: `${dir}/${file}`,
          line,
          lang,
          code,
          exempt: EXEMPT.exec(previous)?.[1] ?? null,
          strictness: lang === 'js' || lang === 'jsx' ? 'loose' : 'strict',
          name: `${dir.replace(/\//g, '_')}__${file.replace(/\.md$/, '')}__${index}.${AS[lang]}`,
        });
      }
    }
  }
  return found;
}

/**
 * What the guides treat as already in scope, derived rather than listed.
 *
 * A snippet on a page that has shown its import once does not repeat it, and
 * demanding four lines of imports above every block of two would make these
 * pages worse to read than they are to check. So the library's own exports are
 * declared as globals — read out of the entry modules with the compiler, so a
 * name this file has never heard of is still checked, and a name a release
 * removes stops resolving here the same day.
 *
 * Exactly three page conventions are declared beyond that: the element a
 * widget is given, under the three names these guides use for it. Declaring
 * more would start hiding what this check exists to find — a snippet reaching
 * for an Angular `signal` it never imported is a snippet a reader cannot run,
 * and it should fail.
 */
function globalsFor(src) {
  const entries = {
    core: src('core/src/index.ts'),
    dom: src('dom/src/index.ts'),
    react: src('react/src/index.ts'),
  };
  const program = ts.createProgram(Object.values(entries), {
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    skipLibCheck: true,
    noEmit: true,
  });
  const checker = program.getTypeChecker();
  const lines = [
    `import * as core from '@tzslot/core';`,
    `import * as dom from '@tzslot/dom';`,
    `import * as react from '@tzslot/react';`,
    `declare global {`,
    `  const element: HTMLElement;`,
    `  const el: HTMLElement;`,
    `  const host: HTMLElement;`,
  ];
  // Later packages win where two export the same name, which is what an
  // application importing both would get from its last import.
  const seen = new Set();
  for (const [alias, file] of Object.entries(entries)) {
    const source = program.getSourceFile(file);
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    if (!moduleSymbol) continue;
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
      const name = symbol.name;
      if (seen.has(name) || !/^[A-Za-z_$][\w$]*$/.test(name)) continue;
      seen.add(name);
      const resolved =
        symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      const isValue = (resolved.flags & ts.SymbolFlags.Value) !== 0;
      const isType = (resolved.flags & ts.SymbolFlags.Type) !== 0;
      // A class is both; declaring the value is enough, since `typeof` carries
      // its instance type with it.
      if (isValue) lines.push(`  const ${name}: typeof ${alias}.${name};`);
      else if (isType) lines.push(`  type ${name} = ${alias}.${name};`);
    }
  }
  lines.push(`}`, `export {};`);
  return lines.join('\n');
}

/**
 * Compiles them all at once, and says which block each error belongs to.
 *
 * One `tsc` over a directory rather than one per block: 238 compiler
 * invocations take minutes, and one takes seconds.
 */
export function check(all = blocks()) {
  const work = join(root, 'node_modules', '.cache', 'guide-code');
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });

  const src = (p) => join(root, 'packages', p);
  const compiled = all.filter((b) => !b.exempt);
  /*
   * A page's blocks compiled together, in the order they are read.
   *
   * These guides are narratives: a block opens `const field = createRangeField(…)`
   * and six paragraphs later another writes `field.update({ locale: 'ja-JP' })`.
   * Compiled one file per block, 39 of them failed on names the page had
   * already introduced — and "add the missing import to every block" would be
   * this check rewriting the documentation's style rather than checking it.
   *
   * So each page becomes one module per language, blocks concatenated in order
   * with a marker line between them, and an error is attributed back to the
   * block whose range it falls in. That is the contract the page actually
   * offers a reader: everything above this point has happened.
   *
   * What it gives up: two blocks on one page that both open `const field` now
   * collide. That is a real thing to know about a page, not a false alarm.
   */
  const pagesOf = new Map();
  for (const block of compiled) {
    if (!pagesOf.has(block.page)) pagesOf.set(block.page, []);
    pagesOf.get(block.page).push(block);
  }
  /** file name → the blocks in it, with the line each one starts at. */
  const laidOut = new Map();
  let n = 0;
  for (const [page, blocks] of pagesOf) {
    const strict = blocks.filter((b) => b.strictness === 'strict');
    const loose = blocks.filter((b) => b.strictness === 'loose');
    for (const [kind, group] of [['strict', strict], ['loose', loose]]) {
      if (group.length === 0) continue;
      const tsx = group.some((b) => b.name.endsWith('.tsx'));
      const file = `page${++n}.${kind}.${tsx ? 'tsx' : 'ts'}`;
      let text = '';
      const spans = [];
      /*
       * A name imported twice on a page is imported once here.
       *
       * A guide that shows `import { FR } from '@tzslot/angular'` in one block
       * and `import { FR } from '@tzslot/dom'` pages later is doing right by a
       * reader who arrived at the second one — both packages export it, and
       * either import is correct where it stands. Joined into one module they
       * collide as a duplicate identifier, which says something about this
       * harness and nothing about the documentation.
       *
       * So the specifiers already brought in are dropped from later imports,
       * and an import left with none is blanked. Blanked rather than removed:
       * every block keeps its own line numbers, so an error still points at
       * the right line of the right block.
       */
      const already = new Set();
      const dedupe = (line) => {
        const match = /^(\s*import\s*\{)([^}]*)(\}\s*from\s*.+)$/.exec(line);
        if (!match) {
          // `import X from …`, `import * as X from …`, `import '…'`.
          const plain = /^\s*import\s+(?:\*\s+as\s+)?([A-Za-z_$][\w$]*)\s+from\s/.exec(line);
          if (plain && already.has(plain[1])) return '';
          if (plain) already.add(plain[1]);
          return line;
        }
        const kept = match[2]
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
          .filter((part) => {
            const name = part.split(/\s+as\s+/).pop().trim().replace(/^type\s+/, '');
            if (already.has(name)) return false;
            already.add(name);
            return true;
          });
        return kept.length === 0 ? '' : `${match[1]} ${kept.join(', ')} ${match[3]}`;
      };
      for (const block of group) {
        const from = text.split('\n').length;
        const body = block.code
          .split('\n')
          .map((line) => (/^\s*import\s/.test(line) ? dedupe(line) : line))
          .join('\n');
        text += body.endsWith('\n') ? body : `${body}\n`;
        spans.push({ block, from, to: text.split('\n').length });
        /*
         * A block that ends in JSX gets a semicolon; nothing else does.
         *
         * Two React blocks each ending in a bare `<RangeField … />` read, once
         * joined by a newline, as one JSX expression with two roots — "JSX
         * expressions must have one parent element", against documentation
         * that is perfectly correct. An empty statement ends the first.
         *
         * Measured rather than assumed: putting a semicolon after *every*
         * block fixed those two and broke fifty, because a `;` after an
         * `import` or a `const` changes nothing and a `;` after a block whose
         * last line belongs to the next one changes everything. 26 problems
         * became 76. So it goes only where JSX left a sentence open.
         */
        const ends = body.trimEnd().split('\n').pop() ?? '';
        if (/(\/>|<\/[A-Za-z][\w.]*>)\s*$/.test(ends)) text += `;`;
        text += `\n`;
      }
      writeFileSync(join(work, file), `${text}\nexport {};\n`);
      laidOut.set(file, { kind, spans });
    }
  }

  writeFileSync(join(work, 'globals.d.ts'), globalsFor(src));

  /*
   * Two regimes, because a JavaScript block is JavaScript.
   *
   * A first version compiled every block under `strict`, and reported
   * `document.querySelector(…)` as possibly null and an unannotated callback
   * parameter as an implicit `any` — in blocks written as `js`. Neither is a
   * defect in JavaScript, and asking a reader to write `!` and type
   * annotations in a JavaScript example would be this check deciding what the
   * documentation says.
   *
   * So `ts` and `tsx` blocks are held to TypeScript's standard, and `js`
   * blocks to what JavaScript guarantees: the names have to exist and the
   * arguments have to fit, which is what a reader copying one needs to be
   * true. A misspelt factory and a renamed option fail in both.
   */
  const paths = {
    '@tzslot/core': [src('core/src/index.ts')],
    '@tzslot/core/lazy': [src('core/src/lazy.ts')],
    '@tzslot/dom': [src('dom/src/index.ts')],
    '@tzslot/dom/lazy': [src('dom/src/lazy.ts')],
    '@tzslot/react': [src('react/src/index.ts')],
    '@tzslot/angular': [src('angular/src/index.ts')],
  };
  const project = (name, loose, files) => {
    writeFileSync(
      join(work, name),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          ...(loose ? { noImplicitAny: false, strictNullChecks: false } : {}),
          noEmit: true,
          skipLibCheck: true,
          jsx: 'react-jsx',
          allowJs: true,
          experimentalDecorators: true,
          baseUrl: '.',
          paths,
        },
        files: ['globals.d.ts', ...files],
      }),
    );
  };
  const named = (kind) => [...laidOut].filter(([, v]) => v.kind === kind).map(([f]) => f);
  project('tsconfig.strict.json', false, named('strict'));
  project('tsconfig.loose.json', true, named('loose'));

  let output = '';
  for (const config of ['tsconfig.strict.json', 'tsconfig.loose.json']) {
    try {
      execFileSync(join(root, 'node_modules/.bin/tsc'), ['-p', config], {
        cwd: work,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (error) {
      output += String(error.stdout ?? '') + String(error.stderr ?? '');
    }
  }

  const problems = [];
  for (const line of output.split('\n')) {
    const m = /^([\w.]+\.tsx?)\((\d+),(\d+)\): error (TS\d+): (.*)$/.exec(line);
    if (!m) continue;
    const page = laidOut.get(m[1]);
    if (!page) continue;
    const at = Number(m[2]);
    // The block whose lines this one falls inside, so the report names a place
    // in the documentation rather than a line of a file nobody will ever see.
    const span = page.spans.find((s) => at >= s.from && at < s.to);
    if (!span) continue;
    problems.push({
      page: span.block.page,
      line: span.block.line,
      at: at - span.from + 1,
      code: m[4],
      message: m[5],
    });
  }
  return { all, compiled, problems };
}

if (process.argv[1] && process.argv[1].endsWith('guide-code.mjs')) {
  const { all, compiled, problems } = check();
  const exempt = all.filter((b) => b.exempt);
  console.log(`\n${all.length} code blocks in the guides: ${compiled.length} compiled, ${exempt.length} exempt.\n`);
  for (const block of exempt) console.log(`  · ${block.page}:${block.line} — ${block.exempt}`);
  if (problems.length === 0) {
    console.log('\nEvery compiled block is clean.\n');
  } else {
    console.error(`\n${problems.length} problem(s):\n`);
    for (const p of problems) {
      console.error(`  ✖ ${p.page}:${p.line} (line ${p.at} of the block)`);
      console.error(`    ${p.code}: ${p.message}`);
    }
    console.error('');
    process.exit(1);
  }
}
