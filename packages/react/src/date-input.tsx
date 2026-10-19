import { createDateInput, type DateInputSettings, type DateInputInstance } from '@tzslot/dom';
import { widgetComponent } from './component.js';

/**
 * A day typed into a box, with no panel of its own.
 *
 * Every setting keeps the name the dom package gives it, so the guide at
 * plinthworks.github.io/tzslot reads straight across. `onChange` is React's
 * word for the one the widget already used.
 *
 * Leave `value` out and the field keeps its own, which is what React calls
 * uncontrolled — nothing to turn on, because a prop that was not given is not
 * passed down.
 */
export type DateInputProps = Partial<DateInputSettings> & { className?: string | undefined };

export const DateInput = widgetComponent<DateInputSettings, DateInputInstance>(
  createDateInput as never,
  'DateInput',
);
