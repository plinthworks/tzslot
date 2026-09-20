import { describe, it, expect } from 'vitest';
import { presetRange, matchesPreset, Temporal, type PresetName } from '../src/index.js';

// A Sunday, deliberately: the week presets are where a first day of week bites.
const today = Temporal.PlainDate.from('2026-09-20');
const span = (name: PresetName, firstDayOfWeek?: 1 | 7) => {
  const range = presetRange(name, { today, ...(firstDayOfWeek ? { firstDayOfWeek } : {}) });
  return `${range.start}/${range.end}`;
};

describe('what each preset means', () => {
  it('counts the recent ones back from today, today included', () => {
    expect(span('today')).toBe('2026-09-20/2026-09-20');
    expect(span('yesterday')).toBe('2026-09-19/2026-09-19');
    // Six days back and today itself: what an analytics screen means by it.
    expect(span('last7Days')).toBe('2026-09-14/2026-09-20');
    expect(span('last14Days')).toBe('2026-09-07/2026-09-20');
    expect(span('last30Days')).toBe('2026-08-22/2026-09-20');
  });

  it('starts a week where it is told to', () => {
    expect(span('thisWeek', 1)).toBe('2026-09-14/2026-09-20'); // Monday to Sunday
    expect(span('thisWeek', 7)).toBe('2026-09-20/2026-09-26'); // Sunday to Saturday
    expect(span('lastWeek', 1)).toBe('2026-09-07/2026-09-13');
  });

  it('takes months as they really are', () => {
    expect(span('thisMonth')).toBe('2026-09-01/2026-09-30');
    expect(span('lastMonth')).toBe('2026-08-01/2026-08-31');
    expect(span('thisYear')).toBe('2026-01-01/2026-12-31');
  });

  it('handles the short month behind a long one', () => {
    const march = { today: Temporal.PlainDate.from('2026-03-31') };
    const last = presetRange('lastMonth', march);
    expect(`${last.start}/${last.end}`).toBe('2026-02-01/2026-02-28');
  });
});

describe('ticking the one in force', () => {
  it('matches a range against a preset', () => {
    const range = presetRange('last7Days', { today });
    expect(matchesPreset('last7Days', range, { today })).toBe(true);
    expect(matchesPreset('last14Days', range, { today })).toBe(false);
  });
});
