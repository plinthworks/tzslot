import { describe, it, expect } from 'vitest';
import {
  Temporal,
  toPlainDate,
  fromPlainDate,
  toInstant,
  fromInstant,
} from '../src/index.js';

describe('a Date coming in', () => {
  it('becomes the day it fell on, in the zone given', () => {
    // 00:30 UTC on New Year's Day: already the 1st in Paris, still the 31st in
    // New York. There is no correct default here, which is why the zone is
    // required rather than guessed.
    const instant = new Date('2026-01-01T00:30:00Z');
    expect(toPlainDate(instant, 'Europe/Paris').toString()).toBe('2026-01-01');
    expect(toPlainDate(instant, 'America/New_York').toString()).toBe('2025-12-31');
  });

  it('a plain date string is taken as written, not resolved through a zone', () => {
    // '2026-06-15' is already a calendar day. Putting it through a zone would
    // move it for half the world.
    for (const zone of ['Pacific/Kiritimati', 'Pacific/Niue']) {
      expect(toPlainDate('2026-06-15', zone).toString()).toBe('2026-06-15');
    }
  });

  it('an ISO instant string is resolved through the zone', () => {
    expect(toPlainDate('2026-01-01T00:30:00Z', 'America/New_York').toString()).toBe('2025-12-31');
  });

  it('a PlainDate passes through untouched', () => {
    const day = Temporal.PlainDate.from('2026-06-15');
    expect(toPlainDate(day, 'Europe/Paris')).toBe(day);
  });
});

describe('a day going out', () => {
  const day = Temporal.PlainDate.from('2026-06-15');

  it('as Temporal, as an ISO string, or as a Date at midnight in the zone', () => {
    expect(fromPlainDate(day, 'temporal', 'Europe/Paris')).toBe(day);
    expect(fromPlainDate(day, 'iso', 'Europe/Paris')).toBe('2026-06-15');

    const asDate = fromPlainDate(day, 'date', 'Europe/Paris') as Date;
    expect(asDate.toISOString()).toBe('2026-06-14T22:00:00.000Z'); // midnight in Paris
  });

  it('round-trips through a Date without moving the day', () => {
    for (const zone of ['Europe/Paris', 'America/Chicago', 'Pacific/Kiritimati', 'Pacific/Niue']) {
      const out = fromPlainDate(day, 'date', zone) as Date;
      expect(toPlainDate(out, zone).toString(), zone).toBe('2026-06-15');
    }
  });

  it('null stays null in every shape', () => {
    for (const shape of ['temporal', 'iso', 'date'] as const) {
      expect(fromPlainDate(null, shape, 'Europe/Paris')).toBeNull();
    }
  });
});

describe('instants', () => {
  it('accept a Date, a number, a string or an Instant', () => {
    const iso = '2026-10-25T00:30:00Z';
    const expected = Temporal.Instant.from(iso);

    expect(toInstant(new Date(iso)).equals(expected)).toBe(true);
    expect(toInstant(expected.epochMilliseconds).equals(expected)).toBe(true);
    expect(toInstant(iso).equals(expected)).toBe(true);
    expect(toInstant(expected)).toBe(expected);
  });

  it('come back as whatever was asked for', () => {
    const instant = Temporal.Instant.from('2026-10-25T00:30:00Z');

    expect(fromInstant(instant, 'temporal')).toBe(instant);
    expect(fromInstant(instant, 'iso')).toBe('2026-10-25T00:30:00Z');
    expect((fromInstant(instant, 'date') as Date).getTime()).toBe(instant.epochMilliseconds);
  });

  it('survive a round trip through a Date, which is what migration relies on', () => {
    // The ambiguous 02:30 in Paris. A Date keeps the instant exactly, so the
    // reading that was chosen is not lost on the way through old code.
    const both = Temporal.PlainDateTime.from('2026-10-25T02:30');
    const first = both.toZonedDateTime('Europe/Paris', { disambiguation: 'earlier' }).toInstant();
    const second = both.toZonedDateTime('Europe/Paris', { disambiguation: 'later' }).toInstant();

    const backFirst = toInstant(fromInstant(first, 'date') as Date);
    const backSecond = toInstant(fromInstant(second, 'date') as Date);

    expect(backFirst.equals(first)).toBe(true);
    expect(backSecond.equals(second)).toBe(true);
    expect(backFirst.equals(backSecond)).toBe(false);
  });
});
