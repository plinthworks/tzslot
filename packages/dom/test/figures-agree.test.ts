import { describe, it, expect, afterEach } from 'vitest';
import { createDateField, createDateInput, AR, type DateFieldInstance } from '../src/index.js';
import { formatWith, maskWith, patternFor } from '../src/format.js';
import { Temporal } from '@tzslot/core';

/**
 * A read-only field and a typed one, writing the same figures.
 *
 * They did not. A read-only field formats through `Intl`, which writes the
 * locale's own figures; `formatWith` built its numbers with `String(n)` and
 * `padStart`, which writes ASCII. On one screen in `ar-EG` the trigger read
 * `٢٣‏/٠٩‏/٢٠٢٦` and the typed field `23‏/09‏/2026` — same date, same locale,
 * two numbering systems. Reported by a consumer running both side by side,
 * and held in place by two tests here that asserted the ASCII.
 *
 * What this pins is the agreement rather than either answer, because neither
 * is ours to choose: `Intl` decides, and it decides differently for `ar-EG`
 * and `ar-MA`. A table of figures would have got Morocco wrong.
 */

let built: DateFieldInstance | undefined;
afterEach(() => {
  built?.destroy();
  built = undefined;
  document.body.replaceChildren();
});

const day = Temporal.PlainDate.from('2026-09-23');
/** The script a string's figures are written in, as one representative digit. */
const script = (text: string): string | null => {
  const figure = /\p{Nd}/u.exec(text);
  if (!figure) return null;
  // The zero of whichever block this digit belongs to, which identifies the
  // numbering system without naming it.
  const code = figure[0]!.codePointAt(0)!;
  for (let back = 0; back < 10; back++) {
    const below = code - back - 1;
    if (!/\p{Nd}/u.test(String.fromCodePoint(below))) return String.fromCodePoint(code - back);
  }
  return null;
};

const LOCALES = ['ar-EG', 'ar-MA', 'fa-IR', 'fr-FR', 'en-GB', 'hi-IN'];

describe('the two paths write the same figures', () => {
  for (const locale of LOCALES) {
    it(locale, () => {
      const readOnly = document.createElement('div');
      document.body.append(readOnly);
      built = createDateField(readOnly, { locale, messages: AR, value: day });
      const shown = readOnly.querySelector('.tz-field__trigger')?.textContent ?? '';

      const typedHost = document.createElement('div');
      document.body.append(typedHost);
      createDateInput(typedHost, { locale, messages: AR, value: { date: day, time: null } });
      const typed =
        typedHost.querySelector<HTMLInputElement>('.tz-dateinput__input')?.value ?? '';

      expect(shown, 'the read-only field wrote no figures').not.toBe('');
      expect(typed, 'the typed field wrote no figures').not.toBe('');
      expect(script(typed), `${locale}: read-only "${shown}" against typed "${typed}"`).toBe(
        script(shown),
      );
    });
  }

  it('and Intl is what decides, not a table of ours', () => {
    // Morocco writes Arabic in Latin figures and Egypt in Arabic-Indic. A
    // table mapping "Arabic" to one set would have been wrong for one of them,
    // which is why this asks Intl.
    const egypt = formatWith('dd/MM/yyyy', { date: day }, 'ar-EG');
    const morocco = formatWith('dd/MM/yyyy', { date: day }, 'ar-MA');
    expect(script(egypt)).toBe('٠');
    expect(script(morocco)).toBe('0');
  });

  it('including the mask, so a field does not flip on reformatting', () => {
    /*
     * The mask counts normalised text — it must, since a reader may type in
     * any script and a width is a width — so it used to hand ASCII back while
     * `formatWith` beside it wrote the locale's. A field in `ar-EG` would have
     * shown Latin while typing and Arabic-Indic the moment it reformatted.
     */
    const shape = patternFor('ar-EG', { time: false });
    const masked = maskWith(shape, '20092026', AR, 'ar-EG');
    const formatted = formatWith(shape, { date: Temporal.PlainDate.from('2026-09-20') }, 'ar-EG');
    expect(script(masked)).toBe(script(formatted));
    // And with no locale it stays ASCII, which is what a test and a log want.
    expect(script(maskWith(shape, '20092026', AR))).toBe('0');
  });
});
