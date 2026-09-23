import { describe, it, expect, afterEach } from 'vitest';
import { createDateField, createDateTimeField, createRangeField, EN, FR } from '../src/index.js';

/**
 * The name a screen reader gives an open panel.
 *
 * It is set when the panel opens, and the panel lives on the body — so a
 * change of words while it is open left a dialog announcing itself in the
 * language before. The trigger was repainted on every change; the panel was
 * not, because nothing repaints an element the field does not own.
 *
 * Not only about language: `title` and `ariaLabel` have always been settings,
 * and they went stale the same way.
 */
let made: { destroy(): void } | null = null;

afterEach(() => {
  made?.destroy();
  made = null;
  document.body.replaceChildren();
});

const open = (make: (host: HTMLElement) => { open(): void; update(s: unknown): void; destroy(): void }) => {
  const host = document.createElement('div');
  document.body.append(host);
  const w = make(host);
  made = w;
  w.open();
  return w;
};
const panel = (selector: string) => document.querySelector(selector)!.getAttribute('aria-label');

describe('an open panel keeps up with what the screen says', () => {
  it('the date field', () => {
    const w = open((host) => createDateField(host, { locale: 'en-GB', messages: EN }));
    expect(panel('.tz-field__panel')).toBe(EN.chooseDate);
    w.update({ messages: FR, locale: 'fr-FR' });
    expect(panel('.tz-field__panel')).toBe(FR.chooseDate);
  });

  it('the date-and-time field', () => {
    const w = open((host) =>
      createDateTimeField(host, { timeZone: 'Europe/Paris', locale: 'en-GB', messages: EN }),
    );
    expect(panel('.tz-field__panel')).toBe(EN.chooseDateTime);
    w.update({ messages: FR, locale: 'fr-FR' });
    expect(panel('.tz-field__panel')).toBe(FR.chooseDateTime);
  });

  it('the period field', () => {
    const w = open((host) =>
      createRangeField(host, { timeZone: 'Europe/Paris', locale: 'en-GB', messages: EN }),
    );
    expect(panel('.tz-field__panel')).toBe(EN.chooseRange);
    w.update({ messages: FR, locale: 'fr-FR' });
    expect(panel('.tz-field__panel')).toBe(FR.chooseRange);
  });

  it('and a title given while it is open reaches it too', () => {
    const w = open((host) =>
      createRangeField(host, { timeZone: 'Europe/Paris', locale: 'en-GB', messages: EN }),
    );
    w.update({ title: 'Dates de voyage' });
    expect(panel('.tz-field__panel')).toBe('Dates de voyage');
  });
});
