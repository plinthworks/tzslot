/**
 * Publishing all five packages, and then checking that all five arrived.
 *
 * Twice before, a release left only one package on npm. The versions in the
 * manifests referred to each other exactly, so the ones that did arrive were
 * uninstallable: `@tzslot/dom@2.x` asking for `@tzslot/core@2.x` that was not
 * there. Nobody noticed until someone tried to install it.
 *
 * The cause, found the third time it happened: this account has
 * `two-factor auth: auth-and-writes`, so every single `npm publish` wants a
 * one-time code. Run as a shell loop inside `npm run`, the prompt does not
 * always reach a terminal, and a code typed for the first package has expired
 * by the fourth. Hence `--otp` passed through to every publish, from one code
 * given once.
 *
 * And hence the second half of this script, which is the part that was always
 * missing: after publishing, it asks the registry — not the local cache, which
 * answers with yesterday's truth — whether each package is really there at the
 * version just built. A release is not finished because `npm publish` printed
 * something; it is finished when the registry says so.
 *
 *   npm run publish:latest -- --otp=123456
 *   npm run publish:latest              # npm prompts for each package
 *   npm run publish:verify              # just the check, after the fact
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Dependencies before dependents, so a half-finished release is still coherent. */
const ORDER = ['core', 'dom', 'theme', 'react', 'angular'];

const manifest = (name) =>
  JSON.parse(readFileSync(join(root, 'packages', name, 'dist', 'package.json'), 'utf8'));

const otpArg = process.argv.find((a) => a.startsWith('--otp='));
const otp = otpArg?.slice('--otp='.length) ?? process.env.NPM_OTP;
const verifyOnly = process.argv.includes('--verify-only');

/**
 * What the registry says, bypassing every cache.
 *
 * `npm view` reads a local cache that can be stale, and it lied twice in one
 * afternoon in the same direction: it answered 2.2.0 for packages already at
 * 2.3.0, and then served an installed 2.3.0 whose manifest had neither the
 * lazy entry nor the corrected `sideEffects` — while the published tarball had
 * both. Either answer alone would have sent someone chasing a defect that did
 * not exist. The registry's own JSON is the only answer worth acting on.
 */
async function published(name) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(`@tzslot/${name}`)}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (response.status === 404) return { versions: [], latest: null, tarball: null };
  if (!response.ok) throw new Error(`the registry answered ${response.status} for @tzslot/${name}`);
  const body = await response.json();
  const version = manifest(name).version;
  return {
    versions: Object.keys(body.versions ?? {}),
    latest: body['dist-tags']?.latest ?? null,
    tarball: body.versions?.[version]?.dist?.tarball ?? null,
  };
}

/**
 * Whether the tarball the metadata promises can actually be fetched.
 *
 * Metadata and files propagate separately. @tzslot/angular@2.3.0 was listed as
 * `latest` while its tarball answered 404 for 101 seconds, and `npm install`
 * failed the whole time with "is not in this registry" — so a check that reads
 * only the metadata declares a release finished that nobody can install. It
 * settles on its own, hence the wait rather than a verdict on the first try.
 */
async function fetchable(url, waitMs = 180_000) {
  const deadline = Date.now() + waitMs;
  let waited = false;
  for (;;) {
    const head = await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null);
    if (head?.ok) return { ok: true, waited };
    if (Date.now() > deadline) return { ok: false, waited, status: head?.status ?? 'no answer' };
    waited = true;
    await new Promise((resume) => setTimeout(resume, 5_000));
  }
}

if (!verifyOnly) {
  if (!otp) {
    console.log(
      '\nNo --otp given. This account requires a one-time code for every publish,\n' +
        'so npm will ask five times. To be asked once instead:\n\n' +
        '  npm run publish:latest -- --otp=123456\n',
    );
  }

  console.log('\nBuilding, and checking what a bundler does to the result.\n');
  execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  execFileSync('npm', ['run', 'check:bundle'], { cwd: root, stdio: 'inherit' });

  for (const name of ORDER) {
    const { version } = manifest(name);
    console.log(`\nPublishing @tzslot/${name}@${version}`);
    const args = ['publish', join('packages', name, 'dist'), '--access', 'public'];
    if (otp) args.push(`--otp=${otp}`);
    // stdio inherited so npm can ask for a code when none was given.
    const run = spawnSync('npm', args, { cwd: root, stdio: 'inherit' });
    if (run.status !== 0) {
      console.error(
        `\n✖ @tzslot/${name} did not publish.\n\n` +
          `  Everything before it did, and the packages after it did not — which is\n` +
          `  the state that leaves a release uninstallable. Fix the cause, then run\n` +
          `  the same command again: npm refuses a version it already has, so the\n` +
          `  ones already up are skipped rather than duplicated.\n`,
      );
      process.exit(1);
    }
  }
}

console.log('\nAsking the registry what actually arrived.\n');
let missing = 0;
for (const name of ORDER) {
  const { version } = manifest(name);
  let state;
  try {
    state = await published(name);
  } catch (error) {
    console.error(`  ? @tzslot/${name} — could not ask: ${error.message}`);
    missing++;
    continue;
  }
  const there = state.versions.includes(version);
  const current = state.latest === version;
  if (there) {
    const tarball = await fetchable(state.tarball ?? '');
    if (!tarball.ok) {
      console.error(
        `  ✖ @tzslot/${name}@${version} is listed, but its tarball is not there ` +
          `(${tarball.status}) — nobody can install it`,
      );
      missing++;
      continue;
    }
    const note = tarball.waited ? ', after waiting for it to propagate' : '';
    if (current) console.log(`  ✔ @tzslot/${name}@${version} is there and installable${note}`);
    else console.log(`  ! @tzslot/${name}@${version} is installable, but latest is ${state.latest}`);
    continue;
  }
  {
    console.error(
      `  ✖ @tzslot/${name}@${version} is NOT on npm (latest there: ${state.latest ?? 'nothing'})`,
    );
    missing++;
  }
}

if (missing > 0) {
  console.error(
    `\n${missing} of ${ORDER.length} packages did not arrive. The ones that did refer to\n` +
      `the missing ones by exact version, so they cannot be installed. This is not\n` +
      `done — publish the rest before telling anyone.\n`,
  );
  process.exit(1);
}
console.log('\nAll five are on npm at the built version.\n');
