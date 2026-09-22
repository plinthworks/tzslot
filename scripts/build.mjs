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
    sideEffects: false,
    main: './index.js',
    module: './index.js',
    types: './index.d.ts',
    exports: {
      '.': { types: './index.d.ts', default: './index.js' },
      './package.json': './package.json',
    },
    dependencies: internal(source.dependencies),
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

// Order matters: dom compiles against core's declarations, Angular against both.
typescript('core');
typescript('dom');
angular();
theme();

// A published manifest that points at src/ points at a file npm never
// received: the install succeeds and the import fails. Refuse to finish.
for (const name of ['core', 'dom', 'angular', 'theme']) {
  const text = readFileSync(join(pkg(name), 'dist', 'package.json'), 'utf8');
  if (text.includes('src/')) {
    console.error(`packages/${name}/dist/package.json still points at src/`);
    process.exit(1);
  }
}
console.log('\nBuilt: packages/{core,dom,angular,theme}/dist');
