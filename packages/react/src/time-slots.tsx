import { createTimeSlots, type TimeSlotsSettings, type TimeSlotsInstance } from '@tzslot/dom';
import { widgetComponent } from './component.js';

/**
 * The day's times as a list, which is what a booking screen reads.
 *
 * Every setting keeps the name the dom package gives it, so the guide at
 * plinthworks.github.io/tzslot reads straight across. `onChange` is React's
 * word for the one the widget already used.
 *
 * Leave `value` out and the field keeps its own, which is what React calls
 * uncontrolled — nothing to turn on, because a prop that was not given is not
 * passed down.
 */
export type TimeSlotsProps = Partial<TimeSlotsSettings> & { className?: string | undefined };

export const TimeSlots = widgetComponent<TimeSlotsSettings, TimeSlotsInstance>(
  createTimeSlots as never,
  'TimeSlots',
);
