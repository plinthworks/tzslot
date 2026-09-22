import { describe, it, expect } from 'vitest';
import { toPlainDate, formatDuration, Temporal } from '../src/index.js';

/**
 * The three shapes a string date arrives in, and they are not interchangeable.
 */
const paris = 'Europe/Paris';

describe('a string handed to a form control', () => {
  it('a wall time with no zone keeps the day written in it', () => {
    // What a Java or .NET back end sends, and what <input type="datetime-local">
    // holds. It used to be routed to Instant.from, which needs an offset, and
    // threw — on the documented interop path of three widgets.
    expect(toPlainDate('2026-06-15T10:00', paris).toString()).toBe('2026-06-15');
    expect(toPlainDate('2026-06-15T10:00:00', paris).toString()).toBe('2026-06-15');
    expect(toPlainDate('2026-06-15T10:00:00.250', paris).toString()).toBe('2026-06-15');
  });

  it('an instant is resolved through the zone, because its day depends on where you stand', () => {
    expect(toPlainDate('2026-01-01T00:30:00Z', paris).toString()).toBe('2026-01-01');
    expect(toPlainDate('2026-01-01T00:30:00Z', 'America/New_York').toString()).toBe('2025-12-31');
    expect(toPlainDate('2026-06-15T23:30:00+02:00', paris).toString()).toBe('2026-06-15');
  });

  it('a plain day is already a day', () => {
    expect(toPlainDate('2026-06-15', paris).toString()).toBe('2026-06-15');
  });
});

describe('a duration written out', () => {
  it('carries its sign once, at the front', () => {
    // "-1d 22h -30m" was three numbers, two of them wrong, and no reading of
    // it that means anything.
    expect(formatDuration(Temporal.Duration.from({ minutes: -90 }))).toBe('-1h 30m');
    expect(formatDuration(Temporal.Duration.from({ minutes: -90 }), { days: false })).toBe('-1h 30m');
    expect(formatDuration(Temporal.Duration.from({ hours: -30 }))).toBe('-1d 6h');
  });

  it('and a positive one is unchanged', () => {
    expect(formatDuration(Temporal.Duration.from({ minutes: 90 }))).toBe('1h 30m');
    expect(formatDuration(Temporal.Duration.from({ hours: 40 }), { days: false })).toBe('40h');
    expect(formatDuration(Temporal.Duration.from({ minutes: 0 }))).toBe('0m');
  });
});
