import { describe, it, expect, afterEach } from 'vitest';
import { firstDayFor, Temporal } from '@tzslot/core';
import { createCalendar } from '../src/calendar.js';
import { createRangeField } from '../src/range-field.js';

/**
 * The week does not start on the same day everywhere, and until this the
 * calendar said Monday whatever the locale — so an American reader was handed
 * a grid their own calendar app disagrees with.
 */
const mounted: { destroy(): void }[] = [];
const mount = () => {
  const host = document.createElement('div');
  document.body.append(host);
  return host;
};
afterEach(() => {
  for (const w of mounted.splice(0)) w.destroy();
  document.body.replaceChildren();
});

/** The long name the heading announces — the only place the order is visible. */
const headings = (host: HTMLElement) =>
  [...host.querySelectorAll('.tz-cal__weekday')].map((el) => el.getAttribute('aria-label'));

describe('where the week starts', () => {
  it('asks the locale, and the locales disagree', () => {
    expect(firstDayFor('fr-FR')).toBe(1);
    expect(firstDayFor('en-GB')).toBe(1);
    expect(firstDayFor('en-US')).toBe(7);
    expect(firstDayFor('ja-JP')).toBe(7);
  });

  it('falls back to Monday rather than throwing on a tag that is not one', () => {
    expect(firstDayFor('not a locale!!')).toBe(1);
    expect(firstDayFor('')).toBe(1);
  });

  it('a French calendar opens on Monday', () => {
    const host = mount();
    mounted.push(createCalendar(host, { locale: 'fr-FR' }));
    expect(headings(host)[0]).toBe('lundi');
  });

  it('an American calendar opens on Sunday — the reason this exists', () => {
    const host = mount();
    mounted.push(createCalendar(host, { locale: 'en-US' }));
    expect(headings(host)[0]).toBe('Sunday');
  });

  it('what the screen asks for still wins over the locale', () => {
    const host = mount();
    mounted.push(createCalendar(host, { locale: 'en-US', firstDayOfWeek: 1 }));
    expect(headings(host)[0]).toBe('Monday');
  });

  it('follows a change of locale while it runs', () => {
    const host = mount();
    const calendar = createCalendar(host, { locale: 'fr-FR' });
    mounted.push(calendar);
    expect(headings(host)[0]).toBe('lundi');
    calendar.update({ locale: 'en-US' });
    expect(headings(host)[0]).toBe('Sunday');
  });

  it('"this week" starts the day the grid starts, or the two disagree', () => {
    // Tuesday 22 September 2026.
    const today = Temporal.PlainDate.from('2026-09-22');
    const week = (locale: string) => {
      const host = mount();
      const field = createRangeField(host, {
        timeZone: 'Europe/Paris', locale, today, presets: ['thisWeek'],
      });
      mounted.push(field);
      field.open();
      const preset = host.ownerDocument.querySelector<HTMLButtonElement>('.tz-rangefield__preset');
      preset?.click();
      return field.value.start!.toZonedDateTimeISO('Europe/Paris').toPlainDate().toString();
    };
    expect(week('fr-FR')).toBe('2026-09-21');   // the Monday
    expect(week('en-US')).toBe('2026-09-20');   // the Sunday before it
  });
});
