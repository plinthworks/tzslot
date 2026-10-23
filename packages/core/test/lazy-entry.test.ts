// @vitest-environment node
/// <reference types="node" />
import { describe, it, expect, vi } from 'vitest';
import * as lazy from '../src/lazy.js';
import * as main from '../src/index.js';

/**
 * The lazy entry: the same library, with the polyfill left out of the bundle.
 *
 * Asked for by a consumer whose own bundle was 137 kB gzipped with 66 kB of
 * polyfill in it, on browsers that ship Temporal natively. Measured rather
 * than estimated: `@tzslot/core` bundles to 26.8 kB gzipped with the polyfill
 * and 3.4 kB without.
 *
 * The two interesting states — nothing loaded yet, and loaded exactly once —
 * cannot be seen in the suite's own module graph: its setup file imports the
 * default entry, which installs the polyfill before any test runs, exactly as
 * an application's first import does. So those three reset the graph first.
 */
describe('the lazy entry', () => {
  it('offers loadTemporal from both, so one startup line serves either', () => {
    expect(typeof lazy.loadTemporal).toBe('function');
    expect(typeof main.loadTemporal).toBe('function');
  });

  it('needs no await on the default entry, exactly as before', () => {
    expect(main.getMonthGrid(2026, 10, 1).length).toBe(6);
    expect(main.Temporal.PlainDate.from('2026-10-25').toString()).toBe('2026-10-25');
  });

  it('works after one await', async () => {
    await lazy.loadTemporal();
    const grid = lazy.getMonthGrid(2026, 10, 1);
    expect(grid.length).toBe(6);
    expect(grid[0]![0]!.toString()).toBe('2026-09-28');
  });

  it('says what to do when the library is used before it is loaded', async () => {
    /*
     * A fresh module graph, which is the only way to see this from inside a
     * suite whose setup installs the polyfill before the first test — exactly
     * as an application's first import does.
     */
    vi.resetModules();
    const fresh = await import('../src/temporal.js');
    expect(() => fresh.Temporal.PlainDate.from('2026-10-25')).toThrow(/loadTemporal/);
    // And it names what was read, rather than leaving `undefined` to be guessed.
    expect(() => fresh.Temporal.Instant.from('2026-10-25T00:00Z')).toThrow(/Temporal\.Instant/);
  });

  it('fetches the polyfill once, however many callers race for it', async () => {
    vi.resetModules();
    const fresh = await import('../src/lazy.js');
    const first = fresh.loadTemporal();
    const second = fresh.loadTemporal();
    /*
     * The same promise, not two imports. Two copies of the polyfill are two
     * sets of classes, and every `instanceof` between them answers false —
     * which this library has already shipped once and will not again.
     */
    expect(first).toBe(second);
    await Promise.all([first, second, fresh.loadTemporal()]);
    expect(fresh.getMonthGrid(2026, 10, 1).length).toBe(6);
  });

  it('survives being destructured before it is loaded', async () => {
    /*
     * The shape that killed the first design, which reassigned an `export let`.
     * A destructured copy of a live binding is a copy of its value, so the copy
     * stayed on the old one and threw after a successful load. One forwarding
     * object has no old value to be stuck on.
     */
    vi.resetModules();
    const fresh = await import('../src/lazy.js');
    const copy = fresh.Temporal;
    await fresh.loadTemporal();
    expect(copy.PlainDate.from('2026-10-25').toString()).toBe('2026-10-25');
  });

  it('enumerates the implementation, not an empty object', async () => {
    vi.resetModules();
    const fresh = await import('../src/lazy.js');
    await fresh.loadTemporal();
    // `Object.keys` and a spread have to see the namespace, or a caller
    // inspecting it is told Temporal is empty.
    expect(Object.keys(fresh.Temporal)).toContain('PlainDate');
    expect('ZonedDateTime' in fresh.Temporal).toBe(true);
    expect({ ...fresh.Temporal }).toHaveProperty('Instant');
  });

  it('can be retried after a failed load', async () => {
    /*
     * A blocked chunk is not a verdict. `??=` kept a rejected promise as
     * happily as a fulfilled one, so one proxy, one moment offline, or one
     * deploy that replaced the hashed filenames under an open page meant every
     * later call returned that same rejection — the page could not recover
     * without a reload. Reported by a consumer reading the code; this counts
     * the attempts, and before the fix it saw one.
     */
    vi.resetModules();
    let attempts = 0;
    vi.doMock('temporal-polyfill/full', async () => {
      attempts++;
      if (attempts === 1) throw new Error('chunk blocked');
      return await vi.importActual<object>('temporal-polyfill/full');
    });
    const fresh = await import('../src/lazy.js');

    await expect(fresh.loadTemporal()).rejects.toThrow();
    expect(attempts).toBe(1);
    // The caller learned it failed. The next one gets a second attempt.
    await expect(fresh.loadTemporal()).resolves.toBeUndefined();
    expect(attempts).toBe(2);
    expect(fresh.getMonthGrid(2026, 10, 1).length).toBe(6);
    vi.doUnmock('temporal-polyfill/full');
  });

  it('resolves immediately once Temporal is there', async () => {
    vi.resetModules();
    const fresh = await import('../src/lazy.js');
    await fresh.loadTemporal();
    const before = performance.now();
    await fresh.loadTemporal();
    // A microtask, not a fetch: no second import to wait for.
    expect(performance.now() - before).toBeLessThan(5);
  });
});
