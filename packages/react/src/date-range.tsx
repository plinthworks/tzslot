import { createDateRange, type DateRangeSettings, type DateRangeInstance } from '@tzslot/dom';
import { widgetComponent } from './component.js';

/**
 * Two days on a grid, with no field around it.
 *
 * Every setting keeps the name the dom package gives it, so the guide at
 * plinthworks.github.io/tzslot reads straight across. `onChange` is React's
 * word for the one the widget already used.
 *
 * Leave `value` out and the field keeps its own, which is what React calls
 * uncontrolled — nothing to turn on, because a prop that was not given is not
 * passed down.
 */
export type DateRangeProps = Partial<DateRangeSettings> & { className?: string | undefined };

export const DateRange = widgetComponent<DateRangeSettings, DateRangeInstance>(
  createDateRange as never,
  'DateRange',
);
