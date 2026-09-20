import type { Instant } from '@tzslot/core';

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
