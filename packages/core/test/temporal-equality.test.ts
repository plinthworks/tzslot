import { describe, it, expect } from 'vitest';
import { Temporal } from '../src/temporal.js';

/**
 * `toEqual` can tell two Temporal values apart here — and the reason is an
 * accident worth writing down.
 *
 * A Temporal object keeps its state in internal slots, which structural
 * comparison cannot see: `expect({ at: Instant.from('2026…') }).toEqual({ at:
 * Instant.from('2027…') })` ought to pass, and in a minified build it does.
 * It fails here because the polyfill attaches a debug string, `_str_`, as a
 * real own property — and it attaches it only while the code is unminified.
 *
 * So every `toEqual` in this repo that happens to compare a Temporal value is
 * resting on a development-only side effect. This test is the alarm: if the
 * polyfill drops the string, or these tests are ever run against a built
 * bundle, this goes red and names the reason, instead of a hundred assertions
 * quietly starting to pass whatever they are given.
 *
 * Reported by a consumer measuring their own bundle, not found here.
 */
describe('comparing Temporal values in a test', () => {
  it('still tells two different instants apart', () => {
    expect(() =>
      expect({ at: Temporal.Instant.from('2026-01-01T00:00:00Z') }).toEqual({
        at: Temporal.Instant.from('2027-01-01T00:00:00Z'),
      }),
    ).toThrow();
  });

  it('and two different days', () => {
    expect(() =>
      expect([Temporal.PlainDate.from('2026-01-01')]).toEqual([
        Temporal.PlainDate.from('2027-01-01'),
      ]),
    ).toThrow();
  });

  it('because of a debug string, which is the part to remember', () => {
    const own = Object.getOwnPropertyNames(Temporal.Instant.from('2026-01-01T00:00:00Z'));
    expect(own).toContain('_str_');
    // If this ever stops being true, the two tests above are what break, and
    // the fix is to compare `.toString()` rather than the objects.
  });
});
