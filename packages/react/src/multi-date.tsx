import { createMultiDate, type MultiDateSettings, type MultiDateInstance } from '@tzslot/dom';
import { widgetComponent } from './component.js';

/**
 * Several days at once, each chosen separately.
 *
 * Every setting keeps the name the dom package gives it, so the guide at
 * plinthworks.github.io/tzslot reads straight across. `onChange` is React's
 * word for the one the widget already used.
 *
 * Leave `value` out and the field keeps its own, which is what React calls
 * uncontrolled — nothing to turn on, because a prop that was not given is not
 * passed down.
 */
export type MultiDateProps = Partial<MultiDateSettings> & { className?: string | undefined };

export const MultiDate = widgetComponent<MultiDateSettings, MultiDateInstance>(
  createMultiDate as never,
  'MultiDate',
);
