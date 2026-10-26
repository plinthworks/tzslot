import { describe, it, expect, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * Escape closes the topmost layer, and lets the next press reach the one under.
 *
 * Our panel used to listen on the document in the bubble phase without
 * stopping the event, which cost a consumer both ways. A field inside their
 * own popup: one press closed our panel *and* their popup, so a reader
 * dismissing a calendar lost the form behind it. And where their popup
 * handled Escape first, it closed and we never heard it.
 *
 * This is about a key. A different consumer relies on our panel not being
 * inside their drawer, so a click in it never reaches their veil — that is
 * about where the panel lives in the DOM and is checked elsewhere. The two
 * requests looked like they conflicted and do not.
 */

let field: RangeFieldInstance | undefined;
afterEach(() => {
  field?.destroy();
  field = undefined;
  document.body.replaceChildren();
});

const escape = () =>
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

/** A host popup around the field, closing on Escape as every modal does. */
function screen() {
  const popup = document.createElement('div');
  const host = document.createElement('div');
  popup.append(host);
  document.body.append(popup);
  let closedTheirs = 0;
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closedTheirs++;
  });
  field = createRangeField(host, {
    timeZone: 'Europe/Paris',
    today: Temporal.PlainDate.from('2026-09-20'),
    months: 1,
  });
  return { theirs: () => closedTheirs };
}

describe('Escape, one layer at a time', () => {
  it('closes our panel and leaves the popup around it alone', () => {
    const { theirs } = screen();
    field!.open();
    expect(field!.isOpen).toBe(true);

    escape();
    expect(field!.isOpen, 'the panel should have closed').toBe(false);
    expect(theirs(), 'the popup around it should not have heard it').toBe(0);
  });

  it('and the next press reaches the popup', () => {
    const { theirs } = screen();
    field!.open();
    escape();
    escape();
    expect(theirs(), 'with nothing of ours open, Escape belongs to the page').toBe(1);
  });

  it('a press with no panel open passes straight through', () => {
    const { theirs } = screen();
    escape();
    expect(theirs()).toBe(1);
  });

  it('and it is prevented, so a native dialog does not also act on it', () => {
    screen();
    field!.open();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('while a press that closes nothing is not prevented', () => {
    screen();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('and another key is never touched', () => {
    const { theirs } = screen();
    field!.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(field!.isOpen).toBe(true);
    expect(theirs()).toBe(0);
  });
});
