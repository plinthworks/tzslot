import { describe, it, expect } from 'vitest';
import { patternFor, parseWith, maskWith, formatWith } from '../src/format.js';
import { Temporal } from '@tzslot/core';

/**
 * Writing a date and reading it back, in every writing system shipped with.
 *
 * The Arabic fix touches a path every locale goes through, and the round-trip
 * test that existed covered four: fr-FR, en-US, sv-SE, de-DE — all Latin
 * figures, none with a bidi mark in its pattern. The one case that was broken
 * was the one no test looked at.
 *
 * So the net is cast wider than the bug: right-to-left scripts, a locale whose
 * own figures are not Latin, and the ones that were already fine.
 */
const DAY = Temporal.PlainDate.from('2026-09-20');

const LOCALES = [
  'en-GB', 'en-US', 'fr-FR', 'de-DE', 'sv-SE', 'es-ES', 'pt-BR', 'it-IT',
  'ar', 'ar-EG', 'ar-SA', 'ar-MA', 'he-IL', 'fa-IR', 'ur-PK',
  'hi-IN', 'th-TH', 'ja-JP', 'zh-CN', 'ru-RU', 'tr-TR', 'pl-PL',
  // ko-KR is left out and tested on its own below: it has a defect of its
  // own, older than anything here.
] as const;

describe('a date written then read back', () => {
  it.each(LOCALES)('survives the round trip in %s', (locale) => {
    const shape = patternFor(locale, { time: false });
    const written = formatWith(shape, { date: DAY }, locale);
    expect(parseWith(shape, written)?.date?.toString()).toBe('2026-09-20');
  });

  it.each(LOCALES)('survives it with an hour too, in %s', (locale) => {
    // Time is opt-in: `patternFor(locale)` alone is a date, which cost the
    // first run of this test twenty-three failures that were the test's fault.
    const shape = patternFor(locale, { time: true });
    const at = Temporal.PlainTime.from('14:30');
    const written = formatWith(shape, { date: DAY, time: at }, locale);
    const read = parseWith(shape, written);
    expect(read?.date?.toString()).toBe('2026-09-20');
    expect(read?.time?.toString().slice(0, 5)).toBe('14:30');
  });

  it.each(LOCALES)('is masked without being emptied, in %s', (locale) => {
    const shape = patternFor(locale, { time: false });
    // Whatever the order of the parts, eight figures fill a date.
    const masked = maskWith(shape, '20092026');
    // Either the mask declines the pattern (a varying width) and hands the
    // text back, or it fills it — never the empty string, which is what the
    // field would then write over what someone was typing.
    expect(masked).not.toBe('');
  });
});

describe('the figures a reader actually has on their keyboard', () => {
  const NUMERALS = [
    ['Latin', '20', '09', '2026'],
    ['Arabic-Indic', '٢٠', '٠٩', '٢٠٢٦'],
    ['Persian', '۲۰', '۰۹', '۲۰۲۶'],
  ] as const;

  it.each(NUMERALS)('reads %s figures as the numbers they are', (_name, d, m, y) => {
    expect(parseWith('dd/MM/yyyy', `${d}/${m}/${y}`)?.date?.toString()).toBe('2026-09-20');
  });

  it.each(NUMERALS)('and masks %s figures into the shape', (_name, d, m, y) => {
    expect(maskWith('dd/MM/yyyy', `${d}${m}${y}`)).toBe('20/09/2026');
  });

  it('refuses what is not a figure, rather than guessing', () => {
    expect(parseWith('dd/MM/yyyy', 'aa/bb/cccc')).toBeNull();
    expect(parseWith('dd/MM/yyyy', '')).toBeNull();
  });
});

describe('a pattern that ends in a literal', () => {
  /*
   * Korean writes `2026. 9. 20.`, with a full stop after the day, and the
   * pattern derived from it keeps that stop. What the field writes drops it,
   * so the field cannot read back what it just wrote.
   *
   * Older than the Arabic work and untouched by it -- measured against
   * format.ts as it stood before: the same pattern, the same truncated text,
   * the same null. It is recorded here rather than fixed in the same pass,
   * so that the fix arrives with a reader who can confirm it.
   */
  it('loses it, and then cannot read its own writing', () => {
    const shape = patternFor('ko-KR', { time: false });
    expect(shape).toBe('yyyy. MM. dd.');
    const written = formatWith(shape, { date: DAY }, 'ko-KR');
    expect(written).toBe('2026. 09. 20'); // the stop the pattern asks for is gone
    expect(parseWith(shape, written)).toBeNull(); // so nothing reads it back
  });

  it('while the same date typed with the stop is read', () => {
    expect(parseWith('yyyy. MM. dd.', '2026. 09. 20.')?.date?.toString()).toBe('2026-09-20');
  });
});
