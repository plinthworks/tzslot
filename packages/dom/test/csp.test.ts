import { describe, it, expect, afterEach } from 'vitest';
import * as tzslot from '../src/index.js';
import { setStyleNonce, styleNonce } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * What this library injects into a page, and under whose permission.
 *
 * A consumer deploying under `style-src 'self'` — no `'unsafe-inline'` —
 * reported two things. `injectStyles: false` stopped the host's sheets and not
 * the panel's, so every open put a blocked <style> in the head and drew an
 * unstyled panel: seven sheets and 40 725 bytes of CSS for one period field.
 * And there was no way to pass a nonce, so the only route was to inject all
 * eleven exported sheets themselves and rely on `ensureStyles` recognising the
 * `data-tzslot` ids — which works, and means knowing our internals.
 *
 * Both are closed here. `setStyleNonce` is the answer for a page that has a
 * nonce; `injectStyles: false` is the answer for a page that would rather
 * place the sheets itself, and it now means what it says everywhere.
 *
 * Asserted by counting what lands in the head rather than by reading the
 * source: an audit by grep found ten ungated calls that were all inside a
 * gated block, and would have missed one that was not.
 */

let built: { destroy(): void } | undefined;
afterEach(() => {
  built?.destroy();
  built = undefined;
  setStyleNonce(null);
  document.head.querySelectorAll('style[data-tzslot]').forEach((sheet) => sheet.remove());
  document.body.replaceChildren();
});

const paris = 'Europe/Paris';
const today = Temporal.PlainDate.from('2026-09-20');
const sheets = () => [...document.head.querySelectorAll<HTMLStyleElement>('style[data-tzslot]')];

/** Every widget, and the layouts that bring a different sheet with them. */
const WIDGETS: ReadonlyArray<{ name: string; options: Record<string, unknown> }> = [
  { name: 'Calendar', options: {} },
  { name: 'MultiDate', options: {} },
  { name: 'DateRange', options: {} },
  { name: 'DateField', options: {} },
  { name: 'DateTimeField', options: { timeZone: paris } },
  { name: 'DateTimeField', options: { timeZone: paris, timeLayout: 'select' } },
  { name: 'DateTimeField', options: { timeZone: paris, timeLayout: 'list' } },
  { name: 'RangeField', options: { timeZone: paris, months: 1 } },
  { name: 'RangeField', options: { timeZone: paris, months: 1, showTime: true } },
  { name: 'DateTimeRange', options: { timeZone: paris } },
  { name: 'DailyRange', options: { timeZone: paris } },
  { name: 'DailyRange', options: { timeZone: paris, timeLayout: 'list' } },
  { name: 'TimeSlots', options: { timeZone: paris, date: '2026-09-20', stepMinutes: 60 } },
  { name: 'DateInput', options: {} },
  { name: 'TimeInput', options: {} },
  { name: 'TimeSelect', options: {} },
];

/** Builds one, opens its panel if it has one, and hands back the host. */
const exercise = (name: string, options: Record<string, unknown>) => {
  const host = document.createElement('div');
  document.body.append(host);
  const create = (tzslot as Record<string, unknown>)[`create${name}`] as (
    host: HTMLElement,
    options: unknown,
  ) => { destroy(): void };
  built = create(host, { locale: 'en-GB', today, ...options });
  host.querySelector<HTMLButtonElement>('.tz-field__trigger')?.click();
  return host;
};

describe('injectStyles: false means no stylesheet, anywhere', () => {
  for (const { name, options } of WIDGETS) {
    const how = Object.entries(options)
      .filter(([key]) => key === 'timeLayout' || key === 'showTime')
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(', ');
    it(`${name}${how ? ` (${how})` : ''}`, () => {
      exercise(name, { ...options, injectStyles: false });
      expect(sheets().map((sheet) => sheet.dataset['tzslot'])).toEqual([]);
    });
  }

  it('and the default still dresses a panel, which is the point of the bargain', () => {
    // The setting is a bargain: say false and the sheets are yours to place.
    // Left alone, a period panel brings everything it needs — the reason the
    // panel injected unconditionally in the first place.
    exercise('RangeField', { timeZone: paris, months: 1, showTime: true });
    expect(sheets().length).toBeGreaterThan(4);
  });
});

describe('setStyleNonce', () => {
  it('puts the nonce on every sheet a panel brings', () => {
    setStyleNonce('abc123');
    exercise('RangeField', { timeZone: paris, months: 1, showTime: true });
    const injected = sheets();
    expect(injected.length).toBeGreaterThan(4);
    for (const sheet of injected) {
      expect(sheet.getAttribute('nonce'), `${sheet.dataset['tzslot']} has no nonce`).toBe('abc123');
    }
  });

  it('on every widget, not only the ones with a panel', () => {
    setStyleNonce('xyz789');
    for (const { name, options } of WIDGETS) {
      exercise(name, options);
      for (const sheet of sheets()) {
        expect(sheet.getAttribute('nonce'), `${name}: ${sheet.dataset['tzslot']}`).toBe('xyz789');
      }
      built?.destroy();
      document.head.querySelectorAll('style[data-tzslot]').forEach((s) => s.remove());
      document.body.replaceChildren();
    }
  });

  it('is cleared by null, and read back for a diagnostic', () => {
    expect(styleNonce()).toBeNull();
    setStyleNonce('abc');
    expect(styleNonce()).toBe('abc');
    setStyleNonce(null);
    expect(styleNonce()).toBeNull();
    setStyleNonce(undefined);
    expect(styleNonce()).toBeNull();
  });

  it('and no nonce means no attribute, rather than an empty one', () => {
    // `nonce=""` matches no policy and is worse than absent: it looks
    // deliberate to whoever reads the markup wondering why nothing applies.
    exercise('Calendar', {});
    for (const sheet of sheets()) expect(sheet.hasAttribute('nonce')).toBe(false);
  });
});
