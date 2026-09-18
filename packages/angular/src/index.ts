/**
 * @tzslot/ui — Angular components over the core.
 *
 * Angular CDK only; no Material, no design system. Structural class names and
 * CSS custom properties (--tz-*), so a consumer restyles without fighting
 * specificity.
 */
export { TimeSlotPicker } from './time-slot-picker.js';
export { TZSLOT_MESSAGES, provideTzslotMessages, EN, FR } from './messages.js';
export type { TzslotMessages } from './messages.js';
export { Calendar } from './calendar.js';
export type { CalendarView } from './calendar.js';
export { DateField } from './date-field.js';
export { DateRange } from './date-range.js';
export { DateTimeRange } from './datetime-range.js';
export type { DateTimeRangeValue } from './datetime-range.js';
export type { DateRangeValue } from './date-range.js';
export type { FieldMode } from './date-field.js';
export type { SlotChoice } from './time-slot-picker.js';
