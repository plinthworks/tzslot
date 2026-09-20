import { Temporal, resolveWallTime } from '@tzslot/core';
import type { Instant, PlainDate, PlainTime, Slot } from '@tzslot/core';
import { createCalendar, type CalendarButton, type CalendarInstance } from './calendar.js';
import { createTimeInput, type TimeInputInstance } from './time-input.js';
import { createTimeSelect, type TimeSelectInstance } from './time-select.js';
import { createTimeSlots, type TimeSlotsInstance } from './time-slots.js';
import type { TimeLayout } from './daily-range.js';
import type { RenderCell } from './cells.js';
import { createPanel, type FieldMode } from './panel.js';
import { formatWith, parseWith, patternFor } from './format.js';
import { EN, type TzslotMessages } from './messages.js';
import { DATETIME_CSS, FIELD_CSS, TIMESELECT_CSS, ensureStyles } from './styles.js';

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
  disabled: boolean;
  /**
   * The text can be typed as well as chosen. What is typed is read with the
   * same pattern the field writes, so the two always agree; anything that is
   * not a date goes back to the last one when the field is left.
   */
  editable: boolean;
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
    timeLayout: 'input',
    stepMinutes: 30,
    minuteStep: 1,
    minTime: undefined,
    maxTime: undefined,
    isSlotDisabled: undefined,
    hour12: undefined,
    disabled: false,
    editable: true,
    format: undefined,
    dateStyle: 'medium',
    timeStyle: 'short',
    displayWith: undefined,
    today: Temporal.Now.plainDateISO(),
    renderCell: undefined,
    buttons: [],
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
  let readings: { instant: Instant; offset: string }[] = [];
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
  host.append(wrap);

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
  const pattern = () => s.format ?? (s.editable ? patternFor(s.locale, { time: true }) : null);

  const display = (): string => {
    if (!s.value) return '';
    if (s.displayWith) return s.displayWith(s.value, s.timeZone);
    const shape = pattern();
    if (shape) {
      const zoned = s.value.toZonedDateTimeISO(s.timeZone);
      return formatWith(shape, { date: zoned.toPlainDate(), time: zoned.toPlainTime() }, s.locale);
    }
    return new Intl.DateTimeFormat(s.locale, {
      dateStyle: s.dateStyle,
      timeStyle: s.timeStyle,
      timeZone: s.timeZone,
    }).format(new Date(s.value.epochMilliseconds));
  };

  /**
   * What was typed. Anything that is not a date is refused rather than
   * guessed at — and refused quietly, until the field is left.
   */
  function readTyped(commitEmpty: boolean): boolean {
    const text = typed.value.trim();
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
    if (read.date && (blocked(read.date) || false)) return false;
    draft = { date: read.date, time: read.time ?? draft.time };
    settle();
    return true;
  }

  /** The bounds and the rules the calendar applies, applied to typed text too. */
  const blocked = (date: PlainDate) =>
    (s.min !== null && Temporal.PlainDate.compare(date, s.min) < 0) ||
    (s.max !== null && Temporal.PlainDate.compare(date, s.max) > 0) ||
    (s.isDateDisabled?.(date) ?? false);

  /**
   * A day and a wall time become a moment — or say why they cannot be one.
   * Nothing is guessed: an hour that happens twice waits for the user.
   */
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
      readings = found.instants.map((instant, i) => ({ instant, offset: found.offsets[i] ?? '' }));
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
      typed.placeholder = s.placeholder ?? pattern() ?? s.messages.chooseDateTime;
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
    });
    timeMenus?.update({
      value: draft.time,
      minuteStep: s.minuteStep,
      minTime: s.minTime,
      maxTime: s.maxTime,
      locale: s.locale,
      disabled: s.disabled,
      messages: s.messages,
    });
    timeInput?.update({
      value: draft.time,
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
      note.textContent = notice ?? '';
      note.hidden = notice === null;
    }
    if (choice) {
      choice.replaceChildren(
        ...readings.map(({ instant, offset }) => {
          const button = el('button', 'tz-datetime__reading');
          button.type = 'button';
          button.textContent = `UTC${offset}`;
          button.setAttribute('aria-pressed', String(s.value?.equals(instant) ?? false));
          button.classList.toggle('tz-datetime__reading--on', s.value?.equals(instant) ?? false);
          button.addEventListener('click', () => commit(instant));
          return button;
        }),
      );
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
    initialFocus: (node) => node.querySelector<HTMLElement>('.tz-cal__day[tabindex="0"]'),
    content: (node) => {
      node.classList.add('tz-datetime__panel');
      ensureStyles(node, 'datetime', DATETIME_CSS);
      const calendarHost = doc.createElement('div');
      const timeRow = el('div', 'tz-datetime__time');
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
          draft = { date, time: draft.time };
          settle();
        },
      });
      if (s.timeLayout === 'select') {
        timeRow.classList.add('tz-datetime__time--select');
        ensureStyles(node, 'timeselect', TIMESELECT_CSS);
        timeMenus = createTimeSelect(timeHost, {
          injectStyles: false,
          onChange: (time) => {
            draft = { date: draft.date, time };
            settle();
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
  typed.addEventListener('focus', () => openPanel(), on);
  typed.addEventListener(
    'input',
    () => {
      typed.classList.remove('tz-field__trigger--invalid');
      typed.removeAttribute('aria-invalid');
      readTyped(false);
    },
    on,
  );
  typed.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      if (readTyped(true)) {
        render();
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
      trigger.remove();
      if (addedHostClass) host.classList.remove('tz-field');
    },
  };
}
