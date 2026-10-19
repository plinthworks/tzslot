import { createDateTimeRange, type DateTimeRangeSettings, type DateTimeRangeInstance } from '@tzslot/dom';
import { widgetComponent } from './component.js';

/**
 * Two moments, with an all-day switch of their own.
 *
 * Every setting keeps the name the dom package gives it, so the guide at
 * plinthworks.github.io/tzslot reads straight across. `onChange` is React's
 * word for the one the widget already used.
 *
 * Leave `value` out and the field keeps its own, which is what React calls
 * uncontrolled — nothing to turn on, because a prop that was not given is not
 * passed down.
 */
export type DateTimeRangeProps = Partial<DateTimeRangeSettings> & { className?: string | undefined };

export const DateTimeRange = widgetComponent<DateTimeRangeSettings, DateTimeRangeInstance>(
  createDateTimeRange as never,
  'DateTimeRange',
);
