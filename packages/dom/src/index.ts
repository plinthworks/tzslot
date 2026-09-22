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
export { formatWith, parseWith, patternFor, maskWith } from './format.js';
// readingName and seasonNames are what the widgets use to write "(été)" after
// a repeated hour; without them a consumer's own displayWith could not say the
// same thing the field says.
export { zoneName, summerFirst, readingName, seasonNames } from './zone-names.js';
export { createTimeSelect } from './time-select.js';
export type {
  TimeSelectInstance,
  TimeSelectOptions,
  TimeSelectSettings,
} from './time-select.js';
export { createTimeInput } from './time-input.js';
export type { TimeInputInstance, TimeInputOptions, TimeInputSettings } from './time-input.js';
export { createMultiDate } from './multi-date.js';
export type { MultiDateInstance, MultiDateOptions, MultiDateSettings } from './multi-date.js';
export { icon } from './icons.js';
export type { IconName } from './icons.js';
export { createDateInput } from './date-input.js';
export type {
  DateInputOptions,
  DateInputSettings,
  DateInputInstance,
  WallValue,
} from './date-input.js';
export { createRangeField } from './range-field.js';
export type {
  RangeFieldInstance,
  RangeFieldOptions,
  RangeFieldSettings,
  RangeFieldValue,
  RangePreset,
} from './range-field.js';
export { createDateTimeField } from './datetime-field.js';
export type {
  DateTimeFieldInstance,
  DateTimeFieldOptions,
  DateTimeFieldSettings,
} from './datetime-field.js';
export { createDailyRange } from './daily-range.js';
export type {
  TimeLayout,
  DailyRangeInstance,
  DailyRangeOptions,
  DailyRangeSettings,
  DailyRangeValue,
} from './daily-range.js';
export { EN, FR } from './messages.js';
export type { TzslotMessages } from './messages.js';
export {
  CALENDAR_CSS,
  FIELD_CSS,
  SLOTS_CSS,
  RANGE_CSS,
  DTR_CSS,
  DAILY_CSS,
  TIME_CSS,
  TIMESELECT_CSS,
  RANGEFIELD_CSS,
  DATETIME_CSS,
  // The period field's two date fields are styled by this one, and it was the
  // only sheet left out: under a Content-Security-Policy that forbids inline
  // styles, `injectStyles: false` left that panel bare with no way to dress it.
  DATEINPUT_CSS,
} from './styles.js';
