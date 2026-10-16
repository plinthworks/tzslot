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
    /*
     * Checked against CLDR rather than against my own reading of it.
     *
     * The first version put the figure in front of every form, which reads
     * "2 two-days" for the dual -- `يومان` already means two days. CLDR prints
     * no figure for the dual nor for the singular, and gives the zero category
     * the singular, not the plural. All three were wrong here, and a review
     * measured them against `Intl.NumberFormat`'s unit data, which is CLDR.
     */
    const cldr = new Intl.NumberFormat('ar', {
      style: 'unit', unit: 'day', unitDisplay: 'long',
    });
    const ours = (days: number) => AR.dailySummary({ days, total: '8h' }).replace(' · 8h', '');

    for (const days of [0, 1, 2, 3, 10, 11, 25, 99, 100, 101]) {
      // The orthography of the tanwīn differs between sources, so the
      // comparison is on the shape of the phrase, not on the exact codepoints.
      expect(ours(days).replace('يومًا', 'يوم')).toBe(cldr.format(days).replace('يومًا', 'يوم'));
    }

    // And the point of the exercise, spelled out:
    expect(ours(2)).toBe('يومان'); // the dual carries its own count
    expect(ours(1)).toBe('يوم'); // so does the singular
    expect(ours(0)).toBe('0 يوم'); // zero takes the singular, not the plural
    expect(ours(3)).toBe('3 أيام');
    expect(ours(11)).toBe('11 يومًا');

    // English, for contrast: two forms for all of them, the figure always out
    // in front, because that is all English needs.
    const english = [0, 1, 2, 3, 11, 100].map((d) =>
      EN.dailySummary({ days: d, total: '8h' }).split(' ')[1],
    );
    expect(new Set(english).size).toBe(2);
  });

  it('says which way the clocks went, in Arabic', () => {
    // `direction` is 'back' or 'forward': a token the catalogue discriminates
    // on, not a word to print. The first version interpolated it raw, so the
    // sentence read "الساعات back" and had lost its verb. Found by review.
    const back = AR.clockChange({ direction: 'back', by: '1h', apparent: '168h', real: '169h' });
    const forward = AR.clockChange({ direction: 'forward', by: '1h', apparent: '168h', real: '167h' });
    expect(back).not.toMatch(/back|forward/);
    expect(forward).not.toMatch(/back|forward/);
    expect(back).toContain('تتأخر');
    expect(forward).toContain('تتقدم');
  });

  it('leaves no English token in any sentence it builds', () => {
    // The whole family at once, rather than the one that was caught.
    const built = [
      AR.clockChange({ direction: 'back', by: '1h', apparent: '2h', real: '3h' }),
      AR.clockChange({ direction: 'forward', by: '1h', apparent: '2h', real: '3h' }),
      ...(['back', 'forward', 'skipped', 'repeated'] as const).map((change) =>
        AR.unusualDay({ date: '20/09', real: '25h', change }),
      ),
      AR.selectedRange('x'),
      AR.spanClamped('1h'),
      AR.readingChosen({ name: 'x', offset: '+03:00' }),
      AR.nonExistentTime('02:30'),
      AR.repeatedTime('02:30', '+03:00'),
    ];
    for (const sentence of built) {
      expect(sentence).not.toMatch(/\b(back|forward|skipped|repeated|summer|winter)\b/);
    }
  });

  it('says morning and afternoon in Arabic, which French does not', () => {
    expect(AR.am).toBe('ص');
    expect(AR.pm).toBe('م');
    // Noted rather than asserted as correct: FR ships the English words here,
    // which looks like a gap nobody has reported.
    expect(FR.am).toBe('AM');
  });
});
