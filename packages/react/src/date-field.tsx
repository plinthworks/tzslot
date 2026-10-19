import { createDateField, type DateFieldSettings, type DateFieldInstance } from '@tzslot/dom';
import { widgetComponent } from './component.js';

/**
 * One day, in a field that opens a calendar.
 *
 * Every setting keeps the name the dom package gives it, so the guide at
 * plinthworks.github.io/tzslot reads straight across. `onChange` is React's
 * word for the one the widget already used.
 *
 * Leave `value` out and the field keeps its own, which is what React calls
 * uncontrolled — nothing to turn on, because a prop that was not given is not
 * passed down.
 */
export type DateFieldProps = Partial<DateFieldSettings> & { className?: string | undefined };

export const DateField = widgetComponent<DateFieldSettings, DateFieldInstance>(
  createDateField as never,
  'DateField',
);
