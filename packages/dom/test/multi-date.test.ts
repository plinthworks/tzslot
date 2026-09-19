import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMultiDate, type MultiDateInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

const today = Temporal.PlainDate.from('2026-09-18');
let host: HTMLElement;
let widget: MultiDateInstance;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  widget?.destroy();
  host.remove();
});

const day = (iso: string) => host.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;
const chosen = () => widget.value.map(String);
const press = (key: string) =>
  document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

describe('choosing several days', () => {
  it('a click adds a day, a second click takes it away, and the list stays in order', () => {
    const onChange = vi.fn();
    widget = createMultiDate(host, { today, onChange });
    day('2026-09-24').click();
    day('2026-09-10').click();
    day('2026-09-17').click();
    expect(chosen()).toEqual(['2026-09-10', '2026-09-17', '2026-09-24']);

    day('2026-09-17').click();
    expect(chosen()).toEqual(['2026-09-10', '2026-09-24']);
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it('marks every chosen day, and tells assistive technology the grid takes several', () => {
    widget = createMultiDate(host, {
      today,
      value: [Temporal.PlainDate.from('2026-09-02'), Temporal.PlainDate.from('2026-09-30')],
    });
    const selected = Array.from(host.querySelectorAll('.tz-cal__day--selected')).map(
      (b) => (b as HTMLElement).dataset['date'],
    );
    expect(selected).toEqual(['2026-09-02', '2026-09-30']);
    expect(day('2026-09-02').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('.tz-cal__grid')!.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('the keyboard toggles too', () => {
    widget = createMultiDate(host, { today });
    day('2026-09-18').focus();
    press('Enter');
    press('ArrowRight');
    press('Enter');
    expect(chosen()).toEqual(['2026-09-18', '2026-09-19']);
    press('Enter');
    expect(chosen()).toEqual(['2026-09-18']);
  });

  it('keeps days chosen in other months while showing this one', () => {
    widget = createMultiDate(host, { today, value: [Temporal.PlainDate.from('2026-10-05')] });
    // Opens on the first chosen day's month.
    expect(host.querySelector('.tz-cal__title')!.textContent).toBe('October 2026');
    host.querySelectorAll<HTMLButtonElement>('.tz-cal__nav')[0]!.click();
    day('2026-09-21').click();
    expect(chosen()).toEqual(['2026-09-21', '2026-10-05']);
  });
});

describe('maxDates', () => {
  it('once reached, the other days stop taking clicks, and free up when one goes', () => {
    widget = createMultiDate(host, { today, maxDates: 2 });
    day('2026-09-10').click();
    day('2026-09-11').click();
    expect(day('2026-09-12').disabled).toBe(true);
    expect(day('2026-09-10').disabled).toBe(false); // can still be taken away

    day('2026-09-10').click();
    expect(day('2026-09-12').disabled).toBe(false);
    expect(chosen()).toEqual(['2026-09-11']);
  });
});

describe('the buttons', () => {
  it('Today adds today and never removes it; Clear empties everything', () => {
    widget = createMultiDate(host, { today, buttons: ['today', 'clear'], value: [Temporal.PlainDate.from('2026-09-01')] });
    const today_ = host.querySelector<HTMLButtonElement>('.tz-cal__action--today')!;
    today_.click();
    today_.click();
    expect(chosen()).toEqual(['2026-09-01', '2026-09-18']);
    host.querySelector<HTMLButtonElement>('.tz-cal__action--clear')!.click();
    expect(chosen()).toEqual([]);
  });
});
