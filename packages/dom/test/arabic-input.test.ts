import { describe, it, expect } from 'vitest';
import { patternFor, parseWith, maskWith, formatWith } from '../src/format.js';
import { Temporal } from '@tzslot/core';

/**
 * A date can be typed in an Arabic locale.
 *
 * It could not. `patternFor` derives its shape from `formatToParts`, and an
 * Arabic locale hands back literals carrying U+200F -- the mark that keeps a
 * date from being reordered on screen beside Arabic text. The pattern became
 * `dd<RLM>/MM<RLM>/yyyy`, `parseWith` built a regex demanding those marks
 * literally, and no keyboard produces one: every Arabic locale refused
 * `20/09/2026`, Latin figures and all.
 *
 * Typing the figures a reader's own keyboard writes failed differently and
 * worse. `\d` matches neither the Arabic-Indic range nor the Persian one, so
 * the mask -- on by default -- filtered every keystroke away and wrote the
 * empty string back into the field. The field emptied itself as someone typed
 * into it, with nothing said.
 *
 * The marks stay in the pattern, because they are doing a job. They are
 * stripped on the way into the parser only, where they were doing none.
 */
const DAY = Temporal.PlainDate.from('2026-09-20');
const ARABIC = ['ar', 'ar-EG', 'ar-SA', 'ar-MA'] as const;
const day = (text: string, locale: string) =>
  parseWith(patternFor(locale, { time: false }), text)?.date?.toString() ?? null;

describe('typing a date in Arabic', () => {
  it('keeps the marks in what it writes', () => {
    // Not cosmetic: without them the parts reorder beside Arabic text.
    const written = formatWith(patternFor('ar-EG', { time: false }), { date: DAY }, 'ar-EG');
    expect(written).toContain('‏');
    expect(written).toBe('20‏/09‏/2026');
  });

  it.each(ARABIC)('accepts Latin figures typed into %s', (locale) => {
    expect(day('20/09/2026', locale)).toBe('2026-09-20');
  });

  it.each(ARABIC)('accepts Arabic-Indic figures typed into %s', (locale) => {
    expect(day('٢٠/٠٩/٢٠٢٦', locale)).toBe('2026-09-20');
  });

  it.each(ARABIC)('accepts Persian figures typed into %s', (locale) => {
    expect(day('۲۰/۰۹/۲۰۲۶', locale)).toBe('2026-09-20');
  });

  it('reads back exactly what it wrote, marks included', () => {
    for (const locale of ARABIC) {
      const shape = patternFor(locale, { time: false });
      expect(day(formatWith(shape, { date: DAY }, locale), locale)).toBe('2026-09-20');
    }
  });

  it('does not empty the field as an Arabic reader types', () => {
    const shape = patternFor('ar-EG', { time: false });
    // Keystroke by keystroke, which is how the mask is called.
    const typed = '٢٠٠٩٢٠٢٦';
    for (let i = 1; i <= typed.length; i++) {
      expect(maskWith(shape, typed.slice(0, i))).not.toBe('');
    }
    expect(maskWith(shape, typed)).toBe('20‏/09‏/2026');
  });

  it('leaves a Latin locale exactly as it was', () => {
    expect(patternFor('fr-FR', { time: false })).toBe('dd/MM/yyyy');
    expect(day('20/09/2026', 'fr-FR')).toBe('2026-09-20');
    expect(maskWith('dd/MM/yyyy', '20092026')).toBe('20/09/2026');
    // And a Latin field now takes Arabic figures too, which costs nothing and
    // spares a reader switching keyboards to fill one box.
    expect(day('٢٠/٠٩/٢٠٢٦', 'fr-FR')).toBe('2026-09-20');
  });
});
