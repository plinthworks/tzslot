import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * A length typed rather than chosen.
 *
 * No column of shortcuts holds every length anyone might want, and the people
 * who read a filter screen all day know what they want before it opens.
 */
const paris = 'Europe/Paris';
const now = Temporal.Instant.from('2026-09-21T09:07:32Z'); // 11:07:32 in Paris
let host: HTMLElement;
let field: RangeFieldInstance;

const make = (options = {}) => {
  field = createRangeField(host, {
    timeZone: paris,
    locale: 'en-GB',
    today: Temporal.PlainDate.from('2026-09-21'),
    now,
    lengthBox: true,
    presets: [],
    ...options,
  });
};
const panel = () => document.querySelector('.tz-field__panel')!;
const box = () => panel().querySelector<HTMLInputElement>('.tz-rangefield__length-input')!;
const shown = () => host.querySelector('.tz-field__text')!.textContent;
const enter = (text: string) => {
  const node = box();
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

describe('typing a length', () => {
  it('with nothing chosen, it is the length ending now', () => {
    make();
    field.open();
    enter('25mn');
    expect(shown()).toBe('21/09/2026 10:42 – 21/09/2026 11:07');
  });

  it('with a start chosen, it is the length from there', () => {
    make({ showTime: true });
    field.open();
    field.update({
      value: { start: Temporal.Instant.from('2026-09-18T08:00:00Z'), end: null, allDay: false }, // 10:00
    });
    enter('1h');
    expect(shown()).toBe('18/09/2026 10:00 – 18/09/2026 11:00');
  });

  it('and the arrows then move by it', () => {
    make();
    field.update({ shift: 'auto' });
    field.open();
    enter('1h');
    const arrows = () => host.querySelectorAll<HTMLButtonElement>('.tz-field__shift');
    arrows()[0]!.click();
    expect(shown()).toBe('21/09/2026 09:07 – 21/09/2026 10:07');
  });

  it('what it cannot read is marked, not guessed at', () => {
    make();
    field.open();
    const before = shown();
    enter('soon');
    expect(box().getAttribute('aria-invalid')).toBe('true');
    expect(shown()).toBe(before); // nothing changed
    const node = box();
    enter('2d');
    // The same element, still focused: a length accepted must not rebuild the
    // panel under the fingers that typed it.
    expect(box()).toBe(node);
    expect(node.getAttribute('aria-invalid')).toBe('false');
  });

  it('explains itself, in the language it was given', () => {
    make({ messages: FR, locale: 'fr-FR' });
    field.open();
    const help = panel().querySelector<HTMLButtonElement>('.tz-rangefield__length-help')!;
    const note = panel().querySelector<HTMLElement>('.tz-rangefield__length-note')!;
    expect(help.title).toContain('25mn');
    expect(note.hidden).toBe(true);
    help.click();
    // A tooltip cannot be reached by a finger or a keyboard; the same words
    // are a line the button shows.
    expect(note.hidden).toBe(false);
    expect(note.textContent).toContain('3j trois jours');
  });

  it('is not there unless the screen asked for it', () => {
    make({ lengthBox: false, presets: ['today'] });
    field.open();
    expect(panel().querySelector('.tz-rangefield__length')).toBe(null);
  });
});
