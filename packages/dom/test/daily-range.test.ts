import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDailyRange, FR, type DailyRangeInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

let host: HTMLElement;
let widget: DailyRangeInstance;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  widget?.destroy();
  host.remove();
});

const day = (iso: string) => host.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
const time = (edge: 'from' | 'to', t: string) =>
  host.querySelector<HTMLButtonElement>(`.tz-daily__list[data-edge="${edge}"] [data-time="${t}"]`)!;
const field = (edge: 'from' | 'to', part: 'hour' | 'minute') =>
  host.querySelector<HTMLInputElement>(`.tz-daily__input[data-edge="${edge}"] [data-part="${part}"]`)!;
const arrow = (edge: 'from' | 'to', part: 'hour' | 'minute', dir: 'up' | 'down') =>
  host.querySelector<HTMLButtonElement>(
    `.tz-daily__input[data-edge="${edge}"] .tz-time__arrow[data-part="${part}"][data-step="${dir}"]`,
  )!;
const typeTime = (edge: 'from' | 'to', part: 'hour' | 'minute', text: string) => {
  const b = field(edge, part);
  b.focus();
  b.value = text;
  b.dispatchEvent(new Event('input', { bubbles: true }));
  b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
};
const text = (sel: string) => host.querySelector(sel)?.textContent ?? null;

describe('choosing, with the compact fields', () => {
  it('two days and two times make a summary, in any order', () => {
    const onChange = vi.fn();
    widget = createDailyRange(host, {
      timeZone: 'Europe/Paris',
      today: Temporal.PlainDate.from('2026-06-15'),
      locale: 'en-GB',
      stepMinutes: 60,
      timeLayout: 'list',
      onChange,
    });
    expect(host.querySelector('.tz-daily__result')).toBeNull();

    time('from', '09:00').click();
    day('2026-06-15').click();
    time('to', '17:00').click();
    day('2026-06-19').click();

    expect(text('.tz-daily__summary')).toBe('5 days · 40h');
    expect(host.querySelector('.tz-daily__unusual')).toBeNull();
    const last = onChange.mock.calls.at(-1)![0];
    expect(`${last.start} ${last.end} ${last.from} ${last.to}`).toBe('2026-06-15 2026-06-19 09:00:00 17:00:00');
    expect(widget.summary!.windows).toHaveLength(5);
  });
});

describe('night shifts across the end of summer time', () => {
  beforeEach(() => {
    widget = createDailyRange(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      stepMinutes: 60,
      timeLayout: 'list',
      today: Temporal.PlainDate.from('2026-10-20'),
      value: {
        start: Temporal.PlainDate.from('2026-10-23'),
        end: Temporal.PlainDate.from('2026-10-26'),
        from: Temporal.PlainTime.from('22:00'),
        to: Temporal.PlainTime.from('06:00'),
      },
    });
  });

  it('marks the end times that fall on the next day', () => {
    expect(time('to', '06:00').textContent).toContain('next day');
    expect(time('to', '23:00').textContent).not.toContain('next day');
  });

  it('counts the real total and names the night that differs', () => {
    expect(text('.tz-daily__summary')).toBe('4 days · 33h');
    expect(text('.tz-daily__overnight')).toBe('22:00 → 06:00 next day');
    const days = Array.from(host.querySelectorAll('.tz-daily__day')).map((li) => li.textContent);
    expect(days).toEqual(['Sat 24 Oct lasts 9h: the clocks go back.']);
  });

  it('says it in French', () => {
    widget.update({ messages: FR, locale: 'fr-FR' });
    expect(text('.tz-daily__summary')).toBe('4 jours · 33h');
    expect(text('.tz-daily__day')).toBe('sam. 24 oct. dure 9h : les pendules reculent.');
    expect(text('.tz-daily__column-label')).toBe('De');
  });
});

describe('bounds and state', () => {
  it('offers only the hours asked for', () => {
    widget = createDailyRange(host, { stepMinutes: 30, minTime: '08:00', maxTime: '18:00', timeLayout: 'list' });
    const times = Array.from(host.querySelectorAll('.tz-daily__list[data-edge="from"] .tz-slots__slot'));
    expect(times[0]!.textContent).toBe('08:00');
    expect(times.at(-1)!.textContent).toBe('18:00');
    expect(times).toHaveLength(21);
  });

  it('disabled stops the times and the days', () => {
    widget = createDailyRange(host, { disabled: true, timeLayout: 'list' });
    expect(time('from', '09:00').disabled).toBe(true);
    expect(Array.from(host.querySelectorAll<HTMLButtonElement>('.tz-range__day')).every((b) => b.disabled)).toBe(true);
  });

  it('clear empties all four parts', () => {
    const onChange = vi.fn();
    widget = createDailyRange(host, { onChange, timeLayout: 'list' });
    time('from', '09:00').click();
    widget.clear();
    expect(onChange).toHaveBeenLastCalledWith({ start: null, end: null, from: null, to: null });
    expect(time('from', '09:00').classList.contains('tz-slots__slot--selected')).toBe(false);
  });
});

describe('the two ways of choosing the hours', () => {
  it('compact fields by default: no list of forty-eight buttons', () => {
    widget = createDailyRange(host, { timeZone: 'Europe/Paris', locale: 'en-GB' });
    expect(host.querySelectorAll('.tz-daily__list')).toHaveLength(0);
    expect(host.querySelectorAll('.tz-daily__input')).toHaveLength(2);
  });

  it('typing and stepping a field sets the value', () => {
    const onChange = vi.fn();
    widget = createDailyRange(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      stepMinutes: 30,
      today: Temporal.PlainDate.from('2026-06-15'),
      onChange,
    });
    typeTime('from', 'hour', '09');
    expect(widget.value.from!.toString()).toBe('09:00:00');
    arrow('from', 'minute', 'up').click();
    expect(widget.value.from!.toString()).toBe('09:30:00');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('says when the end falls on the next day, and counts the night as nine hours', () => {
    widget = createDailyRange(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      value: {
        start: Temporal.PlainDate.from('2026-10-24'),
        end: Temporal.PlainDate.from('2026-10-24'),
        from: Temporal.PlainTime.from('22:00'),
        to: Temporal.PlainTime.from('06:00'),
      },
    });
    expect(field('from', 'hour').value).toBe('22');
    expect(field('to', 'hour').value).toBe('06');
    expect(host.querySelector('.tz-daily__note')!.textContent).toBe('next day');
    expect(text('.tz-daily__summary')).toBe('1 day · 9h');
  });

  it('switches between the two without losing the value', () => {
    widget = createDailyRange(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      stepMinutes: 60,
      value: {
        start: null,
        end: null,
        from: Temporal.PlainTime.from('09:00'),
        to: Temporal.PlainTime.from('17:00'),
      },
    });
    widget.update({ timeLayout: 'list' });
    expect(host.querySelectorAll('.tz-daily__input')).toHaveLength(0);
    expect(time('from', '09:00').classList.contains('tz-slots__slot--selected')).toBe(true);

    widget.update({ timeLayout: 'input' });
    expect(field('to', 'hour').value).toBe('17');
    expect(widget.value.from!.toString()).toBe('09:00:00');
  });
});
