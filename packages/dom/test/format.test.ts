import { describe, it, expect } from 'vitest';
import { formatWith, parseWith, patternFor } from '../src/index.js';
import { Temporal } from '@tzslot/core';

const date = Temporal.PlainDate.from('2026-09-20');
const time = Temporal.PlainTime.from('09:15');

describe('writing', () => {
  it('fills the numeric tokens', () => {
    expect(formatWith('yyyy-MM-dd HH:mm', { date, time })).toBe('2026-09-20 09:15');
    expect(formatWith('d/M/yy', { date })).toBe('20/9/26');
    expect(formatWith('hh:mm a', { time })).toBe('09:15 AM');
    expect(formatWith('hh:mm a', { time: Temporal.PlainTime.from('21:05') })).toBe('09:05 PM');
  });

  it('takes month and weekday names from the locale', () => {
    expect(formatWith('EEE d MMMM yyyy', { date }, 'fr-FR')).toBe('dim. 20 septembre 2026');
    expect(formatWith('MMM d, yyyy', { date }, 'en-US')).toBe('Sep 20, 2026');
  });

  it('keeps quoted words, and leaves out what it has no value for', () => {
    expect(formatWith("d MMMM yyyy 'à' HH:mm", { date, time }, 'fr-FR')).toBe('20 septembre 2026 à 09:15');
    expect(formatWith('yyyy-MM-dd HH:mm', { date })).toBe('2026-09-20');
  });
});

describe('reading back', () => {
  it('reads what the same pattern wrote', () => {
    const read = parseWith('yyyy-MM-dd HH:mm', '2026-09-20 09:15')!;
    expect(read.date!.toString()).toBe('2026-09-20');
    expect(read.time!.toString()).toBe('09:15:00');
  });

  it('accepts one or two digits where the pattern allows it, and spare spaces', () => {
    const read = parseWith('d/M/yyyy', '  5/9/2026 ')!;
    expect(read.date!.toString()).toBe('2026-09-05');
  });

  it('understands the half of the day', () => {
    expect(parseWith('hh:mm a', '09:15 PM')!.time!.toString()).toBe('21:15:00');
    expect(parseWith('hh:mm a', '12:00 AM')!.time!.toString()).toBe('00:00:00');
  });

  it('refuses what is not a date, rather than inventing one', () => {
    expect(parseWith('yyyy-MM-dd', '2026-02-31')).toBeNull();
    expect(parseWith('yyyy-MM-dd', '2026-09')).toBeNull();
    expect(parseWith('yyyy-MM-dd HH:mm', '2026-09-20 25:00')).toBeNull();
    expect(parseWith('yyyy-MM-dd', 'demain')).toBeNull();
  });

  it('refuses to read a pattern that names its month: three spellings, one month', () => {
    expect(parseWith('MMMM d, yyyy', 'September 20, 2026')).toBeNull();
  });
});

describe('the pattern a locale writes', () => {
  it('follows the order and separators of the locale', () => {
    expect(patternFor('fr-FR')).toBe('dd/MM/yyyy');
    expect(patternFor('en-US')).toBe('MM/dd/yyyy');
    expect(patternFor('sv-SE')).toBe('yyyy-MM-dd');
  });

  it('adds the clock the locale uses', () => {
    expect(patternFor('fr-FR', { time: true })).toBe('dd/MM/yyyy HH:mm');
    expect(patternFor('en-US', { time: true })).toBe('MM/dd/yyyy hh:mm a');
  });

  it('what it writes, it can read back', () => {
    for (const locale of ['fr-FR', 'en-US', 'sv-SE', 'de-DE']) {
      const pattern = patternFor(locale, { time: true });
      const text = formatWith(pattern, { date, time }, locale);
      const read = parseWith(pattern, text)!;
      expect(read.date!.toString(), locale).toBe('2026-09-20');
      expect(read.time!.toString(), locale).toBe('09:15:00');
    }
  });
});
