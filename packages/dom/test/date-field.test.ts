import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDateField, FR, type DateFieldInstance, type DateFieldOptions } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/** No framework: a <div>, a function call, and the panel on the body. */

const today = Temporal.PlainDate.from('2026-09-18');
let host: HTMLElement;
let field: DateFieldInstance;

const mount = (options: DateFieldOptions = {}) => {
  field = createDateField(host, { today, locale: 'en-GB', ...options });
  return field;
};
const trigger = () => host.querySelector<HTMLButtonElement>('.tz-field__trigger')!;
const panel = () => document.querySelector<HTMLElement>('.tz-field__panel');
const day = (iso: string) =>
  document.querySelector<HTMLButtonElement>(`.tz-field__panel [data-date="${iso}"]`)!;
const key = (k: string, target: EventTarget = document.activeElement ?? document) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  field?.destroy();
  host.remove();
  document.documentElement.removeAttribute('data-theme');
});

describe('the field', () => {
  it('shows the placeholder, then the chosen date the locale way', () => {
    mount();
    expect(trigger().textContent).toContain('Choose a date');
    field.update({ value: Temporal.PlainDate.from('2026-12-25') });
    expect(trigger().textContent).toContain('25 Dec 2026');
  });

  it('opens a panel on the body, and closes it again', () => {
    mount();
    trigger().click();
    expect(panel()!.parentElement).toBe(document.body);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    trigger().click();
    expect(panel()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('choosing a day reports it, closes, and gives the focus back to the field', () => {
    const onChange = vi.fn();
    mount({ onChange });
    trigger().click();
    day('2026-09-23').click();

    expect(onChange.mock.calls[0]![0].toString()).toBe('2026-09-23');
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('puts the focus on the selected day when it opens', () => {
    mount({ value: Temporal.PlainDate.from('2026-09-10') });
    field.open();
    expect((document.activeElement as HTMLElement).dataset['date']).toBe('2026-09-10');
  });

  it('Escape closes without choosing', () => {
    const onChange = vi.fn();
    mount({ onChange });
    field.open();
    key('Escape');
    expect(panel()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a click elsewhere closes a popup and leaves the focus alone', () => {
    mount();
    const elsewhere = document.createElement('button');
    document.body.append(elsewhere);
    field.open();

    elsewhere.focus();
    elsewhere.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  it('cannot be opened while disabled, and disabling closes it', () => {
    mount();
    field.open();
    field.update({ disabled: true });
    expect(panel()).toBeNull();
    field.open();
    expect(panel()).toBeNull();
    expect(trigger().disabled).toBe(true);
  });

  it('reports opening and closing', () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    mount({ onOpen, onClose });
    field.open();
    field.close();
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('destroy takes the panel with it', () => {
    mount();
    field.open();
    field.destroy();
    expect(panel()).toBeNull();
    expect(host.children).toHaveLength(0);
  });
});

describe('the dialog mode', () => {
  it('is centred over a backdrop, modal, and holds the page still', () => {
    mount({ mode: 'dialog' });
    field.open();
    expect(panel()!.classList.contains('tz-field__panel--dialog')).toBe(true);
    expect(panel()!.getAttribute('aria-modal')).toBe('true');
    expect(document.querySelector('.tz-field__backdrop')).not.toBeNull();
    expect(document.documentElement.style.overflow).toBe('hidden');

    (document.querySelector('.tz-field__backdrop') as HTMLElement).click();
    expect(panel()).toBeNull();
    expect(document.querySelector('.tz-field__backdrop')).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('keeps Tab inside the panel', () => {
    mount({ mode: 'dialog' });
    field.open();
    const stops = Array.from(
      panel()!.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"])'),
    );
    stops[stops.length - 1]!.focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.activeElement!.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(stops[0]);
  });
});

describe('the theme follows the panel out of the field', () => {
  it('a dark card on a light page opens a dark panel', () => {
    // The panel is on the body, not in the card, so it inherits nothing from
    // it. This is the case that breaks without the copy.
    const card = document.createElement('div');
    card.dataset['theme'] = 'dark';
    document.body.append(card);
    card.append(host);

    mount();
    field.open();
    expect(panel()!.dataset['theme']).toBe('dark');
    card.remove();
  });

  it('an accent set on the card follows the panel onto the body', () => {
    const card = document.createElement('div');
    card.style.setProperty('--tz-accent', 'rebeccapurple');
    document.body.append(card);
    card.append(host);

    mount();
    field.open();
    expect(panel()!.style.getPropertyValue('--tz-accent')).toBe('rebeccapurple');
    card.remove();
  });

  it("the panel writes in the field's font, not the body's", () => {
    // The body is often not where an application sets its font; the panel
    // lives there, and opened in Times New Roman.
    const card = document.createElement('div');
    card.style.fontFamily = 'Inter, sans-serif';
    document.body.append(card);
    card.append(host);

    mount();
    field.open();
    expect(panel()!.style.fontFamily).toBe('Inter, sans-serif');
    card.remove();
  });

  it('so does a contrast preference', () => {
    const card = document.createElement('div');
    card.dataset['contrast'] = 'more';
    document.body.append(card);
    card.append(host);

    mount();
    field.open();
    expect(panel()!.dataset['contrast']).toBe('more');
    card.remove();
  });

  it('with no theme anywhere, the panel carries none', () => {
    mount();
    field.open();
    expect(panel()!.hasAttribute('data-theme')).toBe(false);
  });
});

describe('words', () => {
  it('speaks French when given French', () => {
    mount({ messages: FR, locale: 'fr-FR' });
    expect(trigger().textContent).toContain('Choisir une date');
    field.open();
    expect(panel()!.getAttribute('aria-label')).toBe('Choisir une date');
  });
});
