import { createDateTimeField, type DateTimeFieldSettings, type DateTimeFieldInstance } from '@tzslot/dom';
import { widgetComponent } from './component.js';

/**
 * One moment: a day and a time on a chosen zone.
 *
 * Every setting keeps the name the dom package gives it, so the guide at
 * plinthworks.github.io/tzslot reads straight across. `onChange` is React's
 * word for the one the widget already used.
 *
 * Leave `value` out and the field keeps its own, which is what React calls
 * uncontrolled — nothing to turn on, because a prop that was not given is not
 * passed down.
 */
export type DateTimeFieldProps = Partial<DateTimeFieldSettings> & { className?: string | undefined };

export const DateTimeField = widgetComponent<DateTimeFieldSettings, DateTimeFieldInstance>(
  createDateTimeField as never,
  'DateTimeField',
);
