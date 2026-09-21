import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * Three things a screen decides for itself: what the period is called, how an
 * hour is asked for, and whether a typed length fills a date or only tells
 * the arrows how far to go.
 */
const paris = 'Europe/Paris';
const now = Temporal.Instant.from('2026-09-21T09:07:32Z'); // 11:07 in Paris
let host: HTMLElement;
let field: RangeFieldInstance;

const make = (options = {}) => {
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    today: Temporal.PlainDate.from('2026-09-21'),
    now,
    presets: [],
    ...options,
  });
};
const panel = () => document.querySelector('.tz-field__panel')!;
const day = (iso: string) => panel().querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
const shown = () => host.querySelector('.tz-field__text')!.textContent;
const enter = (text: string) => {
  const node = panel().querySelector<HTMLInputElement>('.tz-rangefield__length-input')!;
  node.value = text;
  node.dispatchEvent(new Event('input', { bubbles: true }));
  node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
};

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((node) => node.remove());
});

describe('a title', () => {
  it('says what is being chosen, on screen and to a screen reader', () => {
    make({ title: 'Travel dates' });
    expect(host.querySelector('.tz-field__trigger')!.getAttribute('aria-label')).toBe('Travel dates');
    field.open();
    expect(panel().querySelector('.tz-rangefield__title')!.textContent).toBe('Travel dates');
  });

  it('is absent when nothing was said', () => {
    make();
    field.open();
    expect(panel().querySelector('.tz-rangefield__title')).toBe(null);
  });
});

describe('how an hour is asked for', () => {
  const withHours = (options = {}) => {
    make({ showTime: true, ...options });
    field.update({
      value: { start: Temporal.Instant.from('2026-09-18T08:00:00Z'), end: null, allDay: false },
    });
    field.open();
  };

  it('two menus by default: most of the time an hour is chosen, not nudged', () => {
    withHours();
    expect(panel().querySelector('.tz-dateinput__time.tz-timeselect')).not.toBeNull();
    expect(panel().querySelector('.tz-dateinput__time.tz-time')).toBe(null);
  });

  it('figures with arrows when the screen asks for them', () => {
    withHours({ timeLayout: 'input' });
    expect(panel().querySelector('.tz-dateinput__time.tz-time')).not.toBeNull();
  });

  it('two menus when the screen prefers them', () => {
    withHours({ timeLayout: 'select' });
    const first = panel().querySelector('.tz-dateinput')!;
    const menus = first.querySelectorAll<HTMLSelectElement>('.tz-dateinput__time .tz-timeselect__menu');
    expect(menus.length).toBe(2); // one for the hour, one for the minutes
    // The menu's own value carries which reading it is; what matters here is
    // that it opens on the hour the period holds.
    expect(menus[0]!.selectedOptions[0]!.textContent).toBe('10');
  });

  it('and changing its mind rebuilds it rather than stacking the two', () => {
    withHours({ timeLayout: 'input' });
    field.update({ timeLayout: 'select' });
    const first = panel().querySelector('.tz-dateinput')!;
    expect(first.querySelectorAll('.tz-dateinput__time .tz-timeselect__menu').length).toBe(2);
    expect(first.querySelectorAll('.tz-dateinput__time .tz-time__input').length).toBe(0);
  });
});

describe('a step written the short way', () => {
  it('reads 25mn, 1h, 3d the way the documentation writes them', () => {
    make({ shift: '15mn', showTime: true });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-18T08:00:00Z'), // 10:00
        end: Temporal.Instant.from('2026-09-21T03:00:00Z'), // 05:00
        allDay: false,
      },
    });
    const arrows = () => host.querySelectorAll<HTMLButtonElement>('.tz-field__shift');
    arrows()[1]!.click();
    expect(shown()).toBe('18/09/2026 10:15 – 21/09/2026 05:15');

    field.update({ shift: '1h' });
    arrows()[1]!.click();
    expect(shown()).toBe('18/09/2026 11:15 – 21/09/2026 06:15');
  });

  it('and a word it cannot read simply moves nothing', () => {
    make({ shift: 'soon' as never, showTime: true });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-18T08:00:00Z'),
        end: Temporal.Instant.from('2026-09-21T03:00:00Z'),
        allDay: false,
      },
    });
    const before = shown();
    host.querySelectorAll<HTMLButtonElement>('.tz-field__shift')[1]!.click();
    expect(shown()).toBe(before);
  });

  it('a menu of them takes the short form too', () => {
    make({
      showTime: true,
      shift: [
        { step: '15mn', label: '15 min' },
        { step: '1d', label: '1 jour' },
      ],
    });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-18T08:00:00Z'),
        end: Temporal.Instant.from('2026-09-21T03:00:00Z'),
        allDay: false,
      },
    });
    const picker = host.querySelector<HTMLButtonElement>('.tz-field__step')!;
    host.querySelectorAll<HTMLButtonElement>('.tz-field__shift')[1]!.click();
    expect(shown()).toBe('18/09/2026 10:15 – 21/09/2026 05:15');
    picker.click();
    host.querySelectorAll<HTMLButtonElement>('.tz-field__shift')[1]!.click();
    expect(shown()).toBe('19/09/2026 10:15 – 22/09/2026 05:15');
  });
});

describe('no switch to classify the answer', () => {
  it('a named range of days keeps its last day, even on a screen showing hours', () => {
    make({ showTime: true, presets: ['thisQuarter'] });
    field.open();
    [...panel().querySelectorAll<HTMLButtonElement>('.tz-rangefield__preset')]
      .find((b) => b.textContent === 'This quarter')!
      .click();

    // Built from the hours on screen it would have ended at 30 September
    // 00:00 and dropped the last day of the quarter.
    expect(shown()).toBe('01/07/2026 – 30/09/2026');
    expect(field.value.end!.toZonedDateTimeISO(paris).toPlainDate().toString()).toBe('2026-10-01');
    expect(field.value.allDay).toBe(true);
  });

  it('and touching one hour turns the pair into moments without moving a day', () => {
    make({ showTime: true, presets: ['thisQuarter'], timeLayout: 'input' });
    field.open();
    [...panel().querySelectorAll<HTMLButtonElement>('.tz-rangefield__preset')]
      .find((b) => b.textContent === 'This quarter')!
      .click();
    field.open();

    const hour = panel().querySelectorAll<HTMLInputElement>('.tz-dateinput .tz-time__input[data-part="hour"]')[0]!;
    hour.focus();
    hour.value = '09';
    hour.dispatchEvent(new Event('input', { bubbles: true }));
    hour.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    // The end was the midnight after 30 September; as an interval it must read
    // as the 30th, not as 1 October.
    expect(shown()).toBe('01/07/2026 09:00 – 30/09/2026 00:00');
  });

  it('a day chosen takes the hours the screen named', () => {
    make({ showTime: true, defaultTimes: { start: '09:00', end: '18:00' } });
    field.open();
    day('2026-09-14').click();
    day('2026-09-16').click();
    expect(shown()).toBe('14/09/2026 09:00 – 16/09/2026 18:00');
  });
});
