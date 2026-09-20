import { Temporal } from '@tzslot/core';
import type { PlainDate, PlainTime } from '@tzslot/core';

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

/** A day, a time, or both, written out by a pattern. */
export function formatWith(
  pattern: string,
  value: { date?: PlainDate | null; time?: PlainTime | null },
  locale?: string | undefined,
): string {
  const { date = null, time = null } = value;
  // A UTC Date only to borrow Intl's month and weekday names.
  const asDate = date ? new Date(Date.UTC(date.year, date.month - 1, date.day)) : null;
  const hour12 = time ? (time.hour % 12) || 12 : 0;

  const written = pattern.replace(TOKENS, (token) => {
    if (token.startsWith("'")) return token.slice(1, -1);
    if (!date && 'yMdE'.includes(token[0]!)) return '';
    if (!time && 'Hhma'.includes(token[0]!)) return '';
    switch (token) {
      case 'yyyy': return String(date!.year);
      case 'yy': return pad(date!.year % 100);
      case 'MMMM': return names(locale, 'month', 'long').format(asDate!);
      case 'MMM': return names(locale, 'month', 'short').format(asDate!);
      case 'MM': return pad(date!.month);
      case 'M': return String(date!.month);
      case 'dd': return pad(date!.day);
      case 'd': return String(date!.day);
      case 'EEEE': return names(locale, 'weekday', 'long').format(asDate!);
      case 'EEE': return names(locale, 'weekday', 'short').format(asDate!);
      case 'HH': return pad(time!.hour);
      case 'H': return String(time!.hour);
      case 'hh': return pad(hour12);
      case 'h': return String(hour12);
      case 'mm': return pad(time!.minute);
      case 'a': return time!.hour >= 12 ? 'PM' : 'AM';
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
): { date: PlainDate | null; time: PlainTime | null } | null {
  const order: string[] = [];
  let source = '^\\s*';
  let rest = pattern;

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
    source += token === 'a' ? '([AaPp][Mm])' : token === 'yyyy' ? '(\\d{4})' : '(\\d{1,2})';
  }
  source += '\\s*$';

  const found = new RegExp(source).exec(text);
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
    const afternoon = (parts['a'] ?? '').toLowerCase().startsWith('p');
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
