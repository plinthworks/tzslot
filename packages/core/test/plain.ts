/**
 * Text with every kind of space written as a plain one.
 *
 * `Intl` does not separate a number from its unit with U+0020. French uses
 * U+202F, the narrow no-break space — `formatDuration(…, { locale: 'fr-FR' })`
 * returns `7 j`, not `7 j` — and other locales reach for U+00A0. That is
 * correct typography and the library should keep it.
 *
 * What it must not do is reach the assertions. A test written
 * `expect(text).toBe('7 j')` passes and cannot be read: the character is
 * invisible in an editor, invisible in a diff, and the next person to edit
 * that line will type a normal space and spend an afternoon on it. This
 * repository has already lost a day to one invisible character — a backtick
 * inside a CSS template literal — and the lesson was to stop writing them into
 * source.
 *
 * So assertions compare content, and spacing is normalised on the way in.
 * A test that really is about which space `Intl` chose should look for the
 * code point itself and say so.
 */
export const plain = (text: string | null | undefined): string =>
  (text ?? '').replace(/[     ]/g, ' ');
