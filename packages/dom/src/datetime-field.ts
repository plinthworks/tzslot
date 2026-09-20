import { Temporal, resolveWallTime } from '@tzslot/core';
import type { Instant, PlainDate, PlainTime, Slot } from '@tzslot/core';
import { createCalendar, type CalendarButton, type CalendarInstance } from './calendar.js';
import { createTimeInput, type TimeInputInstance } from './time-input.js';
import { createTimeSlots, type TimeSlotsInstance } from './time-slots.js';
import type { TimeLayout } from './daily-range.js';
import type { RenderCell } from './cells.js';
import { createPanel, type FieldMode } from './panel.js';
import { EN, type TzslotMessages } from './messages.js';
import { DATETIME_CSS, FIELD_CSS, ensureStyles } from './styles.js';

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
  /** How the time is chosen: two compact fields, or the day's times to click. */
  timeLayout: TimeLayout;
  stepMinutes: number;
  minTime: PlainTime | string | undefined;
  maxTime: PlainTime | string | undefined;
  /** Only with timeLayout 'list': rules out slots while still showing them. */
  isSlotDisabled: ((slot: Omit<Slot, 'disabled'>) => boolean) | undefined;
  hour12: boolean | undefined;
  disabled: boolean;
  /** How the moment is written in the field. Defaults to the locale's medium forms. */
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
    minTime: undefined,
    maxTime: undefined,
    isSlotDisabled: undefined,
    hour12: undefined,
    disabled: false,
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

  const trigger = doc.createElement('button');
  trigger.type = 'button';
  trigger.className = 'tz-field__trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  const text = el('span', 'tz-field__text');
  const iconSlot = el('span', 'tz-field__icon');
  iconSlot.setAttribute('aria-hidden', 'true');
  iconSlot.append(icon ?? '▾');
  trigger.append(text, iconSlot);
  host.append(trigger);

  let calendar: CalendarInstance | null = null;
  let timeInput: TimeInputInstance | null = null;
  let slots: TimeSlotsInstance | null = null;
  let note: HTMLElement | null = null;
  let choice: HTMLElement | null = null;

  const label = () => s.ariaLabel ?? s.messages.chooseDateTime;

  const display = (): string => {
    if (!s.value) return '';
    if (s.displayWith) return s.displayWith(s.value, s.timeZone);
    return new Intl.DateTimeFormat(s.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: s.timeZone,
    }).format(new Date(s.value.epochMilliseconds));
  };

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
    s.value = value;
    render();
    s.onChange?.(value);
  }

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'field', FIELD_CSS);
      stylesPending = false;
    }
    text.textContent = display() || s.placeholder || s.messages.chooseDateTime;
    trigger.classList.toggle('tz-field__trigger--empty', s.value === null);
    trigger.setAttribute('aria-expanded', String(panel.isOpen));
    trigger.setAttribute('aria-label', label());
    trigger.disabled = s.disabled;
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
      timeRow.append(timeLabel, timeHost);
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
      if (s.timeLayout === 'input') {
        timeInput = createTimeInput(timeHost, {
          injectStyles: false,
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
        slots?.destroy();
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
