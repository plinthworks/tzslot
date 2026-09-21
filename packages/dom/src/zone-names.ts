import { resolveWallTime } from '@tzslot/core';
import type { Instant } from '@tzslot/core';
import type { TzslotMessages } from './messages.js';

/**
 * What a zone calls itself at a given moment — "heure d'été d'Europe
 * centrale", "Central European Standard Time".
 *
 * An offset is exact and says nothing: nobody books a room at UTC+02:00. The
 * browser already carries these names in every language it speaks, so the
 * widgets ask it rather than shipping a list that would go stale.
 */
export function zoneName(
  instant: Instant,
  timeZone: string,
  locale: string | undefined,
  style: 'long' | 'short' = 'long',
): string {
  const parts = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: style }).formatToParts(
    new Date(instant.epochMilliseconds),
  );
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
}

/**
 * Which of two readings is summer time: the one whose clocks are further
 * ahead. True for both hemispheres — daylight saving is a summer arrangement
 * wherever it is used — and for the half-hour shifts as much as the whole.
 */
export function summerFirst(offsets: readonly string[]): boolean {
  const minutes = (offset: string) => {
    const match = /([+-])(\d{2}):(\d{2})/.exec(offset);
    if (!match) return 0;
    return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
  };
  return minutes(offsets[0] ?? '') >= minutes(offsets[1] ?? '');
}

/**
 * Summer and winter, in whichever order this pair of offsets puts them.
 *
 * Named, not numbered: "heure d'été" is something a person can answer,
 * "+02:00" is something they have to work out.
 */
export function seasonNames(
  offsets: readonly string[],
  messages: TzslotMessages,
): [string, string] {
  return summerFirst(offsets)
    ? [messages.summerTime, messages.winterTime]
    : [messages.winterTime, messages.summerTime];
}

/**
 * What to call a moment whose clock face happens twice that day — and null on
 * the other three hundred and sixty-three.
 *
 * Every widget that writes a time out has to be able to say this, or a field
 * reads 02:30 for two different moments and the reader cannot tell which they
 * chose.
 */
export function readingName(
  instant: Instant,
  timeZone: string,
  messages: TzslotMessages,
): string | null {
  const here = instant.toZonedDateTimeISO(timeZone);
  const found = resolveWallTime(here.toPlainDate(), here.toPlainTime(), timeZone);
  if (!found.exists || !found.ambiguous) return null;
  const index = found.offsets.indexOf(here.offset);
  return seasonNames(found.offsets, messages)[index < 0 ? 0 : index] ?? null;
}
