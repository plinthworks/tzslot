import { Temporal } from '@tzslot/core/lazy';
import type { PlainDate, PlainTime } from '@tzslot/core/lazy';

/**
 * Writing and reading the text in a field.
 *
 * Two ways, because they answer different needs. A pattern — `yyyy-MM-dd
 * HH:mm` — gives the same text everywhere, which is what an export, an API or
 * a form that must match a document wants. Intl's styles give what each
 * reader expects in their own language. The default is Intl; a pattern is
 * what you reach for when the shape matters more than the reader.
 *
 * Only what a field needs is here. Anything more elaborate belongs in
 * `displayWith`, which hands the value straight to the caller.
 *
 * | | |
 * |---|---|
 * | `yyyy` `yy` | year |
 * | `MMMM` `MMM` `MM` `M` | month: name, short name, 09, 9 |
 * | `dd` `d` | day |
 * | `EEEE` `EEE` | weekday name, short name |
 * | `HH` `H` | hour, 24-hour |
 * | `hh` `h` | hour, 12-hour |
 * | `mm` | minute |
 * | `a` | AM or PM |
 *
 * Anything else is written out as it stands; put letters in single quotes to
 * keep them — `'le' d MMMM`.
 */
const TOKENS = /(yyyy|yy|MMMM|MMM|MM|M|dd|d|EEEE|EEE|HH|H|hh|h|mm|a|'[^']*')/g;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

const names = (locale: string | undefined, option: 'month' | 'weekday', style: 'long' | 'short') =>
  new Intl.DateTimeFormat(locale, { [option]: style, timeZone: 'UTC' });

/**
 * A number in the figures the locale writes, padded to a width.
 *
 * This file wrote `String(n)` and `padStart`, so a pattern always came out in
 * ASCII while the read-only fields beside it formatted through `Intl` and came
 * out in the locale's own. On one screen in `ar-EG`: the trigger read
 * `٢٣‏/٠٩‏/٢٠٢٦` and the typed field `23‏/09‏/2026`. Same date, same locale,
 * two numbering systems — reported by a consumer running both.
 *
 * `Intl` is asked rather than a table consulted, so the answer is the locale's
 * and not ours: `ar-EG` writes ٢٣ and `ar-MA` writes 23, which is the point
 * 2.2.0 made about figures and then failed to apply here. `useGrouping: false`
 * because a year is not a quantity — otherwise 2026 comes out `٢٬٠٢٦`.
 */
const figureWriter = (locale: string | undefined) => {
  const widths = new Map<number, Intl.NumberFormat>();
  return (value: number, width = 1): string => {
    let format = widths.get(width);
    if (!format) {
      format = new Intl.NumberFormat(locale, { useGrouping: false, minimumIntegerDigits: width });
      widths.set(width, format);
    }
    return format.format(value);
  };
};

/**
 * The same, for a string of Latin figures already laid out.
 *
 * The mask normalises what it is handed to ASCII before it can count it, so by
 * the time there is something to show the figures are Latin whatever the
 * reader typed. This puts them back into the locale's.
 */
const inLocaleFigures = (text: string, locale: string | undefined): string => {
  const write = figureWriter(locale);
  return text.replace(/[0-9]/g, (digit) => write(Number(digit)));
};

/** A day, a time, or both, written out by a pattern. */
export function formatWith(
  pattern: string,
  value: { date?: PlainDate | null; time?: PlainTime | null },
  locale?: string | undefined,
  halves: Halves = LATIN_HALVES,
): string {
  const { date = null, time = null } = value;
  // A UTC Date only to borrow Intl's month and weekday names.
  const asDate = date ? new Date(Date.UTC(date.year, date.month - 1, date.day)) : null;
  const hour12 = time ? (time.hour % 12) || 12 : 0;
  const write = figureWriter(locale);

  const written = pattern.replace(TOKENS, (token) => {
    if (token.startsWith("'")) return token.slice(1, -1);
    if (!date && 'yMdE'.includes(token[0]!)) return '';
    if (!time && 'Hhma'.includes(token[0]!)) return '';
    switch (token) {
      case 'yyyy': return write(date!.year, 4);
      case 'yy': return write(date!.year % 100, 2);
      case 'MMMM': return names(locale, 'month', 'long').format(asDate!);
      case 'MMM': return names(locale, 'month', 'short').format(asDate!);
      case 'MM': return write(date!.month, 2);
      case 'M': return write(date!.month);
      case 'dd': return write(date!.day, 2);
      case 'd': return write(date!.day);
      case 'EEEE': return names(locale, 'weekday', 'long').format(asDate!);
      case 'EEE': return names(locale, 'weekday', 'short').format(asDate!);
      case 'HH': return write(time!.hour, 2);
      case 'H': return write(time!.hour);
      case 'hh': return write(hour12, 2);
      case 'h': return write(hour12);
      case 'mm': return write(time!.minute, 2);
      case 'a': return time!.hour >= 12 ? halves.pm : halves.am;
      default: return token;
    }
  });

  // A pattern written with only half its value leaves its separators behind:
  // "yyyy-MM-dd HH:mm" with no time would read "2026-09-20 :".
  return written
    .replace(/\s+/g, ' ')
    .replace(/^[\s:/,.\u2013-]+/, '')
    .replace(/[\s:/,.\u2013-]+$/, '')
    .trim();
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The marks Intl puts between the parts of a date in a right-to-left locale.
 *
 * `formatToParts` hands back literals carrying U+200F, so a pattern derived
 * from an Arabic locale reads `dd<RLM>/MM<RLM>/yyyy`. They belong there: they
 * are what keeps `20/09/2026` from being reordered on screen beside Arabic
 * text. What they must not do is reach the parser, which built a regex
 * demanding them literally -- so in every Arabic locale, typing `20/09/2026`
 * was refused, and there is no key on any keyboard that produces one.
 */
const BIDI_MARKS = /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069\u200B-\u200D\uFEFF]/g;

/**
 * What a decimal digit is worth, whatever script wrote it.
 *
 * Unicode lays each set of decimal digits out as ten contiguous code points
 * beginning at its own zero, so a digit's value is its distance from the
 * first code point below it that is not a digit. That is a rule rather than a
 * list, which matters: the first version of this handled Arabic-Indic and
 * Persian, and a review found the same silent emptying still happening for
 * Devanagari, Bengali, Thai, Burmese and the full-width figures a Japanese
 * IME produces by default. A list would have grown by five and stayed wrong.
 *
 * Measured across every decimal digit below U+20000: 710 of 760 resolve, and
 * the 50 that do not are in scripts whose blocks sit directly against one
 * another, where the descent cannot find a floor. Those come back as -1 and
 * are left alone — the rule never converts a digit to the wrong value, it
 * only declines.
 */
const figureValue = (code: number): number => {
  for (let step = 0; step < 10; step++) {
    const below = code - step - 1;
    if (below < 0 || !/\p{Nd}/u.test(String.fromCodePoint(below))) return step;
  }
  return -1;
};

/**
 * Figures from any script, as the Latin ones the parser reads.
 *
 * A reader whose keyboard writes ٢٠ or २० or ２０ is typing a twenty. `\d`
 * matches none of them, so `Number` returned NaN and the mask, filtering on
 * `[0-9]`, deleted every keystroke as it arrived: the field emptied itself
 * while someone was typing into it.
 */
/**
 * The two halves of a twelve-hour day, as words a reader knows.
 *
 * `AM` and `PM` were written into three places here, while the catalogue has
 * said `ص` and `م` since Arabic shipped: the hour menus showed one and the
 * typed field demanded the other, for the same value. The default keeps every
 * caller that does not care working exactly as before.
 */
export interface Halves {
  readonly am: string;
  readonly pm: string;
}
const LATIN_HALVES: Halves = { am: 'AM', pm: 'PM' };

export const toLatinFigures = (text: string) =>
  text.replace(/\p{Nd}/gu, (figure) => {
    const value = figureValue(figure.codePointAt(0)!);
    return value < 0 ? figure : String(value);
  });

/** What a reader typed, as the parser can read it. Display is untouched. */
const asTyped = (text: string) => toLatinFigures(text).replace(BIDI_MARKS, '');

/** How wide each token is when it is written padded, or null when it varies. */
const WIDTHS: Record<string, number> = { yyyy: 4, MM: 2, dd: 2, HH: 2, hh: 2, mm: 2, a: 2 };

/** A pattern split into the parts that take input and the parts that separate them. */
function pieces(pattern: string): { token?: string; literal?: string }[] {
  const out: { token?: string; literal?: string }[] = [];
  let rest = pattern;
  while (rest.length > 0) {
    const match = TOKENS.exec(rest);
    TOKENS.lastIndex = 0;
    if (!match) {
      out.push({ literal: rest });
      break;
    }
    if (match.index > 0) out.push({ literal: rest.slice(0, match.index) });
    const token = match[0]!;
    out.push(token.startsWith("'") ? { literal: token.slice(1, -1) } : { token });
    rest = rest.slice(match.index + token.length);
  }
  return out;
}

/**
 * Typing help, the way a card number gets its spaces: the separators appear
 * as the figures are entered, so nobody has to wonder whether this field
 * wants slashes or dashes.
 *
 * Only for patterns whose every part has a fixed width — `dd/MM/yyyy HH:mm`
 * does, `d/M/yyyy` does not, because two figures could be a day or a day and
 * the start of a month. Given one of those, the text is left alone.
 */
export function maskWith(
  pattern: string,
  text: string,
  halves: Halves = LATIN_HALVES,
  locale?: string | undefined,
): string {
  const parts = pieces(pattern);
  if (parts.some((part) => part.token !== undefined && WIDTHS[part.token] === undefined)) return text;
  /*
   * A figure inside a literal is indistinguishable from one a reader typed.
   *
   * The mask is handed the field's whole text and lays it out again, keeping
   * what looks like a figure. A pattern whose literal holds one -- `'الربع ١'
   * dd/MM/yyyy`, or any era or quarter written with numbers -- feeds its own
   * literal back in as input: measured, `الربع ١ 20/09/2026` came out as
   * `الربع ١ 12/00/9202`, with the day and month built from the wrong
   * figures. That was true of a Latin figure before this file knew about any
   * other, so it is older than the Arabic work; accepting more figure ranges
   * is what made it reachable in practice.
   *
   * Handing the text back is what the line above already does for a pattern
   * the mask cannot handle. One more thing it cannot handle.
   */
  if (parts.some((part) => part.literal !== undefined && /\p{Nd}/u.test(part.literal))) return text;

  // Normalised on the way in only. The literals written back out below are
  // the pattern's own, marks included, so the field still reads correctly
  // beside Arabic text.
  // Figures, Latin letters, and whatever the two halves of the day begin with
  // in this language — `ص` is a letter nobody's ASCII class matches.
  const halfMarks = new Set([halves.am[0], halves.pm[0]].filter(Boolean) as string[]);
  const typed = [...asTyped(text)].filter((c) => /[0-9A-Za-z]/.test(c) || halfMarks.has(c));
  let at = 0;
  let out = '';
  /** The separator after a part that is full comes straight away: that is the help. */
  let justFilled = false;
  for (const part of parts) {
    if (part.literal !== undefined) {
      if (at >= typed.length && !justFilled) break;
      out += part.literal;
      justFilled = false;
      continue;
    }
    if (at >= typed.length) break;
    const width = WIDTHS[part.token!]!;
    if (part.token === 'a') {
      const half = typed[at]!;
      const lower = half.toLowerCase();
      // Either the half's own first character, or the Latin a/p every
      // keyboard can reach — a reader should not have to switch to type one.
      const morning = half === halves.am[0] || (lower === 'a' && halves.am[0] !== halves.pm[0]);
      const afternoon = half === halves.pm[0] || lower === 'p';
      if (!morning && !afternoon) break;
      out += morning ? halves.am : halves.pm;
      at += typed.slice(at, at + 2).join('').length;
      justFilled = true;
      continue;
    }
    const figures = typed.slice(at, at + width).filter((c) => /\d/.test(c));
    if (figures.length === 0) break;
    out += figures.join('');
    at += figures.length;
    if (figures.length < width) break; // still typing this part: no separator yet
    justFilled = true;
  }
  /*
   * Laid out in ASCII, written back in the locale's figures.
   *
   * Everything above counts normalised text — it has to, because a reader may
   * type in any script and a width is a width. But handing ASCII back would
   * make a field in `ar-EG` flip: Latin while typing, Arabic-Indic the moment
   * it reformats. One of the two had to move, and the one that moves is this
   * one, because `formatWith` beside it now writes what `Intl` writes.
   */
  return locale ? inLocaleFigures(out, locale) : out;
}

/**
 * Reading back what a pattern wrote — the numeric parts of it.
 *
 * Month and weekday names are not parsed: "septembre" and "Sept" and "sept."
 * are the same month in three spellings, and guessing between them is how a
 * field ends up storing the wrong date silently. A pattern that names its
 * month is a pattern to display, not one to type into.
 */
export function parseWith(
  pattern: string,
  text: string,
  halves: Halves = LATIN_HALVES,
): { date: PlainDate | null; time: PlainTime | null } | null {
  const order: string[] = [];
  let source = '^\\s*';
  /*
   * Both sides read in the same alphabet, which they did not at first.
   *
   * Only the text was normalised, so a pattern whose literal carries an
   * Arabic-Indic figure -- `dd/MM/yyyy '(١٤٤٨ هـ)'`, a screen annotating the
   * Hijri year -- built a regex demanding ١٤٤٨ against text where the figures
   * had just been turned into 1448. It read before this change and returned
   * null after it: a regression, and the mirror image of the bug being fixed.
   *
   * Normalising the pattern is safe here because `parseWith` only ever
   * extracts numbers from it. What the field *writes* comes from the pattern
   * untouched, so a literal still shows the figures its author chose.
   */
  let rest = asTyped(pattern);

  while (rest.length > 0) {
    const match = TOKENS.exec(rest);
    TOKENS.lastIndex = 0;
    if (!match) {
      source += escapeRegExp(rest);
      break;
    }
    source += escapeRegExp(rest.slice(0, match.index));
    const token = match[0]!;
    rest = rest.slice(match.index + token.length);
    if (token.startsWith("'")) {
      source += escapeRegExp(token.slice(1, -1));
      continue;
    }
    if (token.startsWith('M') && token.length > 2) return null; // a month name
    if (token.startsWith('E')) return null; // a weekday name
    order.push(token);
    // A padded token asks for its full width: half-typed, "09:1" is not one
    // minute past nine, it is someone still typing.
    source +=
      token === 'a'
        ? // The language's own words, and the Latin pair as well: a field that
          // wrote `ص` must read it back, and a reader with a Latin keyboard
          // should still be able to type `pm` into an Arabic field.
          `(${[halves.am, halves.pm, 'AM', 'PM'].map(escapeRegExp).join('|')})`
        : token === 'yyyy'
          ? '(\\d{4})'
          : token.length === 2
            ? '(\\d{2})'
            : '(\\d{1,2})';
  }
  source += '\\s*$';

  const found = new RegExp(source).exec(asTyped(text));
  if (!found) return null;

  const parts: Record<string, string> = {};
  order.forEach((token, i) => (parts[token] = found[i + 1]!));
  const number = (token: string) => (parts[token] === undefined ? null : Number(parts[token]));

  const year = number('yyyy') ?? (number('yy') === null ? null : 2000 + number('yy')!);
  const month = number('MM') ?? number('M');
  const day = number('dd') ?? number('d');
  const minute = number('mm');
  let hour = number('HH') ?? number('H') ?? number('hh') ?? number('h');
  if (hour !== null && (parts['hh'] !== undefined || parts['h'] !== undefined)) {
    const written = parts['a'] ?? '';
    const afternoon = written === halves.pm || written.toLowerCase().startsWith('p');
    hour = (hour % 12) + (afternoon ? 12 : 0);
  }

  let date: PlainDate | null = null;
  if (year !== null && month !== null && day !== null) {
    try {
      date = Temporal.PlainDate.from({ year, month, day }, { overflow: 'reject' });
    } catch {
      return null; // 31 February is not a day, whatever the text says
    }
  } else if (year !== null || month !== null || day !== null) return null;

  let time: PlainTime | null = null;
  if (hour !== null && minute !== null) {
    if (hour > 23 || minute > 59) return null;
    time = Temporal.PlainTime.from({ hour, minute });
  } else if (hour !== null || minute !== null) return null;

  return { date, time };
}

/**
 * The pattern a locale writes numerically — what a field should show when it
 * can also be typed into, so that reading it and typing it agree.
 */
export function patternFor(locale: string | undefined, { time = false } = {}): string {
  const date = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  })
    .formatToParts(new Date(Date.UTC(2026, 8, 20)))
    .map((part) =>
      part.type === 'year' ? 'yyyy' : part.type === 'month' ? 'MM' : part.type === 'day' ? 'dd' : part.value,
    )
    .join('')
    .trim();
  if (!time) return date;

  const clock = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const twelve = clock.formatToParts(new Date()).some((p) => p.type === 'dayPeriod');
  return `${date} ${twelve ? 'hh:mm a' : 'HH:mm'}`;
}
