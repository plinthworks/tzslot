import { Temporal, getDailyWindows, formatDuration } from '../../core/src/index.js';
import type { DailyWindowsSummary, PlainDate, PlainTime, Weekday } from '../../core/src/index.js';
import { createDateRange, type DateRangeInstance } from './date-range.js';
import type { RenderCell } from './cells.js';
import { EN, type TzslotMessages } from './messages.js';
import { DAILY_CSS, SLOTS_CSS, ensureStyles } from './styles.js';

/**
 * Two dates and two clock times: "the 3rd to the 7th, 09:00 to 17:00 each day".
 *
 * Wall times, not instants, because that is what the person means — the same
 * hours every day. The instants differ from day to day, and getDailyWindows
 * (or the instance's `summary`) works them out.
 */
export interface DailyRangeValue {
  readonly start: PlainDate | null;
  readonly end: PlainDate | null;
  readonly from: PlainTime | null;
  readonly to: PlainTime | null;
}

export interface DailyRangeSettings {
  value: DailyRangeValue;
  /** An IANA identifier. The hours are read on the clocks of this zone. */
  timeZone: string;
  stepMinutes: number;
  /** The first and last times offered in the two lists. */
  minTime: PlainTime | string | undefined;
  maxTime: PlainTime | string | undefined;
  firstDayOfWeek: Weekday;
  locale: string | undefined;
  min: PlainDate | null;
  max: PlainDate | null;
  isDateDisabled: ((date: PlainDate) => boolean) | undefined;
  renderCell: RenderCell | undefined;
  today: PlainDate;
  disabled: boolean;
  messages: TzslotMessages;
  onChange: ((value: DailyRangeValue) => void) | undefined;
}

export interface DailyRangeOptions extends Partial<DailyRangeSettings> {
  injectStyles?: boolean;
}

export interface DailyRangeInstance {
  readonly value: DailyRangeValue;
  /** Every day's window and the real total, once all four parts are chosen. */
  readonly summary: DailyWindowsSummary | null;
  update(settings: Partial<DailyRangeSettings>): void;
  clear(): void;
  destroy(): void;
}

const EMPTY: DailyRangeValue = { start: null, end: null, from: null, to: null };
const minutesOf = (t: PlainTime) => t.hour * 60 + t.minute;
const asTime = (t: PlainTime | string | undefined) =>
  t === undefined ? undefined : typeof t === 'string' ? Temporal.PlainTime.from(t) : t;

/**
 * A range of days with the same hours on each: a course, a rota, a hire.
 *
 * The hours may run overnight — an end at or before the start ends the next
 * morning, and the end times that do are marked. What the widget adds is the
 * real total, and the days that break the pattern named with their reason:
 * a night shift is eight hours, except the night the clocks go back.
 */
export function createDailyRange(host: HTMLElement, options: DailyRangeOptions = {}): DailyRangeInstance {
  const doc = host.ownerDocument;
  const { injectStyles = true, ...initial } = options;

  const s: DailyRangeSettings = {
    value: EMPTY,
    timeZone: 'UTC',
    stepMinutes: 30,
    minTime: undefined,
    maxTime: undefined,
    firstDayOfWeek: 1,
    locale: undefined,
    min: null,
    max: null,
    isDateDisabled: undefined,
    renderCell: undefined,
    today: Temporal.Now.plainDateISO(),
    disabled: false,
    messages: EN,
    onChange: undefined,
    ...initial,
  };

  let stylesPending = injectStyles;
  let summary: DailyWindowsSummary | null = null;

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
    const node = doc.createElement(tag);
    node.className = className;
    return node;
  };

  const addedHostClass = !host.classList.contains('tz-daily');
  host.classList.add('tz-daily');

  // The answer first, as in the interval: it is the point of the widget.
  const result = el('output', 'tz-daily__result');
  const total = el('span', 'tz-daily__summary');
  const overnightNote = el('span', 'tz-daily__overnight');
  const unusualList = el('ul', 'tz-daily__unusual');
  unusualList.setAttribute('role', 'status');

  const body = el('div', 'tz-daily__body');
  const datesBox = el('div', 'tz-daily__part');
  datesBox.setAttribute('role', 'group');
  const datesLegend = el('h3', 'tz-daily__legend');
  const rangeHost = doc.createElement('div');
  datesBox.append(datesLegend, rangeHost);

  const hoursBox = el('div', 'tz-daily__part');
  hoursBox.setAttribute('role', 'group');
  const hoursLegend = el('h3', 'tz-daily__legend');
  const columns = el('div', 'tz-daily__times');
  hoursBox.append(hoursLegend, columns);

  const makeColumn = (edge: 'from' | 'to') => {
    const column = el('div', 'tz-daily__column');
    const label = el('p', 'tz-daily__column-label');
    const list = el('div', 'tz-slots tz-daily__list');
    list.setAttribute('role', 'listbox');
    list.dataset['edge'] = edge;
    column.append(label, list);
    columns.append(column);
    return { label, list };
  };
  const fromColumn = makeColumn('from');
  const toColumn = makeColumn('to');

  body.append(datesBox, hoursBox);
  host.append(body);

  const range: DateRangeInstance = createDateRange(rangeHost, {
    injectStyles,
    onChange: ({ start, end }) => commit({ ...s.value, start, end }),
  });

  /** The times on offer: the same list for both ends. */
  const times = (): PlainTime[] => {
    const lo = asTime(s.minTime);
    const hi = asTime(s.maxTime);
    const out: PlainTime[] = [];
    for (let m = 0; m < 1440; m += s.stepMinutes) {
      const t = Temporal.PlainTime.from({ hour: Math.floor(m / 60), minute: m % 60 });
      if (lo && Temporal.PlainTime.compare(t, lo) < 0) continue;
      if (hi && Temporal.PlainTime.compare(t, hi) > 0) break;
      out.push(t);
    }
    return out;
  };

  function paintList(list: HTMLElement, edge: 'from' | 'to', label: string): void {
    const chosen = s.value[edge];
    const opens = s.value.from;
    list.setAttribute('aria-label', label);
    const buttons = times().map((t) => {
      const text = t.toString({ smallestUnit: 'minute' });
      let b = list.querySelector<HTMLButtonElement>(`[data-time="${text}"]`);
      if (!b) {
        b = doc.createElement('button');
        b.type = 'button';
        b.className = 'tz-slots__slot';
        b.setAttribute('role', 'option');
        b.dataset['time'] = text;
      }
      const selected = chosen !== null && chosen.equals(t);
      b.classList.toggle('tz-slots__slot--selected', selected);
      b.setAttribute('aria-selected', String(selected));
      b.disabled = s.disabled;
      // An end at or before the start is tomorrow's; say so on the button.
      const nextDay = edge === 'to' && opens !== null && minutesOf(t) <= minutesOf(opens);
      const time = el('span', 'tz-slots__time');
      time.textContent = text;
      if (nextDay) {
        const note = el('span', 'tz-slots__note');
        note.textContent = s.messages.nextDay;
        b.replaceChildren(time, note);
      } else b.replaceChildren(time);
      return b;
    });
    const current = Array.from(list.children);
    if (current.length !== buttons.length || current.some((n, i) => n !== buttons[i])) {
      list.replaceChildren(...buttons);
    }
  }

  const dayName = (date: PlainDate) =>
    new Intl.DateTimeFormat(s.locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
      new Date(Date.UTC(date.year, date.month - 1, date.day)),
    );
  const hours = (minutes: number) => formatDuration(Temporal.Duration.from({ minutes }), { days: false });

  function paintResult(): void {
    const { start, end, from, to } = s.value;
    summary = start && end && from && to ? getDailyWindows(start, end, from, to, s.timeZone) : null;
    if (!summary) {
      result.remove();
      return;
    }
    total.textContent = s.messages.dailySummary({ days: summary.windows.length, total: hours(summary.minutes) });
    const parts: Node[] = [total];
    if (minutesOf(to!) <= minutesOf(from!)) {
      overnightNote.textContent = `${from!.toString({ smallestUnit: 'minute' })} → ${to!.toString({ smallestUnit: 'minute' })} ${s.messages.nextDay}`;
      parts.push(overnightNote);
    }
    unusualList.replaceChildren(
      ...summary.unusual.map((w) => {
        const li = el('li', 'tz-daily__day');
        const change = w.adjusted ? 'skipped' : w.shiftMinutes > 0 ? 'back' : w.shiftMinutes < 0 ? 'forward' : 'repeated';
        li.textContent = s.messages.unusualDay({ date: dayName(w.date), real: hours(w.minutes), change });
        return li;
      }),
    );
    if (summary.unusual.length) parts.push(unusualList);
    result.replaceChildren(...parts);
    if (!result.isConnected) host.insertBefore(result, body);
  }

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'slots', SLOTS_CSS);
      ensureStyles(host, 'daily', DAILY_CSS);
      stylesPending = false;
    }
    datesLegend.textContent = s.messages.days;
    datesBox.setAttribute('aria-label', s.messages.days);
    hoursLegend.textContent = s.messages.hours;
    hoursBox.setAttribute('aria-label', s.messages.hours);
    fromColumn.label.textContent = s.messages.timeFrom;
    toColumn.label.textContent = s.messages.timeTo;

    range.update({
      value: { start: s.value.start, end: s.value.end },
      firstDayOfWeek: s.firstDayOfWeek,
      locale: s.locale,
      min: s.min,
      max: s.max,
      isDateDisabled: s.isDateDisabled,
      renderCell: s.renderCell,
      today: s.today,
      disabled: s.disabled,
      messages: s.messages,
    });
    paintList(fromColumn.list, 'from', s.messages.timeFrom);
    paintList(toColumn.list, 'to', s.messages.timeTo);
    paintResult();
  }

  function commit(next: DailyRangeValue): void {
    s.value = next;
    render();
    s.onChange?.(next);
  }

  const listening = new AbortController();
  columns.addEventListener(
    'click',
    (event) => {
      const b = (event.target as Element).closest<HTMLButtonElement>('.tz-slots__slot');
      const list = b?.closest<HTMLElement>('.tz-daily__list');
      if (!b || !list || b.disabled || s.disabled) return;
      const edge = list.dataset['edge'] as 'from' | 'to';
      commit({ ...s.value, [edge]: Temporal.PlainTime.from(b.dataset['time']!) });
    },
    { signal: listening.signal },
  );

  render();

  return {
    get value() {
      return s.value;
    },
    get summary() {
      return summary;
    },
    update(settings) {
      Object.assign(s, settings);
      render();
    },
    clear() {
      commit(EMPTY);
    },
    destroy() {
      listening.abort();
      range.destroy();
      result.remove();
      body.remove();
      if (addedHostClass) host.classList.remove('tz-daily');
    },
  };
}
