import { describe, it, expect, afterEach } from 'vitest';
import { createDateTimeField, createRangeField, createDateField } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * Three things a consumer found by reading the markup and watching a mount.
 *
 * None of them is visible from inside: the suite builds every widget on an
 * element it has already put in the document, and it checks what a field says
 * rather than whether an assistive technology could follow it.
 */
const zone = 'Europe/Paris';
let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
  document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove());
  document.querySelectorAll('style[data-tzslot]').forEach((n) => n.remove());
});

describe('a trigger that opens a panel', () => {
  const FIELDS = [
    ['the moment field', (h: HTMLElement) => createDateTimeField(h, { timeZone: zone })],
    ['the day field', (h: HTMLElement) => createDateField(h, {})],
    ['the period field', (h: HTMLElement) => createRangeField(h, { timeZone: zone })],
  ] as const;

  it.each(FIELDS)('%s names what it opens, and may claim to open it', (_name, make) => {
    const host = document.createElement('div');
    document.body.append(host);
    const field = make(host);
    destroy = () => { field.destroy(); host.remove(); };

    const trigger = host.querySelector<HTMLElement>('.tz-field__trigger')!;
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    /*
     * `aria-haspopup` with `aria-expanded` on a plain `<input>` is not
     * something ARIA allows: a text field controlling a popup is a combobox,
     * and without the role a reader is told an edit box has a popup it cannot
     * describe. A button needs no role — it is already one.
     */
    if (trigger instanceof HTMLInputElement) expect(trigger.getAttribute('role')).toBe('combobox');

    // Closed: nothing to point at, so nothing is claimed.
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeNull();

    field.open();
    const panel = document.querySelector<HTMLElement>('.tz-field__panel')!;
    expect(panel.id).not.toBe('');
    // Open: the trigger names the panel, which is how a reader reaches it.
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);

    field.close();
    expect(trigger.getAttribute('aria-controls')).toBeNull();
  });

  it('gives two open panels two different ids', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    document.body.append(a, b);
    const one = createRangeField(a, { timeZone: zone });
    const two = createRangeField(b, { timeZone: zone });
    destroy = () => { one.destroy(); two.destroy(); a.remove(); b.remove(); };
    one.open();
    two.open();
    const ids = [...document.querySelectorAll('.tz-field__panel')].map((p) => p.id);
    expect(ids.length).toBe(2);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('a widget built before it is inserted', () => {
  it('is styled anyway, which it was not', () => {
    /*
     * The sheet used to wait for `host.isConnected`, so a framework that
     * builds a widget and inserts it afterwards got an unstyled one — and it
     * stayed unstyled until something else made it render. Measured before
     * the change: nought stylesheets at creation, nought after insertion, one
     * only after an unrelated `update()`.
     *
     * The wait was for shadow DOM: a detached host cannot say which root it
     * will end up in. So the sheet is written straight away and written again
     * once the host is somewhere real, where `ensureStyles` refuses a second
     * copy in a root that already has one.
     */
    const host = document.createElement('div'); // deliberately not in the document
    const field = createRangeField(host, { timeZone: zone });
    destroy = () => { field.destroy(); host.remove(); };
    expect(document.querySelectorAll('style[data-tzslot]').length).toBeGreaterThan(0);

    document.body.append(host);
    field.update({});
    // And no second copy once it is connected.
    const ids = [...document.querySelectorAll('style[data-tzslot]')].map((s) => s.getAttribute('data-tzslot'));
    expect(ids.length).toBe(new Set(ids).size);
  });
});
