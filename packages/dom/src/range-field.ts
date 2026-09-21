import { Temporal, presetRange, matchesPreset, shiftDayRange, resolveWallTime } from '@tzslot/core';
import type {
  DayRange,
  Instant,
  PlainDate,
  PlainTime,
  PresetName,
  ShiftOption,
  ShiftStep,
} from '@tzslot/core';
import { createDateRange, type DateRangeInstance } from './date-range.js';
import { createTimeInput, type TimeInputInstance } from './time-input.js';
import { createPanel, type FieldMode } from './panel.js';
import { formatWith, patternFor } from './format.js';
import { summerFirst, zoneName } from './zone-names.js';
import type { RenderCell } from './cells.js';
import { EN, type TzslotMessages } from './messages.js';
import { DATETIME_CSS, FIELD_CSS, RANGEFIELD_CSS, RANGE_CSS, TIME_CSS, ensureStyles } from './styles.js';

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
  readonly range: (today: PlainDate) => DayRange;
}

export interface RangeFieldSettings {
  value: RangeFieldValue;
  /** An IANA identifier. Days become moments on this zone's clocks. */
  timeZone: string;
  /** Named ranges beside the calendar. The ten built-in names, or your own. */
  presets: readonly (PresetName | RangePreset)[];
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
  disabled: boolean;
  /** A pattern for each end — `yyyy-MM-dd`. The locale's own form otherwise. */
  format: string | undefined;
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
const BUILT_IN: PresetName[] = ['today', 'yesterday', 'last7Days', 'last30Days', 'thisMonth', 'lastMonth'];

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
    disabled: false,
    format: undefined,
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

  /** Which ends a period is being given. Only ever anything but 'between' when openEnded. */
  type Bounds = 'between' | 'from' | 'until';
  const boundsOf = (value: RangeFieldValue): Bounds =>
    value.start !== null && value.end === null
      ? 'from'
      : value.start === null && value.end !== null
        ? 'until'
        : 'between';
  let bounds: Bounds = boundsOf(s.value);

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
  let fromTime: TimeInputInstance | null = null;
  let toTime: TimeInputInstance | null = null;
  let presetList: HTMLElement | null = null;
  let allDayBox: HTMLButtonElement | null = null;
  let panelShift: { row: HTMLElement; label: HTMLElement; back: HTMLButtonElement; forward: HTMLButtonElement } | null =
    null;
  let timeColumns: { start: HTMLElement; end: HTMLElement } | null = null;
  /**
   * The two readings of a repeated hour, per end, while the choice is open.
   * An end is only ever in here when its wall time happens twice that day.
   */
  type Reading = { instant: Instant; name: string; full: string };
  let readings: { start: Reading[]; end: Reading[] } = { start: [], end: [] };
  let readingBoxes: { start: HTMLElement; end: HTMLElement } | null = null;
  let boundsRow: {
    modes: { name: Bounds; button: HTMLButtonElement }[];
    ends: { edge: 'start' | 'end'; chip: HTMLElement; text: HTMLElement; clear: HTMLButtonElement }[];
  } | null = null;

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
    const allDay = wholeDays();
    const times = {
      start: draft.start && !allDay ? zoned(draft.start).toPlainTime() : null,
      end: draft.end && !allDay ? zoned(draft.end).toPlainTime() : null,
    };
    if (allDay) {
      readings = { start: [], end: [] };
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

  /** Summer and winter, in whichever order the offsets put them. */
  const seasonNames = (offsets: readonly string[]): [string, string] =>
    summerFirst(offsets)
      ? [s.messages.summerTime, s.messages.winterTime]
      : [s.messages.winterTime, s.messages.summerTime];

  /**
   * A day and a wall time become a moment — and on two days a year that is a
   * question, not a conversion. The hour the clocks skip has no moment at all;
   * the hour they repeat has two, and picking one silently is how a booking
   * ends up an hour out with nothing on screen to explain it.
   */
  function resolveEdge(edge: 'start' | 'end', day: PlainDate, time: PlainTime): Instant {
    const found = resolveWallTime(day, time, s.timeZone);
    if (!found.exists) {
      readings[edge] = [];
      return day.toPlainDateTime(time).toZonedDateTime(s.timeZone, { disambiguation: 'later' }).toInstant();
    }
    if (found.ambiguous) {
      const names = seasonNames(found.offsets);
      readings[edge] = found.instants.map((instant, i) => ({
        instant,
        name: names[i] ?? '',
        full: zoneName(instant, s.timeZone, s.locale),
      }));
      return found.instants[0]!;
    }
    readings[edge] = [];
    return found.instants[0]!;
  }

  const pattern = () => s.format ?? patternFor(s.locale, { time: false });

  /** What the field says about a value — the chosen one, or the pending draft. */
  function display(value: RangeFieldValue = s.value): string {
    if (s.displayWith) return s.displayWith(value, s.timeZone);
    const { start, end } = days(value);
    if (!start && !end) return '';
    const shape = pattern();
    const time = (at_: Instant | null) =>
      value.allDay === false && at_
        ? ` ${formatWith('HH:mm', { time: zoned(at_).toPlainTime() }, s.locale)}`
        : '';
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

  /** The offered steps, when the reader is given the choice. */
  const stepMenu = (): readonly ShiftOption[] | null => (Array.isArray(s.shift) ? s.shift : null);
  /** Which of them is chosen. Kept by position, so a relabelled menu is harmless. */
  let stepIndex = 0;
  const currentStep = (): ShiftStep | null => {
    const menu = stepMenu();
    if (menu) return menu[Math.min(stepIndex, menu.length - 1)]?.step ?? null;
    return s.shift === false ? null : (s.shift as ShiftStep);
  };

  /** True when there is a whole period to move, and something to move it by. */
  const canShift = () => {
    const step_ = currentStep();
    if (step_ === null || s.disabled) return false;
    const { start, end } = days(s.value);
    if (start !== null && end !== null) return true;
    // A period open at one end has no length of its own, so only an imposed
    // step can move it.
    return step_ !== 'auto' && (start !== null || end !== null);
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
    const by = currentStep();
    if (!canShift() || by === null) return;
    const shown = days(s.value);
    if (!shown.start || !shown.end) {
      // One end only. There is no length to follow, so an imposed step moves
      // the end that exists and 'auto' does nothing — which is why canShift
      // says no to it.
      if (by === 'auto') return;
      draft = s.value;
      const moved = shiftDayRange(
        { start: shown.start ?? shown.end!, end: shown.start ?? shown.end! },
        by,
        direction,
      );
      const next = fromDays(shown.start ? { start: moved.start, end: null } : { start: null, end: moved.end });
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
   * Moving between Between / From / Until.
   *
   * The end that still makes sense is kept: asking for "from" when 14–20 is
   * chosen means from the 14th, and nobody wants to pick it again.
   */
  function setBounds(next: Bounds): void {
    bounds = next;
    const shown = days(draft);
    const kept =
      next === 'from'
        ? { start: shown.start ?? shown.end, end: null }
        : next === 'until'
          ? { start: null, end: shown.end ?? shown.start }
          : { start: shown.start, end: shown.end };
    choose(fromDays(kept));
  }

  /** Dropping one end, which is the same as saying the period is open on that side. */
  function clearEdge(edge: 'start' | 'end'): void {
    setBounds(edge === 'start' ? 'until' : 'from');
  }

  function paintBounds(): void {
    if (!boundsRow) return;
    for (const { name, button } of boundsRow.modes) {
      const on = bounds === name;
      button.classList.toggle('tz-rangefield__bound--on', on);
      button.setAttribute('aria-pressed', String(on));
      button.disabled = s.disabled;
    }
    const shown = days(draft);
    const shape = pattern();
    for (const { edge, chip, text: label, clear } of boundsRow.ends) {
      const date = edge === 'start' ? shown.start : shown.end;
      // The chip for an end this period does not have would be a cross with
      // nothing behind it.
      chip.hidden = date === null;
      if (date) label.textContent = formatWith(shape, { date }, s.locale);
      clear.disabled = s.disabled;
      clear.setAttribute('aria-label', edge === 'start' ? s.messages.clearStart : s.messages.clearEnd);
      clear.title = clear.getAttribute('aria-label')!;
    }
  }

  const presets = (): RangePreset[] =>
    s.presets.map((preset) =>
      typeof preset === 'string'
        ? {
            name: preset,
            label: s.messages.presets[preset],
            range: (today: PlainDate) =>
              presetRange(preset, { today, firstDayOfWeek: s.firstDayOfWeek }),
          }
        : preset,
    );

  function paintPresets(): void {
    if (!presetList) return;
    const chosen = days(draft);
    presetList.replaceChildren(
      ...presets().map((preset) => {
        const button = el('button', 'tz-rangefield__preset');
        button.type = 'button';
        button.textContent = preset.label;
        const on =
          chosen.start !== null &&
          chosen.end !== null &&
          (typeof preset.name === 'string' && isBuiltIn(preset.name)
            ? matchesPreset(preset.name, { start: chosen.start, end: chosen.end }, {
                today: s.today,
                firstDayOfWeek: s.firstDayOfWeek,
              })
            : sameRange(preset.range(s.today), { start: chosen.start, end: chosen.end }));
        button.classList.toggle('tz-rangefield__preset--on', on);
        button.setAttribute('aria-pressed', String(on));
        button.disabled = s.disabled;
        button.onclick = () => {
          const picked = preset.range(s.today);
          choose(fromDays({ start: picked.start, end: picked.end }), { close: !s.confirm });
        };
        return button;
      }),
    );
  }

  const isBuiltIn = (name: string): name is PresetName => (BUILT_IN as string[]).includes(name) || [
    'last14Days',
    'thisWeek',
    'lastWeek',
    'thisQuarter',
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
    const only = bounds === 'between' ? null : (shown.start ?? shown.end);
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
    const times = {
      start: draft.start && !wholeDays() ? zoned(draft.start).toPlainTime() : null,
      end: draft.end && !wholeDays() ? zoned(draft.end).toPlainTime() : null,
    };
    // Whole days have no times to set: the fields stay in place, greyed, so
    // the panel does not jump when the switch moves.
    const timesOff = s.disabled || wholeDays();
    const shownDays = days(draft);
    for (const [input, time, day] of [
      [fromTime, times.start, shownDays.start],
      [toTime, times.end, shownDays.end],
    ] as const) {
      input?.update({
        value: time,
        stepMinutes: s.stepMinutes,
        locale: s.locale,
        messages: s.messages,
        disabled: timesOff || day === null,
        date: day,
        timeZone: s.timeZone,
      });
    }
    if (timeColumns) {
      // An hour for an end this period does not have is a field that cannot
      // mean anything; greying it would still leave it there to be read.
      timeColumns.start.hidden = bounds === 'until';
      timeColumns.end.hidden = bounds === 'from';
    }
    if (readingBoxes) {
      for (const edge of ['start', 'end'] as const) {
        const box = readingBoxes[edge];
        const offered = readings[edge];
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
    paintBounds();
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
    trigger.setAttribute('aria-label', s.ariaLabel ?? s.messages.chooseRange);
    trigger.disabled = s.disabled;
    if (s.disabled) panel.close({ restoreFocus: false });
    paintPanel();
  }

  const panel = createPanel({
    trigger,
    source: host,
    container,
    mode: () => s.mode,
    label: () => s.ariaLabel ?? s.messages.chooseRange,
    onOpen: () => {
      draft = s.value;
      bounds = s.openEnded ? boundsOf(s.value) : 'between';
      render();
      s.onOpen?.();
    },
    onClose: () => {
      range = null;
      fromTime = null;
      toTime = null;
      presetList = null;
      allDayBox = null;
      panelShift = null;
      boundsRow = null;
      timeColumns = null;
      readingBoxes = null;
      render();
      s.onClose?.();
    },
    initialFocus: (node) => node.querySelector<HTMLElement>('.tz-range__day[tabindex="0"], button'),
    content: (node) => {
      node.classList.add('tz-rangefield__panel');
      ensureStyles(node, 'rangefield', RANGEFIELD_CSS);
      ensureStyles(node, 'range', RANGE_CSS);
      ensureStyles(node, 'time', TIME_CSS);
      ensureStyles(node, 'datetime', DATETIME_CSS);

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

      if (s.openEnded) {
        const row = el('div', 'tz-rangefield__bounds');
        const modes = ([
          ['between', s.messages.between],
          ['from', s.messages.fromDate],
          ['until', s.messages.untilDate],
        ] as const).map(([name, label]) => {
          const button = doc.createElement('button');
          button.type = 'button';
          button.className = 'tz-rangefield__bound';
          button.textContent = label;
          button.onclick = () => setBounds(name);
          return { name: name as Bounds, button };
        });
        const group = el('div', 'tz-rangefield__bound-group');
        group.setAttribute('role', 'group');
        group.append(...modes.map((m) => m.button));

        const ends = (['start', 'end'] as const).map((edge) => {
          const chip = el('span', 'tz-rangefield__end');
          const label = el('span', 'tz-rangefield__end-text');
          const clear = doc.createElement('button');
          clear.type = 'button';
          clear.className = 'tz-rangefield__end-clear';
          clear.textContent = '×';
          clear.onclick = () => clearEdge(edge);
          chip.append(label, clear);
          return { edge, chip, text: label, clear };
        });
        const chips = el('div', 'tz-rangefield__ends');
        chips.append(...ends.map((e) => e.chip));

        row.append(group, chips);
        node.append(row);
        boundsRow = { modes, ends };
      }

      const body = el('div', 'tz-rangefield__body');
      const rangeHost = doc.createElement('div');
      body.append(rangeHost);
      if (s.presets.length > 0) {
        presetList = el('div', 'tz-rangefield__presets');
        body.append(presetList);
      }
      node.append(body);

      range = createDateRange(rangeHost, {
        injectStyles: false,
        onChange: ({ start, end }) => {
          if (bounds !== 'between') {
            // One end only: every click is a fresh answer, and the one just
            // pressed is whichever of the two the calendar reports as new.
            const clicked = end ?? start;
            const picked = clicked
              ? bounds === 'from'
                ? { start: clicked, end: null }
                : { start: null, end: clicked }
              : { start: null, end: null };
            choose(fromDays(picked), { close: clicked !== null && !s.showTime });
            return;
          }
          // A first click starts a range; the second finishes it, and a
          // finished range is the answer — so the panel can step out of the way.
          choose(fromDays({ start, end }), { close: end !== null && !s.showTime });
        },
      });

      if (s.showTime) {
        const times = el('div', 'tz-rangefield__times');
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

        const pair = el('div', 'tz-rangefield__pair');
        const columns: Partial<Record<'start' | 'end', HTMLElement>> = {};
        const boxes: Partial<Record<'start' | 'end', HTMLElement>> = {};
        for (const edge of ['start', 'end'] as const) {
          const column = el('div', 'tz-rangefield__time');
          columns[edge] = column;
          const label = el('span', 'tz-rangefield__time-label');
          label.textContent = edge === 'start' ? s.messages.timeFrom : s.messages.timeTo;
          const timeHost = doc.createElement('div');
          const box = el('div', 'tz-datetime__readings tz-rangefield__readings');
          column.append(label, timeHost, box);
          boxes[edge] = box;
          pair.append(column);
          const input = createTimeInput(timeHost, {
            injectStyles: false,
            onChange: (time) => {
              const shown = days(draft);
              const day = edge === 'start' ? shown.start : shown.end;
              if (!day || !time) return;
              draft = { ...draft, allDay: false, [edge]: resolveEdge(edge, day, time) } as RangeFieldValue;
              choose(draft);
            },
          });
          if (edge === 'start') fromTime = input;
          else toTime = input;
        }
        timeColumns = { start: columns.start!, end: columns.end! };
        readingBoxes = { start: boxes.start!, end: boxes.end! };
        times.append(allDayRow, pair);
        node.append(times);
      }

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
        fromTime?.destroy();
        toTime?.destroy();
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
      if ('value' in settings) {
        draft = s.value;
        bounds = s.openEnded ? boundsOf(s.value) : 'between';
      }
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
