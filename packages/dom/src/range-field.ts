import {
  Temporal,
  asShiftStep,
  presetRange,
  presetMoments,
  isSubDayPreset,
  matchesPreset,
  parseDuration,
  shiftDayRange,
  shiftInstant,
  snapTime,
  resolveWallTime,
  firstDayFor,
} from '@tzslot/core';
import type {
  Weekday,
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
   * Whether the column of shortcuts is drawn at all.
   *
   * Separate from `presets` so a screen can hide it without forgetting the
   * list: `presets: []` empties it, and then something has to remember what
   * was in it to put it back.
   */
  showPresets: boolean;
  /**
   * One field instead of two, and a click means that whole day.
   *
   * The value is a period either way — the day's first instant to the next
   * day's — so a screen can turn this on and off without the thing it is
   * bound to ever changing shape.
   */
  singleDay: boolean;

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
   * How far one press of an arrow moves the period, and whether there are
   * arrows at all.
   *
   * `false` — the default — draws none: a field that means one chosen period
   * has nothing to step through. `true` draws them and follows what is being
   * chosen: an hour where the hours are on screen, a day otherwise.
   *
   * A step imposes it. A plain number is minutes — `15`, `60`, `1440` — which
   * is what most screens want; anything a number cannot say is said in full:
   * `{ days: 1, minutes: 30 }`, `{ months: 1, hours: 1, minutes: 45 }`, or the
   * short form `'45mn'`. A list offers several and lets the reader pick
   * between them — see `showStep` for whether that picker is on screen.
   *
   * Shortcuts never change it. A shortcut computes a value; a step moves one.
   */
  shift: boolean | ShiftStep | readonly ShiftOption[];
  /**
   * Whether the step sits between the arrows, where the reader can read it and
   * press it.
   *
   * It appears when `shift` is a list, which is also what lets the reader
   * change it. A list of one is how a screen shows the step without handing it
   * over: the button reads it and does not take a press. `false` hides it even
   * then — the step is the developer's, and the reader only moves.
   */
  showStep: boolean;
  /** How many months the panel shows side by side. */
  months: number;
  weekNumbers: boolean;
  /**
   * Where the week starts, 1 for Monday through 7 for Sunday.
   *
   * Left out, the locale decides — Monday in France, Sunday in the United
   * States. Set it only where a business disagrees with its own locale.
   */
  firstDayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7 | undefined;
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

const EMPTY: RangeFieldValue = { start: null, end: null };

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
    showPresets: true,
    singleDay: false,
    showStep: true,
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
    firstDayOfWeek: undefined,
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

  /** The week's first day: what the screen asked for, or what the locale says. */
  const firstDay = (): Weekday => s.firstDayOfWeek ?? firstDayFor(s.locale);

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
  /** Kept so the column can be hidden and shown again without losing the list. */
  let presetColumn: HTMLElement | null = null;
  /** The second field and the mark between, hidden together when one day is chosen. */
  let endField: HTMLElement | null = null;
  let betweenMark: HTMLElement | null = null;
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
    if (!at_ || !s.showTime) return [];
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
   * Arm the end the next time the panel opens.
   *
   * Turning singleDay off closes the panel — the switch is outside it — and
   * opening again arms the start, which is what made the next click throw the
   * chosen day away and begin a new selection. The intent has to outlive the
   * close.
   */
  let armEndNext = false;
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

  /**
   * Whether a period is made of whole days — which is not remembered, it is
   * read off the value: both ends land on a day's first instant.
   *
   * There used to be a flag saying so, set by whoever built the value and
   * forgotten by everyone handed one. A screen that computed 09:00 to 18:00
   * and left it out got its hours hidden, silently. The value already knew.
   */
  const coversWholeDays = (v: RangeFieldValue) =>
    (!v.start || opensADay(v.start)) && (!v.end || opensADay(v.end));

  /** The days the value covers, both included — what the calendar highlights. */
  function days(value: RangeFieldValue): { start: PlainDate | null; end: PlainDate | null } {
    const start = value.start ? zoned(value.start).toPlainDate() : null;
    if (!value.end) return { start, end: null };
    const end = zoned(value.end);
    // An end that opens a day closes the one before it: the period holds no
    // part of that day. True whether or not the hours are on screen.
    const last = opensADay(value.end)
      ? end.toPlainDate().subtract({ days: 1 })
      : end.toPlainDate();
    return { start, end: last };
  }

  /** And the other way: two days become two moments, whole or with times. */
  function fromDays(range_: { start: PlainDate | null; end: PlainDate | null }): RangeFieldValue {
    // Without showTime there is nowhere to read or change an hour, so days
    // chosen on the calendar are whole days — even just after a shortcut that
    // was an interval, which would otherwise leave times nothing can edit.
    const whole = wholeDays();
    const times = {
      start: draft.start && !whole ? zoned(draft.start).toPlainTime() : null,
      end: draft.end && !whole ? zoned(draft.end).toPlainTime() : null,
    };
    if (whole) {
      return {
        start: range_.start ? midnight(range_.start) : null,
        end: range_.end ? midnight(range_.end.add({ days: 1 })) : null,
      };
    }
    const endTime = times.end ?? (hasDefaultTime('end') ? defaultTime('end') : null);
    return {
      start: range_.start ? resolveEdge('start', range_.start, times.start ?? defaultTime('start')) : null,
      end: range_.end
        ? endTime
          ? resolveEdge('end', range_.end, endTime)
          : endOfDay(range_.end)
        : null,
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

  /** Whether the screen named an hour for that end, as opposed to falling back to midnight. */
  const hasDefaultTime = (edge: Edge) =>
    (edge === 'start' ? s.defaultTimes.start : s.defaultTimes.end) !== undefined;

  /**
   * The moment a day chosen as the *end* stands for, when no hour was said.
   *
   * A day picked as the end means all of it — the midnight that opens the day
   * after, which is the exclusive end everything else is built on. Reading it
   * as that day at 00:00 would quietly drop the day the reader just clicked.
   */
  const endOfDay = (day: PlainDate) => midnight(day.add({ days: 1 }));

  const pattern = () => s.format ?? patternFor(s.locale, { time: false });

  /** What the field says about a value — the chosen one, or the pending draft. */
  function display(value: RangeFieldValue = s.value): string {
    if (s.displayWith) return s.displayWith(value, s.timeZone);
    /*
     * Whether the hours are written at all.
     *
     * `showTime` asked for them, so they are shown even at midnight — the
     * screen said it deals in times. And they are written whatever `showTime`
     * says when the period is not whole days, because a quarter-hour shortcut
     * on a day-only screen reading "21/09/2026" alone would be a lie.
     */
    const withHours = s.showTime || !coversWholeDays(value);
    // With hours the field says the two moments as they are, the exclusive end
    // included: 21/09 09:00 – 26/09 00:00 is the truth of a five-day stay.
    // Without them it says the days covered, 21/09 – 25/09.
    const { start, end } = withHours
      ? {
          start: value.start ? zoned(value.start).toPlainDate() : null,
          end: value.end ? zoned(value.end).toPlainDate() : null,
        }
      : days(value);
    if (!start && !end) return '';
    const shape = pattern();
    const time = (at_: Instant | null) => {
      if (!withHours || !at_) return '';
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

  /** The offered steps, when the reader is given the choice. */
  const stepMenu = (): readonly ShiftOption[] | null => (Array.isArray(s.shift) && s.shift.length > 0 ? s.shift : null);
  /** Which of them is chosen. Kept by position, so a relabelled menu is harmless. */
  let stepIndex = 0;
  /**
   * What one press of an arrow moves.
   *
   * `true` asks for arrows without naming a step, and the answer follows what
   * the field is choosing: an hour for a period, a day when it is one date.
   * Shortcuts never change it — they compute a value, which is a different
   * job.
   */
  const currentStep = (): ShiftStep | null => {
    const menu = stepMenu();
    if (menu) return menu[Math.min(stepIndex, menu.length - 1)]?.step ?? null;
    if (s.shift === false || Array.isArray(s.shift)) return null;
    /*
     * `true` asks for arrows without naming a step, and the answer follows
     * what the field is choosing: an hour for a period with hours on screen,
     * a day otherwise. An hour on a day-only field turned "22/09/2026" into
     * "22/09/2026 01:00 – 23/09/2026 01:00" and drifted another hour on every
     * press, over controls that cannot show or change an hour.
     */
    if (s.shift === true) return s.singleDay || !s.showTime ? { days: 1 } : { hours: 1 };
    return s.shift as ShiftStep;
  };

  /**
   * A step as Temporal can use it.
   *
   * `'25mn'` is not an ISO duration and Temporal would refuse it; it is the
   * short form a screen writes, and reading it here means `shift` takes the
   * same words the documentation shows.
   */
  const asStep = (step_: ShiftStep | null): ShiftStep | null => {
    if (typeof step_ !== 'string') return step_;
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

  const effectiveStep = (): ShiftStep | null => asStep(currentStep());



  const canShift = () => {
    const step_ = effectiveStep();
    if (step_ === null || off()) return false;
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
    const moveBy = Temporal.Duration.from(asShiftStep(by));

    /*
     * A step has a date part and a time part, and both are applied.
     *
     * Routing on "is the whole thing shorter than a day" lost the remainder:
     * days move through PlainDate, and PlainDate.add({ days: 1, minutes: 30 })
     * truncates to a day without a word — so `{ days: 1, minutes: 30 }` moved
     * exactly a day, ten presses running. Worse, the total crosses 24 hours on
     * the morning the clocks go forward, so the same setting behaved one way
     * on 29 March and another on every other day.
     */
    const datePart = moveBy.with({ hours: 0, minutes: 0, seconds: 0, milliseconds: 0, microseconds: 0, nanoseconds: 0 });
    const timePart = moveBy.with({ years: 0, months: 0, weeks: 0, days: 0 });

    // The time part moves the two ends as moments: a quarter of an hour cannot
    // be said in dates, and the field writes the hours the period gained.
    const withTime = (value: RangeFieldValue): RangeFieldValue =>
      timePart.blank
        ? value
        : {
            start: value.start ? shiftInstant(value.start, timePart, direction, s.timeZone) : null,
            end: value.end ? shiftInstant(value.end, timePart, direction, s.timeZone) : null,
          };

    if (datePart.blank) {
      draft = s.value;
      const next = withTime(s.value);
      if (panel.isOpen) choose(next);
      else commit(next);
      return;
    }

    // The date part moves the days, and the times come along unchanged.
    // Someone comparing one working week with the next means 09:00 to 17:00
    // again, not the same number of hours counted from where the first ended.
    const shown = days(s.value);
    draft = s.value; // so the times carry over into fromDays
    if (!shown.start || !shown.end) {
      const day = shown.start ?? shown.end!;
      const moved = shiftDayRange({ start: day, end: day }, datePart, direction);
      const onDays = fromDays(shown.start ? { start: moved.start, end: null } : { start: null, end: moved.end });
      const next = withTime(onDays);
      if (panel.isOpen) choose(next);
      else commit(next);
      return;
    }
    const moved = shiftDayRange({ start: shown.start, end: shown.end }, datePart, direction);
    const next = withTime(fromDays({ start: moved.start, end: moved.end }));
    if (panel.isOpen) choose(next);
    else commit(next);
  }



  /**
   * Turning singleDay on or off, with a value already in hand.
   *
   * Going to one day, the start's day is kept and the end becomes its next
   * midnight: the reader loses the rest of their period, which is the price
   * of asking for one day and is visible at once.
   *
   * Coming back, the end is armed rather than the start. The reader has their
   * day already and is switching precisely to add an end — arming the start
   * would make their next click throw that day away and begin again.
   */
  function crossOver(wasSingle: boolean): void {
    const { start, end } = days(s.value);
    if (s.singleDay) {
      armed = 'start';
      armedByHand = false;
      armEndNext = false;
      // The day to keep: the start, or the end when that is all there was —
      // hiding the second field otherwise left a value on the trigger with no
      // control anywhere able to reach it.
      const day = start ?? end;
      if (day) choose(fromDays({ start: day, end: day }), { close: false });
      return;
    }
    if (wasSingle && start) {
      armed = 'end';
      armedByHand = true;
      armEndNext = true;
    }
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
    if (!wall.date) {
      draft = { ...draft, [edge]: null } as RangeFieldValue;
      choose(draft);
      return;
    }
    const wanted = wall.time ?? defaultTime(edge);
    const onGrid = timed && s.snapMinutes ? snapTime(wanted, s.snapMinutes) : wanted;
    /*
     * A day chosen as the end means all of it, while nobody has put an hour
     * on that end — the reader pointed at a day, not at its first instant.
     * Read as "the 20th at 00:00" it would drop the day just clicked, and the
     * calendar would light every day but the one under the cursor.
     *
     * The test is the hour itself, not how it arrived, so clicking the 20th
     * and typing 20/09 into the field mean the same thing. An hour set on the
     * end — by the reader or by `defaultTimes` — takes over from then on.
     */
    const midnightHour = !wall.time || wall.time.equals(Temporal.PlainTime.from('00:00'));
    const allOfTheDay = edge === 'end' && midnightHour && !hasDefaultTime('end');
    const at_ =
      timed && !allOfTheDay
        ? resolveEdge(edge, wall.date, onGrid, wall.offset)
        : edge === 'start'
          ? midnight(wall.date)
          : endOfDay(wall.date);
    draft = withinSpan(ordered({ ...draft, [edge]: at_ } as RangeFieldValue, edge), edge);
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
            range: (today: PlainDate, at_: { now: Instant; timeZone: string }) =>
              isSubDayPreset(preset)
                ? presetMoments(preset, at_)
                : presetRange(preset, { today, firstDayOfWeek: firstDay() }),
          }
        : preset,
    );

  /** What a preset returns, applied — days become a period, moments are one. */
  function applyPreset(preset: RangePreset): void {
    armed = 'start';
    armedByHand = false;
    const picked = preset.range(s.today, { now: clock(), timeZone: s.timeZone });
    if (isMoments(picked)) {
      choose({ start: picked.start, end: picked.end }, { close: !s.confirm });
      return;
    }
    // A shortcut named in days means those days entirely — first midnight to
    // the midnight after the last — whether or not the screen shows hours.
    // Building it from the hours on screen would quietly drop the last day.
    choose(
      {
        start: midnight(picked.start),
        end: midnight(picked.end.add({ days: 1 })),
      },
      { close: !s.confirm },
    );
  }

  function paintPresets(): void {
    if (presetColumn) presetColumn.hidden = !s.showPresets;
    if (endField) endField.hidden = s.singleDay;
    if (betweenMark) betweenMark.hidden = s.singleDay;
    if (!presetList) return;
    const chosen = days(draft);
    const offered = s.singleDay ? presets().filter(fitsOneDay) : presets();
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
  /**
   * Whether a shortcut still means something with one day to give.
   *
   * "Last 7 days" and "This quarter" have nowhere to go in a field that holds
   * a single day. They are left out of the column rather than taken out of
   * `presets`, so turning singleDay off brings them back.
   */
  function fitsOneDay(preset: RangePreset): boolean {
    const picked = preset.range(s.today, { now: clock(), timeZone: s.timeZone });
    if (isMoments(picked)) return false;
    return Temporal.PlainDate.compare(picked.start, picked.end) === 0;
  }

  function marks(preset: RangePreset, chosen: { start: PlainDate | null; end: PlainDate | null }): boolean {
    if (isSubDayPreset(preset.name) || !coversWholeDays(draft)) {
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
        firstDayOfWeek: firstDay(),
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
      firstDayOfWeek: firstDay(),
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
            draft = { ...draft, [edge]: instant } as RangeFieldValue;
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
    stepPicker.hidden = menu === null || !s.showStep;
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
      armed = armEndNext && !off('end') ? 'end' : off('start') ? 'end' : 'start';
      armedByHand = armEndNext;
      armEndNext = false;
      render();
      s.onOpen?.();
    },
    onClose: () => {
      range = null;
      presetList = null;
      presetColumn = null;
      endField = null;
      betweenMark = null;
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
      // The armed field, not simply the first one: coming back from a single
      // day the end is armed, and focusing the start would arm it again
      // through its own onFocus — the next click would then throw away the
      // day just chosen.
      const wanted = node.querySelector<HTMLElement>(
        `.tz-rangefield__field--${armed} .tz-dateinput__input:not([readonly])`,
      );
      const field = wanted ?? node.querySelector<HTMLElement>('.tz-dateinput__input:not([readonly])');
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
          betweenMark = el('span', 'tz-rangefield__between');
          betweenMark.append(s.labels.between);
          betweenMark.setAttribute('aria-hidden', 'true');
          pair.append(betweenMark);
        }
        const inputHost = el('div', `tz-rangefield__field tz-rangefield__field--${edge}`);
        pair.append(inputHost);
        if (edge === 'end') endField = inputHost;
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
        presetColumn = el('div', 'tz-rangefield__presets');
        presetList = el('div', 'tz-rangefield__preset-list');
        presetColumn.append(presetList);
        body.append(presetColumn);
      }
      node.append(body);

      range = createDateRange(rangeHost, {
        injectStyles: false,
        onChange: ({ start, end }) => {
          // Only the armed field is filled. Which day was just pressed is
          // whichever of the two the grid reports as new — it restarts its own
          // selection when the click lands before the start, and that restart
          // is not an instruction to us.
          const clicked = end ?? start;
          if (!clicked) return;
          if (s.singleDay) {
            /*
             * One field: the day clicked is the whole day, built in one go.
             *
             * Two calls to setEdge reported twice — the first with end: null,
             * a half-open period a field that is not openEnded should never
             * produce. And routing the end through setEdge let defaultTimes
             * win, so a screen naming office hours got nine hours out of a
             * control that says it gives a whole day.
             */
            draft = { start: midnight(clicked), end: endOfDay(clicked) };
            choose(draft, { close: !s.confirm });
            paintPanel();
            return;
          }
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
      const wasSingle = s.singleDay;
      Object.assign(s, settings);
      // Which field is armed is about the panel, not about the value — and a
      // framework hands the value straight back after every change, so
      // resetting it here re-armed the start between two clicks and both of
      // them landed on it.
      // A value from outside is a new subject: whatever the panel was about to
      // do with the old one no longer applies.
      if ('value' in settings) {
        draft = s.value;
        armEndNext = false;
      }
      if ('singleDay' in settings && s.singleDay !== wasSingle) crossOver(wasSingle);
      render();
    },
    open: openPanel,
    close: () => panel.close(),
    toggle: () => (panel.isOpen ? panel.close() : openPanel()),
    clear() {
      draft = EMPTY;
      armEndNext = false;
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
