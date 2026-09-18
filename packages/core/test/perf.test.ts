import { describe, it, expect } from 'vitest';
import { getDaySlots, getMonthGrid } from '../src/index.js';

/**
 * Measurements, not assertions about a machine.
 *
 * The thresholds are deliberately loose — a slow CI box should not fail a
 * build. What matters is the shape: a day of slots must stay in the low
 * milliseconds, because the component recomputes it on every input change,
 * and a picker that stutters when you change the time zone is a picker
 * nobody keeps.
 */
const time = (fn: () => unknown, runs: number): number => {
  fn();
  const start = performance.now();
  for (let i = 0; i < runs; i++) fn();
  return (performance.now() - start) / runs;
};

describe('cost of a call', () => {
  const report: string[] = [];

  it('a day of slots stays in the low milliseconds', () => {
    for (const step of [60, 30, 15, 5]) {
      const ms = time(() => getDaySlots('2026-06-15', 'Europe/Paris', { stepMinutes: step }), 100);
      report.push(`  ${String(1440 / step).padStart(3)} slots (${step} min): ${ms.toFixed(2)} ms`);
      expect(ms).toBeLessThan(50);
    }

    const dst = time(() => getDaySlots('2026-10-25', 'Europe/Paris', { stepMinutes: 30 }), 100);
    report.push(`  a day the clocks change:  ${dst.toFixed(2)} ms`);

    const grid = time(() => getMonthGrid(2026, 10, 1), 500);
    report.push(`  a month grid:             ${grid.toFixed(3)} ms`);

    console.log('\n' + report.join('\n'));
  });

  it('the day the clocks change costs no more than an ordinary one', () => {
    // The resolution logic falls into a catch on two slots out of 48. If that
    // were expensive, every DST day would feel different from every other.
    const ordinary = time(() => getDaySlots('2026-06-15', 'Europe/Paris', { stepMinutes: 30 }), 200);
    const changing = time(() => getDaySlots('2026-10-25', 'Europe/Paris', { stepMinutes: 30 }), 200);
    expect(changing).toBeLessThan(ordinary * 3);
  });
});

/**
 * Memory, measured only when a collection can be forced.
 *
 * Without --expose-gc these numbers are noise: the first version of this file
 * reported minus 2.6 MB for holding three thousand objects, because a sweep
 * happened mid-measurement. A test that prints a negative size is worse than
 * no test, so it now skips itself and says why rather than asserting on sand.
 */
const gc = (globalThis as { gc?: () => void }).gc;
const heap = () =>
  (globalThis as { process?: { memoryUsage(): { heapUsed: number } } }).process?.memoryUsage()
    .heapUsed ?? 0;

const settle = () => {
  gc?.();
  gc?.();
  return heap();
};

describe.skipIf(!gc)('memory', () => {
  it('a month of slots at 15 minutes is a sane amount of heap', () => {
    const before = settle();
    const kept = Array.from({ length: 31 }, (_, i) =>
      getDaySlots(`2026-10-${String(i + 1).padStart(2, '0')}`, 'Europe/Paris', { stepMinutes: 15 }),
    );
    const grown = (settle() - before) / 1048576;
    const slots = kept.flat().length;

    console.log(
      `\n  ${slots} slots held: ${grown.toFixed(2)} MB  (${((grown * 1024) / slots).toFixed(3)} kB each)`,
    );
    expect(grown).toBeGreaterThan(0);
    // A slot holds a PlainTime and up to two Instants. A kilobyte each would
    // mean something is retaining far more than it appears to.
    expect((grown * 1024) / slots).toBeLessThan(1);
  });

  it('discarded calls are collected, not accumulated', () => {
    for (let i = 0; i < 500; i++) getDaySlots('2026-10-25', 'Europe/Paris', { stepMinutes: 30 });
    const before = settle();
    for (let i = 0; i < 5000; i++) getDaySlots('2026-10-25', 'Europe/Paris', { stepMinutes: 30 });
    const after = settle();

    const drift = (after - before) / 1048576;
    console.log(`\n  5000 discarded calls, after collection: ${drift.toFixed(2)} MB retained`);
    // Nothing should survive: every object created is unreachable by the end.
    expect(drift).toBeLessThan(2);
  });
});

if (!gc) {
  console.log('\n  memory tests skipped — run with: npm run test:memory');
}
