/**
 * @tzslot/ui — Angular components over the core.
 *
 * Angular CDK only; no Material, no design system. Structural class names and
 * CSS custom properties (--tz-*), so a consumer restyles without fighting
 * specificity.
 */
export { TimeSlotPicker } from './time-slot-picker.js';
export { TZSLOT_MESSAGES, provideTzslotMessages, EN, FR } from './messages.js';
export { TZSLOT_DEFAULTS, provideTzslot } from './defaults.js';
export { pairIn, pairOut } from './shapes.js';
export type { MomentPair } from './shapes.js';
export type { TzslotDefaults } from './defaults.js';
export type { TzslotMessages } from './messages.js';
export { Calendar } from './calendar.js';
export type { CalendarView } from './calendar.js';
export type {
  CalendarButton,
  CellRender,
  DayCellInfo,
  RenderCell,
} from '@tzslot/dom';
export { DateField } from './date-field.js';
export { DateTimeField } from './datetime-field.js';
export { RangeField } from './range-field.js';
export type { RangeFieldValue, RangePreset } from './range-field.js';
export { DateRange } from './date-range.js';
export { DateTimeRange } from './datetime-range.js';
export { DailyRange } from './daily-range.js';
export { MultiDate } from './multi-date.js';
export type { TimeLayout } from '@tzslot/dom';
export type { DailyRangeValue } from './daily-range.js';
export type { DateTimeRangeValue } from './datetime-range.js';
export type { DateRangeValue } from './date-range.js';
export type { FieldMode } from './date-field.js';
export type { SlotChoice } from './time-slot-picker.js';
