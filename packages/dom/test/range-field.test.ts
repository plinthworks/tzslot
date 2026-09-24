import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRangeField, FR, type RangeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

const paris = 'Europe/Paris';
const today = Temporal.PlainDate.from('2026-09-20');
let host: HTMLElement;
let field: RangeFieldInstance;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  field?.destroy();
  host.remove();
});

const mount = (o = {}) => (field = createRangeField(host, { timeZone: paris, locale: 'en-GB', today, ...o }));
const trigger = () => host.querySelector<HTMLButtonElement>('.tz-field__trigger')!;
const panel = () => document.querySelector<HTMLElement>('.tz-field__panel');
const presets = () =>
  Array.from(panel()!.querySelectorAll<HTMLButtonElement>('.tz-rangefield__preset'));
const preset = (label: string) => presets().find((b) => b.textContent === label)!;
const day = (iso: string) => panel()!.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;

describe('one field for a period', () => {
  it('says what it holds, and the shape of the answer when it holds nothing', () => {
    // Empty, it shows a mask rather than a sentence: a day, a period and a
    // period with hours all read "Choose a range" before, three different
    // questions behind one wording, and the reader had to open the panel to
    // learn which.
    mount();
    expect(trigger().textContent).toContain('From --/--/----  To --/--/----');

    field.update({
      value: {
        start: Temporal.Instant.from('2026-08-21T22:00:00Z'), // 22 Aug, 00:00 Paris
        end: Temporal.Instant.from('2026-09-20T22:00:00Z'), // 21 Sept, 00:00 — after the 20th
      },
    });
    expect(trigger().textContent).toContain('22/08/2026 – 20/09/2026');
  });

  it('opens two months at once, so a range across the boundary is one click each', () => {
    mount();
    field.open();
    expect(panel()!.querySelectorAll('.tz-range__month')).toHaveLength(2);
    expect(panel()!.querySelectorAll('.tz-range__month-title')[0]!.textContent).toBe('September 2026');
  });

  it('a named range is one click, and it closes', () => {
    const onChange = vi.fn();
    mount({ onChange });
    field.open();
    preset('Last 7 days').click();

    const value = onChange.mock.calls.at(-1)![0];
    // Six days back and today, midnight to the midnight after.
    expect(value.start.toZonedDateTimeISO(paris).toString()).toContain('2026-09-14T00:00:00');
    expect(value.end.toZonedDateTimeISO(paris).toString()).toContain('2026-09-21T00:00:00');
    expect(panel()).toBeNull();
  });

  it('marks the named range in force', () => {
    mount();
    field.open();
    preset('This month').click();
    field.open();
    expect(preset('This month').getAttribute('aria-pressed')).toBe('true');
    expect(preset('Last 7 days').getAttribute('aria-pressed')).toBe('false');
  });

  it('two clicks on the calendar do the same', () => {
    const onChange = vi.fn();
    mount({ onChange });
    field.open();
    day('2026-09-28').click();
    expect(panel()).not.toBeNull(); // a range needs its second end
    day('2026-10-03').click();

    const value = onChange.mock.calls.at(-1)![0];
    expect(value.start.toZonedDateTimeISO(paris).toString()).toContain('2026-09-28T00:00:00');
    expect(value.end.toZonedDateTimeISO(paris).toString()).toContain('2026-10-04T00:00:00');
    expect(trigger().textContent).toContain('28/09/2026 – 03/10/2026');
  });

  it('counts a week that loses an hour as the zone really has it', () => {
    const onChange = vi.fn();
    mount({ onChange, today: Temporal.PlainDate.from('2026-10-27') });
    field.open();
    preset('Last 7 days').click();

    const { start, end } = onChange.mock.calls.at(-1)![0];
    const hours = start.until(end).total({ unit: 'hour' });
    // The clocks went back on the 25th: seven days, 169 hours.
    expect(hours).toBe(169);
  });
});

describe('with times', () => {
  it('two fields, each carrying its own hour, and no switch to classify them', () => {
    mount({ showTime: true });
    field.open();
    expect(panel()!.querySelectorAll('.tz-dateinput__input').length).toBe(2);
    // A switch marked "all day" asked the reader to classify their answer
    // before giving it. The screen decides that, through showTime.
    expect(panel()!.querySelector('.tz-dtr__allday')).toBeNull();
    expect(panel()!.querySelectorAll('.tz-rangefield__times').length).toBe(0);
  });

  it('a time typed into a field turns the range into moments', () => {
    const onChange = vi.fn();
    mount({ showTime: true, timeLayout: 'input', onChange });
    field.open();
    day('2026-09-21').click();
    day('2026-09-22').click();

    const hour = panel()!.querySelector<HTMLInputElement>('.tz-dateinput .tz-time__input[data-part="hour"]')!;
    hour.focus();
    hour.value = '09';
    hour.dispatchEvent(new Event('input', { bubbles: true }));
    hour.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    const value = onChange.mock.calls.at(-1)![0];
    // No flag says it is an interval; the start's own hour does.
    expect(value.start.toZonedDateTimeISO(paris).toPlainTime().toString()).toBe('09:00:00');
  });

  it('the label above each field can be an icon, or nothing', () => {
    const arrow = document.createElement('span');
    arrow.textContent = '»';
    mount({ labels: { start: null, end: null, between: arrow } });
    field.open();
    expect([...panel()!.querySelectorAll('.tz-dateinput__label')].every((n) => (n as HTMLElement).hidden)).toBe(true);
    expect(panel()!.querySelector('.tz-rangefield__between')!.textContent).toBe('»');
    // The word is still read out, whatever is drawn.
    expect(panel()!.querySelector('.tz-dateinput__input')!.getAttribute('aria-label')).toBe('From');
  });
});

describe('waiting for Apply', () => {
  it('reports nothing until it is pressed', () => {
    const onChange = vi.fn();
    mount({ confirm: true, onChange });
    field.open();
    preset('Today').click();
    expect(onChange).not.toHaveBeenCalled();
    expect(panel()).not.toBeNull();

    panel()!.querySelector<HTMLButtonElement>('.tz-rangefield__apply')!.click();
    expect(onChange).toHaveBeenCalledOnce();
    expect(panel()).toBeNull();
  });

  it('Cancel leaves the value where it was', () => {
    const onChange = vi.fn();
    mount({ confirm: true, onChange });
    field.open();
    preset('Yesterday').click();
    panel()!.querySelector<HTMLButtonElement>('.tz-rangefield__cancel')!.click();
    expect(onChange).not.toHaveBeenCalled();
    expect(field.value.start).toBeNull();
  });
});

describe('words', () => {
  it('names the ranges in the language it is given', () => {
    mount({ messages: FR, locale: 'fr-FR' });
    field.open();
    expect(presets().map((b) => b.textContent)).toContain('7 derniers jours');
    // Shortest first, longest last: the column grows steadily, so a reader can
    // stop as soon as it overshoots what they wanted.
    const offered = presets().map((b) => b.textContent);
    expect(offered[0]).toBe("Le quart d'heure courant");
    expect(offered.at(-1)).toBe('Ce trimestre');
  });
});

describe('the panel reads as two halves', () => {
  it('the dates are ruled off from the calendar and its shortcuts', () => {
    mount({ showTime: true });
    field.open();
    const head = panel()!.querySelector('.tz-rangefield__head')!;
    // Both fields and the whole-day switch belong to the first half…
    expect(head.querySelectorAll('.tz-dateinput').length).toBe(2);
    // …and the calendar and its shortcuts to the second.
    expect(head.querySelector('.tz-range__grid')).toBeNull();
    expect(head.querySelector('.tz-rangefield__presets')).toBeNull();
    // The rule between the two halves is drawn by the row below, not by the
    // head: the head is only as wide as one field, so a border of its own
    // stopped two thirds of the way across and read as unfinished.
    const css = [...document.querySelectorAll('style[data-tzslot]')].map((n) => n.textContent).join('');
    expect(css).toContain('.tz-rangefield__head');
    expect(css).toMatch(/\.tz-rangefield__body[^}]*border-top/);
  });

  it('the hour sits inside its field, framed by it and not by itself', () => {
    mount({ showTime: true, timeLayout: 'input' });
    field.open();
    day('2026-09-21').click();
    const inside = panel()!.querySelector('.tz-dateinput__row .tz-dateinput__time.tz-time .tz-time__field');
    expect(inside).not.toBeNull(); // the hour is in the field, not on a row below
    const css = [...document.querySelectorAll('style[data-tzslot]')].map((n) => n.textContent).join('');
    expect(css).toContain('.tz-dateinput__time .tz-time__field { border: 0; background: transparent; min-width: 0; }');
    // Arrows above and below the figures, which is the shape asked for.
    expect(inside!.closest('.tz-time')!.classList.contains('tz-time--bare')).toBe(true);
  });
});
