import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTimeSlots, createDailyRange } from '../src/index.js';
import type { PlainTime } from '@tzslot/core';

/**
 * A listbox that behaves like one.
 *
 * Both widgets announced `role="listbox"` and implemented none of its keyboard
 * model: forty-eight tab stops for a day of half-hours, and arrow keys that
 * did nothing. A screen reader said "listbox, 48 items" and then the arrows
 * were dead — the worst of both, because the promise was explicit.
 */
let host: HTMLElement;
let widget: { destroy(): void };

const press = (key: string) =>
  (document.activeElement ?? host).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
const slots = () => [...host.querySelectorAll<HTMLButtonElement>('.tz-slots__slot')];
const stops = () => slots().filter((s) => s.tabIndex === 0);

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  widget?.destroy();
  host.remove();
});

describe('the day’s times', () => {
  const make = (options = {}) => {
    widget = createTimeSlots(host, {
      date: '2026-06-15',
      timeZone: 'Europe/Paris',
      stepMinutes: 30,
      ...options,
    });
  };

  it('is one tab stop, not one per slot', () => {
    make();
    expect(slots().length).toBe(48);
    expect(stops().length).toBe(1);
  });

  it('the arrows walk it, and Home and End reach its ends', () => {
    make();
    stops()[0]!.focus();
    press('ArrowDown');
    expect(document.activeElement).toBe(slots()[1]);
    press('ArrowUp');
    expect(document.activeElement).toBe(slots()[0]);
    press('End');
    expect(document.activeElement).toBe(slots().at(-1));
    press('Home');
    expect(document.activeElement).toBe(slots()[0]);
  });

  it('a slot nobody can take is stepped over, not landed on', () => {
    make({ isDisabled: (slot: { time: PlainTime }) => slot.time.hour === 0 && slot.time.minute === 30 });
    stops()[0]!.focus();
    press('ArrowDown');
    // 00:30 is taken, so the keyboard lands on 01:00.
    expect((document.activeElement as HTMLElement).textContent).toContain('01:00');
  });

  it('the stop follows what is chosen, so Tab returns to it', () => {
    make();
    slots()[10]!.click();
    expect(stops()[0]).toBe(slots()[10]);
  });
});

describe('the daily pattern’s two lists', () => {
  it('each is one tab stop, and the arrows walk it', () => {
    widget = createDailyRange(host, {
      timeZone: 'Europe/Paris',
      locale: 'en-GB',
      timeLayout: 'list',
      stepMinutes: 60,
    });
    const lists = [...host.querySelectorAll<HTMLElement>('[role="listbox"]')];
    expect(lists.length).toBe(2);
    for (const list of lists) {
      const options = [...list.querySelectorAll<HTMLButtonElement>('.tz-slots__slot')];
      expect(options.filter((o) => o.tabIndex === 0).length).toBe(1);
    }

    const first = lists[0]!.querySelector<HTMLButtonElement>('[tabindex="0"]')!;
    first.focus();
    press('ArrowDown');
    expect(document.activeElement).not.toBe(first);
    expect(lists[0]!.contains(document.activeElement)).toBe(true);
  });
});
