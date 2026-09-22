import {
  Temporal,
  presetRange,
  presetMoments,
  presetStep,
  isSubDayPreset,
  matchesPreset,
  parseDuration,
  shiftDayRange,
  shiftInstant,
  snapTime,
  resolveWallTime,
} from '@tzslot/core';
import type {
  DayRange,
  DurationLike,
  MomentRange,
  Instant,
  PlainDate,
  PlainTime,
  PresetName,
  ShiftOption,
  ShiftStep,
} from '@tzslot/core';
import { createDateRange, type DateRangeInstance } from './date-range.js';
import { createDateInput, type DateInputInstance, type WallValue } from './date-input.js';
import { createPanel, type FieldMode } from './panel.js';
import { formatWith, patternFor } from './format.js';
import {
  seasonNames as namesFor,
  readingName as nameOfReading,
  zoneName,
} from './zone-names.js';
import type { RenderCell } from './cells.js';
import { EN, type TzslotMessages } from './messages.js';
import {
  DATEINPUT_CSS,
  DATETIME_CSS,
  FIELD_CSS,
  RANGEFIELD_CSS,
  RANGE_CSS,
  TIMESELECT_CSS,
  TIME_CSS,
  ensureStyles,
} from './styles.js';

/** What the field holds: two moments, and whether they are whole days. */
export interface RangeFieldValue {
  readonly start: Instant | null;
  /**
   * Whole days end at the midnight *after* the last of them, so a search
   * reads `start >= from AND start < to` with nothing falling through a gap
   * at 23:59:59.
   */
  readonly end: Instant | null;
  readonly allDay?: boolean;
}

/** A named range offered beside the calendar. */
export interface RangePreset {
  readonly name: string;
  readonly label: string;
  /**
   * Two days — or, for a range shorter than one, two moments. The second
   * argument carries the clock and the zone, so "the quarter hour that is
   * running" can be written without reaching for a global.
   */
  readonly range: (today: PlainDate, at: { now: Instant; timeZone: string }) => DayRange | MomentRange;
  /**
   * What one press of the arrows moves, once this range is chosen. Left out,
   * whole days move by their own length and a shorter range by its duration.
   */
  readonly step?: ShiftStep;
}

/** True for what a preset shorter than a day returns. */
const isMoments = (range: DayRange | MomentRange): range is MomentRange =>
  range.start instanceof Temporal.Instant;

export interface RangeFieldSettings {
  value: RangeFieldValue;
  /** An IANA identifier. Days become moments on this zone's clocks. */
  timeZone: string;
  /** Named ranges beside the calendar. The built-in names, or your own. */
  presets: readonly (PresetName | RangePreset)[];

  /**
   * A word or two saying what is being chosen — "Travel dates", "Effective
   * date". Written above the panel, and read out for the field itself. A
   * picker with no subject is a picker the reader has to infer from what is
   * around it.
   */
  title: string | undefined;
  /**
   * How an hour is asked for inside the two fields. `'select'` — an hour menu
   * and a minute menu — is the default, because most of the time an hour is
   * chosen outright and a menu is two clicks. `'input'` puts an arrow above
   * and below the figures, which suits nudging a time already close to right.
   */
  timeLayout: 'input' | 'select';
  /**
   * Lets a period stop at one end: "from 14 September", "until 20 September".
   * A search means that — `WHERE at >= :start` with no upper bound — and a
   * booking form does not, which is why it is asked for rather than assumed.
   * The panel then offers Between / From / Until, and each chosen end can be
   * dropped with the cross beside it.
   */
  openEnded: boolean;
  /**
   * Whether the period carries times as well as days.
   *
   * It is the screen's decision, not the reader's: a switch marked "all day"
   * asked them to classify their own answer before giving it, and left them
   * wondering what the hours they could see were for. On, every chosen day
   * starts at `defaultTimes` — midnight unless said otherwise — and they
   * change it if they want to.
   */
  showTime: boolean;
  /**
   * The hours a newly chosen day is given. Midnight for both ends unless the
   * screen knows better — a working day from 09:00 to 18:00, a night shift
   * from 22:00. An interval handed to the field keeps its own hours; this is
   * only for days picked afterwards.
   */
  defaultTimes: { start?: PlainTime | string; end?: PlainTime | string };
  /** Minutes the hour's arrows step by. */
  stepMinutes: number;
  /**
   * Move a time typed by hand to the nearest mark of this grid — 15 for
   * quarter-hour appointments. Ties go up. Off by default: a screen that
   * accepts any minute must not have them quietly moved.
   *
   * A time picked from the menus is already on the grid; this is for the
   * figures, which anyone can type 10:07 into.
   */
  snapMinutes: number | null;
  /**
   * How long a period may be, and how short. Either end being moved pushes
   * the other rather than refusing the move: someone dragging a start forward
   * meant to move the period, not to be told their end is now illegal.
   *
   * A duration, or the short form — `'30d'`, `'2h'`.
   */
  maxSpan: DurationLike | null;
  minSpan: DurationLike | null;
  /**
   * Minutes between the options of the hour menu. Five by default — sixty
   * entries is a list nobody reads, and a menu always offers the minute it is
   * already showing whether or not it lands on the step.
   */
  minuteStep: number;
  /** Nothing is reported until Apply is pressed. For searches that cost. */
  confirm: boolean;
  /**
   * Arrows that step the whole selection one period at a time, without
   * opening anything. `false` — the default — draws none: a filter that means
   * one chosen day has nothing to step through. `'auto'` moves by what is
   * selected, so a quarter moves by a quarter and seven days by seven days;
   * a duration — `{ months: 3 }`, `{ days: 7 }` — imposes the step whatever
   * is selected, for a screen whose window is fixed.
   *
   * A duration may be written short — `'25mn'`, `'1h'`, `'3d'`, `'2w'`,
   * `'6mo'` — which is how a screen says its step in one word.
   *
   * A list of `{ step, label }` instead puts a menu between the arrows and
   * lets the reader choose, for a page used to sweep both weeks and quarters.
   *
   * A period open at one end has no length, so `'auto'` moves it by a day
   * there — the unit the calendar itself works in.
   */
  shift: ShiftStep | readonly ShiftOption[] | false;
  /** How many months the panel shows side by side. */
  months: number;
  weekNumbers: boolean;
  firstDayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  mode: FieldMode;
  placeholder: string | undefined;
  ariaLabel: string | undefined;
  locale: string | undefined;
  min: PlainDate | null;
  max: PlainDate | null;
  isDateDisabled: ((date: PlainDate) => boolean) | undefined;
  renderCell: RenderCell | undefined;
  today: PlainDate;
  /**
   * The moment the ranges shorter than a day are counted from. The clock,
   * unless a test or a page rendered ahead of time needs it fixed.
   */
  now: Instant | null;
  /**
   * The whole field, or one end of it: `{ end: true }` for a period whose end
   * the screen works out itself. A locked end is read-only and cannot be
   * armed, so a click in the calendar can never reach it.
   */
  disabled: boolean | { start?: boolean; end?: boolean };
  /** A pattern for each end — `yyyy-MM-dd`. The locale's own form otherwise. */
  format: string | undefined;
  /**
   * Separators appear as figures are typed in the panel's two fields, never
   * while deleting.
   */
  mask: boolean;
  /**
   * The mark inside each of the panel's two fields, and which end it sits at.
   * A calendar by default; `null` for none; a node of your own for an
   * application that already has an icon set.
   */
  fieldIcon: Node | string | null | undefined;
  fieldIconSide: 'start' | 'end';
  /**
   * What is written above each of the panel's two fields, and between them.
   *
   * Words by default — From / To in the messages — but a screen that prefers
   * an arrow says so: `{ start: null, end: null, between: '»' }`. Anything
   * that can be put in a document works, an SVG icon included.
   */
  labels: {
    start?: Node | string | null;
    end?: Node | string | null;
    between?: Node | string | null;
  };
  /** The last word on the text the field shows. */
  displayWith: ((value: RangeFieldValue, timeZone: string) => string) | undefined;
  messages: TzslotMessages;
  onChange: ((value: RangeFieldValue) => void) | undefined;
  onOpen: (() => void) | undefined;
  onClose: (() => void) | undefined;
}

export interface RangeFieldOptions extends Partial<RangeFieldSettings> {
  icon?: Node | string | undefined;
  container?: HTMLElement | undefined;
  injectStyles?: boolean;
}

export interface RangeFieldInstance {
  readonly value: RangeFieldValue;
  readonly isOpen: boolean;
  update(settings: Partial<RangeFieldSettings>): void;
  open(): void;
  close(): void;
  toggle(): void;
  clear(): void;
  destroy(): void;
}

const EMPTY: RangeFieldValue = { start: null, end: null, allDay: true };

/** Which of the two ends a click or a keystroke is about. */
type Edge = 'start' | 'end';
/**
 * What a filter screen offers unless told otherwise, shortest first.
 *
 * Ordered by the length of what they mean rather than by how often they are
 * used: a reader scanning the column is looking for a size, and a list that
 * grows steadily is one they can stop reading as soon as it overshoots.
 */
const BUILT_IN: PresetName[] = [
  'thisQuarterHour',
  'lastHour',
  'thisHour',
  'nextHour',
  'yesterday',
  'today',
  'tomorrow',
  'last7Days',
  'thisMonth',
  'thisQuarter',
];

/**
 * One field for a period: "22/08/2026 – 20/09/2026".
 *
 * Two fields and four clicks is what a range usually costs. This is one field
 * and, most of the time, one click: the named ranges beside the calendar —
 * last 7 days, this month — are what people actually ask for, and they are
 * counted in the zone, so "the last 7 days" is 169 hours the week the clocks
 * go back rather than a silent 168.
 */
export function createRangeField(host: HTMLElement, options: RangeFieldOptions = {}): RangeFieldInstance {
  const doc = host.ownerDocument;
  const { icon, container, injectStyles = true, ...initial } = options;

  const s: RangeFieldSettings = {
    value: EMPTY,
    timeZone: Temporal.Now.timeZoneId(),
    presets: BUILT_IN,
    title: undefined,
    timeLayout: 'select',
    openEnded: false,
    showTime: false,
    defaultTimes: {},
    stepMinutes: 30,
    snapMinutes: null,
    maxSpan: null,
    minSpan: null,
    minuteStep: 5,
    confirm: false,
    shift: false,
    months: 2,
    weekNumbers: false,
    firstDayOfWeek: 1,
    mode: 'popup',
    placeholder: undefined,
    ariaLabel: undefined,
    locale: undefined,
    min: null,
    max: null,
    isDateDisabled: undefined,
    renderCell: undefined,
    today: Temporal.Now.plainDateISO(),
    now: null,
    disabled: false,
    format: undefined,
    mask: true,
    labels: {},
    fieldIcon: undefined,
    fieldIconSide: 'start',
    displayWith: undefined,
    messages: EN,
    onChange: undefined,
    onOpen: undefined,
    onClose: undefined,
    ...initial,
  };

  let stylesPending = injectStyles;
  /** What the panel is showing. The same as the value unless Apply is awaited. */
  let draft: RangeFieldValue = s.value;


  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
    const node = doc.createElement(tag);
    node.className = className;
    return node;
  };

  const addedHostClass = !host.classList.contains('tz-field');
  host.classList.add('tz-field');

  const trigger = doc.createElement('button');
  trigger.type = 'button';
  trigger.className = 'tz-field__trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  const text = el('span', 'tz-field__text');
  const iconSlot = el('span', 'tz-field__icon');
  iconSlot.setAttribute('aria-hidden', 'true');
  iconSlot.append(icon ?? '▾');
  trigger.append(text, iconSlot);

  /**
   * Declared here rather than beside the other listeners: the arrows and the
   * step button are built above, and they were the only handlers in the
   * library that destroy() could not take away.
   */
  const listening = new AbortController();
  const on = { signal: listening.signal };

  /** One of the two arrows that step the selection. */
  function arrow(direction: 1 | -1, className: string): HTMLButtonElement {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = direction === -1 ? '‹' : '›';
    button.addEventListener(
      'click',
      (event) => {
        event.stopPropagation(); // on the field the arrows sit beside a trigger
        step(direction);
      },
      on,
    );
    return button;
  }

  const back = arrow(-1, 'tz-field__shift tz-field__shift--prev');
  const forward = arrow(1, 'tz-field__shift tz-field__shift--next');
  /**
   * The step, as a button that cycles rather than a menu.
   *
   * A native select is painted by the operating system, and on a dark page
   * Chrome draws its closed text from the selected option's colour — which a
   * palette written in light-dark() resolves against the control's own
   * scheme, so the label came out invisible. With three or four steps, a
   * button that advances one each press is plainer anyway: the current step
   * is always readable, which is the thing that mattered.
   */
  const stepPicker = doc.createElement('button');
  stepPicker.type = 'button';
  stepPicker.className = 'tz-field__step';
  stepPicker.addEventListener(
    'click',
    (event) => {
      event.stopPropagation();
      const menu = stepMenu();
      if (!menu) return;
      stepIndex = (stepIndex + 1) % menu.length;
      render();
    },
    on,
  );
  host.append(back, trigger, stepPicker, forward);

  let range: DateRangeInstance | null = null;
  let presetList: HTMLElement | null = null;
  let panelShift: { row: HTMLElement; label: HTMLElement; back: HTMLButtonElement; forward: HTMLButtonElement } | null =
    null;
  type Reading = { instant: Instant; name: string; full: string };

  /**
   * The two readings of a repeated hour, for one end — derived, never
   * remembered. Held state went stale the moment a value arrived from outside,
   * and a panel opened on an ambiguous time then offered no choice at all.
   */
  function readingsFor(edge: Edge): Reading[] {
    const at_ = draft[edge];
    if (!at_ || draft.allDay !== false) return [];
    const here = zoned(at_);
    const found = resolveWallTime(here.toPlainDate(), here.toPlainTime(), s.timeZone);
    if (!found.exists || !found.ambiguous) return [];
    const names = seasonNames(found.offsets);
    return found.instants.map((instant, i) => ({
      instant,
      name: names[i] ?? '',
      full: zoneName(instant, s.timeZone, s.locale),
    }));
  }
  let readingBoxes: { start: HTMLElement; end: HTMLElement } | null = null;
  let inputs: { start: DateInputInstance; end: DateInputInstance } | null = null;
  /** The field the next click in the calendar fills. */
  let armed: Edge = 'start';
  /**
   * Whether the reader armed it themselves, by reaching the field.
   *
   * It decides what two clicks in the calendar mean. Left alone, they mean
   * the usual thing — a start, then an end. After someone has deliberately
   * put the cursor in one of the two fields, they mean that field and nothing
   * else, which is the whole point of having two.
   */
  let armedByHand = false;
  /**
   * The panel putting the cursor somewhere is not the reader choosing.
   *
   * Opening focuses the first field so the keyboard lands inside the panel;
   * treating that as "they armed this one themselves" broke the ordinary
   * two-click flow, because the second click then corrected the start again
   * instead of filling the end.
   */
  let openingFocus = false;

  /**
   * Whether the period is whole days. Said by the screen through showTime,
   * not by a switch the reader has to understand before answering.
   */
  const wholeDays = () => !s.showTime;

  /** Whether the whole field is off, or just one of its two ends. */
  const off = (edge?: Edge): boolean => {
    if (typeof s.disabled === 'boolean') return s.disabled;
    if (!edge) return s.disabled.start === true && s.disabled.end === true;
    return s.disabled[edge] === true;
  };
  const zoned = (value: Instant) => value.toZonedDateTimeISO(s.timeZone);
  const midnight = (day: PlainDate) => day.toZonedDateTime({ timeZone: s.timeZone }).toInstant();
  const at = (day: PlainDate, time: PlainTime) =>
    day.toZonedDateTime({ timeZone: s.timeZone, plainTime: time }).toInstant();

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

  /** The days the value covers, both included — what the calendar highlights. */
  function days(value: RangeFieldValue): { start: PlainDate | null; end: PlainDate | null } {
    const start = value.start ? zoned(value.start).toPlainDate() : null;
    if (!value.end) return { start, end: null };
    const end = zoned(value.end);
    const last =
      value.allDay !== false && opensADay(value.end)
        ? end.toPlainDate().subtract({ days: 1 })
        : end.toPlainDate();
    return { start, end: last };
  }

  /** And the other way: two days become two moments, whole or with times. */
  function fromDays(range_: { start: PlainDate | null; end: PlainDate | null }): RangeFieldValue {
    // Without showTime there is nowhere to read or change an hour, so days
    // chosen on the calendar are whole days — even just after a shortcut that
    // was an interval, which would otherwise leave times nothing can edit.
    const allDay = wholeDays();
    const times = {
      start: draft.start && !allDay ? zoned(draft.start).toPlainTime() : null,
      end: draft.end && !allDay ? zoned(draft.end).toPlainTime() : null,
    };
    if (allDay) {
      return {
        start: range_.start ? midnight(range_.start) : null,
        end: range_.end ? midnight(range_.end.add({ days: 1 })) : null,
        allDay,
      };
    }
    return {
      start: range_.start ? resolveEdge('start', range_.start, times.start ?? defaultTime('start')) : null,
      end: range_.end ? resolveEdge('end', range_.end, times.end ?? defaultTime('end')) : null,
      allDay,
    };
  }

  const seasonNames = (offsets: readonly string[]) => namesFor(offsets, s.messages);

  /**
   * A day and a wall time become a moment — and on two days a year that is a
   * question, not a conversion. The hour the clocks skip has no moment at all;
   * the hour they repeat has two, and picking one silently is how a booking
   * ends up an hour out with nothing on screen to explain it.
   */
  function resolveEdge(_edge: Edge, day: PlainDate, time: PlainTime, offset?: string | null): Instant {
    const found = resolveWallTime(day, time, s.timeZone);
    if (!found.exists) {
      return day.toPlainDateTime(time).toZonedDateTime(s.timeZone, { disambiguation: 'later' }).toInstant();
    }
    // A menu that offered "02 — winter" has already been answered; only when
    // nothing said which does the first reading stand.
    if (offset) {
      const named = found.offsets.indexOf(offset);
      if (named >= 0) return found.instants[named]!;
    }
    return found.instants[0]!;
  }

  /** The hour a newly chosen day gets, at one end or the other. */
  const defaultTime = (edge: Edge): PlainTime => {
    const given = edge === 'start' ? s.defaultTimes.start : s.defaultTimes.end;
    return given ? Temporal.PlainTime.from(given) : Temporal.PlainTime.from('00:00');
  };

  const pattern = () => s.format ?? patternFor(s.locale, { time: false });

  /** What the field says about a value — the chosen one, or the pending draft. */
  function display(value: RangeFieldValue = s.value): string {
    if (s.displayWith) return s.displayWith(value, s.timeZone);
    const { start, end } = days(value);
    if (!start && !end) return '';
    const shape = pattern();
    const time = (at_: Instant | null) => {
      if (value.allDay !== false || !at_) return '';
      const written = formatWith('HH:mm', { time: zoned(at_).toPlainTime() }, s.locale);
      // Which 02:30 was chosen is visible in the panel and nowhere else once
      // it closes, and a field that reads 02:30 twice over is a field the
      // reader cannot check. The name rides along in brackets.
      const reading = nameOfReading(at_, s.timeZone, s.messages);
      return reading ? ` ${written} (${reading})` : ` ${written}`;
    };
    const first = start ? formatWith(shape, { date: start }, s.locale) + time(value.start) : null;
    const last = end ? formatWith(shape, { date: end }, s.locale) + time(value.end) : null;
    // An open end is a statement, not an unfinished sentence: "From 14/09/2026",
    // not "14/09/2026 – …". The reader has to be able to tell the two apart.
    if (first && !last) return s.openEnded ? `${s.messages.fromDate} ${first}` : `${first} – …`;
    if (!first && last) return `${s.messages.untilDate} ${last}`;
    return first === last ? first! : `${first} – ${last}`;
  }

  function commit(next: RangeFieldValue): void {
    s.value = next;
    render();
    s.onChange?.(next);
  }

  /** Chosen in the panel: reported at once, or held until Apply. */
  function choose(next: RangeFieldValue, { close = false } = {}): void {
    draft = next;
    if (s.confirm) {
      paintPanel();
      return;
    }
    commit(next);
    if (close) panel.close();
    else paintPanel();
  }

  /**
   * The step the last chosen preset left behind.
   *
   * Someone who asks for the current quarter hour and then presses an arrow
   * means the quarter hour before — the named range they picked is the rule
   * they have in mind. Choosing days by hand on the calendar clears it, and
   * the arrows go back to following the length of what is selected.
   */
  let presetShift: ShiftStep | null = null;

  /** The offered steps, when the reader is given the choice. */
  const stepMenu = (): readonly ShiftOption[] | null => (Array.isArray(s.shift) && s.shift.length > 0 ? s.shift : null);
  /** Which of them is chosen. Kept by position, so a relabelled menu is harmless. */
  let stepIndex = 0;
  const currentStep = (): ShiftStep | null => {
    const menu = stepMenu();
    if (menu) return menu[Math.min(stepIndex, menu.length - 1)]?.step ?? null;
    if (s.shift === false) return null;
    // 'auto' means "follow what is selected", and a preset says what that is
    // better than the value can.
    if (s.shift === 'auto' && presetShift !== null) return presetShift;
    return s.shift as ShiftStep;
  };

  /** True when there is a whole period to move, and something to move it by. */
  /**
   * What one press moves, with 'auto' resolved.
   *
   * A period open at one end has no length to follow, and refusing to move at
   * all was the wrong answer: nothing stops someone wanting "from the 18th"
   * to become "from the 17th" without reopening the calendar. A day is the
   * unit the calendar itself works in, so that is the fallback; anything else
   * is imposed with a step of its own.
   */
  /**
   * A step as Temporal can use it.
   *
   * `'25mn'` is not an ISO duration and Temporal would refuse it; it is the
   * short form a screen writes, and reading it here means `shift` takes the
   * same words the documentation shows.
   */
  const asStep = (step_: ShiftStep | null): ShiftStep | null => {
    if (typeof step_ !== 'string' || step_ === 'auto') return step_;
    const short = parseDuration(step_);
    if (short) return short;
    try {
      return Temporal.Duration.from(step_); // an ISO duration, 'PT1H'
    } catch {
      // Neither. Drawing no arrows is a better answer than throwing out of a
      // click handler and taking the panel with it.
      return null;
    }
  };

  const effectiveStep = (): ShiftStep | null => {
    const step_ = asStep(currentStep());
    if (step_ !== 'auto') return step_;
    const { start, end } = days(s.value);
    return start !== null && end !== null ? 'auto' : { days: 1 };
  };

  /**
   * True for a step shorter than a day.
   *
   * A period of whole days cannot move by fifteen minutes and stay whole
   * days, and a screen that shows no hours has nowhere to put the ones such a
   * move would create. The arrows go away rather than sitting there doing
   * nothing, which is what they did: PlainDate.add({ hours: 1 }) does not
   * throw, it adds nothing.
   */
  const subDay = (step_: ShiftStep): boolean => {
    if (step_ === 'auto') return false;
    // A duration counted in months or weeks cannot be measured in hours
    // without a point to measure from, and Temporal says so rather than
    // guessing. Today in the zone is as good a point as any for "is this
    // shorter than a day".
    const relative = s.value.start
      ? zoned(s.value.start)
      : s.today.toZonedDateTime({ timeZone: s.timeZone });
    return Temporal.Duration.from(step_ as DurationLike).total({ unit: 'hour', relativeTo: relative }) < 24;
  };

  const canShift = () => {
    const step_ = effectiveStep();
    if (step_ === null || off()) return false;
    if (wholeDays() && s.value.allDay !== false && subDay(step_)) return false;
    const { start, end } = days(s.value);
    return start !== null || end !== null;
  };

  /**
   * One notch, in either direction.
   *
   * The step moves the days and the times follow: an interval from 09:00 to
   * 17:00 shifted a week on is still 09:00 to 17:00, which is what someone
   * comparing two weeks means — and, across a change of clocks, not the same
   * number of hours, which is the truth of it.
   */
  function step(direction: 1 | -1): void {
    const by = effectiveStep();
    if (!canShift() || by === null) return;

    // A period with times moves as moments when the step is shorter than a
    // day: fifteen minutes cannot be said in dates. Longer than a day, it
    // moves as days and the hours come along unchanged — someone comparing
    // one working week with the next means 09:00 to 17:00 again, not the same
    // number of hours counted from wherever the first one ended.
    if (s.value.allDay === false && s.value.start && s.value.end) {
      const own = s.value.start.until(s.value.end);
      const moveBy = by === 'auto' ? own : Temporal.Duration.from(by);
      const shortHop = moveBy.total({ unit: 'hour', relativeTo: zoned(s.value.start) }) < 24;
      if (shortHop) {
        draft = s.value;
        const next = {
          start: shiftInstant(s.value.start, moveBy, direction, s.timeZone),
          end: shiftInstant(s.value.end, moveBy, direction, s.timeZone),
          allDay: false,
        };
        if (panel.isOpen) choose(next);
        else commit(next);
        return;
      }
    }

    const shown = days(s.value);
    if (!shown.start || !shown.end) {
      // One end only: the bound that exists moves, and the open side stays
      // open. A step shorter than a day moves the moment — "from the 18th at
      // 10:00" to 09:45 — and anything longer moves the day, hours and all.
      const only = s.value.start ?? s.value.end!;
      const moveBy = Temporal.Duration.from(by === 'auto' ? { days: 1 } : by);
      draft = s.value;
      let next: RangeFieldValue;
      if (moveBy.total({ unit: 'hour', relativeTo: zoned(only) }) < 24) {
        const moved = shiftInstant(only, moveBy, direction, s.timeZone);
        next = s.value.start
          ? { start: moved, end: null, allDay: false }
          : { start: null, end: moved, allDay: false };
      } else {
        const day = shown.start ?? shown.end!;
        const moved = shiftDayRange({ start: day, end: day }, moveBy, direction);
        next = fromDays(shown.start ? { start: moved.start, end: null } : { start: null, end: moved.end });
      }
      if (panel.isOpen) choose(next);
      else commit(next);
      return;
    }
    const moved = shiftDayRange({ start: shown.start, end: shown.end }, by, direction);
    draft = s.value; // so the times carry over into fromDays
    const next = fromDays({ start: moved.start, end: moved.end });
    if (panel.isOpen) choose(next);
    else commit(next);
  }

  /**
   * One end of the period, set from a field or from a click in the calendar.
   *
   * The wall time becomes a moment here, so the two mornings a year when that
   * is a question — the hour that never happens, the hour that happens twice —
   * are answered in one place for both ends.
   */
  function setEdge(edge: Edge, wall: WallValue): void {
    if (off(edge)) return;
    // Without showTime there is nowhere to read or change an hour, so a day
    // chosen is a whole day.
    const timed = s.showTime;
    // Whole days becoming an interval: both ends are rebuilt from the days on
    // screen first, or the end — which is the midnight *after* the last day —
    // would suddenly read as that following day.
    if (timed && draft.allDay !== false && (draft.start || draft.end)) {
      const shownDays = days(draft);
      draft = {
        start: shownDays.start ? resolveEdge('start', shownDays.start, defaultTime('start')) : null,
        end: shownDays.end ? resolveEdge('end', shownDays.end, defaultTime('end')) : null,
        allDay: false,
      };
    }
    if (!wall.date) {
      draft = { ...draft, [edge]: null } as RangeFieldValue;
      choose(draft);
      return;
    }
    const wanted = wall.time ?? defaultTime(edge);
    const onGrid = timed && s.snapMinutes ? snapTime(wanted, s.snapMinutes) : wanted;
    const at_ = timed
      ? resolveEdge(edge, wall.date, onGrid, wall.offset)
      : edge === 'start'
        ? midnight(wall.date)
        : midnight(wall.date.add({ days: 1 }));
    draft = withinSpan(ordered({ ...draft, [edge]: at_, allDay: !timed } as RangeFieldValue, edge), edge);
    choose(draft);
    range?.goTo({ year: wall.date.year, month: wall.date.month });
  }

  /**
   * What goes above one of the two fields. The word from the messages unless
   * the screen said otherwise — including saying it wants nothing there.
   */
  function labelFor(edge: Edge): Node | string | null {
    const given = edge === 'start' ? s.labels.start : s.labels.end;
    if (given !== undefined) return given;
    return edge === 'start' ? s.messages.rangeStart : s.messages.rangeEnd;
  }

  /**
   * A period whose two ends are the right way round.
   *
   * The calendar's own swap logic is bypassed here, because a click fills the
   * armed field and nothing else. Someone who arms the start and clicks a day
   * after the end has said something impossible; the other end follows rather
   * than the click being refused, which is what the range calendar does when
   * it is left to itself, and it never emits `start > end`.
   */
  function ordered(value: RangeFieldValue, touched: Edge): RangeFieldValue {
    const { start, end } = value;
    if (!start || !end || Temporal.Instant.compare(start, end) <= 0) return value;
    const other: Edge = touched === 'start' ? 'end' : 'start';
    if (off(other)) {
      // Locked, so it cannot move out of the way: the click is refused rather
      // than emitting a period that runs backwards.
      return draft;
    }
    // The end that is now impossible is dropped, and it is the one to fill
    // next: this is someone beginning a new period, and saying so reads
    // better than a period of no length at all.
    armed = other;
    armedByHand = false;
    return { ...value, [other]: null } as RangeFieldValue;
  }

  /**
   * A period held to the length the screen allows.
   *
   * The end that was *not* just touched is the one that moves: someone
   * dragging a start forward meant to move the period, not to be told their
   * end has become illegal. Through the zone, so a span in days survives the
   * two nights that are not twenty-four hours long.
   */
  function withinSpan(value: RangeFieldValue, touched: Edge): RangeFieldValue {
    const { start, end } = value;
    if (!start || !end) return value;
    const other: Edge = touched === 'start' ? 'end' : 'start';
    if (off(other)) return value; // locked: nothing here may move it
    const move = (limit: DurationLike, direction: 1 | -1) =>
      touched === 'start'
        ? { ...value, end: shiftInstant(start, limit, direction, s.timeZone) }
        : { ...value, start: shiftInstant(end, limit, -direction as 1 | -1, s.timeZone) };

    if (s.maxSpan) {
      const longest = Temporal.Duration.from(asDuration(s.maxSpan));
      const room = zoned(start).until(zoned(end));
      if (Temporal.Duration.compare(room, longest, { relativeTo: zoned(start) }) > 0) {
        return move(longest, 1);
      }
    }
    if (s.minSpan) {
      const shortest = Temporal.Duration.from(asDuration(s.minSpan));
      const room = zoned(start).until(zoned(end));
      if (Temporal.Duration.compare(room, shortest, { relativeTo: zoned(start) }) < 0) {
        return move(shortest, 1);
      }
    }
    return value;
  }

  /** `'30d'` as well as `{ days: 30 }`, the same words the step takes. */
  const asDuration = (given: DurationLike): DurationLike =>
    typeof given === 'string' ? (parseDuration(given) ?? given) : given;

  /** The clock face an end already carries, so a click on a day keeps it. */
  function timeOf(edge: Edge): PlainTime | null {
    const at_ = draft[edge];
    if (!at_ || !s.showTime) return null;
    return zoned(at_).toPlainTime();
  }

  /** The two ends as a field writes them: a day, an hour, and which reading. */
  function wallOf(edge: Edge): WallValue {
    const shown = days(draft);
    const at_ = draft[edge];
    return {
      date: edge === 'start' ? shown.start : shown.end,
      time: timeOf(edge),
      // Only where there are two identical clock faces to tell apart. On an
      // ordinary day the hour is offered without an offset, and naming one
      // would match no option at all — the menu would show a blank.
      offset: at_ && s.showTime && readingsFor(edge).length > 0 ? zoned(at_).offset : null,
    };
  }

  const clock = () => s.now ?? Temporal.Now.instant();

  const presets = (): RangePreset[] =>
    s.presets.map((preset) =>
      typeof preset === 'string'
        ? {
            name: preset,
            label: s.messages.presets[preset],
            step: presetStep(preset),
            range: (today: PlainDate, at_: { now: Instant; timeZone: string }) =>
              isSubDayPreset(preset)
                ? presetMoments(preset, at_)
                : presetRange(preset, { today, firstDayOfWeek: s.firstDayOfWeek }),
          }
        : preset,
    );

  /** What a preset returns, applied — days become a period, moments are one. */
  function applyPreset(preset: RangePreset): void {
    armed = 'start';
    armedByHand = false;
    const picked = preset.range(s.today, { now: clock(), timeZone: s.timeZone });
    presetShift = preset.step ?? (isMoments(picked) ? picked.start.until(picked.end) : 'auto');
    if (isMoments(picked)) {
      choose({ start: picked.start, end: picked.end, allDay: false }, { close: !s.confirm });
      return;
    }
    // A shortcut named in days means those days entirely — first midnight to
    // the midnight after the last — whether or not the screen shows hours.
    // Building it from the hours on screen would quietly drop the last day.
    choose(
      {
        start: midnight(picked.start),
        end: midnight(picked.end.add({ days: 1 })),
        allDay: true,
      },
      { close: !s.confirm },
    );
  }

  function paintPresets(): void {
    if (!presetList) return;
    const chosen = days(draft);
    const offered = presets();
    // Repainted, not rebuilt. Pressing Enter on a shortcut repaints the panel,
    // and replaceChildren then destroyed the very button under the focus —
    // which landed on the body. The same care is taken for the readings and
    // the day cells; this column was missed.
    const existing = [...presetList.children] as HTMLButtonElement[];
    offered.forEach((preset, index) => {
      let button = existing[index];
      if (!button) {
        button = el('button', 'tz-rangefield__preset');
        button.type = 'button';
        presetList!.append(button);
      }
      const on = marks(preset, chosen);
      if (button.textContent !== preset.label) button.textContent = preset.label;
      button.classList.toggle('tz-rangefield__preset--on', on);
      button.setAttribute('aria-pressed', String(on));
      button.disabled = off();
      button.onclick = () => applyPreset(preset);
    });
    for (const extra of existing.slice(offered.length)) extra.remove();
  }

  /**
   * Whether a preset is what is currently chosen, so it can be ticked.
   *
   * A range shorter than a day is compared as moments — two quarter hours of
   * the same day are the same two dates, and comparing dates would tick the
   * wrong one.
   */
  function marks(preset: RangePreset, chosen: { start: PlainDate | null; end: PlainDate | null }): boolean {
    if (isSubDayPreset(preset.name) || draft.allDay === false) {
      const picked = preset.range(s.today, { now: clock(), timeZone: s.timeZone });
      if (!isMoments(picked)) return false;
      return (
        draft.start !== null &&
        draft.end !== null &&
        draft.start.equals(picked.start) &&
        draft.end.equals(picked.end)
      );
    }
    if (chosen.start === null || chosen.end === null) return false;
    // Only a shortcut that *is* a built-in one. A custom preset named
    // 'thisWeek' was ticked by the built-in definition of thisWeek, ignoring
    // the range function it came with.
    if (isBuiltIn(preset.name) && !(s.presets as readonly unknown[]).includes(preset)) {
      return matchesPreset(preset.name, { start: chosen.start, end: chosen.end }, {
        today: s.today,
        firstDayOfWeek: s.firstDayOfWeek,
      });
    }
    const picked = preset.range(s.today, { now: clock(), timeZone: s.timeZone });
    return !isMoments(picked) && sameRange(picked, { start: chosen.start, end: chosen.end });
  }

  const isBuiltIn = (name: string): name is PresetName => (BUILT_IN as string[]).includes(name) || [
    'last14Days',
    'last30Days',
    'thisWeek',
    'lastWeek',
    'lastMonth',
    'lastQuarter',
    'nextQuarter',
    'next7Days',
    'next30Days',
    'thisYear',
  ].includes(name);
  const sameRange = (a: DayRange, b: { start: PlainDate; end: PlainDate }) =>
    a.start.equals(b.start) && a.end.equals(b.end);

  function paintPanel(): void {
    const shown = days(draft);
    // With one end open there is a single day to mark; the grid draws it as a
    // range of one, which is exactly how it looks.
    const only = shown.start === null || shown.end === null ? (shown.start ?? shown.end) : null;
    range?.update({
      value: only ? { start: only, end: only } : { start: shown.start, end: shown.end },
      months: s.months,
      weekNumbers: s.weekNumbers,
      firstDayOfWeek: s.firstDayOfWeek,
      locale: s.locale,
      min: s.min,
      max: s.max,
      isDateDisabled: s.isDateDisabled,
      renderCell: s.renderCell,
      today: s.today,
      disabled: off(),
      messages: s.messages,
    });
    if (inputs) {
      for (const edge of ['start', 'end'] as const) {
        inputs[edge].update({
          value: wallOf(edge),
          withTime: s.showTime,
          timeLayout: s.timeLayout,
          readingStyle: 'marked',
          icon: s.fieldIcon,
          iconSide: s.fieldIconSide,
          stepMinutes: s.stepMinutes,
          minuteStep: s.minuteStep,
          date: edge === 'start' ? days(draft).start : days(draft).end,
          timeZone: s.timeZone,
          format: s.format,
          locale: s.locale,
          mask: s.mask,
          clearable: s.openEnded,
          disabled: off(edge),
          messages: s.messages,
          label: labelFor(edge),
          ariaLabel: edge === 'start' ? s.messages.rangeStart : s.messages.rangeEnd,
          // Never the pattern: a field that says dd/MM/yyyy before anything is
          // typed is a field explaining itself instead of inviting an answer.
          // The word above it already says which end it is.
          placeholder: undefined,
        });
        // The ring says which field the next click in the calendar will fill.
        inputs[edge].host.classList.toggle('tz-dateinput--armed', armed === edge && !off(edge));
      }
    }
    if (readingBoxes) {
      for (const edge of ['start', 'end'] as const) {
        const box = readingBoxes[edge];
        // The menus tell the two readings apart with a star, which keeps the
        // list as narrow as any other day of the year; what the star means is
        // said underneath, once, instead of in every option.
        const offered = s.timeLayout === 'select' ? [] : readingsFor(edge);
        if (s.timeLayout === 'select') {
          const pair = readingsFor(edge);
          const chosen = draft[edge];
          // The line names the reading in force, not the starred one: it
          // answers "which 02:00 is this?", which is the question the reader
          // has. The star comes along only when the starred option is the
          // answer, because then it also explains the mark in the list.
          const held = chosen === null ? undefined : pair.find((r) => r.instant.equals(chosen));
          if (held) {
            const starred = held === pair[1];
            box.hidden = false;
            const legend = (box.firstElementChild as HTMLElement | null) ?? el('span', 'tz-dateinput__legend');
            legend.className = 'tz-dateinput__legend';
            legend.textContent = starred ? `* ${held.name}` : held.name;
            legend.title = held.full;
            legend.classList.toggle('tz-dateinput__legend--on', starred);
            if (!legend.isConnected) box.replaceChildren(legend);
            continue;
          }
          box.hidden = true;
          box.replaceChildren();
          continue;
        }
        box.hidden = offered.length === 0;
        if (offered.length === 0) {
          box.replaceChildren();
          continue;
        }
        const current = draft[edge];
        // Repainted rather than rebuilt: a button replaced under a finger in
        // mid-click swallows the click, which cost an afternoon once already.
        const buttons = [...box.children] as HTMLButtonElement[];
        offered.forEach(({ instant, name, full }, index) => {
          let button = buttons[index];
          if (!button) {
            button = el('button', 'tz-datetime__reading');
            button.type = 'button';
            box.append(button);
          }
          button.textContent = name;
          button.title = full;
          const picked = current !== null && current.equals(instant);
          button.classList.toggle('tz-datetime__reading--on', picked);
          button.setAttribute('aria-pressed', String(picked));
          button.disabled = off();
          button.onclick = () => {
            draft = { ...draft, allDay: false, [edge]: instant } as RangeFieldValue;
            choose(draft);
          };
        });
        for (const extra of buttons.slice(offered.length)) extra.remove();
      }
    }
    if (panelShift) {
      panelShift.label.textContent = display(draft) || s.messages.chooseRange;
      for (const button of [panelShift.back, panelShift.forward]) button.disabled = !canShift();
    }
    paintPresets();
    panel.place();
  }

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'field', FIELD_CSS);
      stylesPending = false;
    }
    text.textContent = display() || s.placeholder || s.messages.chooseRange;
    const menu = stepMenu();
    host.classList.toggle('tz-field--shift', currentStep() !== null);
    stepPicker.hidden = menu === null;
    if (menu) {
      const current = menu[Math.min(stepIndex, menu.length - 1)];
      stepIndex = Math.min(stepIndex, menu.length - 1);
      stepPicker.textContent = current?.label ?? '';
      stepPicker.disabled = off() || menu.length < 2;
      const label_ = `${s.messages.stepLabel} : ${current?.label ?? ''}`;
      stepPicker.title = label_;
      stepPicker.setAttribute('aria-label', label_);
    }
    for (const [button, label] of [
      [back, s.messages.previousPeriod],
      [forward, s.messages.nextPeriod],
    ] as const) {
      button.hidden = currentStep() === null;
      button.disabled = !canShift();
      button.setAttribute('aria-label', label);
      button.title = label;
    }
    trigger.classList.toggle('tz-field__trigger--empty', s.value.start === null);
    trigger.setAttribute('aria-expanded', String(panel.isOpen));
    trigger.setAttribute('aria-label', s.ariaLabel ?? s.title ?? s.messages.chooseRange);
    trigger.disabled = off();
    if (off()) panel.close({ restoreFocus: false });
    paintPanel();
  }

  const panel = createPanel({
    trigger,
    source: host,
    container,
    mode: () => s.mode,
    label: () => s.ariaLabel ?? s.title ?? s.messages.chooseRange,
    onOpen: () => {
      draft = s.value;
      armed = off('start') ? 'end' : 'start';
      armedByHand = false;
      render();
      s.onOpen?.();
    },
    onClose: () => {
      range = null;
      presetList = null;
      panelShift = null;
      readingBoxes = null;
      inputs = null;
      render();
      s.onClose?.();
    },
    /**
     * The first field, which is what the panel is for.
     *
     * It looked for a day cell the range calendar never marks as tabbable and
     * fell back to "the first button", which is the start field's clear cross
     * — hidden unless openEnded, and focusing a hidden element does nothing.
     * The focus stayed on the body, so opening the panel with the keyboard
     * left the reader outside it.
     */
    initialFocus: (node) => {
      const field = node.querySelector<HTMLElement>('.tz-dateinput__input:not([readonly])');
      if (field) openingFocus = true;
      return (
        field ??
        node.querySelector<HTMLElement>('.tz-range__day[tabindex="0"]') ??
        node.querySelector<HTMLElement>('button:not([hidden]):not(:disabled)')
      );
    },
    content: (node) => {
      node.classList.add('tz-rangefield__panel');
      ensureStyles(node, 'rangefield', RANGEFIELD_CSS);
      ensureStyles(node, 'range', RANGE_CSS);
      ensureStyles(node, 'time', TIME_CSS);
      ensureStyles(node, 'dateinput', DATEINPUT_CSS);
      ensureStyles(node, 'timeselect', TIMESELECT_CSS);
      ensureStyles(node, 'datetime', DATETIME_CSS);

      if (s.title) {
        const heading = el('h2', 'tz-rangefield__title');
        heading.textContent = s.title;
        node.append(heading);
      }

      if (currentStep() !== null) {
        const row = el('div', 'tz-rangefield__shift');
        const label = el('span', 'tz-rangefield__shift-label');
        const backButton = arrow(-1, 'tz-rangefield__shift-arrow');
        const forwardButton = arrow(1, 'tz-rangefield__shift-arrow');
        backButton.setAttribute('aria-label', s.messages.previousPeriod);
        forwardButton.setAttribute('aria-label', s.messages.nextPeriod);
        row.append(backButton, label, forwardButton);
        node.append(row);
        panelShift = { row, label, back: backButton, forward: forwardButton };
      }

      const head = el('div', 'tz-rangefield__head');
      const pair = el('div', 'tz-rangefield__inputs');
      const made: Partial<Record<Edge, DateInputInstance>> = {};
      for (const edge of ['start', 'end'] as const) {
        // Whatever the screen wants between the two fields — a dash, a double
        // arrow, nothing. It sits on the line of the fields, not of the labels.
        if (edge === 'end' && s.labels.between !== undefined && s.labels.between !== null) {
          const between = el('span', 'tz-rangefield__between');
          between.append(s.labels.between);
          between.setAttribute('aria-hidden', 'true');
          pair.append(between);
        }
        const inputHost = doc.createElement('div');
        pair.append(inputHost);
        made[edge] = createDateInput(inputHost, {
          injectStyles: false,
          label: labelFor(edge),
          ariaLabel: edge === 'start' ? s.messages.rangeStart : s.messages.rangeEnd,
          clearable: s.openEnded,
          messages: s.messages,
          onFocus: () => {
            if (off(edge)) return; // locked: it stays where the screen put it
            armed = edge;
            if (openingFocus) openingFocus = false;
            else armedByHand = true;
            paintPanel();
          },
          onChange: (typedValue) => {
            armed = edge;
            // A date typed by hand replaces whatever rule a shortcut left, but
            // emptying a field is not choosing a date: it opens that end, and
            // the arrows go on moving by the step that was in force.
            if (typedValue.date !== null) presetShift = null;
            setEdge(edge, typedValue);
          },
        });
      }
      inputs = { start: made.start!, end: made.end! };
      readingBoxes = { start: made.start!.extra, end: made.end!.extra };
      head.append(pair);

      node.append(head);

      const body = el('div', 'tz-rangefield__body');
      const rangeHost = doc.createElement('div');
      body.append(rangeHost);
      if (s.presets.length > 0) {
        const column = el('div', 'tz-rangefield__presets');
        presetList = el('div', 'tz-rangefield__preset-list');
        column.append(presetList);
        body.append(column);
      }
      node.append(body);

      range = createDateRange(rangeHost, {
        injectStyles: false,
        onChange: ({ start, end }) => {
          presetShift = null; // chosen by hand now, so no preset rule applies
          // Only the armed field is filled. Which day was just pressed is
          // whichever of the two the grid reports as new — it restarts its own
          // selection when the click lands before the start, and that restart
          // is not an instruction to us.
          const clicked = end ?? start;
          if (!clicked) return;
          setEdge(armed, { date: clicked, time: timeOf(armed) ?? defaultTime(armed) });
          // The usual first-then-second flow, kept: a click on the start arms
          // the end. Unless the reader armed a field themselves, in which case
          // they are correcting that one and nothing else.
          if (!armedByHand && armed === 'start' && !off('end')) armed = 'end';
          paintPanel();
        },
      });

      if (s.confirm) {
        const footer = el('div', 'tz-rangefield__footer');
        const cancel = el('button', 'tz-rangefield__cancel');
        cancel.type = 'button';
        cancel.textContent = s.messages.cancel;
        cancel.onclick = () => panel.close();
        const apply = el('button', 'tz-rangefield__apply');
        apply.type = 'button';
        apply.textContent = s.messages.apply;
        apply.onclick = () => {
          commit(draft);
          panel.close();
        };
        footer.append(cancel, apply);
        node.append(footer);
      }

      return () => {
        range?.destroy();
        inputs?.start.destroy();
        inputs?.end.destroy();
      };
    },
  });

  const openPanel = () => {
    if (!off()) panel.open();
  };

  
  trigger.addEventListener('click', () => (panel.isOpen ? panel.close() : openPanel()), on);

  render();

  return {
    get value() {
      return s.value;
    },
    get isOpen() {
      return panel.isOpen;
    },
    update(settings) {
      Object.assign(s, settings);
      // Which field is armed is about the panel, not about the value — and a
      // framework hands the value straight back after every change, so
      // resetting it here re-armed the start between two clicks and both of
      // them landed on it.
      if ('value' in settings) draft = s.value;
      render();
    },
    open: openPanel,
    close: () => panel.close(),
    toggle: () => (panel.isOpen ? panel.close() : openPanel()),
    clear() {
      draft = { ...EMPTY, allDay: wholeDays() };
      commit(draft);
    },
    destroy() {
      panel.close({ restoreFocus: false });
      listening.abort();
      back.remove();
      trigger.remove();
      stepPicker.remove();
      forward.remove();
      if (addedHostClass) host.classList.remove('tz-field');
    },
  };
}
