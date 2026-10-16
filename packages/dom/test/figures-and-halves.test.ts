import { describe, it, expect } from 'vitest';
import { patternFor, parseWith, maskWith, formatWith, toLatinFigures } from '../src/format.js';
import { AR, EN } from '../src/messages.js';
import { Temporal } from '@tzslot/core';

/**
 * Figures from any script, and the two halves of a twelve-hour day.
 *
 * The first pass at Arabic handled two ranges of figures and left five
 * scripts emptying the field as a reader typed into it — the same defect,
 * found again by review. A list of ranges would have grown by five and stayed
 * wrong; Unicode lays decimal digits out as ten contiguous points from each
 * script's own zero, so a digit's value is its distance from the first point
 * below it that is not a digit. That is a rule, and it covers scripts nobody
 * here has thought of.
 *
 * And `AM`/`PM` were written into three places while the catalogue had said
 * `ص`/`م` since Arabic shipped: the hour menus showed one word and the typed
 * field demanded the other, for the same value.
 */
const DAY = Temporal.PlainDate.from('2026-09-20');

describe('figures, whatever script wrote them', () => {
  const SCRIPTS = [
    ['Latin', '20/09/2026'],
    ['Arabic-Indic', '٢٠/٠٩/٢٠٢٦'],
    ['Persian', '۲۰/۰۹/۲۰۲۶'],
    ['Devanagari', '२०/०९/२०२६'],
    ['Bengali', '২০/০৯/২০২৬'],
    ['Thai', '๒๐/๐๙/๒๐๒๖'],
    ['Burmese', '၂၀/၀၉/၂၀၂၆'],
    ['full-width', '２０/０９/２０２６'],
  ] as const;

  it.each(SCRIPTS)('reads %s figures as the numbers they are', (_script, typed) => {
    expect(parseWith('dd/MM/yyyy', typed)?.date?.toString()).toBe('2026-09-20');
  });

  it.each(SCRIPTS)('masks %s figures instead of deleting them', (_script, typed) => {
    const bare = [...typed].filter((c) => c !== '/').join('');
    expect(maskWith('dd/MM/yyyy', bare)).toBe('20/09/2026');
  });

  it('declines rather than guesses where the rule cannot reach', () => {
    // Scripts whose digit blocks sit directly against one another leave the
    // descent no floor to find. Measured: 50 of the 760 decimal digits below
    // U+20000. They come back unchanged — never converted to a wrong value.
    const odd = String.fromCodePoint(0x116da);
    expect(toLatinFigures(odd)).toBe(odd);
    // And everything the rule does reach, it reaches correctly.
    expect(toLatinFigures('٢۲२২๒２၂')).toBe('2222222');
  });
});

describe('the two halves of a twelve-hour day', () => {
  const shape = 'dd/MM/yyyy hh:mm a';
  const afternoon = { date: DAY, time: Temporal.PlainTime.from('14:35') };

  it('are written in the language the catalogue speaks', () => {
    expect(formatWith(shape, afternoon, 'ar-EG', AR)).toBe('20/09/2026 02:35 م');
    expect(formatWith(shape, afternoon, 'en-GB', EN)).toBe('20/09/2026 02:35 PM');
  });

  it('are read back in it', () => {
    expect(parseWith(shape, '20/09/2026 02:35 م', AR)?.time?.toString().slice(0, 5)).toBe('14:35');
    expect(parseWith(shape, '20/09/2026 02:35 ص', AR)?.time?.toString().slice(0, 5)).toBe('02:35');
  });

  it('and the Latin pair is still accepted, so a Latin keyboard can fill an Arabic field', () => {
    expect(parseWith(shape, '20/09/2026 02:35 PM', AR)?.time?.toString().slice(0, 5)).toBe('14:35');
  });

  it('survive the mask, which used to drop the Arabic word and leave a space', () => {
    expect(maskWith(shape, '200920260235م', AR)).toBe('20/09/2026 02:35 م');
    expect(maskWith(shape, '200920260235p', AR)).toBe('20/09/2026 02:35 م');
  });

  it('round-trip through the locale pattern, which is where it mattered', () => {
    const derived = patternFor('ar-EG', { time: true });
    const written = formatWith(derived, afternoon, 'ar-EG', AR);
    expect(parseWith(derived, written, AR)?.time?.toString().slice(0, 5)).toBe('14:35');
  });

  it('and a caller that says nothing still gets AM and PM', () => {
    expect(formatWith(shape, afternoon, 'en-GB')).toBe('20/09/2026 02:35 PM');
    expect(parseWith(shape, '20/09/2026 02:35 PM')?.time?.toString().slice(0, 5)).toBe('14:35');
  });
});
