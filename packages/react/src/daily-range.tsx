import { createDailyRange, type DailyRangeSettings, type DailyRangeInstance } from '@tzslot/dom';
import { widgetComponent } from './component.js';

/**
 * The same hours on every day of a span — opening times, a shift pattern.
 *
 * Every setting keeps the name the dom package gives it, so the guide at
 * plinthworks.github.io/tzslot reads straight across. `onChange` is React's
 * word for the one the widget already used.
 *
 * Leave `value` out and the field keeps its own, which is what React calls
 * uncontrolled — nothing to turn on, because a prop that was not given is not
 * passed down.
 */
export type DailyRangeProps = Partial<DailyRangeSettings> & { className?: string | undefined };

export const DailyRange = widgetComponent<DailyRangeSettings, DailyRangeInstance>(
  createDailyRange as never,
  'DailyRange',
);
