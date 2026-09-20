import { Temporal, getDailyWindows, formatDuration } from '@tzslot/core';
import type { DailyWindowsSummary, PlainDate, PlainTime, Weekday } from '@tzslot/core';
import { createDateRange, type DateRangeInstance } from './date-range.js';
import { createTimeInput, type TimeInputInstance } from './time-input.js';
import { createTimeColumns, type TimeColumnsInstance } from './time-columns.js';
import type { RenderCell } from './cells.js';
import { EN, type TzslotMessages } from './messages.js';
import { DAILY_CSS, SLOTS_CSS, TIME_CSS, TIMECOLS_CSS, ensureStyles } from './styles.js';

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

/**
 * How a time is asked for: a compact field, two columns of hours and minutes,
 * or the times on offer that day.
 */
export type TimeLayout = 'input' | 'columns' | 'list';

export interface DailyRangeSettings {
  value: DailyRangeValue;
  /**
   * How the two hours are chosen. 'input' by default: two lists of forty-eight
   * buttons are a long way to say 09:00. 'list' is the right one when the
   * times on offer are the point — opening hours, say.
   */
  timeLayout: TimeLayout;
  /** 12-hour fields with an AM/PM button; the locale decides when unset. */
  hour12: boolean | undefined;
  /** With 'columns': minutes between the options. Every minute by default. */
  minuteStep: number;
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
    timeLayout: 'input',
    hour12: undefined,
    minuteStep: 1,
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
    const inputHost = el('div', 'tz-daily__input');
    inputHost.dataset['edge'] = edge;
    const note = el('span', 'tz-daily__note');
    const columnsHost = el('div', 'tz-daily__columns');
    columnsHost.dataset['edge'] = edge;
    column.append(label);
    columns.append(column);
    return {
      edge,
      column,
      label,
      list,
      inputHost,
      columnsHost,
      note,
      input: null as TimeInputInstance | null,
      columns: null as TimeColumnsInstance | null,
    };
  };
  const fromColumn = makeColumn('from');
  const toColumn = makeColumn('to');
  const both = [fromColumn, toColumn];

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

  /** Hours on one side, minutes on the other, for each end. */
  function paintColumns(column: (typeof both)[number], label: string): void {
    column.list.remove();
    column.inputHost.remove();
    if (!column.columns) {
      column.columns = createTimeColumns(column.columnsHost, {
        injectStyles,
        onChange: (time) => commit({ ...s.value, [column.edge]: time }),
      });
    }
    column.columns.update({
      value: s.value[column.edge],
      minuteStep: s.minuteStep,
      minTime: s.minTime,
      maxTime: s.maxTime,
      locale: s.locale,
      disabled: s.disabled,
      messages: s.messages,
    });
    column.columnsHost.setAttribute('aria-label', label);
    if (!column.columnsHost.isConnected) column.column.append(column.columnsHost);
    paintNextDay(column);
  }

  /** A word under an end that falls on the following day. */
  function paintNextDay(column: (typeof both)[number]): void {
    const { from, to } = s.value;
    const nextDay = column.edge === 'to' && from !== null && to !== null && minutesOf(to) <= minutesOf(from);
    if (nextDay) {
      column.note.textContent = s.messages.nextDay;
      if (!column.note.isConnected) column.column.append(column.note);
    } else column.note.remove();
  }

  /** The compact form: one field per end, and a word under an end that is tomorrow's. */
  function paintInput(column: (typeof both)[number], label: string): void {
    column.list.remove();
    column.columnsHost.remove();
    if (!column.input) {
      column.input = createTimeInput(column.inputHost, {
        injectStyles,
        onChange: (time) => commit({ ...s.value, [column.edge]: time }),
      });
    }
    column.input.update({
      value: s.value[column.edge],
      stepMinutes: s.stepMinutes,
      minTime: s.minTime,
      maxTime: s.maxTime,
      hour12: s.hour12,
      locale: s.locale,
      disabled: s.disabled,
      messages: s.messages,
    });
    column.inputHost.setAttribute('aria-label', label);
    if (!column.inputHost.isConnected) column.column.append(column.inputHost);
    paintNextDay(column);
  }

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
      ensureStyles(host, 'time', TIME_CSS);
      ensureStyles(host, 'timecols', TIMECOLS_CSS);
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
    for (const column of both) {
      const label = column.edge === 'from' ? s.messages.timeFrom : s.messages.timeTo;
      if (s.timeLayout === 'input') paintInput(column, label);
      else if (s.timeLayout === 'columns') paintColumns(column, label);
      else {
        column.input?.destroy();
        column.input = null;
        column.columns?.destroy();
        column.columns = null;
        column.inputHost.remove();
        column.columnsHost.remove();
        column.note.remove();
        if (!column.list.isConnected) column.column.append(column.list);
        paintList(column.list, column.edge, label);
      }
    }
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
      for (const column of both) {
        column.input?.destroy();
        column.columns?.destroy();
      }
      range.destroy();
      result.remove();
      body.remove();
      if (addedHostClass) host.classList.remove('tz-daily');
    },
  };
}
