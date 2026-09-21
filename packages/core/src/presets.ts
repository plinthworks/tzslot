import { Temporal } from './temporal.js';
import type { PlainDate } from './temporal.js';
import type { Weekday } from './grid.js';

/** The ranges a search screen offers before anyone touches a calendar. */
export type PresetName =
  | 'today'
  | 'yesterday'
  | 'last7Days'
  | 'last14Days'
  | 'last30Days'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'nextQuarter'
  | 'next7Days'
  | 'next30Days'
  | 'thisYear';

/** Two days, both included — what a calendar highlights. */
export interface DayRange {
  readonly start: PlainDate;
  readonly end: PlainDate;
}

export interface PresetOptions {
  /** The day everything is counted from. */
  readonly today: PlainDate;
  /** Which day a week starts on, for the two week presets. */
  readonly firstDayOfWeek?: Weekday;
}

/**
 * What each named range means, in days.
 *
 * "The last 7 days" includes today: six days back and today itself, which is
 * what every analytics screen means by it and what a reader counting on their
 * fingers expects. Both ends are included; turning that into moments — and
 * into the midnight *after* the last day — is the widget's job, because only
 * it knows the zone.
 */
export function presetRange(name: PresetName, { today, firstDayOfWeek = 1 }: PresetOptions): DayRange {
  /**
   * Calendar quarters, counted from January. A fiscal year that starts in
   * April is a different thing and would need its own option; naming this one
   * 'quarter' and quietly meaning something else is how a report ends up off
   * by three months.
   */
  const quarter = (from: PlainDate, away: number): DayRange => {
    const first = from
      .with({ day: 1, month: from.month - ((from.month - 1) % 3) })
      .add({ months: away * 3 });
    return { start: first, end: first.add({ months: 3 }).subtract({ days: 1 }) };
  };
  const back = (days: number) => today.subtract({ days });
  const startOfWeek = (from: PlainDate) =>
    from.subtract({ days: (from.dayOfWeek - firstDayOfWeek + 7) % 7 });

  switch (name) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday':
      return { start: back(1), end: back(1) };
    case 'last7Days':
      return { start: back(6), end: today };
    case 'last14Days':
      return { start: back(13), end: today };
    case 'last30Days':
      return { start: back(29), end: today };
    case 'thisWeek': {
      const first = startOfWeek(today);
      return { start: first, end: first.add({ days: 6 }) };
    }
    case 'lastWeek': {
      const first = startOfWeek(today).subtract({ days: 7 });
      return { start: first, end: first.add({ days: 6 }) };
    }
    case 'thisMonth': {
      const first = today.with({ day: 1 });
      return { start: first, end: first.add({ months: 1 }).subtract({ days: 1 }) };
    }
    case 'lastMonth': {
      const first = today.with({ day: 1 }).subtract({ months: 1 });
      return { start: first, end: first.add({ months: 1 }).subtract({ days: 1 }) };
    }
    case 'thisQuarter':
      return quarter(today, 0);
    case 'lastQuarter':
      return quarter(today, -1);
    case 'nextQuarter':
      return quarter(today, 1);
    case 'next7Days':
      return { start: today, end: today.add({ days: 6 }) };
    case 'next30Days':
      return { start: today, end: today.add({ days: 29 }) };
    case 'thisYear': {
      const first = Temporal.PlainDate.from({ year: today.year, month: 1, day: 1 });
      return { start: first, end: Temporal.PlainDate.from({ year: today.year, month: 12, day: 31 }) };
    }
  }
}

/** True when a range is exactly what a preset means, so it can be ticked. */
export function matchesPreset(name: PresetName, range: DayRange, options: PresetOptions): boolean {
  const wanted = presetRange(name, options);
  return wanted.start.equals(range.start) && wanted.end.equals(range.end);
}
