/**
 * @ngx-zoneddatepicker/core — date and time primitives that know about
 * daylight saving.
 *
 * No DOM, no framework, no styling. Everything here is a pure function over
 * Temporal values, so it can be tested against real time zone rules rather
 * than mocked, and reused by any UI.
 */
export { Temporal, usingPolyfill } from './temporal.js';
export type { PlainDate, PlainTime, PlainDateTime, ZonedDateTime, Instant } from './temporal.js';
export { getDaySlots } from './slots.js';
export type { Slot, DaySlotsOptions } from './slots.js';
export { getMonthGrid, getWeekdayOrder } from './grid.js';
export type { Weekday } from './grid.js';
