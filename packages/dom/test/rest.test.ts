import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createTimeSlots,
  createDateRange,
  createDateTimeRange,
  type TimeSlotsInstance,
  type DateRangeInstance,
  type DateTimeRangeInstance,
} from '../src/index.js';
import { Temporal } from '@tzslot/core';

/** The other three widgets, driven the way a page without a framework would. */

let host: HTMLElement;
let widget: TimeSlotsInstance | DateRangeInstance | DateTimeRangeInstance | null = null;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  widget?.destroy();
  widget = null;
  host.remove();
});

const slots = () => Array.from(host.querySelectorAll<HTMLButtonElement>('.tz-slots__slot'));
const label = (b: HTMLElement) => b.querySelector('.tz-slots__time')!.textContent;
const paris_ = (iso: string) =>
  Temporal.PlainDateTime.from(iso).toZonedDateTime('Europe/Paris', { disambiguation: 'earlier' }).toInstant();

describe('createTimeSlots', () => {
  it('draws nothing until it has a day', () => {
    widget = createTimeSlots(host, { timeZone: 'Europe/Paris' });
    expect(slots()).toHaveLength(0);
    expect(host.querySelector('.tz-slots__empty')).toBeNull();
  });

  it('offers the repeated hour twice and selects the one clicked', () => {
    const onChange = vi.fn();
    widget = createTimeSlots(host, {
      date: '2026-10-25',
      timeZone: 'Europe/Paris',
      stepMinutes: 60,
      onChange,
    });
    const twos = slots().filter((b) => label(b) === '02:00');
    expect(twos).toHaveLength(2);
    twos[1]!.click();
    expect(onChange.mock.calls[0]![0].toString()).toBe('2026-10-25T01:00:00Z');
    expect(twos[1]!.classList.contains('tz-slots__slot--selected')).toBe(true);
  });

  it('keeps the same buttons across a repaint, so the focus survives', () => {
    widget = createTimeSlots(host, { date: '2026-06-15', timeZone: 'Europe/Paris', stepMinutes: 60 });
    const nine = slots()[9]!;
    nine.focus();
    widget.update({ value: paris_('2026-06-15T10:00') });
    expect(slots()[9]).toBe(nine);
    expect(document.activeElement).toBe(nine);
  });

  it('says so when a day has nothing to offer', () => {
    widget = createTimeSlots(host, {
      date: '2026-06-15',
      timeZone: 'Europe/Paris',
      minTime: '10:00',
      maxTime: '09:00',
    });
    expect(host.querySelector('.tz-slots__empty')!.textContent).toBe('No times available.');
  });
});

describe('createDateRange', () => {
  const day = (iso: string) => host.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
  const today = Temporal.PlainDate.from('2026-06-15');

  it('takes two clicks, and previews the span in between', () => {
    const onChange = vi.fn();
    widget = createDateRange(host, { today, onChange });
    day('2026-06-10').click();
    day('2026-06-13').dispatchEvent(new MouseEvent('mouseenter'));
    expect(day('2026-06-12').classList.contains('tz-range__day--within')).toBe(true);
    day('2026-06-13').click();
    const last = onChange.mock.calls.at(-1)![0];
    expect(`${last.start}/${last.end}`).toBe('2026-06-10/2026-06-13');
  });

  it('refuses to step over a closed day, and says why', () => {
    widget = createDateRange(host, {
      today,
      isDateDisabled: (d) => d.toString() === '2026-06-12',
    });
    day('2026-06-10').click();
    day('2026-06-14').click();
    expect(widget.value.end).toBeNull();
    expect(host.querySelector('[role="alert"]')!.textContent).toContain('unavailable');
  });
});

describe('createDateTimeRange', () => {
  const box = (leg: 0 | 1) =>
    host.querySelectorAll<HTMLInputElement>('tz-datetime-field input.tz-field__trigger')[leg]!;

  it('reports the night the clocks go back as seven hours, in words', () => {
    widget = createDateTimeRange(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      value: { start: paris_('2026-10-24T23:00'), end: paris_('2026-10-25T05:00') },
    });
    expect(host.querySelector('.tz-dtr__summary')!.textContent).toBe('7h');
    expect(host.querySelector('.tz-dtr__warning')!.textContent).toContain('lasts 7h');
    // Each end is a whole date-and-time field, showing what it holds.
    expect(host.querySelectorAll('tz-datetime-field')).toHaveLength(2);
    expect(box(0).value).toBe('24/10/2026 23:00');
    expect(box(1).value).toBe('25/10/2026 05:00');
  });

  it('refuses an end before its start', () => {
    widget = createDateTimeRange(host, {
      timeZone: 'Europe/Paris',
      value: { start: paris_('2026-06-15T17:00'), end: paris_('2026-06-15T09:00') },
    });
    expect(host.querySelector('.tz-dtr__error')!.textContent).toContain('before the start');
    expect(host.querySelector('.tz-dtr__summary')).toBeNull();
  });

  it('typing into one end reports the whole interval', () => {
    const onChange = vi.fn();
    widget = createDateTimeRange(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      value: { start: paris_('2026-06-15T09:00'), end: null },
      onChange,
    });
    const end = box(1);
    end.focus();
    end.value = '15/06/2026 17:00';
    end.dispatchEvent(new Event('input', { bubbles: true }));

    expect(onChange.mock.calls.at(-1)![0].end.toString()).toBe('2026-06-15T15:00:00Z');
    expect(host.querySelector('.tz-dtr__summary')!.textContent).toBe('8h');
  });

  it('offers the day\u2019s times on each end when asked to', () => {
    widget = createDateTimeRange(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      timeLayout: 'list',
      stepMinutes: 60,
      value: { start: paris_('2026-06-15T09:00'), end: null },
    });
    host.querySelectorAll<HTMLButtonElement>('.tz-field__icon-button')[0]!.click();
    const panel = document.querySelector('.tz-field__panel')!;
    expect(panel.querySelectorAll('.tz-slots__slot').length).toBeGreaterThan(0);
  });
});

describe('whole days rather than moments', () => {
  const paris = 'Europe/Paris';
  const box = () => host.querySelector<HTMLButtonElement>('.tz-dtr__allday-box')!;
  const fields = () => host.querySelectorAll('input.tz-field__trigger');
  const shownAt = (leg: 0 | 1) => (fields()[leg] as HTMLInputElement).value;

  it('offers the switch, and hides the times when it is on', () => {
    const onChange = vi.fn();
    widget = createDateTimeRange(host, {
      timeZone: paris,
      locale: 'en-GB',
      value: { start: paris_('2026-10-24T23:00'), end: paris_('2026-10-26T05:00') },
      onChange,
    });
    expect(shownAt(0)).toBe('24/10/2026 23:00');

    box().click();

    // The days are kept; the times are gone, from the text and from the value.
    expect(shownAt(0)).toBe('24/10/2026');
    expect(shownAt(1)).toBe('26/10/2026');
    const value = onChange.mock.calls.at(-1)![0];
    expect(value.allDay).toBe(true);
    expect(value.start.toString()).toBe('2026-10-23T22:00:00Z'); // the 24th at 00:00 in Paris
    // The end is the midnight *after* the last day, so a search asks for "before".
    expect(value.end.toString()).toBe('2026-10-26T23:00:00Z'); // the 27th at 00:00
  });

  it('choosing a last day moves the end to the midnight after it', () => {
    const onChange = vi.fn();
    widget = createDateTimeRange(host, {
      timeZone: paris,
      locale: 'en-GB',
      allDay: true,
      today: Temporal.PlainDate.from('2026-06-15'),
      onChange,
    });
    const triggers = host.querySelectorAll<HTMLButtonElement>('.tz-field__trigger');
    triggers[1]!.click();
    document.querySelector<HTMLButtonElement>('.tz-field__panel [data-date="2026-06-18"]')!.click();

    const value = onChange.mock.calls.at(-1)![0];
    expect(value.end.toZonedDateTimeISO(paris).toString()).toContain('2026-06-19T00:00:00');
    expect(shownAt(1)).toBe('18/06/2026');
  });

  it('turning it off again gives the days back, at midnight', () => {
    widget = createDateTimeRange(host, {
      timeZone: paris,
      locale: 'en-GB',
      value: {
        start: paris_('2026-10-24T00:00'),
        end: paris_('2026-10-27T00:00'),
        allDay: true,
      },
    });
    expect(shownAt(1)).toBe('26/10/2026');

    box().click();
    expect(shownAt(0)).toBe('24/10/2026 00:00');
    expect(shownAt(1)).toBe('26/10/2026 00:00');
    expect(widget.value.allDay).toBe(false);
  });

  it('can be left out of the widget altogether', () => {
    widget = createDateTimeRange(host, { timeZone: paris, allDaySwitch: false });
    expect(host.querySelector('.tz-dtr__allday')).toBeNull();
  });

  it('counts the days across a change of offset', () => {
    widget = createDateTimeRange(host, {
      timeZone: paris,
      locale: 'en-GB',
      value: { start: paris_('2026-10-24T00:00'), end: paris_('2026-10-27T00:00'), allDay: true },
    });
    // Three days that week are 73 hours, because one of them is 25 hours long.
    expect(host.querySelector('.tz-dtr__summary')!.textContent).toBe('3d 1h');
    expect(host.querySelector('.tz-dtr__warning')!.textContent).toContain('back');
  });
});

describe('the all-day switch itself', () => {
  it('is a switch, not a checkbox, and says so', () => {
    // Thirteen grey pixels on a dark background is a control nobody finds.
    widget = createDateTimeRange(host, { timeZone: 'Europe/Paris', locale: 'en-GB' });
    const box = host.querySelector('.tz-dtr__allday-box')!;
    expect(box.tagName).toBe('BUTTON');
    expect(box.getAttribute('role')).toBe('switch');
    expect(box.getAttribute('aria-checked')).toBe('false');

    (box as HTMLButtonElement).click();
    expect(box.getAttribute('aria-checked')).toBe('true');
    expect(widget.value.allDay).toBe(true);
  });

  it('the words beside it work too', () => {
    widget = createDateTimeRange(host, { timeZone: 'Europe/Paris' });
    host.querySelector<HTMLElement>('.tz-dtr__allday-text')!.click();
    expect(widget.value.allDay).toBe(true);
  });
});
