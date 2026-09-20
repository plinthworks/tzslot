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

const words = (text: string) => text.split(/\s+/).filter(Boolean);

/**
 * The words that tell two zone names apart, with what they share taken off
 * both ends: of "Central European Summer Time" and "Central European Standard
 * Time" only "Summer" and "Standard" are left, which is the whole of the
 * difference and short enough for a menu.
 *
 * Names that share nothing, or everything, come back as they were.
 */
export function distinguish(first: string, second: string): [string, string] {
  const a = words(first);
  const b = words(second);
  if (a.length === 0 || b.length === 0 || first === second) return [first, second];

  let start = 0;
  while (start < a.length - 1 && start < b.length - 1 && a[start] === b[start]) start += 1;
  let end = 0;
  while (
    end < a.length - start - 1 &&
    end < b.length - start - 1 &&
    a[a.length - 1 - end] === b[b.length - 1 - end]
  ) {
    end += 1;
  }

  const cut = (list: string[]) => list.slice(start, list.length - end).join(' ');
  const [shortA, shortB] = [cut(a), cut(b)];
  return shortA && shortB && shortA !== shortB ? [shortA, shortB] : [first, second];
}
