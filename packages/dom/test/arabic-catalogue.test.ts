import { describe, it, expect } from 'vitest';
import { EN, FR, AR, type TzslotMessages } from '../src/messages.js';

/**
 * The Arabic catalogue, and the one thing in it that is not translation.
 *
 * Arabic has six plural categories where English has two. The catalogue's
 * countable sentences were written as functions rather than templates with a
 * hole in them, for exactly this; Arabic is the first language to need it, and
 * the shape held without a change.
 *
 * The figures are deliberately absent from the catalogue: `locale` decides
 * them. `ar-EG` writes ٢٠ and `ar-MA` writes 20, and both may want these
 * words.
 */
const keys = (m: TzslotMessages) => Object.keys(m).sort();

describe('the Arabic catalogue', () => {
  it('has every key the others have, and no more', () => {
    expect(keys(AR)).toEqual(keys(EN));
    expect(keys(AR)).toEqual(keys(FR));
    expect(Object.keys(AR.presets).sort()).toEqual(Object.keys(EN.presets).sort());
  });

  it('leaves nothing in English', () => {
    const arabic = /[؀-ۿ]/;
    const untranslated: string[] = [];
    for (const [key, value] of Object.entries(AR)) {
      if (typeof value !== 'string') continue;
      // A mark is a mark in any language.
      if (key === 'winterMark') continue;
      if (!arabic.test(value)) untranslated.push(`${key}: ${value}`);
    }
    for (const [key, value] of Object.entries(AR.presets)) {
      if (!arabic.test(value)) untranslated.push(`presets.${key}: ${value}`);
    }
    expect(untranslated).toEqual([]);
  });

  it('counts days the way Arabic counts them, not the way English does', () => {
    const said = (days: number) => AR.dailySummary({ days, total: '8h' }).split(' ')[1];
    // The six categories, each with a number that falls in it.
    expect(said(1)).toBe('يوم'); // one
    expect(said(2)).toBe('يومان'); // two — a form English has no use for
    expect(said(3)).toBe('أيام'); // few, 3 to 10
    expect(said(11)).toBe('يوماً'); // many, 11 to 99
    expect(said(100)).toBe('يوم'); // other
    expect(said(0)).toBe('أيام'); // zero
    // And the English catalogue, for contrast: two forms for all six numbers.
    const english = [0, 1, 2, 3, 11, 100].map((d) => EN.dailySummary({ days: d, total: '8h' }).split(' ')[1]);
    expect(new Set(english).size).toBe(2);
  });

  it('says morning and afternoon in Arabic, which French does not', () => {
    expect(AR.am).toBe('ص');
    expect(AR.pm).toBe('م');
    // Noted rather than asserted as correct: FR ships the English words here,
    // which looks like a gap nobody has reported.
    expect(FR.am).toBe('AM');
  });
});
