import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRangeField, type RangeFieldInstance } from '../src/index.js';
import { FR } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * What an empty field says.
 *
 * A day, a period and a period with hours all read "Choose a range", so the
 * three shapes were indistinguishable until someone opened the panel. A mask
 * shows how many dates are wanted, whether the hours count, and the order the
 * locale writes them in — which helps the typing as well as the reading.
 */
let host: HTMLElement;
let field: RangeFieldInstance;
const lu = () => host.querySelector('.tz-field__text')!.textContent;
const make = (options = {}) => {
  field = createRangeField(host, {
    timeZone: 'Europe/Paris',
    locale: 'fr-FR',
    messages: FR,
    today: Temporal.PlainDate.from('2026-09-24'),
    ...options,
  });
};

beforeEach(() => { host = document.createElement('div'); document.body.append(host); });
afterEach(() => { field?.destroy(); host.remove(); document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove()); });

describe('an empty field shows its shape', () => {
  it('one mask for one day', () => {
    make({ singleDay: true });
    expect(lu()).toBe('--/--/----');
  });

  it('two, named, for a period', () => {
    make();
    expect(lu()).toBe('Du --/--/----  Au --/--/----');
  });

  it('and the hours when the hours count', () => {
    make({ showTime: true });
    expect(lu()).toBe('Du --/--/---- --:--  Au --/--/---- --:--');
  });

  it('follows the locale rather than a written-out pattern', () => {
    // ja-JP writes the year first. Nobody has to think about it.
    make({ locale: 'ja-JP', singleDay: true });
    expect(lu()).toBe('----/--/--');
  });

  it('gives way to a placeholder the screen wrote itself', () => {
    make({ placeholder: 'choisir une période' });
    expect(lu()).toBe('choisir une période');
  });

  it('is gone as soon as there is a value', () => {
    make();
    field.update({
      value: {
        start: Temporal.Instant.from('2026-09-22T22:00:00Z'),
        end: Temporal.Instant.from('2026-09-24T22:00:00Z'),
      },
    });
    expect(lu()).toBe('23/09/2026 – 24/09/2026');
  });
});
