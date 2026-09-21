import { Temporal, resolveWallTime, shiftInstant } from '@tzslot/core';
import type { DurationLike, Instant, PlainDate, PlainTime, ShiftOption, Slot } from '@tzslot/core';
import { createCalendar, type CalendarButton, type CalendarInstance } from './calendar.js';
import { createTimeInput, type TimeInputInstance } from './time-input.js';
import { createTimeSelect, type TimeSelectInstance } from './time-select.js';
import { createTimeSlots, type TimeSlotsInstance } from './time-slots.js';
import type { TimeLayout } from './daily-range.js';
import type { RenderCell } from './cells.js';
import { createPanel, type FieldMode } from './panel.js';
import { formatWith, maskWith, parseWith, patternFor } from './format.js';
import { summerFirst, zoneName } from './zone-names.js';
import { EN, type TzslotMessages } from './messages.js';
import {
  CALENDAR_CSS,
  DATETIME_CSS,
  FIELD_CSS,
  SLOTS_CSS,
  TIMESELECT_CSS,
  TIME_CSS,
  ensureStyles,
} from './styles.js';

export interface DateTimeFieldSettings {
  /** A moment, because a date and a wall time alone are not one. */
  value: Instant | null;
  /** An IANA identifier. The date and the time are read on this zone's clocks. */
  timeZone: string;
  mode: FieldMode;
  placeholder: string | undefined;
  ariaLabel: string | undefined;
  locale: string | undefined;
  firstDayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  min: PlainDate | null;
  max: PlainDate | null;
  isDateDisabled: ((date: PlainDate) => boolean) | undefined;
  /**
   * Whether a time is asked for at all. False leaves a field that chooses a
   * day and holds the moment it starts — what a whole-day range needs, with
   * everything else about the field unchanged.
   */
  showTime: boolean;
  /**
   * Arrows that step the chosen moment, without opening anything: an hour
   * later, a day earlier. `false` — the default — draws none. The step is
   * always explicit here; a single moment has no length of its own to follow,
   * so there is nothing for an 'auto' to mean. It is counted on the zone's
   * clocks, so `{ days: 1 }` on the night they change is 23 or 25 hours, and
   * the time of day survives.
   *
   * A list of `{ step, label }` instead puts a menu between the arrows and
   * lets the reader choose — a quarter of an hour, an hour, a day — on a page
   * that serves all three. An 'auto' entry is ignored here, for the reason
   * just given.
   */
  shift: DurationLike | readonly ShiftOption[] | false;
  /** How the time is chosen: a compact field, two menus, or the day's times. */
  timeLayout: TimeLayout;
  stepMinutes: number;
  /** With 'select': minutes between the options. Every minute by default. */
  minuteStep: number;
  minTime: PlainTime | string | undefined;
  maxTime: PlainTime | string | undefined;
  /** Only with timeLayout 'list': rules out slots while still showing them. */
  isSlotDisabled: ((slot: Omit<Slot, 'disabled'>) => boolean) | undefined;
  hour12: boolean | undefined;
  /**
   * The time a day starts out with, so that choosing a date is already a
   * moment. Midnight by default, moved up to minTime when there is one.
   */
  defaultTime: PlainTime | string;
  disabled: boolean;
  /**
   * The text can be typed as well as chosen. What is typed is read with the
   * same pattern the field writes, so the two always agree; anything that is
   * not a date goes back to the last one when the field is left.
   */
  editable: boolean;
  /**
   * The separators appear as the figures are typed, the way a card number
   * gets its spaces. Only for patterns that leave no doubt — `dd/MM/yyyy`
   * does, `d/M/yyyy` does not.
   */
  mask: boolean;
  /**
   * A pattern — `yyyy-MM-dd HH:mm` — when the shape matters more than the
   * reader. Unset, the field follows the locale: its numeric order when it can
   * be typed into, dateStyle and timeStyle when it cannot.
   */
  format: string | undefined;
  dateStyle: 'full' | 'long' | 'medium' | 'short';
  timeStyle: 'full' | 'long' | 'medium' | 'short';
  /** The last word on the text. Given both, this one wins. */
  displayWith: ((value: Instant, timeZone: string) => string) | undefined;
  today: PlainDate;
  renderCell: RenderCell | undefined;
  buttons: readonly CalendarButton[];
  /** A column of ISO week numbers down the left of the panel's calendar. */
  weekNumbers: boolean;
  messages: TzslotMessages;
  onChange: ((value: Instant | null) => void) | undefined;
  onOpen: (() => void) | undefined;
  onClose: (() => void) | undefined;
}

export interface DateTimeFieldOptions extends Partial<DateTimeFieldSettings> {
  icon?: Node | string | undefined;
  container?: HTMLElement | undefined;
  injectStyles?: boolean;
}

export interface DateTimeFieldInstance {
  readonly value: Instant | null;
  readonly isOpen: boolean;
  update(settings: Partial<DateTimeFieldSettings>): void;
  open(): void;
  close(): void;
  toggle(): void;
  clear(): void;
  setIcon(icon: Node | string): void;
  destroy(): void;
}

/** The day and the wall time a moment reads as, on this zone's clocks. */
function readOff(value: Instant | null, timeZone: string) {
  if (!value) return { date: null, time: null };
  const zoned = value.toZonedDateTimeISO(timeZone);
  return { date: zoned.toPlainDate(), time: zoned.toPlainTime() };
}

/**
 * A field that opens a calendar and a time — flatpickr's `enableTime`, with
 * the part flatpickr cannot do.
 *
 * It holds an Instant, so the value says which moment was meant even when the
 * clock face does not. Choosing a day and a time that the zone skips says so
 * and moves on to the first moment that exists; choosing one that happens
 * twice offers both readings by their offset rather than guessing.
 */
export function createDateTimeField(
  host: HTMLElement,
  options: DateTimeFieldOptions = {},
): DateTimeFieldInstance {
  const doc = host.ownerDocument;
  const { icon, container, injectStyles = true, ...initial } = options;

  const s: DateTimeFieldSettings = {
    value: null,
    timeZone: Temporal.Now.timeZoneId(),
    mode: 'popup',
    placeholder: undefined,
    ariaLabel: undefined,
    locale: undefined,
    firstDayOfWeek: 1,
    min: null,
    max: null,
    isDateDisabled: undefined,
    showTime: true,
    shift: false,
    timeLayout: 'input',
    stepMinutes: 30,
    minuteStep: 1,
    minTime: undefined,
    maxTime: undefined,
    isSlotDisabled: undefined,
    hour12: undefined,
    defaultTime: '00:00',
    disabled: false,
    editable: true,
    mask: true,
    format: undefined,
    dateStyle: 'medium',
    timeStyle: 'short',
    displayWith: undefined,
    today: Temporal.Now.plainDateISO(),
    renderCell: undefined,
    buttons: [],
    weekNumbers: false,
    messages: EN,
    onChange: undefined,
    onOpen: undefined,
    onClose: undefined,
    ...initial,
  };

  let stylesPending = injectStyles;
  /** The day and time being built, which exist before a moment does. */
  let draft: { date: PlainDate | null; time: PlainTime | null } = readOff(s.value, s.timeZone);
  /** The two readings of a repeated hour, while the choice is open. */
  let readings: { instant: Instant; offset: string; name: string; full: string }[] = [];
  /**
   * What the panel says about the moment: that the clocks skipped it, or that
   * it happens twice. Held, not passed to one render: a framework that hands
   * the value back redraws, and the explanation must survive that.
   */
  let notice: string | null = null;

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
    const node = doc.createElement(tag);
    node.className = className;
    return node;
  };

  const addedHostClass = !host.classList.contains('tz-field');
  host.classList.add('tz-field');

  /**
   * Two shapes of the same field. A button when the text is only read — there
   * is nothing to type, so nothing that can be mistyped. An input when it can
   * be typed, with the icon beside it as its own button.
   */
  const wrap = el('div', 'tz-field__wrap');
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'tz-field__trigger';
  button.setAttribute('aria-haspopup', 'dialog');
  const text = el('span', 'tz-field__text');
  const typed = doc.createElement('input');
  typed.type = 'text';
  typed.className = 'tz-field__trigger tz-field__trigger--editable';
  typed.autocomplete = 'off';
  typed.setAttribute('aria-haspopup', 'dialog');
  const iconSlot = el('span', 'tz-field__icon');
  iconSlot.append(icon ?? '▾');
  const iconButton = doc.createElement('button');
  iconButton.type = 'button';
  iconButton.className = 'tz-field__icon-button';
  /** One of the two arrows that step the moment. */
  function arrow(direction: 1 | -1, className: string): HTMLButtonElement {
    const node = doc.createElement('button');
    node.type = 'button';
    node.className = className;
    node.textContent = direction === -1 ? '‹' : '›';
    node.addEventListener('click', (event) => {
      event.stopPropagation();
      step(direction);
    });
    return node;
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
  host.append(back, wrap, stepPicker, forward);

  /** The offered steps, when the reader is given the choice. */
  const stepMenu = (): readonly ShiftOption[] | null => (Array.isArray(s.shift) ? s.shift : null);
  let stepIndex = 0;
  const currentStep = (): DurationLike | null => {
    const menu = stepMenu();
    if (menu) {
      const chosen = menu[Math.min(stepIndex, menu.length - 1)]?.step;
      // 'auto' means "as long as what is selected", and a single moment is
      // not long. Such an entry cannot drive these arrows.
      return chosen === undefined || chosen === 'auto' ? null : chosen;
    }
    return s.shift === false ? null : (s.shift as DurationLike);
  };

  /**
   * One notch away, on the zone's clocks.
   *
   * A moment that does not exist cannot be landed on: the hour the clocks
   * skip is stepped over by Temporal itself, which is why this goes through
   * the zone rather than adding milliseconds.
   */
  function step(direction: 1 | -1): void {
    const by = currentStep();
    if (by === null || s.disabled || s.value === null) return;
    commit(shiftInstant(s.value, by, direction, s.timeZone));
  }

  /** Which of the two is in the document, and what the panel hangs from. */
  let trigger: HTMLElement = button;
  /**
   * Whether the text may be rewritten. Only the field's own focus says no:
   * a flag raised while typing stayed raised when the panel took over, and
   * the text then disagreed with the value underneath it.
   */
  const beingTyped = () => doc.activeElement === typed;

  function mountTrigger(): void {
    const wanted = s.editable ? typed : button;
    if (trigger === wanted && wrap.contains(wanted)) return;
    trigger = wanted;
    if (s.editable) {
      iconSlot.removeAttribute('aria-hidden');
      iconButton.replaceChildren(iconSlot);
      wrap.replaceChildren(typed, iconButton);
    } else {
      iconSlot.setAttribute('aria-hidden', 'true');
      button.replaceChildren(text, iconSlot);
      wrap.replaceChildren(button);
    }
  }
  mountTrigger();

  let calendar: CalendarInstance | null = null;
  let timeInput: TimeInputInstance | null = null;
  let timeMenus: TimeSelectInstance | null = null;
  let slots: TimeSlotsInstance | null = null;
  let note: HTMLElement | null = null;
  let choice: HTMLElement | null = null;

  const label = () => s.ariaLabel ?? s.messages.chooseDateTime;

  /** The pattern the field writes and reads, when it is written by pattern at all. */
  const pattern = () =>
    s.format ?? (s.editable ? patternFor(s.locale, { time: s.showTime }) : null);

  /**
   * The two names for a moment whose clock face happens twice that day, and
   * which of them this moment is. Null when the hour is an ordinary one.
   */
  function readingOf(value: Instant): { names: [string, string]; index: number } | null {
    const zoned = value.toZonedDateTimeISO(s.timeZone);
    const found = resolveWallTime(zoned.toPlainDate(), zoned.toPlainTime(), s.timeZone);
    if (!found.ambiguous) return null;
    const index = found.offsets.indexOf(zoned.offset);
    return { names: seasonNames(found.offsets), index: index < 0 ? 0 : index };
  }

  /** Summer and winter, in that order or the other, by which clocks are ahead. */
  const seasonNames = (offsets: readonly string[]): [string, string] =>
    summerFirst(offsets)
      ? [s.messages.summerTime, s.messages.winterTime]
      : [s.messages.winterTime, s.messages.summerTime];

  const display = (): string => {
    if (!s.value) return '';
    if (s.displayWith) return s.displayWith(s.value, s.timeZone);
    const shape = pattern();
    const written = shape
      ? formatWith(
          shape,
          {
            date: s.value.toZonedDateTimeISO(s.timeZone).toPlainDate(),
            time: s.value.toZonedDateTimeISO(s.timeZone).toPlainTime(),
          },
          s.locale,
        )
      : new Intl.DateTimeFormat(s.locale, {
          dateStyle: s.dateStyle,
          ...(s.showTime ? { timeStyle: s.timeStyle } : {}),
          timeZone: s.timeZone,
        }).format(new Date(s.value.epochMilliseconds));

    // "02:00" is two different moments on the morning the clocks go back, and
    // a field that shows one of them without saying which has told the reader
    // nothing. The name is only added when it is needed.
    const reading = s.showTime ? readingOf(s.value) : null;
    return reading ? `${written} (${reading.names[reading.index]})` : written;
  };

  /**
   * What was typed. Anything that is not a date is refused rather than
   * guessed at — and refused quietly, until the field is left.
   */
  function readTyped(commitEmpty: boolean): boolean {
    const whole = typed.value.trim();
    // The name of a reading rides along in brackets; it is read back, so
    // "02:00 (Standard)" keeps meaning the second of the two.
    const aside = /\s*\(([^)]*)\)\s*$/.exec(whole);
    const hint = aside?.[1]?.trim().toLowerCase() ?? null;
    const text = aside ? whole.slice(0, aside.index).trim() : whole;
    if (text === '') {
      if (commitEmpty && s.value !== null) {
        draft = { date: null, time: null };
        settle();
      }
      return true;
    }
    const shape = pattern();
    const read = shape ? parseWith(shape, text) : null;
    if (!read?.date) return false;
    if (blocked(read.date)) return false;
    draft = { date: read.date, time: read.time ?? draft.time ?? startingTime() };
    settleTyped(hint);
    return true;
  }

  /** The bounds and the rules the calendar applies, applied to typed text too. */
  /** The time a newly chosen day starts at. */
  function startingTime(): PlainTime {
    const wanted =
      typeof s.defaultTime === 'string' ? Temporal.PlainTime.from(s.defaultTime) : s.defaultTime;
    const min = typeof s.minTime === 'string' ? Temporal.PlainTime.from(s.minTime) : s.minTime;
    return min && Temporal.PlainTime.compare(wanted, min) < 0 ? min : wanted;
  }

  const blocked = (date: PlainDate) =>
    (s.min !== null && Temporal.PlainDate.compare(date, s.min) < 0) ||
    (s.max !== null && Temporal.PlainDate.compare(date, s.max) > 0) ||
    (s.isDateDisabled?.(date) ?? false);

  /**
   * A day and a wall time become a moment — or say why they cannot be one.
   * Nothing is guessed: an hour that happens twice waits for the user.
   */
  /**
   * A time chosen from the menus already says which reading it is, so there
   * is nothing left to ask: the offset picks the instant.
   */
  function settleWithOffset(time: PlainTime, offset: string | null): void {
    readings = [];
    notice = null;
    const date = draft.date;
    draft = { date, time };
    if (!date) {
      render();
      return;
    }
    const found = resolveWallTime(date, time, s.timeZone);
    const chosen =
      offset === null
        ? found.instants[0]
        : found.instants[found.offsets.indexOf(offset)] ?? found.instants[0];
    if (!chosen) {
      settle();
      return;
    }
    commit(chosen);
  }

  /** What was typed, with any reading named in brackets taken into account. */
  function settleTyped(hint: string | null): void {
    const { date, time } = draft;
    if (hint && date && time) {
      const found = resolveWallTime(date, time, s.timeZone);
      if (found.ambiguous) {
        const names = seasonNames(found.offsets);
        const which = names.findIndex((name) => name.toLowerCase() === hint);
        const byOffset = found.offsets.findIndex((offset) => `utc${offset}`.toLowerCase() === hint);
        const index = which >= 0 ? which : byOffset;
        if (index >= 0) {
          settleWithOffset(time, found.offsets[index]!);
          return;
        }
      }
    }
    settle();
  }

  function settle(): void {
    readings = [];
    notice = null;
    const { date, time } = draft;
    if (!date || !time) {
      commit(null);
      return;
    }
    const found = resolveWallTime(date, time, s.timeZone);
    if (!found.exists) {
      // The clocks skipped this time; the first moment that exists is the
      // honest answer, and the panel says so.
      const moved = date.toPlainDateTime(time).toZonedDateTime(s.timeZone, { disambiguation: 'later' });
      draft = { date, time: moved.toPlainTime() };
      notice = s.messages.nonExistentTime(time.toString({ smallestUnit: 'minute' }));
      commit(moved.toInstant());
      return;
    }
    if (found.ambiguous) {
      // Named, not numbered: "heure d'été" is something a person can answer,
      // "+02:00" is something they have to work out.
      const names = seasonNames(found.offsets);
      readings = found.instants.map((instant, i) => ({
        instant,
        offset: found.offsets[i] ?? '',
        name: names[i] ?? '',
        full: zoneName(instant, s.timeZone, s.locale),
      }));
      notice = s.messages.whichReading;
      commit(readings[0]!.instant);
      return;
    }
    commit(found.instants[0]!);
  }

  function commit(value: Instant | null): void {
    // Only a different moment is reported. Opening the panel moves the focus
    // out of the text field, which re-reads it — and re-reading the same text
    // must not look like a change to a form.
    const changed =
      (value === null) !== (s.value === null) ||
      (value !== null && s.value !== null && !value.equals(s.value));
    s.value = value;
    render();
    if (changed) s.onChange?.(value);
  }

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'field', FIELD_CSS);
      stylesPending = false;
    }
    mountTrigger();
    const written = display();
    if (s.editable) {
      if (!beingTyped()) typed.value = written;
      // Never the pattern: a field that says dd/MM/yyyy before anything is
      // typed is a field explaining itself instead of inviting an answer.
      typed.placeholder = s.placeholder ?? s.messages.chooseDateTime;
      typed.disabled = s.disabled;
      iconButton.disabled = s.disabled;
      iconButton.setAttribute('aria-label', label());
    } else {
      text.textContent = written || s.placeholder || s.messages.chooseDateTime;
      button.disabled = s.disabled;
    }
    trigger.classList.toggle('tz-field__trigger--empty', s.value === null);
    trigger.setAttribute('aria-expanded', String(panel.isOpen));
    trigger.setAttribute('aria-label', label());
    const menu = stepMenu();
    const by = currentStep();
    host.classList.toggle('tz-field--shift', by !== null);
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
    for (const [node, text_] of [
      [back, s.messages.previousPeriod],
      [forward, s.messages.nextPeriod],
    ] as const) {
      node.hidden = by === null;
      node.disabled = s.disabled || s.value === null;
      node.setAttribute('aria-label', text_);
      node.title = text_;
    }
    if (s.disabled) panel.close({ restoreFocus: false });
    paintPanel();
  }

  /** What the panel shows about a time that is not ordinary. */
  function paintPanel(): void {
    calendar?.update({
      value: draft.date,
      locale: s.locale,
      firstDayOfWeek: s.firstDayOfWeek,
      min: s.min,
      max: s.max,
      isDateDisabled: s.isDateDisabled,
      today: s.today,
      messages: s.messages,
      renderCell: s.renderCell,
      buttons: s.buttons,
      weekNumbers: s.weekNumbers,
    });
    timeMenus?.update({
      value: draft.time,
      // The menus show the day they are choosing a time on, as the zone has it.
      date: draft.date,
      timeZone: s.timeZone,
      offset: s.value && draft.date ? s.value.toZonedDateTimeISO(s.timeZone).offset : null,
      minuteStep: s.minuteStep,
      minTime: s.minTime,
      maxTime: s.maxTime,
      locale: s.locale,
      disabled: s.disabled,
      messages: s.messages,
    });
    timeInput?.update({
      value: draft.time,
      // The day it is on, so the arrows step over an hour that does not exist.
      date: draft.date,
      timeZone: s.timeZone,
      stepMinutes: s.stepMinutes,
      minTime: s.minTime,
      maxTime: s.maxTime,
      hour12: s.hour12,
      locale: s.locale,
      disabled: s.disabled,
      messages: s.messages,
    });
    slots?.update({
      date: draft.date,
      timeZone: s.timeZone,
      stepMinutes: s.stepMinutes,
      minTime: s.minTime,
      maxTime: s.maxTime,
      isDisabled: s.isSlotDisabled,
      value: s.value,
      disabled: s.disabled,
      messages: s.messages,
    });

    if (note) {
      // Once one of the two is chosen, say which: the field shows 02:00
      // either way, and that alone never told anyone what they picked.
      const chosen = readings.find((reading) => s.value?.equals(reading.instant));
      const said = chosen
        ? `${notice ?? ''} ${s.messages.readingChosen({ name: chosen.full, offset: chosen.offset })}`.trim()
        : notice;
      note.textContent = said ?? '';
      note.hidden = !said;
    }
    if (choice) {
      // The same two buttons are kept and repainted. Rebuilding them would
      // take the one under the pointer away mid-click — pressing it moves the
      // focus out of the text field, which repaints before the click lands.
      const buttons = readings.map(({ instant, offset, name, full }, index) => {
        let button = choice!.children[index] as HTMLButtonElement | undefined;
        if (!button) {
          button = el('button', 'tz-datetime__reading');
          button.type = 'button';
          choice!.append(button);
        }
        const picked = s.value?.equals(instant) ?? false;
        button.textContent = name || `UTC${offset}`;
        button.title = `${full} (UTC${offset})`;
        button.setAttribute('aria-pressed', String(picked));
        button.classList.toggle('tz-datetime__reading--on', picked);
        button.onclick = () => commit(instant);
        return button;
      });
      while (choice.children.length > buttons.length) choice.lastElementChild!.remove();
      choice.hidden = readings.length === 0;
    }
    panel.place();
  }

  const panel = createPanel({
    trigger,
    source: host,
    container,
    mode: () => s.mode,
    label,
    onOpen: () => {
      render();
      s.onOpen?.();
    },
    onClose: () => {
      calendar = null;
      timeInput = null;
      timeMenus = null;
      slots = null;
      note = null;
      choice = null;
      render();
      s.onClose?.();
    },
    // A field being typed into keeps the focus; one that is only clicked hands
    // it to the day the panel opens on.
    initialFocus: (node) =>
      s.editable ? null : node.querySelector<HTMLElement>('.tz-cal__day[tabindex="0"]'),
    content: (node) => {
      node.classList.add('tz-datetime__panel');
      // Everything inside is told not to inject its own, so the panel brings
      // all of it. Without this the calendar came up unstyled on any page
      // that happened to have no other calendar on it.
      ensureStyles(node, 'datetime', DATETIME_CSS);
      ensureStyles(node, 'calendar', CALENDAR_CSS);
      ensureStyles(node, s.timeLayout === 'list' ? 'slots' : 'time', s.timeLayout === 'list' ? SLOTS_CSS : TIME_CSS);
      const calendarHost = doc.createElement('div');
      const timeRow = el('div', 'tz-datetime__time');
      timeRow.hidden = !s.showTime;
      const timeLabel = el('span', 'tz-datetime__label');
      timeLabel.textContent = s.messages.timeLabel;
      const timeHost = doc.createElement('div');
      // The compact field speaks for itself under a calendar; a list of times
      // needs saying what it is.
      if (s.timeLayout !== 'input') timeRow.append(timeLabel);
      timeRow.append(timeHost);
      note = el('p', 'tz-datetime__note');
      note.setAttribute('role', 'status');
      choice = el('div', 'tz-datetime__readings');
      node.append(calendarHost, timeRow, note, choice);

      calendar = createCalendar(calendarHost, {
        injectStyles: false,
        onChange: (date) => {
          // A day with no time is not a moment; start it at defaultTime so
          // choosing a date already means something.
          draft = { date, time: date === null ? null : (draft.time ?? startingTime()) };
          settle();
        },
      });
      if (!s.showTime) {
        // Nothing to choose: the day carries the moment it starts at.
      } else if (s.timeLayout === 'select') {
        timeRow.classList.add('tz-datetime__time--select');
        ensureStyles(node, 'timeselect', TIMESELECT_CSS);
        timeMenus = createTimeSelect(timeHost, {
          injectStyles: false,
          onChange: (time, offset) => {
            if (time === null) {
              draft = { date: draft.date, time: null };
              settle();
            } else settleWithOffset(time, offset);
          },
        });
      } else if (s.timeLayout === 'input') {
        timeInput = createTimeInput(timeHost, {
          injectStyles: false,
          variant: 'bare',
          onChange: (time) => {
            draft = { date: draft.date, time };
            settle();
          },
        });
      } else {
        timeRow.classList.add('tz-datetime__time--list');
        slots = createTimeSlots(timeHost, {
          injectStyles: false,
          onChange: (instant) => {
            draft = readOff(instant, s.timeZone);
            readings = [];
            commit(instant);
          },
        });
      }
      return () => {
        calendar?.destroy();
        timeInput?.destroy();
        timeMenus?.destroy();
        slots?.destroy();
      };
    },
  });

  const openPanel = () => {
    if (!s.disabled) panel.open();
  };

  const listening = new AbortController();
  const on = { signal: listening.signal };
  button.addEventListener('click', () => (panel.isOpen ? panel.close() : openPanel()), on);
  iconButton.addEventListener('click', () => (panel.isOpen ? panel.close() : openPanel()), on);
  // Typing opens the panel, so the calendar follows along as the text changes.
  /**
   * The panel opens on a click, on the first keystroke, and on ArrowDown —
   * not merely on focus. Escape hands the focus back to the field, and a
   * field that opened on focus would open it straight back, so Escape would
   * never close anything. Tabbing through a form does not open panels either.
   */
  typed.addEventListener('click', () => openPanel(), on);
  typed.addEventListener(
    'input',
    (event) => {
      typed.classList.remove('tz-field__trigger--invalid');
      typed.removeAttribute('aria-invalid');
      openPanel();
      const shape = pattern();
      const deleting = (event as InputEvent).inputType?.startsWith('delete') ?? false;
      const atEnd = typed.selectionStart === typed.value.length;
      // Not while a reading is named in brackets: the mask would eat it.
      const named = typed.value.includes('(');
      // Helping only where it cannot get in the way: at the end of the text,
      // and never while someone is deleting — putting a separator back that
      // was just removed makes a field impossible to correct.
      if (s.mask && shape && !deleting && atEnd && !named) {
        const helped = maskWith(shape, typed.value);
        if (helped !== typed.value) {
          typed.value = helped;
          typed.setSelectionRange(helped.length, helped.length);
        }
      }
      readTyped(false);
    },
    on,
  );
  typed.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'ArrowDown' && !panel.isOpen) {
        event.preventDefault();
        openPanel();
        return;
      }
      if (event.key !== 'Enter') return;
      event.preventDefault();
      if (readTyped(true)) {
        render();
        // Settled: show the moment as the field writes it, not as it was typed.
        typed.value = display();
        panel.close();
      } else {
        typed.classList.add('tz-field__trigger--invalid');
        typed.setAttribute('aria-invalid', 'true');
      }
    },
    on,
  );
  // Leaving the field settles it: what cannot be read goes back to the last
  // moment the field held, rather than sitting there looking chosen.
  typed.addEventListener(
    'blur',
    () => {
      readTyped(true);
      typed.classList.remove('tz-field__trigger--invalid');
      typed.removeAttribute('aria-invalid');
      render();
      // Whatever was left half-typed or unreadable goes back to the moment
      // the field holds. Not left to render(), which leaves a focused field
      // alone — and the focus has not always moved when this fires.
      typed.value = display();
    },
    on,
  );

  render();

  return {
    get value() {
      return s.value;
    },
    get isOpen() {
      return panel.isOpen;
    },
    update(settings) {
      const was = { value: s.value, timeZone: s.timeZone };
      Object.assign(s, settings);
      // Only a moment that is genuinely different starts again. A framework
      // handing back the value it was just given must not wipe the choice
      // between the two readings of a repeated hour.
      const moved =
        s.timeZone !== was.timeZone ||
        (s.value === null) !== (was.value === null) ||
        (s.value !== null && was.value !== null && !s.value.equals(was.value));
      if (moved) {
        draft = readOff(s.value, s.timeZone);
        readings = [];
        notice = null;
      }
      render();
    },
    open: openPanel,
    close: () => panel.close(),
    toggle: () => (panel.isOpen ? panel.close() : openPanel()),
    clear() {
      draft = { date: null, time: null };
      readings = [];
      notice = null;
      commit(null);
    },
    setIcon(next) {
      iconSlot.replaceChildren(next);
    },
    destroy() {
      panel.close({ restoreFocus: false });
      listening.abort();
      back.remove();
      wrap.remove();
      stepPicker.remove();
      forward.remove();
      if (addedHostClass) host.classList.remove('tz-field');
    },
  };
}
