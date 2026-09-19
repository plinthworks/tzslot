/**
 * @tzslot/dom — the widgets themselves, in plain DOM.
 *
 * Everything a user sees and touches lives here: markup, keyboard, the words.
 * Framework packages (@tzslot/angular today) only translate their own idioms —
 * signals, forms, content projection — into calls on these functions, so a
 * behaviour fixed here is fixed everywhere.
 */
export { createCalendar } from './calendar.js';
export type { DayCellInfo, CellRender, RenderCell } from './cells.js';
export type {
  CalendarButton,
  CalendarIcons,
  CalendarInstance,
  CalendarOptions,
  CalendarSettings,
  CalendarView,
  YearMonth,
} from './calendar.js';
export { createDateField } from './date-field.js';
export type {
  DateFieldInstance,
  DateFieldOptions,
  DateFieldSettings,
  FieldMode,
} from './date-field.js';
export { createTimeSlots, getSlotChoices } from './time-slots.js';
export type {
  SlotChoice,
  TimeSlotsInstance,
  TimeSlotsOptions,
  TimeSlotsSettings,
} from './time-slots.js';
export { createDateRange } from './date-range.js';
export type {
  DateRangeInstance,
  DateRangeOptions,
  DateRangeSettings,
  DateRangeValue,
} from './date-range.js';
export { createDateTimeRange } from './datetime-range.js';
export type {
  DateTimeRangeInstance,
  DateTimeRangeOptions,
  DateTimeRangeSettings,
  DateTimeRangeValue,
} from './datetime-range.js';
export { createDailyRange } from './daily-range.js';
export type {
  DailyRangeInstance,
  DailyRangeOptions,
  DailyRangeSettings,
  DailyRangeValue,
} from './daily-range.js';
export { EN, FR } from './messages.js';
export type { TzslotMessages } from './messages.js';
export { CALENDAR_CSS, FIELD_CSS, SLOTS_CSS, RANGE_CSS, DTR_CSS, DAILY_CSS } from './styles.js';
