import { Temporal, getRangeInfo, isRangeProblem, formatDuration } from '@tzslot/core';
import type { Instant, PlainDate, PlainTime, Slot } from '@tzslot/core';
import { createDateTimeField, type DateTimeFieldInstance } from './datetime-field.js';
import type { TimeLayout } from './daily-range.js';
import type { CalendarButton } from './calendar.js';
import type { RenderCell } from './cells.js';
import { readingName } from './zone-names.js';
import { EN, type TzslotMessages } from './messages.js';
import { DTR_CSS, ensureStyles } from './styles.js';

export interface DateTimeRangeValue {
  readonly start: Instant | null;
  /**
   * The end. Whole days end at the midnight *after* the last of them — the
   * 24th to the 26th ends at the 27th at 00:00 — so a search reads
   * `start >= from AND start < to` with nothing falling through a gap at
   * 23:59:59.
   */
  readonly end: Instant | null;
  /**
   * True when the two ends are whole days rather than moments. Optional to
   * pass in — a value without it is an ordinary interval — and always there
   * on the way out.
   */
  readonly allDay?: boolean;
}

export interface DateTimeRangeSettings {
  /** The two moments. Either may be unset while the interval is being built. */
  value: DateTimeRangeValue;
  /**
   * Lets the interval stop at one end: "from 14 September", "until the 20th".
   * A search means that; a booking does not. Without it, one end on its own
   * is an unfinished selection and nothing is said about it.
   */
  openEnded: boolean;
  /** An IANA identifier. Both ends are read on this zone's clocks. */
  timeZone: string;
  /**
   * Whole days rather than moments: midnight to midnight, no times shown.
   * Two-way — the switch inside the widget sets it, and so can you.
   */
  allDay: boolean;
  /** Whether that switch is offered at all. */
  allDaySwitch: boolean;
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
  /** Which day is today, in both panels. Settable so a test does not drift. */
  today: PlainDate;
  renderCell: RenderCell | undefined;
  buttons: readonly CalendarButton[];
  /** A column of ISO week numbers down the left of each panel's calendar. */
  weekNumbers: boolean;
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
  readonly host: HTMLElement;
  field: DateTimeFieldInstance | null;
}

const EMPTY: DateTimeRangeValue = { start: null, end: null, allDay: false };

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
    allDay: false,
    allDaySwitch: true,
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
    openEnded: false,
    format: undefined,
    min: null,
    max: null,
    isDateDisabled: undefined,
    today: Temporal.Now.plainDateISO(),
    renderCell: undefined,
    buttons: [],
    weekNumbers: false,
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
    const host_ = doc.createElement('tz-datetime-field');
    section.append(legend, host_);
    legsBox.append(section);
    return { key, section, legend, host: host_, field: null };
  };
  const legs = [makeLeg('start'), makeLeg('end')];

  /**
   * The switch, above both ends. Drawn rather than a bare checkbox: a native
   * one is thirteen grey pixels that nobody finds on a dark background.
   */
  const allDayRow = el('div', 'tz-dtr__allday');
  const allDayBox = doc.createElement('button');
  allDayBox.type = 'button';
  allDayBox.className = 'tz-dtr__allday-box';
  allDayBox.setAttribute('role', 'switch');
  const allDayKnob = el('span', 'tz-dtr__allday-knob');
  allDayBox.append(allDayKnob);
  const allDayText = el('span', 'tz-dtr__allday-text');
  allDayRow.append(allDayBox, allDayText);
  allDayBox.addEventListener('click', () => setAllDay(!wholeDays()));
  allDayText.addEventListener('click', () => !s.disabled && setAllDay(!wholeDays()));

  const wholeDays = () => s.value.allDay === true;
  const zoned = (value: Instant) => value.toZonedDateTimeISO(s.timeZone);
  const midnight = (day: PlainDate) => day.toZonedDateTime({ timeZone: s.timeZone }).toInstant();

/**
 * Whether a moment is the instant a day begins in this zone.
 *
 * Not "is its clock face midnight": Santiago and Havana spring forward *at*
 * midnight, so the day begins at 01:00 and the wall time 00:00 never happens.
 * Comparing against the day's own start is the only test that holds
 * everywhere — and the two zones where it differs are exactly the ones this
 * library exists for.
 */
  const opensADay = (at_: Instant) => at_.equals(midnight(zoned(at_).toPlainDate()));

  /** The last day of a whole-day range, which ends at the midnight after it. */
  function lastDay(end: Instant | null): PlainDate | null {
    if (!end) return null;
    const at = zoned(end);
    return opensADay(end) ? at.toPlainDate().subtract({ days: 1 }) : at.toPlainDate();
  }

  /**
   * Turning whole days on and off keeps the days and drops or restores the
   * times: what was 24 Oct 23:00 to 25 Oct 05:00 becomes the 24th to the
   * 25th, midnight to the midnight after.
   */
  function converted(value: DateTimeRangeValue, on: boolean): DateTimeRangeValue {
    const { start, end } = value;
    if (on) {
      const first = start ? zoned(start).toPlainDate() : null;
      const last = end ? zoned(end).toPlainDate() : null;
      return {
        start: first ? midnight(first) : null,
        end: last ? midnight(last.add({ days: 1 })) : null,
        allDay: true,
      };
    }
    const last = lastDay(end);
    return { start, end: last ? midnight(last) : null, allDay: false };
  }

  /**
   * The switch, moved by the reader. That is a choice, so it is reported.
   */
  function setAllDay(on: boolean): void {
    if (on === wholeDays()) return;
    commit(converted(s.value, on));
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
    if (!start || !end) {
      // One end on its own is either a half-finished selection or a deliberate
      // open interval, and only the screen knows which. When it has said so,
      // the line says what the interval means instead of going blank — a blank
      // line reads as nothing chosen.
      const one = start ?? end;
      if (!s.openEnded || !one) return { summary: null, warning: null, problem: null };
      const word = start ? s.messages.fromDate : s.messages.untilDate;
      const when = new Intl.DateTimeFormat(s.locale, {
        dateStyle: 'medium',
        timeStyle: wholeDays() ? undefined : 'short',
        timeZone: s.timeZone,
      }).format(new Date(one.epochMilliseconds));
      // The same clock face happens twice on one morning a year, and this
      // sentence would read the same for both moments without saying so.
      const reading = wholeDays() ? null : readingName(one, s.timeZone, s.messages);
      return {
        summary: reading ? `${word} ${when} (${reading})` : `${word} ${when}`,
        warning: null,
        problem: null,
      };
    }
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

    allDayText.textContent = s.messages.allDay;
    allDayBox.setAttribute('aria-checked', String(wholeDays()));
    allDayBox.setAttribute('aria-label', s.messages.allDay);
    allDayBox.classList.toggle('tz-dtr__allday-box--on', wholeDays());
    allDayBox.disabled = s.disabled;
    if (s.allDaySwitch) {
      if (!allDayRow.isConnected) host.insertBefore(allDayRow, legsBox);
    } else allDayRow.remove();

    for (const leg of legs) {
      const name = leg.key === 'start' ? (s.startLabel ?? s.messages.from) : (s.endLabel ?? s.messages.to);
      leg.legend.textContent = name;
      leg.section.setAttribute('aria-label', name);

      if (!leg.field) {
        leg.field = createDateTimeField(leg.host, {
          injectStyles,
          onChange: (value) => {
            // A whole-day end is the midnight *after* the last day, so that a
            // search can ask for "before" rather than "before or exactly at".
            const kept =
              wholeDays() && value && leg.key === 'end'
                ? midnight(zoned(value).toPlainDate().add({ days: 1 }))
                : value;
            commit({ ...s.value, [leg.key]: kept });
          },
        });
      }
      // The end field shows the last day itself, not the midnight after it.
      const last = leg.key === 'end' ? lastDay(s.value.end) : null;
      leg.field.update({
        showTime: !wholeDays(),
        value: wholeDays() && leg.key === 'end' ? (last ? midnight(last) : null) : s.value[leg.key],
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
        today: s.today,
        renderCell: s.renderCell,
        buttons: s.buttons,
        weekNumbers: s.weekNumbers,
        ariaLabel: name,
        locale: s.locale,
        disabled: s.disabled,
        messages: s.messages,
      });
    }
  }

  // Said once is enough: `allDay: true` alongside an ordinary interval turns
  // it into whole days, and a value that already says so needs no option.
  const asked = initial.allDay;
  if (asked !== undefined && asked !== wholeDays()) s.value = converted(s.value, asked);

  render();

  return {
    get value() {
      return s.value;
    },
    update(settings) {
      const wanted = 'allDay' in settings ? settings.allDay! : null;
      Object.assign(s, settings);
      // The outside telling the widget something is never the reader doing
      // it: the days are kept, the shape changes, and nothing is reported.
      // This used to run through the switch, so a form writing a value with
      // setValue(…, { emitEvent: false }) got an emission anyway — and the
      // instants it had just set were rewritten under it.
      if (wanted !== null && wanted !== wholeDays()) s.value = converted(s.value, wanted);
      render();
    },
    clear() {
      commit(EMPTY);
    },
    destroy() {
      for (const leg of legs) leg.field?.destroy();
      allDayRow.remove();
      result.remove();
      problem.remove();
      legsBox.remove();
      if (addedHostClass) host.classList.remove('tz-dtr');
    },
  };
}
