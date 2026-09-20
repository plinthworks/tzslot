import { Temporal } from '@tzslot/core';
import type { PlainTime } from '@tzslot/core';
import { EN, type TzslotMessages } from './messages.js';
import { TIMECOLS_CSS, ensureStyles } from './styles.js';

export interface TimeColumnsSettings {
  value: PlainTime | null;
  /** Minutes between the options in the right-hand column. Every minute by default. */
  minuteStep: number;
  /** Hours between the options in the left-hand one. */
  hourStep: number;
  minTime: PlainTime | string | undefined;
  maxTime: PlainTime | string | undefined;
  locale: string | undefined;
  disabled: boolean;
  messages: TzslotMessages;
  onChange: ((value: PlainTime | null) => void) | undefined;
}

export interface TimeColumnsOptions extends Partial<TimeColumnsSettings> {
  injectStyles?: boolean;
}

export interface TimeColumnsInstance {
  readonly value: PlainTime | null;
  update(settings: Partial<TimeColumnsSettings>): void;
  destroy(): void;
}

const asTime = (t: PlainTime | string | undefined) =>
  t === undefined || t === null ? null : typeof t === 'string' ? Temporal.PlainTime.from(t) : t;
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Hours on one side, minutes on the other.
 *
 * The third way to ask for a time, next to the compact field and the day's
 * bookable slots. Two short lists beat one long one: every half hour of a day
 * is forty-eight buttons, while 24 hours and 60 minutes is two columns that
 * each fit on a screen — and it can offer every minute, which a single list
 * never could.
 */
export function createTimeColumns(
  host: HTMLElement,
  options: TimeColumnsOptions = {},
): TimeColumnsInstance {
  const doc = host.ownerDocument;
  const { injectStyles = true, ...initial } = options;

  const s: TimeColumnsSettings = {
    value: null,
    minuteStep: 1,
    hourStep: 1,
    minTime: undefined,
    maxTime: undefined,
    locale: undefined,
    disabled: false,
    messages: EN,
    onChange: undefined,
    ...initial,
  };

  let stylesPending = injectStyles;

  const addedHostClass = !host.classList.contains('tz-timecols');
  host.classList.add('tz-timecols');

  const column = (part: 'hour' | 'minute', label: string) => {
    const box = doc.createElement('div');
    box.className = `tz-timecols__column tz-timecols__column--${part}`;
    box.setAttribute('role', 'listbox');
    box.setAttribute('aria-label', label);
    box.dataset['part'] = part;
    host.append(box);
    return box;
  };
  const hours = column('hour', s.messages.hourLabel);
  const minutes = column('minute', s.messages.minuteLabel);

  const bounds = () => ({ min: asTime(s.minTime), max: asTime(s.maxTime) });

  /** Which hours are worth offering, given the bounds. */
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

  /** And which minutes, within the hour already chosen. */
  function minuteValues(): number[] {
    const { min, max } = bounds();
    const hour = s.value?.hour ?? null;
    const out: number[] = [];
    for (let m = 0; m < 60; m += s.minuteStep) {
      if (hour !== null && min && hour === min.hour && m < min.minute) continue;
      if (hour !== null && max && hour === max.hour && m > max.minute) break;
      out.push(m);
    }
    return out;
  }

  function paint(box: HTMLElement, part: 'hour' | 'minute', values: number[], chosen: number | null): void {
    box.setAttribute('aria-label', part === 'hour' ? s.messages.hourLabel : s.messages.minuteLabel);
    const buttons = values.map((value) => {
      let button = box.querySelector<HTMLButtonElement>(`[data-value="${value}"]`);
      if (!button) {
        button = doc.createElement('button');
        button.type = 'button';
        button.className = 'tz-timecols__option';
        button.setAttribute('role', 'option');
        button.dataset['value'] = String(value);
        button.dataset['part'] = part;
        button.textContent = pad(value);
      }
      const selected = value === chosen;
      button.classList.toggle('tz-timecols__option--selected', selected);
      button.setAttribute('aria-selected', String(selected));
      button.disabled = s.disabled;
      return button;
    });
    const current = Array.from(box.children);
    if (current.length !== buttons.length || current.some((n, i) => n !== buttons[i])) {
      box.replaceChildren(...buttons);
    }
  }

  /**
   * The chosen option has to be in view, or a list that opens at midnight
   * looks as though nothing was chosen at all.
   */
  function reveal(box: HTMLElement): void {
    const selected = box.querySelector<HTMLElement>('.tz-timecols__option--selected');
    if (!selected) return;
    // Measured against the column, not offsetTop: the nearest positioned
    // ancestor is the panel, so offsetTop counted the calendar above it and
    // the lists opened hours away from what was chosen.
    const inside = selected.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    box.scrollTop = Math.max(0, inside - box.clientHeight / 2 + selected.offsetHeight / 2);
  }

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'timecols', TIMECOLS_CSS);
      stylesPending = false;
    }
    paint(hours, 'hour', hourValues(), s.value?.hour ?? null);
    paint(minutes, 'minute', minuteValues(), s.value?.minute ?? null);
    reveal(hours);
    reveal(minutes);
  }

  function choose(part: 'hour' | 'minute', value: number): void {
    if (s.disabled) return;
    const from = s.value ?? asTime(s.minTime) ?? Temporal.PlainTime.from('00:00');
    s.value = part === 'hour' ? from.with({ hour: value }) : from.with({ minute: value });
    render();
    s.onChange?.(s.value);
  }

  const listening = new AbortController();
  host.addEventListener(
    'click',
    (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('.tz-timecols__option');
      if (!button || button.disabled) return;
      choose(button.dataset['part'] as 'hour' | 'minute', Number(button.dataset['value']));
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
      hours.remove();
      minutes.remove();
      if (addedHostClass) host.classList.remove('tz-timecols');
    },
  };
}
