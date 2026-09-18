import { Temporal, getRangeInfo, isRangeProblem, formatDuration } from '../../core/src/index.js';
import type { Instant, PlainDate, PlainTime, Slot } from '../../core/src/index.js';
import { createDateField, type DateFieldInstance } from './date-field.js';
import { createTimeSlots, type TimeSlotsInstance } from './time-slots.js';
import { EN, type TzslotMessages } from './messages.js';
import { DTR_CSS, ensureStyles } from './styles.js';

export interface DateTimeRangeValue {
  readonly start: Instant | null;
  readonly end: Instant | null;
}

export interface DateTimeRangeSettings {
  value: DateTimeRangeValue;
  timeZone: string;
  stepMinutes: number;
  minTime: PlainTime | string | undefined;
  maxTime: PlainTime | string | undefined;
  isSlotDisabled: ((slot: Omit<Slot, 'disabled'>) => boolean) | undefined;
  min: PlainDate | null;
  max: PlainDate | null;
  locale: string | undefined;
  disabled: boolean;
  startLabel: string | undefined;
  endLabel: string | undefined;
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
  readonly field: DateFieldInstance;
  readonly slotsHost: HTMLElement;
  slots: TimeSlotsInstance | null;
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
    stepMinutes: 30,
    minTime: undefined,
    maxTime: undefined,
    isSlotDisabled: undefined,
    min: null,
    max: null,
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

  /**
   * The day each leg is showing. Held apart from the value because a day is
   * chosen before a time: between the two clicks there is a date with no
   * instant, and forcing it into the value would mean inventing a time.
   */
  const days: Record<LegKey, PlainDate | null> = { start: null, end: null };

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
    const node = doc.createElement(tag);
    node.className = className;
    return node;
  };

  const addedHostClass = !host.classList.contains('tz-dtr');
  host.classList.add('tz-dtr');

  // The answer first. Under two lists of twenty-four times it would be below
  // the fold, and the whole point of the widget would be invisible.
  const result = el('output', 'tz-dtr__result');
  const summary = el('span', 'tz-dtr__summary');
  const warning = el('span', 'tz-dtr__warning');
  warning.setAttribute('role', 'status');
  result.append(summary);
  const problem = el('p', 'tz-dtr__error');
  problem.setAttribute('role', 'alert');
  const legsBox = el('div', 'tz-dtr__legs');
  host.append(legsBox);

  const makeLeg = (key: LegKey): Leg => {
    const section = el('section', 'tz-dtr__leg');
    const legend = el('h3', 'tz-dtr__legend');
    // Named like the Angular elements, so the same CSS reaches them either way.
    const fieldHost = doc.createElement('tz-date-field');
    const slotsHost = doc.createElement('tz-time-slots');
    section.append(legend, fieldHost);
    legsBox.append(section);
    return {
      key,
      section,
      legend,
      slotsHost,
      slots: null,
      field: createDateField(fieldHost, {
        injectStyles,
        onChange: (day) => setDay(key, day),
      }),
    };
  };
  const legs = [makeLeg('start'), makeLeg('end')];

  const dayOf = (leg: LegKey): PlainDate | null => {
    const chosen = s.value[leg];
    return chosen ? chosen.toZonedDateTimeISO(s.timeZone).toPlainDate() : days[leg];
  };

  function setDay(leg: LegKey, day: PlainDate | null): void {
    days[leg] = day;
    // Changing the day invalidates the time chosen on the old one.
    if (s.value[leg]) commit({ ...s.value, [leg]: null });
    else render();
  }

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

      const day = dayOf(leg.key);
      leg.field.update({
        value: day,
        locale: s.locale,
        min: s.min,
        max: s.max,
        disabled: s.disabled,
        messages: s.messages,
      });

      if (!day) {
        leg.slots?.destroy();
        leg.slots = null;
        leg.slotsHost.remove();
        continue;
      }
      const slotSettings = {
        date: day,
        timeZone: s.timeZone,
        stepMinutes: s.stepMinutes,
        minTime: s.minTime,
        maxTime: s.maxTime,
        isDisabled: s.isSlotDisabled,
        value: s.value[leg.key],
        disabled: s.disabled,
        messages: s.messages,
      };
      if (!leg.slotsHost.isConnected) leg.section.append(leg.slotsHost);
      if (leg.slots) leg.slots.update(slotSettings);
      else {
        const key = leg.key;
        leg.slots = createTimeSlots(leg.slotsHost, {
          ...slotSettings,
          injectStyles,
          onChange: (instant) => commit({ ...s.value, [key]: instant }),
        });
      }
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
      for (const leg of legs) {
        leg.slots?.destroy();
        leg.field.destroy();
      }
      result.remove();
      problem.remove();
      legsBox.remove();
      if (addedHostClass) host.classList.remove('tz-dtr');
    },
  };
}
