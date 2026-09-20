import { describe, it, expect } from 'vitest';
import { zoneName, distinguish } from '../src/index.js';
import { Temporal } from '@tzslot/core';

const summer = Temporal.Instant.from('2026-10-25T00:30:00Z'); // still +02:00 in Paris
const winter = Temporal.Instant.from('2026-10-25T01:30:00Z'); // +01:00, an hour later

describe('what a zone calls itself', () => {
  it('asks the browser, in the language it is given', () => {
    expect(zoneName(summer, 'Europe/Paris', 'fr-FR')).toBe('heure d’été d’Europe centrale');
    expect(zoneName(winter, 'Europe/Paris', 'fr-FR')).toBe('heure normale d’Europe centrale');
    expect(zoneName(summer, 'Europe/Paris', 'en-GB')).toBe('Central European Summer Time');
  });
});

describe('telling two readings apart', () => {
  it('keeps only the words that differ', () => {
    expect(distinguish('Central European Summer Time', 'Central European Standard Time')).toEqual([
      'Summer',
      'Standard',
    ]);
    expect(distinguish('heure d’été d’Europe centrale', 'heure normale d’Europe centrale')).toEqual([
      'd’été',
      'normale',
    ]);
  });

  it('leaves names that share nothing, or everything, as they are', () => {
    expect(distinguish('AEST', 'AEDT')).toEqual(['AEST', 'AEDT']);
    expect(distinguish('CET', 'CET')).toEqual(['CET', 'CET']);
  });
});
