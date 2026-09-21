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
  resolveWallTime,
} from '@tzslot/core';
import type {
  DayRange,
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
   * A box above them where a length is typed — `25mn`, `1h`, `3d`. Off by
   * default: it suits a screen read all day by the same people, and not a
   * booking form.
   */
  lengthBox: boolean;
  /**
   * What a typed length does.
   *
   * `'period'` fills a *missing* end from the start — what someone measuring
   * a window wants. `'step'` never touches the dates at all. Neither ever
   * rewrites an end that is already there: with both dates chosen, a length
   * is a step and nothing else. Either way the arrows end up moving by it.
   */
  lengthMeans: 'period' | 'step';
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
  /** Times as well as days, with a switch back to whole days. */
  showTime: boolean;
  /** Minutes the time fields step by. */
  stepMinutes: number;
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
  disabled: boolean;
  /** A pattern for each end — `yyyy-MM-dd`. The locale's own form otherwise. */
  format: string | undefined;
  /**
   * Separators appear as figures are typed in the panel's two fields, never
   * while deleting.
   */
  mask: boolean;
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
    lengthBox: false,
    lengthMeans: 'period',
    title: undefined,
    timeLayout: 'select',
    openEnded: false,
    showTime: false,
    stepMinutes: 30,
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

  /** One of the two arrows that step the selection. */
  function arrow(direction: 1 | -1, className: string): HTMLButtonElement {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = direction === -1 ? '‹' : '›';
    button.addEventListener('click', (event) => {
      event.stopPropagation(); // on the field the arrows sit beside a trigger
      step(direction);
    });
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
  stepPicker.addEventListener('click', (event) => {
    event.stopPropagation();
    const menu = stepMenu();
    if (!menu) return;
    stepIndex = (stepIndex + 1) % menu.length;
    render();
  });
  host.append(back, trigger, stepPicker, forward);

  let range: DateRangeInstance | null = null;
  let presetList: HTMLElement | null = null;
  let allDayBox: HTMLButtonElement | null = null;
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

  const wholeDays = () => draft.allDay !== false;
  const zoned = (value: Instant) => value.toZonedDateTimeISO(s.timeZone);
  const midnight = (day: PlainDate) => day.toZonedDateTime({ timeZone: s.timeZone }).toInstant();
  const at = (day: PlainDate, time: PlainTime) =>
    day.toZonedDateTime({ timeZone: s.timeZone, plainTime: time }).toInstant();

  /** The days the value covers, both included — what the calendar highlights. */
  function days(value: RangeFieldValue): { start: PlainDate | null; end: PlainDate | null } {
    const start = value.start ? zoned(value.start).toPlainDate() : null;
    if (!value.end) return { start, end: null };
    const end = zoned(value.end);
    const last =
      value.allDay !== false && end.toPlainTime().equals(Temporal.PlainTime.from('00:00'))
        ? end.toPlainDate().subtract({ days: 1 })
        : end.toPlainDate();
    return { start, end: last };
  }

  /** And the other way: two days become two moments, whole or with times. */
  function fromDays(range_: { start: PlainDate | null; end: PlainDate | null }): RangeFieldValue {
    // Without showTime there is nowhere to read or change an hour, so days
    // chosen on the calendar are whole days — even just after a shortcut that
    // was an interval, which would otherwise leave times nothing can edit.
    const allDay = s.showTime ? wholeDays() : true;
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
    const midday = Temporal.PlainTime.from('00:00');
    return {
      start: range_.start ? resolveEdge('start', range_.start, times.start ?? midday) : null,
      end: range_.end ? resolveEdge('end', range_.end, times.end ?? midday) : null,
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
  function resolveEdge(_edge: Edge, day: PlainDate, time: PlainTime): Instant {
    const found = resolveWallTime(day, time, s.timeZone);
    if (!found.exists) {
      return day.toPlainDateTime(time).toZonedDateTime(s.timeZone, { disambiguation: 'later' }).toInstant();
    }
    // The first reading stands until the panel's two buttons say otherwise.
    return found.instants[0]!;
  }

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
  const stepMenu = (): readonly ShiftOption[] | null => (Array.isArray(s.shift) ? s.shift : null);
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
  const effectiveStep = (): ShiftStep | null => {
    const step_ = currentStep();
    if (step_ !== 'auto') return step_;
    const { start, end } = days(s.value);
    return start !== null && end !== null ? 'auto' : { days: 1 };
  };

  const canShift = () => {
    if (effectiveStep() === null || s.disabled) return false;
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
    // Without showTime there is nowhere to read or change an hour, so a day
    // chosen is a whole day — even just after a shortcut that was an interval.
    const timed = s.showTime && draft.allDay === false;
    if (!wall.date) {
      draft = { ...draft, [edge]: null } as RangeFieldValue;
      choose(draft);
      return;
    }
    const at_ = timed
      ? resolveEdge(edge, wall.date, wall.time ?? Temporal.PlainTime.from('00:00'))
      : edge === 'start'
        ? midnight(wall.date)
        : midnight(wall.date.add({ days: 1 }));
    draft = { ...draft, [edge]: at_, allDay: !timed } as RangeFieldValue;
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
   * A length typed rather than chosen: 25mn, 1h, 3d.
   *
   * No list of shortcuts holds every length someone might want, and the
   * people who use a filter screen all day know what they want before it
   * opens. What is typed becomes the length of the period — measured from the
   * start if there is one, and ending now if there is not — and the arrows
   * then move by it, exactly as a shortcut would.
   */
  function applyLength(text: string): boolean {
    const length = parseDuration(text);
    if (!length) return false;
    presetShift = length;
    // A length never rewrites an end that exists. Someone with both dates
    // chosen who then asks for a step of fifteen minutes means the arrows,
    // not "throw away my end and make the period fifteen minutes long" —
    // which is what this did, and it destroyed the period it was given.
    if (s.lengthMeans === 'step' || (draft.start !== null && draft.end !== null)) {
      render();
      return true;
    }
    // Through the zone, not on the instant: an instant cannot be moved by days
    // at all — Temporal refuses — and a day is not always twenty-four hours.
    const from = draft.start ?? clock().toZonedDateTimeISO(s.timeZone).subtract(length).toInstant();
    draft = { ...draft, start: from, end: from.toZonedDateTimeISO(s.timeZone).add(length).toInstant(), allDay: false };
    choose(draft);
    return true;
  }

  function buildLengthBox(): HTMLElement {
    const box = el('div', 'tz-rangefield__length');
    const field = doc.createElement('input');
    field.type = 'text';
    field.className = 'tz-rangefield__length-input';
    field.placeholder = s.messages.lengthLabel;
    field.setAttribute('aria-label', s.messages.lengthLabel);
    const help = doc.createElement('button');
    help.type = 'button';
    help.className = 'tz-rangefield__length-help';
    help.textContent = 'ⓘ';
    help.title = s.messages.lengthHelp;
    help.setAttribute('aria-label', s.messages.lengthHelp);
    // A tooltip is not readable on a touch screen and not reachable by a
    // keyboard, so the same words are also a line that the button shows.
    const note = el('p', 'tz-rangefield__length-note');
    note.textContent = s.messages.lengthHelp;
    note.hidden = true;
    help.addEventListener('click', () => {
      note.hidden = !note.hidden;
    });
    field.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const read = applyLength(field.value);
      field.classList.toggle('tz-rangefield__length-input--invalid', !read);
      field.setAttribute('aria-invalid', String(!read));
    });
    field.addEventListener('input', () => {
      field.classList.remove('tz-rangefield__length-input--invalid');
      field.removeAttribute('aria-invalid');
    });
    const row = el('div', 'tz-rangefield__length-row');
    row.append(field, help);
    box.append(row, note);
    return box;
  }

  /** The clock face an end already carries, so a click on a day keeps it. */
  function timeOf(edge: Edge): PlainTime | null {
    const at_ = draft[edge];
    return at_ && draft.allDay === false ? zoned(at_).toPlainTime() : null;
  }

  /** The two ends as a field writes them: a day, and an hour when there is one. */
  function wallOf(edge: Edge): WallValue {
    const shown = days(draft);
    return { date: edge === 'start' ? shown.start : shown.end, time: timeOf(edge) };
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
    // A shortcut named in days means whole days. Carrying over the hours of
    // whatever was chosen before — 10:45 because a quarter hour was picked a
    // moment ago — makes "this quarter" mean something nobody asked for.
    draft = { ...draft, allDay: true };
    choose(fromDays({ start: picked.start, end: picked.end }), { close: !s.confirm });
  }

  function paintPresets(): void {
    if (!presetList) return;
    const chosen = days(draft);
    presetList.replaceChildren(
      ...presets().map((preset) => {
        const button = el('button', 'tz-rangefield__preset');
        button.type = 'button';
        button.textContent = preset.label;
        const on = marks(preset, chosen);
        button.classList.toggle('tz-rangefield__preset--on', on);
        button.setAttribute('aria-pressed', String(on));
        button.disabled = s.disabled;
        button.onclick = () => applyPreset(preset);
        return button;
      }),
    );
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
    if (isBuiltIn(preset.name)) {
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
      disabled: s.disabled,
      messages: s.messages,
    });
    if (inputs) {
      for (const edge of ['start', 'end'] as const) {
        inputs[edge].update({
          value: wallOf(edge),
          withTime: s.showTime && !wholeDays(),
          timeLayout: s.timeLayout,
          stepMinutes: s.stepMinutes,
          date: edge === 'start' ? days(draft).start : days(draft).end,
          timeZone: s.timeZone,
          format: s.format,
          locale: s.locale,
          mask: s.mask,
          clearable: s.openEnded,
          disabled: s.disabled,
          messages: s.messages,
          label: labelFor(edge),
          ariaLabel: edge === 'start' ? s.messages.rangeStart : s.messages.rangeEnd,
          // Never the pattern: a field that says dd/MM/yyyy before anything is
          // typed is a field explaining itself instead of inviting an answer.
          // The word above it already says which end it is.
          placeholder: undefined,
        });
        // The ring says which field the next click in the calendar will fill.
        inputs[edge].host.classList.toggle('tz-dateinput--armed', armed === edge && !s.disabled);
      }
    }
    if (readingBoxes) {
      for (const edge of ['start', 'end'] as const) {
        const box = readingBoxes[edge];
        const offered = readingsFor(edge);
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
          button.disabled = s.disabled;
          button.onclick = () => {
            draft = { ...draft, allDay: false, [edge]: instant } as RangeFieldValue;
            choose(draft);
          };
        });
        for (const extra of buttons.slice(offered.length)) extra.remove();
      }
    }
    if (allDayBox) {
      allDayBox.setAttribute('aria-checked', String(wholeDays()));
      allDayBox.classList.toggle('tz-dtr__allday-box--on', wholeDays());
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
      stepPicker.disabled = s.disabled || menu.length < 2;
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
    trigger.disabled = s.disabled;
    if (s.disabled) panel.close({ restoreFocus: false });
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
      armed = 'start';
      armedByHand = false;
      render();
      s.onOpen?.();
    },
    onClose: () => {
      range = null;
      presetList = null;
      allDayBox = null;
      panelShift = null;
      readingBoxes = null;
      inputs = null;
      render();
      s.onClose?.();
    },
    initialFocus: (node) => node.querySelector<HTMLElement>('.tz-range__day[tabindex="0"], button'),
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
            armed = edge;
            armedByHand = true;
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

      if (s.showTime) {
        const allDayRow = el('div', 'tz-dtr__allday');
        allDayBox = doc.createElement('button');
        allDayBox.type = 'button';
        allDayBox.className = 'tz-dtr__allday-box';
        allDayBox.setAttribute('role', 'switch');
        allDayBox.append(el('span', 'tz-dtr__allday-knob'));
        const allDayText = el('span', 'tz-dtr__allday-text');
        allDayText.textContent = s.messages.allDay;
        allDayRow.append(allDayBox, allDayText);
        const toggle = () => {
          const shown = days(draft);
          draft = { ...draft, allDay: !wholeDays() };
          choose(fromDays({ start: shown.start, end: shown.end }));
        };
        allDayBox.addEventListener('click', toggle);
        allDayText.addEventListener('click', toggle);
        head.append(allDayRow);
      }
      node.append(head);

      const body = el('div', 'tz-rangefield__body');
      const rangeHost = doc.createElement('div');
      body.append(rangeHost);
      if (s.presets.length > 0 || s.lengthBox) {
        const column = el('div', 'tz-rangefield__presets');
        if (s.lengthBox) column.append(buildLengthBox());
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
          setEdge(armed, { date: clicked, time: timeOf(armed) });
          // The usual first-then-second flow, kept: a click on the start arms
          // the end. Unless the reader armed a field themselves, in which case
          // they are correcting that one and nothing else.
          if (!armedByHand && armed === 'start') armed = 'end';
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
    if (!s.disabled) panel.open();
  };

  const listening = new AbortController();
  trigger.addEventListener('click', () => (panel.isOpen ? panel.close() : openPanel()), {
    signal: listening.signal,
  });

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
