/**
 * @tzslot/dom — the widgets themselves, in plain DOM.
 *
 * Everything a user sees and touches lives here: markup, keyboard, the words.
 * Framework packages (@tzslot/angular today) only translate their own idioms —
 * signals, forms, content projection — into calls on these functions, so a
 * behaviour fixed here is fixed everywhere.
 */
export { createCalendar } from './calendar.js';
export type {
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
export { EN, FR } from './messages.js';
export type { TzslotMessages } from './messages.js';
export { CALENDAR_CSS, FIELD_CSS } from './styles.js';
