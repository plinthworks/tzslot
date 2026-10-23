/**
 * Builds every package into its own dist/, ready for `npm publish dist`.
 *
 * Each package.json in the repository points at TypeScript sources, which is
 * what the workspace and the playground need. What npm receives is different —
 * compiled JavaScript and declarations — so each dist/ gets a manifest of its
 * own, written here from the source one. Nothing is published from a
 * package's root, only from its dist/.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const pkg = (name) => join(root, 'packages', name);
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

const repository = (name) => ({
  type: 'git',
  url: 'git+https://github.com/plinthworks/tzslot.git',
  directory: `packages/${name}`,
});
const shared = (name) => ({
  license: read(join(pkg(name), 'package.json')).license,
  repository: repository(name),
  homepage: 'https://plinthworks.github.io/tzslot/',
  bugs: { url: 'https://github.com/plinthworks/tzslot/issues' },
  keywords: ['date', 'time', 'datepicker', 'timezone', 'dst', 'temporal', 'calendar', 'time-slots'],
});

/** The workspace's own packages, pinned to the versions being built together. */
const internal = (deps = {}) =>
  Object.fromEntries(
    Object.entries(deps).map(([name, version]) =>
      name.startsWith('@tzslot/') ? [name, `^${read(join(pkg(name.slice(8)), 'package.json')).version}`] : [name, version],
    ),
  );

/** README and LICENSE, when they exist, travel with every package. */
function extras(name) {
  for (const file of ['README.md', 'LICENSE']) {
    const own = join(pkg(name), file);
    const top = join(root, file);
    const source = existsSync(own) ? own : existsSync(top) ? top : null;
    if (source) cpSync(source, join(pkg(name), 'dist', file));
  }
}

function typescript(name) {
  const dir = pkg(name);
  rmSync(join(dir, 'dist'), { recursive: true, force: true });
  run('npx', ['tsc', '-p', join(dir, 'tsconfig.build.json')]);
  const source = read(join(dir, 'package.json'));
  const manifest = {
    name: source.name,
    version: source.version,
    description: source.description,
    ...shared(name),
    type: 'module',
    /*
     * Which modules here do something merely by being imported.
     *
     * `sideEffects: false` is a promise to every bundler: nothing in this
     * package matters unless a binding is read out of it. That was true until
     * the default entry started installing the polyfill — and esbuild, taking
     * the promise at its word, deleted the `install()` call and the polyfill
     * import with it. The bundle then read Temporal and got the "not available
     * yet" proxy, so a bundled application crashed on its first date while
     * every one of the 1023 tests stayed green: the suite imports source,
     * where nothing is tree-shaken. Found by running a bundle, which is now
     * `npm run check:bundle`.
     *
     * A package with a lazy entry is exactly a package whose default entry
     * installs, so the exception is derived rather than written down twice.
     */
    sideEffects: existsSync(join(dir, 'dist', 'lazy.js')) ? ['./index.js'] : false,
    main: './index.js',
    module: './index.js',
    types: './index.d.ts',
    exports: {
      '.': { types: './index.d.ts', default: './index.js' },
      /*
       * A second entry where the source has one.
       *
       * `@tzslot/core/lazy` is the same library without the polyfill bundled:
       * the manifest has to say so, or the subpath resolves to nothing and the
       * import fails at install time rather than here.
       */
      ...(existsSync(join(dir, 'dist', 'lazy.js'))
        ? { './lazy': { types: './lazy.d.ts', default: './lazy.js' } }
        : {}),
      './package.json': './package.json',
    },
    dependencies: internal(source.dependencies),
    /*
     * And the peers, where there are any.
     *
     * This builder copied `dependencies` and nothing else, which was true of
     * every package it had ever been given. The React wrapper has React as a
     * peer, and the first build of it produced a manifest that did not mention
     * React at all: it would have installed beside any version, or none, and
     * npm would have had nothing to warn about. Caught by reading the built
     * manifest rather than by any test — nothing here checks what a manifest
     * does not say.
     */
    ...(source.peerDependencies ? { peerDependencies: source.peerDependencies } : {}),
  };
  writeFileSync(join(dir, 'dist', 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  extras(name);
}

function angular() {
  const dir = pkg('angular');
  rmSync(join(dir, 'dist'), { recursive: true, force: true });
  run('npx', ['ng-packagr', '-p', 'ng-package.json', '-c', 'tsconfig.lib.json'], dir);
  // ng-packagr writes its own manifest from the source one; take out what only
  // makes sense in the repository, and pin the internal dependencies.
  const file = join(dir, 'dist', 'package.json');
  const manifest = read(file);
  // The repository's main and types point at the sources; ng-packagr's own
  // exports, module and typings are the ones that ship.
  delete manifest.main;
  delete manifest.types;
  Object.assign(manifest, shared('angular'));
  manifest.dependencies = internal(manifest.dependencies);
  writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
  extras('angular');
}

function theme() {
  const dir = pkg('theme');
  rmSync(join(dir, 'dist'), { recursive: true, force: true });
  mkdirSync(join(dir, 'dist'));
  run('npm', ['run', 'build:theme', '--silent']);
  const source = read(join(dir, 'package.json'));
  for (const file of source.files) cpSync(join(dir, file), join(dir, 'dist', file));
  const { files: _files, ...manifest } = source;
  writeFileSync(
    join(dir, 'dist', 'package.json'),
    JSON.stringify({ ...manifest, ...shared('theme') }, null, 2) + '\n',
  );
  extras('theme');
}

// Order matters: dom compiles against core's declarations, the wrappers
// against both.
typescript('core');
typescript('dom');
typescript('react');
angular();
theme();

// A published manifest that points at src/ points at a file npm never
// received: the install succeeds and the import fails. Refuse to finish.
for (const name of ['core', 'dom', 'react', 'angular', 'theme']) {
  const text = readFileSync(join(pkg(name), 'dist', 'package.json'), 'utf8');
  if (text.includes('src/')) {
    console.error(`packages/${name}/dist/package.json still points at src/`);
    process.exit(1);
  }
}
console.log('\nBuilt: packages/{core,dom,react,angular,theme}/dist');
