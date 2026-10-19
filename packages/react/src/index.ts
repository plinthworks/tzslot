/**
 * React components for tzslot.
 *
 * Twelve widgets, one wrapper each, all built from the same factory: the hard
 * parts of putting an imperative widget inside React are identical every time,
 * and a copy of them is a place for them to drift apart.
 */
export { Calendar, type CalendarProps } from './calendar.js';
export { DailyRange, type DailyRangeProps } from './daily-range.js';
export { DateField, type DateFieldProps } from './date-field.js';
export { DateInput, type DateInputProps } from './date-input.js';
export { DateRange, type DateRangeProps } from './date-range.js';
export { DateTimeField, type DateTimeFieldProps } from './datetime-field.js';
export { DateTimeRange, type DateTimeRangeProps } from './datetime-range.js';
export { MultiDate, type MultiDateProps } from './multi-date.js';
export { RangeField, type RangeFieldProps } from './range-field.js';
export { TimeInput, type TimeInputProps } from './time-input.js';
export { TimeSelect, type TimeSelectProps } from './time-select.js';
export { TimeSlots, type TimeSlotsProps } from './time-slots.js';

export { widgetComponent } from './component.js';
export { useWidget, type Widget } from './use-widget.js';
