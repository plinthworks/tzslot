import { createCalendar, type CalendarSettings, type CalendarInstance } from '@tzslot/dom';
import { widgetComponent } from './component.js';

/**
 * A month grid on its own, with no field around it.
 *
 * Every setting keeps the name the dom package gives it, so the guide at
 * plinthworks.github.io/tzslot reads straight across. `onChange` is React's
 * word for the one the widget already used.
 *
 * Leave `value` out and the field keeps its own, which is what React calls
 * uncontrolled — nothing to turn on, because a prop that was not given is not
 * passed down.
 */
export type CalendarProps = Partial<CalendarSettings> & { className?: string | undefined };

export const Calendar = widgetComponent<CalendarSettings, CalendarInstance>(
  createCalendar as never,
  'Calendar',
);
