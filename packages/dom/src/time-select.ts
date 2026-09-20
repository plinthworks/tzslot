import { Temporal } from '@tzslot/core';
import type { PlainTime } from '@tzslot/core';
import { EN, type TzslotMessages } from './messages.js';
import { TIMESELECT_CSS, ensureStyles } from './styles.js';

export interface TimeSelectSettings {
  value: PlainTime | null;
  /** Minutes between the options. Every minute by default. */
  minuteStep: number;
  /** Hours between them. */
  hourStep: number;
  minTime: PlainTime | string | undefined;
  maxTime: PlainTime | string | undefined;
  /** 12-hour menus with an AM/PM one beside them; the locale decides when unset. */
  hour12: boolean | undefined;
  locale: string | undefined;
  disabled: boolean;
  messages: TzslotMessages;
  onChange: ((value: PlainTime | null) => void) | undefined;
}

export interface TimeSelectOptions extends Partial<TimeSelectSettings> {
  injectStyles?: boolean;
}

export interface TimeSelectInstance {
  readonly value: PlainTime | null;
  update(settings: Partial<TimeSelectSettings>): void;
  destroy(): void;
}

const asTime = (t: PlainTime | string | undefined) =>
  t === undefined || t === null ? null : typeof t === 'string' ? Temporal.PlainTime.from(t) : t;
const pad = (n: number) => String(n).padStart(2, '0');

function localeUses12Hour(locale: string | undefined): boolean {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric' })
    .formatToParts(new Date())
    .some((part) => part.type === 'dayPeriod');
}

/**
 * An hour menu and a minute menu: `09 ▾ : 15 ▾`.
 *
 * Real `<select>` elements, not a list of our own. They are reachable by
 * keyboard without a line of code, they cannot be clipped by the panel they
 * sit in, and on a phone they open the system's own picker — which is the one
 * the owner of the phone already knows.
 */
export function createTimeSelect(host: HTMLElement, options: TimeSelectOptions = {}): TimeSelectInstance {
  const doc = host.ownerDocument;
  const { injectStyles = true, ...initial } = options;

  const s: TimeSelectSettings = {
    value: null,
    minuteStep: 1,
    hourStep: 1,
    minTime: undefined,
    maxTime: undefined,
    hour12: undefined,
    locale: undefined,
    disabled: false,
    messages: EN,
    onChange: undefined,
    ...initial,
  };

  let stylesPending = injectStyles;

  const addedHostClass = !host.classList.contains('tz-timeselect');
  host.classList.add('tz-timeselect');

  const menu = (part: 'hour' | 'minute' | 'meridiem') => {
    const select = doc.createElement('select');
    select.className = `tz-timeselect__menu tz-timeselect__menu--${part}`;
    select.dataset['part'] = part;
    return select;
  };
  const hour = menu('hour');
  const separator = doc.createElement('span');
  separator.className = 'tz-timeselect__separator';
  separator.textContent = ':';
  const minute = menu('minute');
  const meridiem = menu('meridiem');
  host.append(hour, separator, minute);

  const uses12 = () => s.hour12 ?? localeUses12Hour(s.locale);
  const bounds = () => ({ min: asTime(s.minTime), max: asTime(s.maxTime) });

  function hourValues(): number[] {
    const { min, max } = bounds();
    const out: number[] = [];
    for (let h = 0; h < 24; h += s.hourStep) {
      if (min && h < min.hour) continue;
      if (max && h > max.hour) break;
      out.push(h);
    }
    return out;
  }

  /** The minutes on offer inside the hour already chosen. */
  function minuteValues(): number[] {
    const { min, max } = bounds();
    const chosen = s.value?.hour ?? null;
    const out: number[] = [];
    for (let m = 0; m < 60; m += s.minuteStep) {
      if (chosen !== null && min && chosen === min.hour && m < min.minute) continue;
      if (chosen !== null && max && chosen === max.hour && m > max.minute) break;
      out.push(m);
    }
    return out;
  }

  /** An empty option, while nothing has been chosen: a menu must not lie. */
  function fill(select: HTMLSelectElement, values: number[], chosen: number | null, label: (v: number) => string): void {
    const wanted = [...(chosen === null ? [null] : []), ...values];
    const same =
      select.options.length === wanted.length &&
      wanted.every((v, i) => select.options[i]!.value === (v === null ? '' : String(v)));
    if (!same) {
      select.replaceChildren(
        ...wanted.map((value) => {
          const option = doc.createElement('option');
          option.value = value === null ? '' : String(value);
          option.textContent = value === null ? '--' : label(value);
          return option;
        }),
      );
    }
    select.value = chosen === null ? '' : String(chosen);
    select.disabled = s.disabled;
  }

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'timeselect', TIMESELECT_CSS);
      stylesPending = false;
    }
    const twelve = uses12();
    const time = s.value;

    hour.setAttribute('aria-label', s.messages.hourLabel);
    minute.setAttribute('aria-label', s.messages.minuteLabel);
    meridiem.setAttribute('aria-label', s.messages.meridiemLabel);

    fill(hour, hourValues(), time?.hour ?? null, (h) => (twelve ? String((h % 12) || 12) : pad(h)));
    fill(minute, minuteValues(), time?.minute ?? null, pad);

    if (twelve) {
      meridiem.replaceChildren(
        ...(['AM', 'PM'] as const).map((half) => {
          const option = doc.createElement('option');
          option.value = half;
          option.textContent = half === 'AM' ? s.messages.am : s.messages.pm;
          return option;
        }),
      );
      meridiem.value = time && time.hour >= 12 ? 'PM' : 'AM';
      meridiem.disabled = s.disabled || time === null;
      if (!meridiem.isConnected) host.append(meridiem);
    } else meridiem.remove();
  }

  function choose(part: string, raw: string): void {
    if (s.disabled) return;
    const from = s.value ?? asTime(s.minTime) ?? Temporal.PlainTime.from('00:00');
    if (part === 'meridiem') {
      const afternoon = raw === 'PM';
      if (!s.value || s.value.hour >= 12 === afternoon) return;
      s.value = from.add({ hours: afternoon ? 12 : -12 });
    } else {
      const value = Number(raw);
      s.value = part === 'hour' ? from.with({ hour: value }) : from.with({ minute: value });
    }
    render();
    s.onChange?.(s.value);
  }

  const listening = new AbortController();
  host.addEventListener(
    'change',
    (event) => {
      const select = event.target as HTMLSelectElement;
      if (select.dataset['part']) choose(select.dataset['part'], select.value);
    },
    { signal: listening.signal },
  );

  render();

  return {
    get value() {
      return s.value;
    },
    update(settings) {
      Object.assign(s, settings);
      render();
    },
    destroy() {
      listening.abort();
      hour.remove();
      separator.remove();
      minute.remove();
      meridiem.remove();
      if (addedHostClass) host.classList.remove('tz-timeselect');
    },
  };
}
