import { describe, it, expect } from 'vitest';
import { Temporal, getRangeInfo, isRangeProblem, formatDuration } from '../src/index.js';
import type { RangeInfo } from '../src/index.js';

/** An instant from a wall time in a zone, choosing the earlier reading. */
const at = (iso: string, zone: string) =>
  Temporal.PlainDateTime.from(iso).toZonedDateTime(zone, { disambiguation: 'earlier' }).toInstant();

const info = (from: string, to: string, zone: string): RangeInfo => {
  const result = getRangeInfo(at(from, zone), at(to, zone), zone);
  if (isRangeProblem(result)) throw new Error(result.kind);
  return result;
};

describe('an ordinary interval', () => {
  it('lasts as long as it looks', () => {
    const r = info('2026-06-15T09:00', '2026-06-15T17:30', 'Europe/Paris');
    expect(r.minutes).toBe(510);
    expect(r.wallMinutes).toBe(510);
    expect(r.crossesTransition).toBe(false);
    expect(r.shiftMinutes).toBe(0);
    expect(formatDuration(r.duration)).toBe('8h 30m');
  });

  it('works across midnight', () => {
    // A night shift: yesterday 23:30 to today 05:00.
    const r = info('2026-06-14T23:30', '2026-06-15T05:00', 'Europe/Paris');
    expect(r.minutes).toBe(330);
    expect(formatDuration(r.duration)).toBe('5h 30m');
    expect(r.crossesTransition).toBe(false);
  });
});

describe('the night the clocks go back', () => {
  it('lasts an hour longer than the clock faces say', () => {
    // 25 October 2026, Paris. 02:00 to 08:00 reads as six hours.
    const r = info('2026-10-25T02:00', '2026-10-25T08:00', 'Europe/Paris');

    expect(r.wallMinutes).toBe(360); // what a person expects
    expect(r.minutes).toBe(420); // what actually elapses
    expect(r.crossesTransition).toBe(true);
    expect(r.shiftMinutes).toBe(60);
    expect(r.startOffset).toBe('+02:00');
    expect(r.endOffset).toBe('+01:00');
    expect(formatDuration(r.duration)).toBe('7h');
  });

  it('a night shift across that morning is paid for seven hours, not six', () => {
    const r = info('2026-10-24T23:00', '2026-10-25T05:00', 'Europe/Paris');
    expect(r.wallMinutes).toBe(360);
    expect(r.minutes).toBe(420);
    // The whole reason this function exists: payroll runs on `minutes`, and
    // the roster was written in `wallMinutes`.
    expect(r.shiftMinutes).toBe(60);
  });
});

describe('the morning the clocks go forward', () => {
  it('lasts an hour less than the clock faces say', () => {
    const r = info('2026-03-29T01:00', '2026-03-29T07:00', 'Europe/Paris');
    expect(r.wallMinutes).toBe(360);
    expect(r.minutes).toBe(300);
    expect(r.crossesTransition).toBe(true);
    expect(r.shiftMinutes).toBe(-60);
    expect(formatDuration(r.duration)).toBe('5h');
  });

  it('Chicago, the same in its own week', () => {
    const r = info('2026-03-08T01:00', '2026-03-08T07:00', 'America/Chicago');
    expect(r.shiftMinutes).toBe(-60);
  });
});

describe('Lord Howe Island', () => {
  it('shifts by thirty minutes, not sixty', () => {
    const r = info('2026-10-04T01:00', '2026-10-04T07:00', 'Australia/Lord_Howe');
    expect(r.wallMinutes).toBe(360);
    expect(r.minutes).toBe(330);
    // Code that assumed an hour would report the wrong duration here, and it
    // would look plausible.
    expect(r.shiftMinutes).toBe(-30);
    expect(formatDuration(r.duration)).toBe('5h 30m');
  });
});

describe('intervals of several days', () => {
  it('counts the transition once, not once a day', () => {
    const r = info('2026-10-23T12:00', '2026-10-27T12:00', 'Europe/Paris');
    expect(r.wallMinutes).toBe(4 * 1440);
    expect(r.minutes).toBe(4 * 1440 + 60);
    expect(formatDuration(r.duration)).toBe('4d 1h');
  });

  it('a zone without daylight saving never shifts', () => {
    const r = info('2026-10-23T12:00', '2026-10-27T12:00', 'Asia/Tokyo');
    expect(r.crossesTransition).toBe(false);
    expect(r.minutes).toBe(r.wallMinutes);
  });
});

describe('arguments', () => {
  it('reports an end before its start rather than returning a negative', () => {
    const zone = 'Europe/Paris';
    const result = getRangeInfo(at('2026-06-15T17:00', zone), at('2026-06-15T09:00', zone), zone);
    expect(isRangeProblem(result)).toBe(true);
  });

  it('an interval of no length is zero, not a problem', () => {
    const r = info('2026-06-15T09:00', '2026-06-15T09:00', 'Europe/Paris');
    expect(r.minutes).toBe(0);
    expect(formatDuration(r.duration)).toBe('0m');
  });
});
