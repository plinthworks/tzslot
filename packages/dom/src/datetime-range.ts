import { Temporal, getRangeInfo, isRangeProblem, formatDuration } from '@tzslot/core';
import type { Instant, PlainDate, PlainTime, Slot } from '@tzslot/core';
import { createDateTimeField, type DateTimeFieldInstance } from './datetime-field.js';
import type { TimeLayout } from './daily-range.js';
import type { CalendarButton } from './calendar.js';
import type { RenderCell } from './cells.js';
import { EN, type TzslotMessages } from './messages.js';
import { DTR_CSS, ensureStyles } from './styles.js';

export interface DateTimeRangeValue {
  readonly start: Instant | null;
  readonly end: Instant | null;
}

export interface DateTimeRangeSettings {
  /** The two moments. Either may be unset while the interval is being built. */
  value: DateTimeRangeValue;
  /** An IANA identifier. Both ends are read on this zone's clocks. */
  timeZone: string;
  /** How each end asks for its time: a compact field, two menus, or the day's times. */
  timeLayout: TimeLayout;
  stepMinutes: number;
  /** With 'select': minutes between the options. Every minute by default. */
  minuteStep: number;
  minTime: PlainTime | string | undefined;
  maxTime: PlainTime | string | undefined;
  /** Only with timeLayout 'list': rules out slots while still showing them. */
  isSlotDisabled: ((slot: Omit<Slot, 'disabled'>) => boolean) | undefined;
  hour12: boolean | undefined;
  /** The time a newly chosen day starts at. Midnight by default. */
  defaultTime: PlainTime | string;
  /** Each end can be typed into as well as chosen from. */
  editable: boolean;
  /** Separators appear as the figures are typed. */
  mask: boolean;
  /** A pattern for both ends — `yyyy-MM-dd HH:mm`. */
  format: string | undefined;
  min: PlainDate | null;
  max: PlainDate | null;
  isDateDisabled: ((date: PlainDate) => boolean) | undefined;
  renderCell: RenderCell | undefined;
  buttons: readonly CalendarButton[];
  locale: string | undefined;
  disabled: boolean;
  /** The heading over the first end. */
  startLabel: string | undefined;
  /** The heading over the second end. */
  endLabel: string | undefined;
  /** Said when the second moment comes before the first. */
  endBeforeStartMessage: string | undefined;
  messages: TzslotMessages;
  onChange: ((value: DateTimeRangeValue) => void) | undefined;
}

export interface DateTimeRangeOptions extends Partial<DateTimeRangeSettings> {
  injectStyles?: boolean;
}

export interface DateTimeRangeInstance {
  readonly value: DateTimeRangeValue;
  update(settings: Partial<DateTimeRangeSettings>): void;
  clear(): void;
  destroy(): void;
}

type LegKey = 'start' | 'end';

interface Leg {
  readonly key: LegKey;
  readonly section: HTMLElement;
  readonly legend: HTMLElement;
  readonly field: DateTimeFieldInstance;
}

const EMPTY: DateTimeRangeValue = { start: null, end: null };

/**
 * An interval with a time at both ends, which may cross midnight — or a change
 * of offset.
 *
 * This is where the library earns itself. A shift from 23:00 to 05:00 is six
 * hours on any other picker, and on the morning a zone puts its clocks back it
 * is seven. Nothing warns you: the numbers look ordinary afterwards, and the
 * error surfaces as a payroll discrepancy nobody can reproduce.
 *
 * So the duration shown is the measured one, and when it disagrees with the
 * clock faces the widget says so in words.
 */
export function createDateTimeRange(
  host: HTMLElement,
  options: DateTimeRangeOptions = {},
): DateTimeRangeInstance {
  const doc = host.ownerDocument;
  const { injectStyles = true, ...initial } = options;

  const s: DateTimeRangeSettings = {
    value: EMPTY,
    timeZone: 'UTC',
    timeLayout: 'input',
    stepMinutes: 30,
    minuteStep: 1,
    minTime: undefined,
    maxTime: undefined,
    isSlotDisabled: undefined,
    hour12: undefined,
    defaultTime: '00:00',
    editable: true,
    mask: true,
    format: undefined,
    min: null,
    max: null,
    isDateDisabled: undefined,
    renderCell: undefined,
    buttons: [],
    locale: undefined,
    disabled: false,
    startLabel: undefined,
    endLabel: undefined,
    endBeforeStartMessage: undefined,
    messages: EN,
    onChange: undefined,
    ...initial,
  };

  let stylesPending = injectStyles;

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
    const node = doc.createElement(tag);
    node.className = className;
    return node;
  };

  const addedHostClass = !host.classList.contains('tz-dtr');
  host.classList.add('tz-dtr');

  // The answer first. Under two fields it would still read first, but under a
  // list of times it would be below the fold, and the answer is the point.
  const result = el('output', 'tz-dtr__result');
  const summary = el('span', 'tz-dtr__summary');
  const warning = el('span', 'tz-dtr__warning');
  warning.setAttribute('role', 'status');
  result.append(summary);
  const problem = el('p', 'tz-dtr__error');
  problem.setAttribute('role', 'alert');
  const legsBox = el('div', 'tz-dtr__legs');
  host.append(legsBox);

  /**
   * Each end is a whole date-and-time field, so both ends gain what one of
   * them has: typing, a format, a chooser that suits, and the two readings of
   * an hour that happens twice.
   */
  const makeLeg = (key: LegKey): Leg => {
    const section = el('div', 'tz-dtr__leg');
    section.setAttribute('role', 'group');
    const legend = el('h3', 'tz-dtr__legend');
    const fieldHost = doc.createElement('tz-datetime-field');
    section.append(legend, fieldHost);
    legsBox.append(section);
    return {
      key,
      section,
      legend,
      field: createDateTimeField(fieldHost, {
        injectStyles,
        onChange: (value) => commit({ ...s.value, [key]: value }),
      }),
    };
  };
  const legs = [makeLeg('start'), makeLeg('end')];

  function commit(next: DateTimeRangeValue): void {
    s.value = next;
    render();
    s.onChange?.(next);
  }

  /**
   * Said in words, because the number alone does not explain itself. Someone
   * who chose 23:00 to 05:00 and is shown "7h" will assume a bug unless told
   * the clocks moved.
   */
  function describe(): { summary: string | null; warning: string | null; problem: string | null } {
    const { start, end } = s.value;
    if (!start || !end) return { summary: null, warning: null, problem: null };
    const info = getRangeInfo(start, end, s.timeZone);
    if (isRangeProblem(info)) {
      return {
        summary: null,
        warning: null,
        problem: s.endBeforeStartMessage ?? s.messages.endBeforeStart,
      };
    }
    const real = formatDuration(info.duration);
    if (!info.crossesTransition) return { summary: real, warning: null, problem: null };
    const minutes = (m: number) => formatDuration(Temporal.Duration.from({ minutes: Math.abs(m) }));
    return {
      summary: real,
      problem: null,
      warning: s.messages.clockChange({
        direction: info.shiftMinutes > 0 ? 'back' : 'forward',
        by: minutes(info.shiftMinutes),
        apparent: minutes(info.wallMinutes),
        real,
      }),
    };
  }

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'dtr', DTR_CSS);
      stylesPending = false;
    }

    const text = describe();
    if (text.summary) {
      summary.textContent = text.summary;
      if (text.warning) {
        warning.textContent = text.warning;
        result.append(warning);
      } else warning.remove();
      if (!result.isConnected) host.insertBefore(result, host.firstChild);
    } else result.remove();
    if (text.problem) {
      problem.textContent = text.problem;
      if (!problem.isConnected) host.insertBefore(problem, legsBox);
    } else problem.remove();

    for (const leg of legs) {
      const name = leg.key === 'start' ? (s.startLabel ?? s.messages.from) : (s.endLabel ?? s.messages.to);
      leg.legend.textContent = name;
      leg.section.setAttribute('aria-label', name);
      leg.field.update({
        value: s.value[leg.key],
        timeZone: s.timeZone,
        timeLayout: s.timeLayout,
        stepMinutes: s.stepMinutes,
        minuteStep: s.minuteStep,
        minTime: s.minTime,
        maxTime: s.maxTime,
        isSlotDisabled: s.isSlotDisabled,
        hour12: s.hour12,
        defaultTime: s.defaultTime,
        editable: s.editable,
        mask: s.mask,
        format: s.format,
        min: s.min,
        max: s.max,
        isDateDisabled: s.isDateDisabled,
        renderCell: s.renderCell,
        buttons: s.buttons,
        ariaLabel: name,
        locale: s.locale,
        disabled: s.disabled,
        messages: s.messages,
      });
    }
  }

  render();

  return {
    get value() {
      return s.value;
    },
    update(settings) {
      Object.assign(s, settings);
      render();
    },
    clear() {
      commit(EMPTY);
    },
    destroy() {
      for (const leg of legs) leg.field.destroy();
      result.remove();
      problem.remove();
      legsBox.remove();
      if (addedHostClass) host.classList.remove('tz-dtr');
    },
  };
}
