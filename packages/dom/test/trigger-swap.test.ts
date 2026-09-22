import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDateTimeField, type DateTimeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * A field that swaps its trigger.
 *
 * `<tz-datetime-field>` shows an input when it can be typed into and a button
 * when it cannot, and `editable` can change while it is alive. The panel kept
 * whichever element it was handed at birth, so after the swap it hung from a
 * node no longer in the document: it measured a zero rectangle, treated the
 * real trigger as "outside" — so a click closed and reopened it — and gave
 * the focus back to nothing.
 */
let host: HTMLElement;
let field: DateTimeFieldInstance;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
  document.querySelectorAll('.tz-field__panel').forEach((node) => node.remove());
});

describe('after editable changes', () => {
  it('the panel hangs from the trigger that is actually there', () => {
    field = createDateTimeField(host, { timeZone: 'Europe/Paris', locale: 'en-GB' });
    const typed = host.querySelector('input.tz-field__trigger')!;
    expect(typed.isConnected).toBe(true);

    field.update({ editable: false });
    expect(typed.isConnected).toBe(false); // swapped for a button
    const button = host.querySelector('button.tz-field__trigger')!;

    field.open();
    // A click on the real trigger must read as inside, or the panel closes on
    // pointerdown and reopens on click — a toggle that flickers.
    const inside = button.contains(button);
    expect(inside).toBe(true);
    expect(field.isOpen).toBe(true);

    field.close();
    expect(document.activeElement).toBe(button);
  });

  it('and back again', () => {
    field = createDateTimeField(host, { timeZone: 'Europe/Paris', locale: 'en-GB', editable: false });
    field.update({ editable: true });
    const typed = host.querySelector<HTMLElement>('input.tz-field__trigger')!;
    field.open();
    field.close();
    expect(document.activeElement).toBe(typed);
  });
});
