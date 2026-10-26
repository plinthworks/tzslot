import { CSP_NONCE, ENVIRONMENT_INITIALIZER, InjectionToken, inject } from '@angular/core';
import type { ValueShape } from '@tzslot/core';
import type { TzslotMessages } from '@tzslot/dom';
import { setStyleNonce } from '@tzslot/dom';
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
  const providers: { provide: unknown; useValue: unknown; multi?: boolean }[] = [
    { provide: TZSLOT_DEFAULTS, useValue: defaults },
    /*
     * Angular's own nonce, handed to the library that needs it.
     *
     * Under a Content-Security-Policy that forbids inline styles, every sheet
     * a widget injects is blocked and the widget comes up undressed — seven
     * sheets for one period panel, reported by a consumer who was injecting
     * all eleven themselves to get one attribute onto them.
     *
     * An application under such a policy already provides `CSP_NONCE`, because
     * Angular needs it for its own styles. So there is nothing to write: this
     * reads it and tells the dom package, before any component is built.
     *
     * `ENVIRONMENT_INITIALIZER` rather than `provideEnvironmentInitializer`,
     * which arrived in Angular 19 and would drop support for 18.
     */
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        const nonce = inject(CSP_NONCE, { optional: true });
        // Only when there is one. Clearing it otherwise would undo a
        // `setStyleNonce` an application made by hand before bootstrapping.
        if (nonce) setStyleNonce(nonce);
      },
    },
  ];
  if (defaults.messages) providers.push({ provide: TZSLOT_MESSAGES, useValue: defaults.messages });
  return providers;
}
