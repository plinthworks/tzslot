/**
 * What a bundler does to the built packages, checked by running the result.
 *
 * The test suite imports source. Nothing there is tree-shaken, minified or
 * split into chunks, so the suite cannot see the one class of defect that only
 * a bundler produces: code deleted because the package said it was safe to
 * delete. That happened — `sideEffects: false` was still being declared after
 * the default entry started installing the polyfill at import time, and esbuild
 * removed the install. Every test passed; a bundled application threw on its
 * first date.
 *
 * So this builds two real consumers, bundles them the way an application does,
 * and runs them. It is the only gate here that executes shipped bytes.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const work = join(root, 'node_modules', '.cache', 'tzslot-bundle-check');
const core = join(root, 'packages', 'core', 'dist');

const fail = (what) => {
  console.error(`✖ ${what}`);
  process.exitCode = 1;
};
/**
 * What a failed run actually said.
 *
 * Node prints the whole offending bundle before the message, which on a
 * minified file is one line of several kilobytes. The message is the last
 * thing worth reading, so that is what comes back.
 */
const complaint = (error) => {
  const text = String(error.stderr ?? error.message ?? error);
  return text.split('\n').find((line) => /Error:/.test(line))?.trim() ?? text.slice(0, 200);
};

const gzipped = (file) =>
  Number(execFileSync('sh', ['-c', `gzip -c ${JSON.stringify(file)} | wc -c`]).toString().trim());

if (!existsSync(join(core, 'index.js'))) {
  console.error('✖ packages/core/dist is missing — run `npm run build` first.');
  process.exit(1);
}

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
// `type: module` so Node runs the bundles as ESM, and the repo's own
// node_modules two levels up so `temporal-polyfill` resolves from here.
writeFileSync(join(work, 'package.json'), JSON.stringify({ type: 'module' }));

const esbuild = (args) =>
  execFileSync('npx', ['esbuild', ...args, '--bundle', '--format=esm', '--minify', '--log-level=error'], {
    cwd: work,
    encoding: 'utf8',
  });

/** The entry chunk's own static imports, which is what a browser fetches first. */
const staticChunks = (file) =>
  (readFileSync(file, 'utf8').match(/(?:from|import)"\.\/([^"]+)"/g) ?? []).map((m) =>
    m.replace(/.*"\.\/|"$/g, ''),
  );

console.log('\nThe default entry — no await, exactly as before\n');
{
  writeFileSync(
    join(work, 'app.js'),
    [
      `import { getMonthGrid, Temporal } from ${JSON.stringify(join(core, 'index.js'))};`,
      `console.log(getMonthGrid(2026, 10, 1).length, Temporal.PlainDate.from('2026-10-25').toString());`,
    ].join('\n'),
  );
  esbuild(['app.js', '--splitting', '--outdir=out-default']);
  esbuild(['app.js', '--outfile=flat-default.js']);

  const flat = join(work, 'flat-default.js');
  let said = '';
  try {
    said = execFileSync('node', [flat], { cwd: work, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    said = complaint(error);
  }
  if (said === '6 2026-10-25') console.log(`  ✔ runs after minifying: ${said}`);
  else fail(`the bundled default entry did not work — ${said}`);

  const entry = join(work, 'out-default', 'app.js');
  const carried = staticChunks(entry);
  if (carried.length > 0) console.log(`  ✔ the polyfill arrives with the entry (${carried.join(', ')})`);
  else fail('the default entry no longer loads the polyfill up front — that is the lazy entry\'s job');

  const first =
    gzipped(entry) +
    carried.reduce((sum, name) => sum + gzipped(join(work, 'out-default', name)), 0);
  console.log(`  · first load: ${first} B gzipped`);
}

console.log('\nThe lazy entry — the polyfill only where it is needed\n');
{
  writeFileSync(
    join(work, 'app.js'),
    [
      `import { getMonthGrid, Temporal, loadTemporal } from ${JSON.stringify(join(core, 'lazy.js'))};`,
      `await loadTemporal();`,
      `console.log(getMonthGrid(2026, 10, 1).length, Temporal.PlainDate.from('2026-10-25').toString());`,
    ].join('\n'),
  );
  esbuild(['app.js', '--splitting', '--outdir=out-lazy']);

  const entry = join(work, 'out-lazy', 'app.js');
  const carried = staticChunks(entry);
  if (carried.length === 0) console.log('  ✔ the entry chunk pulls in no polyfill');
  else fail(`the lazy entry statically imports ${carried.join(', ')} — the saving is gone`);
  console.log(`  · first load: ${gzipped(entry)} B gzipped`);

  /*
   * The decisive one: on a runtime that already has Temporal, the polyfill
   * chunk must never be asked for. Proven by deleting it, not by reading the
   * code — an `import()` that is never reached cannot fail on a missing file.
   */
  const shed = readdirSync(join(work, 'out-lazy')).filter((f) => f !== 'app.js');
  const saved = shed.reduce((sum, f) => sum + gzipped(join(work, 'out-lazy', f)), 0);
  for (const f of shed) rmSync(join(work, 'out-lazy', f));

  writeFileSync(
    join(work, 'native.js'),
    [
      `import { Temporal as Native } from 'temporal-polyfill/full';`,
      `globalThis.Temporal = Native;`,
      `await import('./out-lazy/app.js');`,
    ].join('\n'),
  );
  let said = '';
  try {
    said = execFileSync('node', ['native.js'], { cwd: work, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    said = complaint(error);
  }
  if (said === '6 2026-10-25')
    console.log(`  ✔ runs with the polyfill chunk deleted: ${saved} B gzipped never fetched`);
  else fail(`with native Temporal and no polyfill chunk, it said: ${said}`);
}

console.log('\nThrough the widgets, which is how most people arrive\n');
{
  /*
   * `@tzslot/dom` imports the core's default entry, so a widget user gets the
   * polyfill whatever they do — the lazy entry is for code that talks to the
   * core directly. What must not happen is the install being dropped on this
   * path too, which is the same defect one package further away.
   */
  const dom = join(root, 'packages', 'dom', 'dist', 'index.js');
  if (!existsSync(dom)) fail('packages/dom/dist is missing — run `npm run build` first.');
  else {
    writeFileSync(
      join(work, 'widget.js'),
      [
        `import { createRangeField } from ${JSON.stringify(dom)};`,
        `import { Temporal } from ${JSON.stringify(join(core, 'index.js'))};`,
        `console.log(typeof createRangeField, Temporal.PlainDate.from('2026-10-25').toString());`,
      ].join('\n'),
    );
    esbuild(['widget.js', '--outfile=flat-widget.js']);
    let said = '';
    try {
      said = execFileSync('node', ['flat-widget.js'], { cwd: work, encoding: 'utf8', stdio: 'pipe' }).trim();
    } catch (error) {
      said = complaint(error);
    }
    if (said === 'function 2026-10-25') console.log(`  ✔ a bundled widget still has Temporal: ${said}`);
    else fail(`a bundled widget did not work — ${said}`);
  }
}

console.log('');
if (process.exitCode) console.error('Bundle check failed.\n');
else console.log('Bundle check passed.\n');
