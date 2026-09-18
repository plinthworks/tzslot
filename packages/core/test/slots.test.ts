import { describe, it, expect } from 'vitest';
import { Temporal, getDaySlots } from '../src/index.js';

/**
 * These run against real IANA rules, not fixtures.
 *
 * Every date below is a day the clocks actually change somewhere, chosen so
 * that a mistake in the resolution logic cannot pass: three different zones,
 * both directions, and one zone that moves by half an hour rather than a whole
 * one — because code that assumes an hour is code that breaks on Lord Howe.
 */

const at = (slots: ReturnType<typeof getDaySlots>, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const found = slots.find((s) => s.time.hour === h && s.time.minute === m);
  if (!found) throw new Error(`no slot at ${hhmm} — the day has ${slots.length} slots`);
  return found;
};

describe('spring forward — the hour that does not happen', () => {
  // Last Sunday of March: 02:00 becomes 03:00.
  it('Europe/Paris, 29 March 2026', () => {
    const slots = getDaySlots('2026-03-29', 'Europe/Paris', { stepMinutes: 30 });

    expect(at(slots, '02:00').exists).toBe(false);
    expect(at(slots, '02:30').exists).toBe(false);
    expect(at(slots, '01:30').exists).toBe(true);
    expect(at(slots, '03:00').exists).toBe(true);

    // A missing hour has no instant to store, which is the point.
    expect(at(slots, '02:00').instants).toHaveLength(0);
    expect(at(slots, '02:00').offsets).toHaveLength(0);
  });

  // Second Sunday of March.
  it('America/Chicago, 8 March 2026', () => {
    const slots = getDaySlots('2026-03-08', 'America/Chicago', { stepMinutes: 30 });

    expect(at(slots, '02:00').exists).toBe(false);
    expect(at(slots, '02:30').exists).toBe(false);
    expect(at(slots, '03:00').exists).toBe(true);
  });

  // First Sunday of October, and the gap is THIRTY minutes, not sixty.
  it('Australia/Lord_Howe, 4 October 2026 — a half-hour gap', () => {
    const slots = getDaySlots('2026-10-04', 'Australia/Lord_Howe', { stepMinutes: 15 });

    expect(at(slots, '02:00').exists).toBe(false);
    expect(at(slots, '02:15').exists).toBe(false);
    // 02:30 exists: the gap closed. Code that assumed an hour would call this
    // missing too, and refuse a perfectly valid appointment.
    expect(at(slots, '02:30').exists).toBe(true);
    expect(at(slots, '01:45').exists).toBe(true);
  });

  it('skipNonExistent leaves the impossible times out', () => {
    const kept = getDaySlots('2026-03-29', 'Europe/Paris', { stepMinutes: 30 });
    const dropped = getDaySlots('2026-03-29', 'Europe/Paris', {
      stepMinutes: 30,
      skipNonExistent: true,
    });

    expect(kept).toHaveLength(48);
    expect(dropped).toHaveLength(46); // the 23-hour day
    expect(dropped.every((s) => s.exists)).toBe(true);
  });
});

describe('autumn back — the hour that happens twice', () => {
  it('Europe/Paris, 25 October 2026', () => {
    const slots = getDaySlots('2026-10-25', 'Europe/Paris', { stepMinutes: 30 });
    const repeated = at(slots, '02:30');

    expect(repeated.exists).toBe(true);
    expect(repeated.ambiguous).toBe(true);

    // Both readings are offered, and they are distinguishable — which is what
    // lets a user say which 02:30 they meant.
    expect(repeated.offsets).toEqual(['+02:00', '+01:00']);
    expect(repeated.instants).toHaveLength(2);

    // An hour apart, and in order.
    const [first, second] = repeated.instants;
    expect(second!.epochMilliseconds - first!.epochMilliseconds).toBe(3_600_000);

    // The hours either side are ordinary.
    expect(at(slots, '01:30').ambiguous).toBe(false);
    expect(at(slots, '03:30').ambiguous).toBe(false);
  });

  it('America/Chicago, 1 November 2026', () => {
    const slots = getDaySlots('2026-11-01', 'America/Chicago', { stepMinutes: 30 });
    const repeated = at(slots, '01:30');

    expect(repeated.ambiguous).toBe(true);
    expect(repeated.offsets).toEqual(['-05:00', '-06:00']);
  });

  it('Australia/Lord_Howe, 5 April 2026 — repeats for half an hour only', () => {
    const slots = getDaySlots('2026-04-05', 'Australia/Lord_Howe', { stepMinutes: 15 });
    const repeated = at(slots, '01:45');

    expect(repeated.ambiguous).toBe(true);
    expect(repeated.instants).toHaveLength(2);

    // Thirty minutes apart, not sixty.
    const [first, second] = repeated.instants;
    expect(second!.epochMilliseconds - first!.epochMilliseconds).toBe(1_800_000);
  });
});

describe('ordinary days are ordinary', () => {
  it('every slot exists exactly once', () => {
    const slots = getDaySlots('2026-06-15', 'Europe/Paris', { stepMinutes: 30 });

    expect(slots).toHaveLength(48);
    expect(slots.every((s) => s.exists && !s.ambiguous)).toBe(true);
    expect(slots.every((s) => s.instants.length === 1)).toBe(true);
    expect(new Set(slots.map((s) => s.offsets[0])).size).toBe(1);
  });

  it('a zone without daylight saving never flags anything', () => {
    for (const day of ['2026-03-29', '2026-10-25', '2026-06-15']) {
      const slots = getDaySlots(day, 'Asia/Tokyo', { stepMinutes: 60 });
      expect(slots).toHaveLength(24);
      expect(slots.every((s) => s.exists && !s.ambiguous)).toBe(true);
    }
  });
});

describe('storing and reading back', () => {
  /**
   * The round trip the spec asks for: keep an instant, not a wall time. An
   * instant read back in its original zone gives the same clock face; the same
   * instant read in another zone gives that zone's — which is the behaviour a
   * calendar needs and `Date` cannot express.
   */
  it('an instant survives storage and a change of zone', () => {
    const slots = getDaySlots('2026-10-25', 'Europe/Paris', { stepMinutes: 30 });
    const [firstReading] = at(slots, '02:30').instants;

    const stored = firstReading!.toString(); // what goes in the database
    const restored = Temporal.Instant.from(stored);

    expect(restored.toZonedDateTimeISO('Europe/Paris').toPlainTime().toString()).toBe('02:30:00');
    expect(restored.toZonedDateTimeISO('UTC').toPlainTime().toString()).toBe('00:30:00');
  });

  it('the two readings of an ambiguous time stay different after a round trip', () => {
    const [a, b] = at(
      getDaySlots('2026-10-25', 'Europe/Paris', { stepMinutes: 30 }),
      '02:30',
    ).instants;

    const back = [a!.toString(), b!.toString()].map((s) => Temporal.Instant.from(s));
    expect(back[0]!.equals(back[1]!)).toBe(false);
    expect(back[0]!.toString()).toBe(a!.toString());
  });
});

describe('arguments', () => {
  it('rejects a step that is not a usable number of minutes', () => {
    for (const bad of [0, -15, 7.5, 1441]) {
      expect(() => getDaySlots('2026-06-15', 'Europe/Paris', { stepMinutes: bad })).toThrow(
        RangeError,
      );
    }
  });

  it('accepts a PlainDate as readily as a string', () => {
    const fromString = getDaySlots('2026-06-15', 'Europe/Paris', { stepMinutes: 60 });
    const fromDate = getDaySlots(Temporal.PlainDate.from('2026-06-15'), 'Europe/Paris', {
      stepMinutes: 60,
    });
    expect(fromDate.map((s) => s.time.toString())).toEqual(fromString.map((s) => s.time.toString()));
  });
});

describe('opening hours', () => {
  it('bounds omit the slots outside them', () => {
    const slots = getDaySlots('2026-06-15', 'Europe/Paris', {
      stepMinutes: 60,
      minTime: '09:00',
      maxTime: '17:00',
    });

    expect(slots).toHaveLength(9); // 09:00 through 17:00, both ends included
    expect(slots[0]!.time.toString({ smallestUnit: 'minute' })).toBe('09:00');
    expect(slots.at(-1)!.time.toString({ smallestUnit: 'minute' })).toBe('17:00');
  });

  it('takes a PlainTime as readily as a string', () => {
    const fromString = getDaySlots('2026-06-15', 'Europe/Paris', { stepMinutes: 60, minTime: '09:00' });
    const fromTime = getDaySlots('2026-06-15', 'Europe/Paris', {
      stepMinutes: 60,
      minTime: Temporal.PlainTime.from('09:00'),
    });
    expect(fromTime).toHaveLength(fromString.length);
  });

  it('still reports the skipped hour when it falls inside the bounds', () => {
    // Chicago springs forward at 02:00; a night shift running 01:00 to 05:00
    // needs to be told, not quietly handed a shorter list.
    const slots = getDaySlots('2026-03-08', 'America/Chicago', {
      stepMinutes: 60,
      minTime: '01:00',
      maxTime: '05:00',
    });
    expect(at(slots, '02:00').exists).toBe(false);
  });
});

describe('slots ruled out by the caller', () => {
  it('flags without removing', () => {
    const slots = getDaySlots('2026-06-15', 'Europe/Paris', {
      stepMinutes: 60,
      isDisabled: (slot) => slot.time.hour === 13, // lunch
    });

    expect(slots).toHaveLength(24);
    expect(at(slots, '13:00').disabled).toBe(true);
    expect(at(slots, '13:00').exists).toBe(true); // it happens; it is just taken
    expect(at(slots, '12:00').disabled).toBe(false);
  });

  it('is given the instants, so a caller can match its own bookings', () => {
    const taken = new Set(['2026-06-15T08:00:00Z']);
    const slots = getDaySlots('2026-06-15', 'Europe/Paris', {
      stepMinutes: 60,
      isDisabled: (slot) => slot.instants.some((i) => taken.has(i.toString())),
    });

    // 10:00 in Paris in June is 08:00 UTC.
    expect(at(slots, '10:00').disabled).toBe(true);
    expect(at(slots, '11:00').disabled).toBe(false);
  });

  it('is never asked about a time that cannot happen', () => {
    const asked: string[] = [];
    getDaySlots('2026-03-29', 'Europe/Paris', {
      stepMinutes: 30,
      isDisabled: (slot) => {
        asked.push(slot.time.toString({ smallestUnit: 'minute' }));
        return false;
      },
    });

    // Ruling out a moment that does not occur is not a decision anyone can make.
    expect(asked).not.toContain('02:00');
    expect(asked).not.toContain('02:30');
    expect(asked).toContain('03:00');
  });

  it('every slot carries the flag, disabled or not', () => {
    const slots = getDaySlots('2026-06-15', 'Europe/Paris', { stepMinutes: 60 });
    expect(slots.every((s) => s.disabled === false)).toBe(true);
  });
});
