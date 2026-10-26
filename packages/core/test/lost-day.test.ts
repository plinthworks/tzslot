import { describe, it, expect } from 'vitest';
import { Temporal, resolveWallTime, getDaySlots } from '../src/index.js';

/**
 * A day a zone skipped entirely, and the ordinary cases beside it.
 *
 * Samoa went from 29 December 2011 straight to the 31st, moving across the
 * date line: the 30th never happened there. Asked for 09:00 on it,
 * `resolveWallTime` answered `exists: true, ambiguous: true` with two moments
 * forty-eight hours apart — 09:00 on the 29th and 09:00 on the 31st. A field
 * offering that day would have handed back a moment on the 29th.
 *
 * `keepsItsFace` compared the clock face and not the date, so both readings
 * passed: they really were 09:00, just not on the day asked for. Reported by a
 * consumer whose own sweep compared our answers against Temporal's.
 *
 * The ordinary cases are here too, because a fix that narrows a predicate can
 * narrow it too far: an hour that happens twice must still be ambiguous, and
 * one that does not happen must still be absent.
 */

const apia = 'Pacific/Apia';
const paris = 'Europe/Paris';
const at = (date: string, time: string, zone: string) =>
  resolveWallTime(Temporal.PlainDate.from(date), Temporal.PlainTime.from(time), zone);

describe('a day the zone never had', () => {
  it('does not exist, and is not ambiguous', () => {
    const lost = at('2011-12-30', '09:00', apia);
    expect(lost.exists).toBe(false);
    expect(lost.ambiguous).toBe(false);
    expect(lost.offsets).toEqual([]);
    expect(lost.instants).toEqual([]);
  });

  it('at every hour of it, not only the one that was reported', () => {
    for (let hour = 0; hour < 24; hour++) {
      const reading = at('2011-12-30', `${String(hour).padStart(2, '0')}:00`, apia);
      expect(reading.exists, `${hour}:00 on a day that did not happen`).toBe(false);
    }
  });

  it('and the days either side of it are ordinary', () => {
    expect(at('2011-12-29', '09:00', apia).exists).toBe(true);
    expect(at('2011-12-29', '09:00', apia).ambiguous).toBe(false);
    expect(at('2011-12-31', '09:00', apia).exists).toBe(true);
    expect(at('2011-12-31', '09:00', apia).ambiguous).toBe(false);
  });

  it('so a field offering that day offers nothing on it', () => {
    const slots = getDaySlots('2011-12-30', apia, { stepMinutes: 60 });
    expect(slots.every((slot) => !slot.exists)).toBe(true);
  });
});

describe('the ordinary readings, unchanged', () => {
  it('an hour that happens twice is still ambiguous', () => {
    const twice = at('2026-10-25', '02:30', paris);
    expect(twice.exists).toBe(true);
    expect(twice.ambiguous).toBe(true);
    expect(twice.offsets).toEqual(['+02:00', '+01:00']);
    expect(twice.instants).toHaveLength(2);
  });

  it('an hour that does not happen is still absent', () => {
    const never = at('2026-03-29', '02:30', paris);
    expect(never.exists).toBe(false);
    expect(never.instants).toEqual([]);
  });

  it('an ordinary afternoon is one moment', () => {
    const plain = at('2026-06-15', '14:00', paris);
    expect(plain.exists).toBe(true);
    expect(plain.ambiguous).toBe(false);
    expect(plain.instants).toHaveLength(1);
  });

  it('and a zone whose change is half an hour still reads twice', () => {
    // Lord Howe moves by thirty minutes, not an hour: 01:45 on 5 April 2026
    // happens twice there, and the two readings are on the same day.
    const lord = at('2026-04-05', '01:45', 'Australia/Lord_Howe');
    expect(lord.exists).toBe(true);
    expect(lord.ambiguous).toBe(true);
    expect(lord.instants).toHaveLength(2);
  });
});
