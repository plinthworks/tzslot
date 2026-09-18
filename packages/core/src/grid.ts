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

/** The weekday headings, in the order the grid will show them. */
export function getWeekdayOrder(firstDayOfWeek: Weekday = 1): Weekday[] {
  return Array.from({ length: 7 }, (_, i) => (((firstDayOfWeek - 1 + i) % 7) + 1) as Weekday);
}
