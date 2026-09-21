import { Temporal, getDaySlots } from '@tzslot/core';
import type { PlainDate, PlainTime, Slot } from '@tzslot/core';
import { EN, type TzslotMessages } from './messages.js';
import { summerFirst } from './zone-names.js';
import { TIMESELECT_CSS, ensureStyles } from './styles.js';

export interface TimeSelectSettings {
  /** The time shown, as a clock face rather than a moment. */
  value: PlainTime | null;
  /**
   * Which of the two readings of a repeated hour the value stands for, as a
   * UTC offset. Only ever set on the day the clocks go back.
   */
  offset: string | null;
  /**
   * The day the time is on, and the zone it is read in. Given both, the menus
   * show that day as it really is: the hour the clocks skip is not offered,
   * and the hour they repeat is offered twice, by its two offsets. Left out,
   * they offer every hour of an ordinary day.
   */
  date: PlainDate | string | null;
  timeZone: string | undefined;
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
  /** The time chosen, and which reading of it when the hour happens twice. */
  onChange: ((value: PlainTime | null, offset: string | null) => void) | undefined;
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
    offset: null,
    date: null,
    timeZone: undefined,
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

  /**
   * The day as the zone really has it, when there is a day and a zone to ask
   * about: twenty-five hours in October, twenty-three in March.
   */
  function realSlots(): Slot[] | null {
    if (s.date === null || s.timeZone === undefined) return null;
    const { min, max } = bounds();
    return getDaySlots(s.date, s.timeZone, {
      stepMinutes: s.minuteStep,
      skipNonExistent: true,
      ...(min ? { minTime: min } : {}),
      ...(max ? { maxTime: max } : {}),
    });
  }

  /** One entry per choosable hour: twice over for the hour that happens twice. */
  function realHours(slots: Slot[]): { hour: number; offset: string | null; name: string }[] {
    const seen = new Map<string, { hour: number; offset: string | null; name: string }>();
    for (const slot of slots) {
      const hour = slot.time.hour;
      if (hour % s.hourStep !== 0) continue;
      if (slot.ambiguous && s.timeZone) {
        // Summer and winter: the words everyone uses for the two readings.
        const names = summerFirst(slot.offsets)
          ? [s.messages.summerTime, s.messages.winterTime]
          : [s.messages.winterTime, s.messages.summerTime];
        slot.offsets.forEach((offset, i) => {
          seen.set(`${hour}|${offset}`, { hour, offset, name: names[i] ?? offset });
        });
      } else if (!seen.has(`${hour}|`)) {
        seen.set(`${hour}|`, { hour, offset: null, name: '' });
      }
    }
    return [...seen.values()];
  }

  /** The minutes that exist inside the hour — and the reading — already chosen. */
  function realMinutes(slots: Slot[], hour: number, offset: string | null): number[] {
    const out: number[] = [];
    for (const slot of slots) {
      if (slot.time.hour !== hour) continue;
      if (offset !== null && !slot.offsets.includes(offset)) continue;
      out.push(slot.time.minute);
    }
    return out;
  }

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
    // The minute it already holds, wherever it came from. A menu built on a
    // step of five has nothing to offer a time sitting at 00:15 — it would
    // show a blank, and picking anything at all would move a time the reader
    // never asked to move.
    const held = s.value?.minute;
    if (held !== undefined && !out.includes(held)) out.push(held);
    return out.sort((a, b) => a - b);
  }

  /** Options that carry more than a figure: an hour and the reading it stands for. */
  function fillKeyed(
    select: HTMLSelectElement,
    entries: { value: string; label: string }[],
    chosen: string | null,
  ): void {
    const wanted = chosen === null ? [{ value: '', label: '--' }, ...entries] : entries;
    const same =
      select.options.length === wanted.length &&
      wanted.every((entry, i) => select.options[i]!.value === entry.value);
    if (!same) {
      select.replaceChildren(
        ...wanted.map((entry) => {
          const option = doc.createElement('option');
          option.value = entry.value;
          option.textContent = entry.label;
          return option;
        }),
      );
    }
    select.value = chosen ?? '';
    select.disabled = s.disabled;
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

    const slots = realSlots();
    const shownHour = (h: number) => (twelve ? String((h % 12) || 12) : pad(h));
    if (slots) {
      // The day as it is: no hour that cannot happen, and the one that happens
      // twice told apart by its offset, so nothing is left to ask afterwards.
      fillKeyed(
        hour,
        realHours(slots).map(({ hour: h, offset, name }) => ({
          value: `${h}|${offset ?? ''}`,
          label: offset === null ? shownHour(h) : `${shownHour(h)} — ${name}`,
        })),
        time === null ? null : `${time.hour}|${s.offset ?? ''}`,
      );
      fillKeyed(
        minute,
        (time === null ? [] : realMinutes(slots, time.hour, s.offset)).map((m) => ({
          value: String(m),
          label: pad(m),
        })),
        time === null ? null : String(time.minute),
      );
    } else {
      fill(hour, hourValues(), time?.hour ?? null, shownHour);
      fill(minute, minuteValues(), time?.minute ?? null, pad);
    }

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
    } else if (part === 'hour') {
      // An hour carries its reading with it, on a day that has two of them.
      const [figure, offset] = raw.split('|');
      s.value = from.with({ hour: Number(figure) });
      s.offset = offset ? offset : null;
      const slots = realSlots();
      const minutes = slots ? realMinutes(slots, s.value.hour, s.offset) : [];
      // The minute stands only if that hour really has it — the half hour
      // Lord Howe skips, say.
      if (minutes.length > 0 && !minutes.includes(s.value.minute)) {
        s.value = s.value.with({ minute: minutes[0]! });
      }
    } else {
      s.value = from.with({ minute: Number(raw) });
    }
    render();
    s.onChange?.(s.value, s.offset);
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
