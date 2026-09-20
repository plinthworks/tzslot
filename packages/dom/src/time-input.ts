import { Temporal, resolveWallTime } from '@tzslot/core';
import type { PlainDate, PlainTime } from '@tzslot/core';
import { EN, type TzslotMessages } from './messages.js';
import { TIME_CSS, ensureStyles } from './styles.js';

export interface TimeInputSettings {
  value: PlainTime | null;
  /** What the arrows, the wheel and the keyboard move the minutes by. */
  stepMinutes: number;
  /** The earliest and latest time accepted, inclusive. */
  minTime: PlainTime | string | undefined;
  maxTime: PlainTime | string | undefined;
  /**
   * 12-hour with an AM/PM button. Undefined asks the locale, which is what a
   * reader of that locale expects.
   */
  hour12: boolean | undefined;
  locale: string | undefined;
  /**
   * The day this time is on, and the zone it is read in. Given both, the
   * arrows step over an hour the clocks skip instead of landing in it — from
   * 03:00 down is 01:00 on the morning of the change, not 02:00, which would
   * be corrected straight back and look like a stuck arrow.
   */
  date: PlainDate | string | null;
  timeZone: string | undefined;
  /**
   * 'boxed' stands on its own, in a form. 'bare' is the row under a calendar:
   * big figures, no frame, arrows only when the pointer or the focus is there.
   */
  variant: 'boxed' | 'bare';
  disabled: boolean;
  messages: TzslotMessages;
  onChange: ((value: PlainTime | null) => void) | undefined;
}

export interface TimeInputOptions extends Partial<TimeInputSettings> {
  injectStyles?: boolean;
}

export interface TimeInputInstance {
  readonly value: PlainTime | null;
  update(settings: Partial<TimeInputSettings>): void;
  destroy(): void;
}

const asTime = (t: PlainTime | string | undefined) =>
  t === undefined || t === null ? null : typeof t === 'string' ? Temporal.PlainTime.from(t) : t;
const minutesOf = (t: PlainTime) => t.hour * 60 + t.minute;
const pad = (n: number) => String(n).padStart(2, '0');

/** Whether this locale writes times as 09:30 or 9:30 AM. */
function localeUses12Hour(locale: string | undefined): boolean {
  const parts = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).formatToParts(new Date());
  return parts.some((p) => p.type === 'dayPeriod');
}

/**
 * An hour and a minute, the compact way — flatpickr's time input, keyboard
 * and wheel included.
 *
 * It holds a wall time, not a moment: what a clock shows. Which instant that
 * is depends on the day and the zone, and that is the caller's to resolve —
 * `<tz-datetime-field>` and `createDailyRange` do it, and say when the answer
 * is surprising.
 *
 * Two text fields rather than `<input type="time">`: the native one cannot be
 * stepped by anything but its own rules, cannot show a zone's oddities, and
 * looks different in every browser.
 */
export function createTimeInput(host: HTMLElement, options: TimeInputOptions = {}): TimeInputInstance {
  const doc = host.ownerDocument;
  const { injectStyles = true, ...initial } = options;

  const s: TimeInputSettings = {
    value: null,
    stepMinutes: 5,
    minTime: undefined,
    maxTime: undefined,
    hour12: undefined,
    locale: undefined,
    date: null,
    timeZone: undefined,
    variant: 'boxed',
    disabled: false,
    messages: EN,
    onChange: undefined,
    ...initial,
  };

  let stylesPending = injectStyles;
  /** What is shown while someone is typing, before it becomes a value. */
  let editing: { hour: string; minute: string } | null = null;

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
    const node = doc.createElement(tag);
    node.className = className;
    return node;
  };

  const addedHostClass = !host.classList.contains('tz-time');
  host.classList.add('tz-time');

  const field = (part: 'hour' | 'minute') => {
    const wrap = el('span', `tz-time__field tz-time__field--${part}`);
    const input = doc.createElement('input');
    input.type = 'text';
    input.className = 'tz-time__input';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.dataset['part'] = part;
    // A spinbutton is what this is, and what a screen reader should announce.
    input.setAttribute('role', 'spinbutton');
    const up = el('button', 'tz-time__arrow tz-time__arrow--up');
    const down = el('button', 'tz-time__arrow tz-time__arrow--down');
    for (const [b, dir] of [[up, 'up'], [down, 'down']] as const) {
      b.type = 'button';
      b.tabIndex = -1; // the input's arrow keys do this; a Tab stop each would be noise
      b.dataset['step'] = dir;
      b.dataset['part'] = part;
      b.textContent = dir === 'up' ? '▴' : '▾';
    }
    const arrows = el('span', 'tz-time__arrows');
    arrows.append(up, down);
    wrap.append(input, arrows);
    return { wrap, input };
  };

  const hourField = field('hour');
  const separator = el('span', 'tz-time__separator');
  separator.textContent = ':';
  const minuteField = field('minute');
  const meridiem = el('button', 'tz-time__meridiem');
  meridiem.type = 'button';
  host.append(hourField.wrap, separator, minuteField.wrap);

  const uses12 = () => s.hour12 ?? localeUses12Hour(s.locale);
  const bounds = () => ({ min: asTime(s.minTime), max: asTime(s.maxTime) });

  const clamp = (time: PlainTime): PlainTime => {
    const { min, max } = bounds();
    if (min && minutesOf(time) < minutesOf(min)) return min;
    if (max && minutesOf(time) > minutesOf(max)) return max;
    return time;
  };

  function commit(time: PlainTime | null): void {
    editing = null;
    s.value = time === null ? null : clamp(time);
    render();
    s.onChange?.(s.value);
  }

  /** The hour as this field shows it: 0–23, or 1–12 with a meridiem button. */
  const shownHour = (time: PlainTime) =>
    uses12() ? ((time.hour % 12) || 12) : time.hour;

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'time', TIME_CSS);
      stylesPending = false;
    }
    host.classList.toggle('tz-time--bare', s.variant === 'bare');
    const time = s.value;
    const twelve = uses12();

    hourField.input.value = editing ? editing.hour : time ? pad(shownHour(time)) : '--';
    minuteField.input.value = editing ? editing.minute : time ? pad(time.minute) : '--';
    hourField.input.setAttribute('aria-label', s.messages.hourLabel);
    minuteField.input.setAttribute('aria-label', s.messages.minuteLabel);
    hourField.input.setAttribute('aria-valuemin', twelve ? '1' : '0');
    hourField.input.setAttribute('aria-valuemax', twelve ? '12' : '23');
    minuteField.input.setAttribute('aria-valuemin', '0');
    minuteField.input.setAttribute('aria-valuemax', '59');
    for (const [input, value] of [
      [hourField.input, time ? shownHour(time) : null],
      [minuteField.input, time ? time.minute : null],
    ] as const) {
      if (value === null) input.removeAttribute('aria-valuenow');
      else input.setAttribute('aria-valuenow', String(value));
      input.disabled = s.disabled;
    }

    if (twelve) {
      meridiem.textContent = time && time.hour >= 12 ? s.messages.pm : s.messages.am;
      meridiem.disabled = s.disabled || time === null;
      meridiem.setAttribute('aria-label', s.messages.meridiemLabel);
      if (!meridiem.isConnected) host.append(meridiem);
    } else meridiem.remove();
  }

  /** Whether a wall time happens at all, on the day this field is about. */
  function exists(time: PlainTime): boolean {
    if (s.date === null || s.timeZone === undefined) return true;
    const day = typeof s.date === 'string' ? Temporal.PlainDate.from(s.date) : s.date;
    return resolveWallTime(day, time, s.timeZone).exists;
  }

  /** Moving a field by the wheel, the arrows or the keyboard. */
  function step(part: 'hour' | 'minute', direction: 1 | -1): void {
    if (s.disabled) return;
    const from = s.value ?? asTime(s.minTime) ?? Temporal.PlainTime.from('09:00');
    const once = (time: PlainTime) => {
      const moved =
        part === 'hour'
          ? time.add({ hours: direction })
          : time.add({ minutes: direction * s.stepMinutes });
      // A field of its own wraps within itself: stepping the minutes past the
      // hour would move an appointment by an hour nobody asked for.
      return part === 'hour' ? time.with({ hour: moved.hour }) : time.with({ minute: moved.minute });
    };

    let kept = once(from);
    // Step over the hour the clocks skip rather than into it. Bounded, so a
    // zone that somehow offered nothing could not spin here forever.
    for (let tries = 0; tries < 60 && !exists(kept); tries += 1) kept = once(kept);
    commit(kept);
  }

  function typed(part: 'hour' | 'minute', raw: string): void {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    editing = {
      hour: part === 'hour' ? digits : hourField.input.value,
      minute: part === 'minute' ? digits : minuteField.input.value,
    };
    hourField.input.value = editing.hour;
    minuteField.input.value = editing.minute;
  }

  /** What was typed becomes a time when the field is left, or on Enter. */
  function settle(): void {
    if (!editing) return;
    const hour = Number.parseInt(editing.hour, 10);
    const minute = Number.parseInt(editing.minute, 10);
    if (Number.isNaN(hour) && Number.isNaN(minute)) {
      commit(null);
      return;
    }
    const base = s.value ?? Temporal.PlainTime.from('00:00');
    let h = Number.isNaN(hour) ? shownHour(base) : hour;
    if (uses12()) {
      const afternoon = base.hour >= 12;
      h = (h % 12) + (afternoon ? 12 : 0);
    }
    commit(
      base.with({
        hour: Math.min(23, Math.max(0, h)),
        minute: Math.min(59, Math.max(0, Number.isNaN(minute) ? base.minute : minute)),
      }),
    );
  }

  const listening = new AbortController();
  const on = { signal: listening.signal };
  const partOf = (node: EventTarget | null) =>
    (node as HTMLElement | null)?.dataset?.['part'] as 'hour' | 'minute' | undefined;

  host.addEventListener(
    'click',
    (event) => {
      const button = (event.target as Element).closest<HTMLElement>('.tz-time__arrow');
      if (button) {
        step(partOf(button)!, button.dataset['step'] === 'up' ? 1 : -1);
        return;
      }
      if ((event.target as Element).closest('.tz-time__meridiem') && s.value) {
        commit(s.value.add({ hours: s.value.hour >= 12 ? -12 : 12 }));
      }
    },
    on,
  );
  host.addEventListener(
    'keydown',
    (event) => {
      const part = partOf(event.target);
      if (!part) return;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        step(part, event.key === 'ArrowUp' ? 1 : -1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        settle();
      }
    },
    on,
  );
  host.addEventListener('input', (event) => typed(partOf(event.target)!, (event.target as HTMLInputElement).value), on);
  host.addEventListener('focusout', () => settle(), on);
  // The wheel only while the field has the focus, or a page scroll would
  // change an appointment on the way past.
  host.addEventListener(
    'wheel',
    (event) => {
      const part = partOf(event.target);
      if (!part || doc.activeElement !== event.target) return;
      event.preventDefault();
      step(part, event.deltaY < 0 ? 1 : -1);
    },
    { ...on, passive: false },
  );

  render();

  return {
    get value() {
      return s.value;
    },
    update(settings) {
      Object.assign(s, settings);
      editing = null;
      render();
    },
    destroy() {
      listening.abort();
      hourField.wrap.remove();
      separator.remove();
      minuteField.wrap.remove();
      meridiem.remove();
      if (addedHostClass) host.classList.remove('tz-time');
    },
  };
}
