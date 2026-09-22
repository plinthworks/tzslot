import { Temporal } from './temporal.js';
import type { PlainDate } from './temporal.js';

/** Monday through Sunday, as ISO-8601 numbers them. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * The six weeks a month calendar shows, including the days either side of it.
 *
 * Always six rows, never five or four. A grid that changes height between
 * months makes the page jump under the cursor while someone is aiming at a
 * date — the idea is Air Datepicker's `fixedHeight`, which is right often
 * enough to be the default rather than an option.
 *
 * There is no DST logic here on purpose. Which day it is does not depend on
 * whether the clocks changed that day; only what time it is does. Mixing the
 * two is what makes calendar code hard to read and easy to get wrong.
 */
export function getMonthGrid(
  year: number,
  month: number,
  firstDayOfWeek: Weekday = 1,
): PlainDate[][] {
  const first = Temporal.PlainDate.from({ year, month, day: 1 });

  // How many days of the previous month lead the grid. The +7 before the
  // modulo is what keeps this correct when the month starts before the chosen
  // first day of the week — without it the result goes negative.
  const lead = (first.dayOfWeek - firstDayOfWeek + 7) % 7;
  const start = first.subtract({ days: lead });

  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => start.add({ days: week * 7 + day })),
  );
}

/**
 * Where the week starts in a locale: Monday in France, Sunday in the United
 * States, Saturday in much of the Arab world.
 *
 * It is asked of `Intl`, like every other thing a locale decides, rather than
 * kept in a table here — a table of two hundred locales is a table that goes
 * out of date. Two spellings are in the wild: `getWeekInfo()` is the method
 * the specification settled on, `weekInfo` the getter shipped first, and Node
 * 22 still has only the getter while Chrome has only the method.
 *
 * Where neither exists — older Safari, older Firefox — the answer is Monday,
 * which is what ISO-8601 says and what the majority of the world uses. A
 * calendar is never wrong about which day a date falls on because of this;
 * only about which column it sits in.
 */
interface WeekInfo {
  readonly firstDay?: number;
}
/** Neither spelling is in TypeScript's lib for every target, so both are declared. */
interface LocaleWithWeekInfo {
  readonly getWeekInfo?: () => WeekInfo;
  readonly weekInfo?: WeekInfo;
}

export function firstDayFor(locale: string | undefined): Weekday {
  try {
    const tag = locale ?? new Intl.NumberFormat().resolvedOptions().locale;
    const resolved = new Intl.Locale(tag) as unknown as LocaleWithWeekInfo;
    const info = typeof resolved.getWeekInfo === 'function' ? resolved.getWeekInfo() : resolved.weekInfo;
    const first = info?.firstDay;
    return first !== undefined && first >= 1 && first <= 7 ? (first as Weekday) : 1;
  } catch {
    // An ill-formed tag reaches Intl.Locale as an exception, not a null.
    return 1;
  }
}

/** The weekday headings, in the order the grid will show them. */
export function getWeekdayOrder(firstDayOfWeek: Weekday = 1): Weekday[] {
  return Array.from({ length: 7 }, (_, i) => (((firstDayOfWeek - 1 + i) % 7) + 1) as Weekday);
}

/**
 * The twelve years a decade view shows: the ten of the decade, plus the last
 * year of the one before and the first of the one after.
 *
 * Twelve rather than ten so the grid is a rectangle — three rows of four —
 * and so the edges of the decade are reachable without navigating first, the
 * same reason a month grid shows the days either side of it.
 */
export function getDecadeYears(year: number): number[] {
  const first = Math.floor(year / 10) * 10;
  return Array.from({ length: 12 }, (_, i) => first - 1 + i);
}

/** True for the two cells a decade view shows from the neighbouring decades. */
export function isOutsideDecade(year: number, shownYear: number): boolean {
  const first = Math.floor(shownYear / 10) * 10;
  return year < first || year > first + 9;
}
