import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, createCalendar, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * A panel a keyboard can reach, stay inside, and use.
 *
 * Three separate faults met in the period field: the focus never entered the
 * panel, the tab trap did not know what a <select> was — the default time
 * layout builds six of them — and pressing Enter on a shortcut destroyed the
 * button under the focus.
 */
let host: HTMLElement;
let field: RangeFieldInstance;
const panel = () => document.querySelector('.tz-field__panel')!;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((node) => node.remove());
});

describe('opening the panel', () => {
  it('puts the focus inside it, in the first field', () => {
    field = createRangeField(host, { timeZone: 'Europe/Paris', locale: 'en-GB' });
    field.open();
    expect(document.activeElement).toBe(panel().querySelector('.tz-dateinput__input'));
  });

  it('and the field it focuses is not treated as armed by the reader', () => {
    // Otherwise the ordinary two-click flow breaks: the second click would
    // correct the start again instead of filling the end.
    field = createRangeField(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
    });
    field.open();
    panel().querySelector<HTMLButtonElement>('[data-date="2026-09-14"]')!.click();
    panel().querySelector<HTMLButtonElement>('[data-date="2026-09-20"]')!.click();
    expect(host.querySelector('.tz-field__text')!.textContent).toBe('14/09/2026 – 20/09/2026');
  });

  it('a value it was given is shown, not swallowed by the focus', () => {
    field = createRangeField(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      value: {
        start: Temporal.Instant.from('2026-09-13T22:00:00Z'),
        end: Temporal.Instant.from('2026-09-20T22:00:00Z'),
        allDay: true,
      },
    });
    field.open();
    const shown = [...panel().querySelectorAll<HTMLInputElement>('.tz-dateinput__input')].map((i) => i.value);
    expect(shown).toEqual(['14/09/2026', '20/09/2026']);
  });
});

describe('the tab trap', () => {
  it('counts the menus the default time layout builds', () => {
    field = createRangeField(host, { timeZone: 'Europe/Paris', locale: 'en-GB', showTime: true });
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-18T08:00:00Z'),
        end: Temporal.Instant.from('2026-09-18T15:00:00Z'),
        allDay: false,
      },
    });
    field.open();
    const menus = panel().querySelectorAll('select:not(:disabled)');
    expect(menus.length).toBeGreaterThan(0);

    const css = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]';
    const stops = [...panel().querySelectorAll<HTMLElement>(css)].filter(
      (node) => node.getAttribute('tabindex') !== '-1' && !node.hasAttribute('hidden'),
    );
    // Every menu is a stop the trap knows about; they used to be invisible to
    // it, so Tab walked straight out of an open panel.
    expect([...menus].every((menu) => stops.includes(menu as HTMLElement))).toBe(true);
  });
});

describe('pressing a shortcut', () => {
  it('leaves the button under the focus alive', () => {
    field = createRangeField(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-21'),
      confirm: true, // the panel stays open, so the focus matters
      presets: ['today', 'yesterday', 'last7Days'],
    });
    field.open();
    const button = [...panel().querySelectorAll<HTMLButtonElement>('.tz-rangefield__preset')][1]!;
    button.focus();
    button.click();

    // The same node, still focused: the column used to be rebuilt wholesale.
    expect(panel().querySelectorAll('.tz-rangefield__preset')[1]).toBe(button);
    expect(document.activeElement).toBe(button);
  });
});

describe('a calendar whose entry point is out of bounds', () => {
  it('offers a tab stop that can actually be used', () => {
    const cal = createCalendar(host, {
      locale: 'en-GB',
      today: Temporal.PlainDate.from('2026-09-15'),
      min: Temporal.PlainDate.from('2026-09-20'),
    });
    const stops = [...host.querySelectorAll<HTMLButtonElement>('.tz-cal__day')].filter(
      (cell) => cell.tabIndex === 0,
    );
    expect(stops.length).toBe(1);
    // A disabled button cannot take focus: marking today as the way in left
    // the grid unreachable, and the arrow keys need focus inside it.
    expect(stops[0]!.disabled).toBe(false);
    cal.destroy();
  });
});

describe('a field that is typed into', () => {
  it('a second ArrowDown walks into the panel', async () => {
    const { createDateTimeField } = await import('../src/index.js');
    const field = createDateTimeField(host, { timeZone: 'Europe/Paris', locale: 'en-GB' });
    const typed = host.querySelector<HTMLInputElement>('input.tz-field__trigger')!;
    typed.focus();

    typed.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(field.isOpen).toBe(true);
    expect(document.activeElement).toBe(typed); // the text keeps it, so far

    typed.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    // It used to do nothing at all, leaving the calendar reachable only by
    // tabbing through the rest of the document.
    expect(panel().contains(document.activeElement)).toBe(true);
    field.destroy();
  });
});

describe('the month and year views', () => {
  it('are rows of cells, and the arrows walk them', async () => {
    const { createCalendar } = await import('../src/index.js');
    const cal = createCalendar(host, { locale: 'en-GB', view: 'months', today: Temporal.PlainDate.from('2026-09-15') });
    expect(host.querySelectorAll('.tz-cal__coarse [role="row"]').length).toBe(3);

    const cells = [...host.querySelectorAll<HTMLButtonElement>('.tz-cal__coarse-cell')];
    cells[0]!.focus();
    cells[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(cells[1]);
    cells[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(cells[5]);
    cal.destroy();
  });
});
