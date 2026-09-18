import { Temporal } from './temporal.js';
import type { Instant, PlainDate, PlainTime } from './temporal.js';

/**
 * One selectable time on a given day, and what the time zone does to it.
 *
 * Two of these three states are why this library exists. A picker built on
 * `Date` offers all of them identically and lets the user choose one that
 * cannot happen, or one that happens twice — and then stores whichever the
 * browser guessed.
 */
export interface Slot {
  /** The wall-clock time as a human reads it off a clock face. */
  readonly time: PlainTime;

  /**
   * False on the hour that a spring-forward skips. On 29 March 2026 in Paris,
   * 02:30 never happens: the clock goes from 01:59:59 to 03:00:00. Offering it
   * means accepting an appointment for a moment that will not occur.
   */
  readonly exists: boolean;

  /**
   * True on the hour an autumn-back repeats. On 25 October 2026 in Paris,
   * 02:30 happens twice, an hour apart. "02:30" alone does not identify an
   * instant, so a picker that returns only a wall time is returning a guess.
   */
  readonly ambiguous: boolean;

  /**
   * The UTC offsets this wall time maps to: one normally, two when ambiguous,
   * none when it does not exist. Showing them is how a user tells the two
   * 02:30s apart — "+02:00" is the one before the change, "+01:00" after.
   */
  readonly offsets: readonly string[];

  /**
   * The instants this wall time maps to, in order. This is what to store: an
   * instant is unambiguous everywhere and survives a change of time zone, a
   * change of DST rules, and being read back next year.
   */
  readonly instants: readonly Instant[];
}

export interface DaySlotsOptions {
  /** Minutes between slots. 30 gives 48 a day; 15 gives 96. */
  readonly stepMinutes?: number;
  /** Drop the slots that cannot happen instead of returning them flagged. */
  readonly skipNonExistent?: boolean;
}

/**
 * Resolves one wall time in one zone, saying which of the three cases it is.
 *
 * The method is deliberately not a try/catch around `disambiguation: 'reject'`
 * alone: reject throws for a gap *and* for an ambiguity, so catching it tells
 * you something is unusual but not what. Asking for both the earlier and the
 * later reading separates them — if the wall time survives the round trip, the
 * time exists twice; if it comes back shifted, it does not exist at all.
 */
function resolve(
  date: PlainDate,
  time: PlainTime,
  timeZone: string,
): { exists: boolean; ambiguous: boolean; offsets: string[]; instants: Instant[] } {
  const wall = date.toPlainDateTime(time);

  try {
    const unique = wall.toZonedDateTime(timeZone, { disambiguation: 'reject' });
    return {
      exists: true,
      ambiguous: false,
      offsets: [unique.offset],
      instants: [unique.toInstant()],
    };
  } catch {
    // Either a gap or a repetition; the two readings tell us which.
    const earlier = wall.toZonedDateTime(timeZone, { disambiguation: 'earlier' });
    const later = wall.toZonedDateTime(timeZone, { disambiguation: 'later' });

    // An ambiguous time keeps its face on both readings — the clock really did
    // show 02:30 twice. A skipped time comes back as something else entirely,
    // because there was no 02:30 to return.
    const keepsItsFace =
      earlier.hour === time.hour &&
      earlier.minute === time.minute &&
      earlier.second === time.second;

    if (keepsItsFace) {
      return {
        exists: true,
        ambiguous: true,
        offsets: [earlier.offset, later.offset],
        instants: [earlier.toInstant(), later.toInstant()],
      };
    }

    return { exists: false, ambiguous: false, offsets: [], instants: [] };
  }
}

/**
 * Every selectable time on one calendar day in one time zone.
 *
 * The day is walked in wall-clock steps rather than by adding a duration to an
 * instant, because that is what a person reading a clock does — and because
 * adding 24 hours to an instant lands on the wrong day twice a year. A day is
 * 23 or 25 hours long when the clocks change; the number of slots returned
 * changes with it, which is correct and is the whole point.
 */
export function getDaySlots(
  date: PlainDate | string,
  timeZone: string,
  options: DaySlotsOptions = {},
): Slot[] {
  const { stepMinutes = 30, skipNonExistent = false } = options;

  if (!Number.isInteger(stepMinutes) || stepMinutes <= 0 || stepMinutes > 1440) {
    throw new RangeError(`stepMinutes must be a whole number of minutes between 1 and 1440, got ${stepMinutes}`);
  }

  const day = typeof date === 'string' ? Temporal.PlainDate.from(date) : date;
  const slots: Slot[] = [];

  for (let minute = 0; minute < 1440; minute += stepMinutes) {
    const time = Temporal.PlainTime.from({
      hour: Math.floor(minute / 60),
      minute: minute % 60,
    });

    const resolved = resolve(day, time, timeZone);
    if (!resolved.exists && skipNonExistent) continue;

    slots.push({
      time,
      exists: resolved.exists,
      ambiguous: resolved.ambiguous,
      offsets: resolved.offsets,
      instants: resolved.instants,
    });
  }

  return slots;
}
