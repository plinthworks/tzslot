import { Temporal } from '@tzslot/core';
import type { PlainDate } from '@tzslot/core';
import {
  mountGrid,
  type CalendarOptions,
  type GridInstance,
  type GridSettings,
  type SelectionMode,
} from './calendar.js';

export type MultiDateSettings = GridSettings<readonly PlainDate[]>;

export interface MultiDateOptions extends Partial<MultiDateSettings>, Pick<CalendarOptions, 'icons' | 'injectStyles'> {}

export type MultiDateInstance = GridInstance<readonly PlainDate[]>;

const sorted = (dates: readonly PlainDate[]) => [...dates].sort(Temporal.PlainDate.compare);
const has = (dates: readonly PlainDate[], date: PlainDate) => dates.some((d) => d.equals(date));
const isFull = (dates: readonly PlainDate[], max: number | undefined) =>
  max !== undefined && dates.length >= max;

const MULTIPLE: SelectionMode<readonly PlainDate[]> = {
  empty: [],
  multiple: true,
  dates: (value) => value,
  // A click toggles. Past maxDates, a new day is refused, not swapped in: a
  // choice that silently drops an earlier one is a choice the user did not make.
  pick: (value, date, s) =>
    has(value, date)
      ? value.filter((d) => !d.equals(date))
      : isFull(value, s.maxDates)
        ? value
        : sorted([...value, date]),
  // Today adds today; it never takes it away.
  today: (value, date, s) => (has(value, date) || isFull(value, s.maxDates) ? value : sorted([...value, date])),
  full: (value, s) => isFull(value, s.maxDates),
};

/**
 * Several days, not necessarily next to each other: the sessions of a course,
 * the days someone is on call, the dates a venue is wanted.
 *
 * The same grid as the calendar — keyboard, month and year views, renderCell,
 * Today and Clear — with a click that toggles a day in and out. The value is
 * always in date order. With maxDates, the unchosen days stop taking clicks
 * once it is reached, and free up again as soon as one is removed.
 */
export function createMultiDate(host: HTMLElement, options: MultiDateOptions = {}): MultiDateInstance {
  return mountGrid(host, { ...options, value: sorted(options.value ?? []) }, MULTIPLE);
}
