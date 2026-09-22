import { InjectionToken } from '@angular/core';
import type { ValueShape } from '@tzslot/core';
import type { TzslotMessages } from '@tzslot/dom';
import type { Weekday } from '@tzslot/core';
import { TZSLOT_MESSAGES } from './messages.js';

/**
 * The conventions an application settles once.
 *
 * A zone, a locale, the shape values leave in: these are decisions about the
 * application, not about the field. Repeating them on every tag is how one
 * screen ends up handing a `Date` to a back end that stores instants, and how
 * a reviewer has to read every template to find out which one.
 *
 * Anything set on a component still wins — this is the default, not the law.
 */
export interface TzslotDefaults {
  /**
   * What every component that holds a moment or a day hands to its form
   * control. `'utc'` is the useful one here: an instant, written as an ISO
   * string ending in Z, whatever the widget is. A date-only field gives the
   * midnight that opens that day in `timeZone`, so a back end that stores
   * instants gets one from it too.
   *
   * `<tz-daily-range>` is the exception, and not an oversight: its value is a
   * *pattern* — two days and two clock faces repeated over them — which is
   * not a moment and has no UTC form. It always hands out Temporal objects.
   */
  readonly valueAs?: ValueShape;
  /**
   * The IANA zone the screen is read in — and the one a day is turned into a
   * moment on. Components that take a `timeZone` of their own use this when
   * none is given.
   */
  readonly timeZone?: string;
  readonly locale?: string;
  readonly firstDayOfWeek?: Weekday;
  /** The words. The same thing `provideTzslotMessages` does, in one call. */
  readonly messages?: TzslotMessages;
}

export const TZSLOT_DEFAULTS = new InjectionToken<TzslotDefaults>('tzslot.defaults', {
  providedIn: 'root',
  factory: () => ({}),
});

/**
 * `providers: [provideTzslot({ valueAs: 'utc', timeZone: 'Europe/Paris' })]`
 *
 * In an application: `bootstrapApplication(App, { providers: [provideTzslot({ … })] })`.
 */
export function provideTzslot(defaults: TzslotDefaults) {
  const providers: { provide: unknown; useValue: unknown }[] = [
    { provide: TZSLOT_DEFAULTS, useValue: defaults },
  ];
  if (defaults.messages) providers.push({ provide: TZSLOT_MESSAGES, useValue: defaults.messages });
  return providers;
}
