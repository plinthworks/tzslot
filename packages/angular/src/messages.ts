import { InjectionToken } from '@angular/core';
import { EN, type TzslotMessages } from '../../dom/src/index.js';

/**
 * The words themselves live in @tzslot/dom, which every wrapper shares. Angular
 * only adds the way to provide them once for a whole application.
 */
export { EN, FR } from '../../dom/src/index.js';
export type { TzslotMessages } from '../../dom/src/index.js';

export const TZSLOT_MESSAGES = new InjectionToken<TzslotMessages>('tzslot.messages', {
  providedIn: 'root',
  factory: () => EN,
});

/** `providers: [provideTzslotMessages(FR)]` */
export function provideTzslotMessages(messages: TzslotMessages) {
  return { provide: TZSLOT_MESSAGES, useValue: messages };
}
