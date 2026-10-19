import { createTimeSelect, type TimeSelectSettings, type TimeSelectInstance } from '@tzslot/dom';
import { widgetComponent } from './component.js';

/**
 * A time in two menus, hour and minute.
 *
 * Every setting keeps the name the dom package gives it, so the guide at
 * plinthworks.github.io/tzslot reads straight across. `onChange` is React's
 * word for the one the widget already used.
 *
 * Leave `value` out and the field keeps its own, which is what React calls
 * uncontrolled — nothing to turn on, because a prop that was not given is not
 * passed down.
 */
export type TimeSelectProps = Partial<TimeSelectSettings> & { className?: string | undefined };

export const TimeSelect = widgetComponent<TimeSelectSettings, TimeSelectInstance>(
  createTimeSelect as never,
  'TimeSelect',
);
