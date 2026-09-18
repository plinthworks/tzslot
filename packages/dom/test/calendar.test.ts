import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createCalendar, FR, type CalendarInstance, type CalendarOptions } from '../src/index.js';
import { Temporal } from '../../core/src/index.js';

/**
 * No Angular anywhere in this file. If these pass, the calendar works for a
 * page with a <div> and a <script>, which is the promise @tzslot/dom makes.
 */

const today = Temporal.PlainDate.from('2026-09-18');
let host: HTMLElement;
let cal: CalendarInstance;

const mount = (options: CalendarOptions = {}) => {
  cal = createCalendar(host, { today, locale: 'en-GB', ...options });
  return cal;
};
const days = () => Array.from(host.querySelectorAll<HTMLButtonElement>('.tz-cal__day'));
const day = (iso: string) => host.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
const title = () => host.querySelector<HTMLButtonElement>('.tz-cal__title')!;
const navs = () => Array.from(host.querySelectorAll<HTMLButtonElement>('.tz-cal__nav'));
const press = (key: string) =>
  (document.activeElement ?? host).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  cal?.destroy();
  host.remove();
  document.head.querySelectorAll('style[data-tzslot]').forEach((s) => s.remove());
});

describe('mounting', () => {
  it('draws a month into any element', () => {
    mount();
    expect(host.classList.contains('tz-cal')).toBe(true);
    expect(days()).toHaveLength(42);
    expect(title().textContent).toBe('September 2026');
  });

  it('brings its own layout, once, however many calendars there are', () => {
    mount();
    const second = document.createElement('div');
    document.body.append(second);
    const other = createCalendar(second, { today });

    expect(document.head.querySelectorAll('style[data-tzslot="calendar"]')).toHaveLength(1);
    other.destroy();
    second.remove();
  });

  it('puts its styles first, unlayered, so page resets cannot win and page classes can', () => {
    // A cascade layer lost to every unlayered rule of the page: an
    // `output { display: block }` in a demo page took the interval apart.
    const pageStyles = document.createElement('style');
    document.head.append(pageStyles);
    mount();
    const style = document.head.querySelector('style[data-tzslot="calendar"]')!;
    expect(document.head.firstElementChild).toBe(style);
    expect(style.textContent).not.toContain('@layer');
    pageStyles.remove();
  });

  it('leaves the styles to you when asked', () => {
    mount({ injectStyles: false });
    expect(document.head.querySelector('style[data-tzslot]')).toBeNull();
  });

  it('puts its styles inside a shadow root, where <head> would not reach', () => {
    const outer = document.createElement('div');
    document.body.append(outer);
    const shadow = outer.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    shadow.append(inner);

    const inShadow = createCalendar(inner, { today });
    expect(shadow.querySelector('style[data-tzslot="calendar"]')).not.toBeNull();
    inShadow.destroy();
    outer.remove();
  });

  it('destroy leaves the element as it found it', () => {
    host.classList.add('mine');
    mount();
    cal.destroy();
    expect(host.children).toHaveLength(0);
    expect(host.className).toBe('mine');
  });
});

describe('talking to the outside', () => {
  it('reports a click through onChange', () => {
    const onChange = vi.fn();
    mount({ onChange });
    day('2026-09-23').click();

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]![0].toString()).toBe('2026-09-23');
    expect(cal.value!.toString()).toBe('2026-09-23');
    expect(day('2026-09-23').classList.contains('tz-cal__day--selected')).toBe(true);
  });

  it('update changes what is shown and does not call onChange', () => {
    // It is the outside telling the calendar something. Echoing it back as a
    // change is how two-way bindings end up in a loop.
    const onChange = vi.fn();
    mount({ onChange });
    cal.update({ value: Temporal.PlainDate.from('2028-11-02') });

    expect(title().textContent).toBe('November 2028');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clear does call onChange, because it is an action', () => {
    const onChange = vi.fn();
    mount({ onChange, value: Temporal.PlainDate.from('2026-09-10') });
    cal.clear();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('goTo moves the grid without selecting', () => {
    mount();
    cal.goTo({ year: 2027, month: 3 });
    expect(title().textContent).toBe('March 2027');
    expect(cal.value).toBeNull();
  });

  it('reports view changes', () => {
    const onViewChange = vi.fn();
    mount({ onViewChange });
    title().click();
    expect(onViewChange).toHaveBeenCalledWith('months');
    expect(cal.view).toBe('months');
  });

  it('disabled stops every control', () => {
    const onChange = vi.fn();
    mount({ onChange, disabled: true });
    day('2026-09-23').click();
    expect(onChange).not.toHaveBeenCalled();
    expect(navs().every((b) => b.disabled)).toBe(true);
  });
});

describe('words and icons', () => {
  it('speaks the language it is given', () => {
    mount({ locale: 'fr-FR', messages: FR });
    expect(title().textContent).toBe('septembre 2026');
    expect(navs()[0]!.getAttribute('aria-label')).toBe('Mois précédent');
  });

  it('takes icons as nodes, and strings as text rather than HTML', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mount({ icons: { prev: svg, next: '<b>x</b>' } });
    expect(navs()[0]!.firstChild).toBe(svg);
    expect(navs()[1]!.querySelector('b')).toBeNull();
    expect(navs()[1]!.textContent).toBe('<b>x</b>');
  });
});

describe('the keyboard', () => {
  it('can enter a calendar nobody has touched', () => {
    // A grid with no tabbable cell cannot be reached with Tab at all.
    mount();
    const tabbable = days().filter((b) => b.tabIndex === 0);
    expect(tabbable.map((b) => b.dataset['date'])).toEqual(['2026-09-18']);
  });

  it('the focus itself follows the arrows, not just the tabindex', () => {
    mount();
    day('2026-09-18').focus();
    press('ArrowRight');
    expect((document.activeElement as HTMLElement).dataset['date']).toBe('2026-09-19');
    press('PageDown');
    expect(title().textContent).toBe('October 2026');
    expect((document.activeElement as HTMLElement).dataset['date']).toBe('2026-10-19');
  });

  it('Enter selects the day under the focus', () => {
    const onChange = vi.fn();
    mount({ onChange });
    day('2026-09-18').focus();
    press('ArrowDown');
    press('Enter');
    expect(onChange.mock.calls[0]![0].toString()).toBe('2026-09-25');
  });

  it('never throws away the focused cell while repainting', () => {
    mount();
    const cell = day('2026-09-18');
    cell.focus();
    press('ArrowRight');
    // Same 42 buttons, relabelled: the node under the focus survives a month change.
    press('PageDown');
    expect(days()).toContain(cell);
    expect(document.activeElement && host.contains(document.activeElement)).toBe(true);
  });
});
