import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createCalendar,
  createDateField,
  createDateRange,
  FR,
  type CalendarInstance,
  type DateFieldInstance,
  type DateRangeInstance,
} from '../src/index.js';
import { Temporal, type PlainDate } from '@tzslot/core';

const today = Temporal.PlainDate.from('2026-09-18');
let host: HTMLElement;
let widget: CalendarInstance | DateFieldInstance | DateRangeInstance | null = null;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  widget?.destroy();
  widget = null;
  host.remove();
});

const day = (iso: string) => document.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
const press = (key: string) =>
  document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

/** A small hotel: prices by weekday, the 23rd sold out. */
const prices = ({ date }: { date: PlainDate }) =>
  date.toString() === '2026-09-23'
    ? { note: 'Full', className: 'sold-out', disabled: true, title: 'No rooms left' }
    : { note: date.dayOfWeek > 5 ? '120€' : '89€' };

describe('renderCell on the calendar', () => {
  it('writes a note under the number, and says so on the grid', () => {
    widget = createCalendar(host, { today, renderCell: prices });
    const cell = day('2026-09-21');
    expect(cell.querySelector('.tz-cal__num')!.textContent).toBe('21');
    expect(cell.querySelector('.tz-cal__note')!.textContent).toBe('89€');
    expect(host.classList.contains('tz-cal--notes')).toBe(true);
  });

  it('adds your class and title, and rules the day out', () => {
    const onChange = vi.fn();
    widget = createCalendar(host, { today, renderCell: prices, onChange });
    const full = day('2026-09-23');
    expect(full.classList.contains('sold-out')).toBe(true);
    expect(full.title).toBe('No rooms left');
    expect(full.disabled).toBe(true);
  });

  it('a day it rules out cannot be chosen from the keyboard either', () => {
    const onChange = vi.fn();
    widget = createCalendar(host, { today, renderCell: prices, onChange });
    day('2026-09-22').focus();
    press('ArrowRight'); // onto the 23rd, which is full
    press('Enter');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('takes its classes off again when the answer changes', () => {
    widget = createCalendar(host, { today, renderCell: prices });
    expect(day('2026-09-23').classList.contains('sold-out')).toBe(true);
    widget.update({ renderCell: undefined });
    expect(day('2026-09-23').classList.contains('sold-out')).toBe(false);
    expect(day('2026-09-23').textContent).toBe('23');
    expect(host.classList.contains('tz-cal--notes')).toBe(false);
  });

  it('is told what the grid already knows', () => {
    const renderCell = vi.fn();
    widget = createCalendar(host, {
      today,
      value: Temporal.PlainDate.from('2026-09-10'),
      max: Temporal.PlainDate.from('2026-09-25'),
      renderCell,
    });
    const seen = (iso: string) => renderCell.mock.calls.find(([c]) => c.date.toString() === iso)![0];
    expect(seen('2026-09-18').today).toBe(true);
    expect(seen('2026-09-10').selected).toBe(true);
    expect(seen('2026-09-26').disabled).toBe(true);
    expect(seen('2026-08-31').outside).toBe(true);
  });
});

describe('renderCell on the range', () => {
  it('prices each night, and a sold-out night stops a stay crossing it', () => {
    widget = createDateRange(host, { today: Temporal.PlainDate.from('2026-09-18'), renderCell: prices });
    expect(day('2026-09-21').querySelector('.tz-range__note')!.textContent).toBe('89€');
    day('2026-09-21').click();
    day('2026-09-25').click();
    expect((widget as DateRangeInstance).value.end).toBeNull();
    expect(host.querySelector('.tz-range__error')).not.toBeNull();
  });
});

describe('the Today and Clear buttons', () => {
  const button = (name: string) => host.querySelector<HTMLButtonElement>(`.tz-cal__action--${name}`);

  it('are not there unless asked for', () => {
    widget = createCalendar(host, { today });
    expect(host.querySelector('.tz-cal__footer')).toBeNull();
  });

  it('Today comes back from a year away and chooses today', () => {
    const onChange = vi.fn();
    widget = createCalendar(host, { today, buttons: ['today', 'clear'], onChange });
    (widget as CalendarInstance).goTo({ year: 2027, month: 9 });
    button('today')!.click();
    expect(onChange.mock.calls[0]![0].toString()).toBe('2026-09-18');
    expect(host.querySelector('.tz-cal__title')!.textContent).toContain('2026');
  });

  it('Today from the year view comes back down to days', () => {
    widget = createCalendar(host, { today, buttons: ['today'] });
    const title = host.querySelector<HTMLButtonElement>('.tz-cal__title')!;
    title.click();
    title.click();
    button('today')!.click();
    expect((widget as CalendarInstance).view).toBe('days');
  });

  it('Clear empties the selection, and is idle when there is nothing to clear', () => {
    const onChange = vi.fn();
    widget = createCalendar(host, { today, buttons: ['clear'], onChange });
    expect(button('clear')!.disabled).toBe(true);
    day('2026-09-10').click();
    expect(button('clear')!.disabled).toBe(false);
    button('clear')!.click();
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect((widget as CalendarInstance).value).toBeNull();
  });

  it('speak the language they are given', () => {
    widget = createCalendar(host, { today, buttons: ['today', 'clear'], messages: FR });
    expect(button('today')!.textContent).toBe("Aujourd'hui");
    expect(button('clear')!.textContent).toBe('Effacer');
  });

  it('in a field, Clear empties it and closes the panel', () => {
    const onChange = vi.fn();
    widget = createDateField(host, {
      today,
      locale: 'en-GB',
      value: Temporal.PlainDate.from('2026-09-10'),
      buttons: ['today', 'clear'],
      onChange,
    });
    (widget as DateFieldInstance).open();
    document.querySelector<HTMLButtonElement>('.tz-field__panel .tz-cal__action--clear')!.click();
    expect(onChange).toHaveBeenCalledWith(null);
    expect(document.querySelector('.tz-field__panel')).toBeNull();
    expect(host.querySelector('.tz-field__trigger')!.textContent).toContain('Choose a date');
  });
});
