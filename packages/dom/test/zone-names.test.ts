import { describe, it, expect } from 'vitest';
import { zoneName, summerFirst } from '../src/index.js';
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

describe('which of the two is summer time', () => {
  it('is the one whose clocks are further ahead', () => {
    expect(summerFirst(['+02:00', '+01:00'])).toBe(true); // Paris, the usual order
    expect(summerFirst(['+01:00', '+02:00'])).toBe(false);
    expect(summerFirst(['+11:00', '+10:30'])).toBe(true); // Lord Howe, half an hour
    expect(summerFirst(['-04:00', '-05:00'])).toBe(true); // New York
  });
});
