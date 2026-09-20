import { Temporal } from '@tzslot/core';
import type { PlainDate, Weekday } from '@tzslot/core';
import { createCalendar, type CalendarButton, type CalendarInstance } from './calendar.js';
import type { RenderCell } from './cells.js';
import { EN, type TzslotMessages } from './messages.js';
import { FIELD_CSS, ensureStyles } from './styles.js';
import { createPanel, type FieldMode, type PanelController } from './panel.js';

export type { FieldMode } from './panel.js';

export interface DateFieldSettings {
  /** The chosen day. */
  value: PlainDate | null;
  mode: FieldMode;
  placeholder: string | undefined;
  /** The trigger's and the panel's accessible name. Defaults to messages.chooseDate. */
  ariaLabel: string | undefined;
  locale: string | undefined;
  firstDayOfWeek: Weekday;
  min: PlainDate | null;
  max: PlainDate | null;
  isDateDisabled: ((date: PlainDate) => boolean) | undefined;
  disabled: boolean;
  /** How the chosen date is written in the field. Defaults to the locale's medium form. */
  displayWith: ((date: PlainDate) => string) | undefined;
  today: PlainDate;
  messages: TzslotMessages;
  /** Passed to the calendar in the panel. */
  renderCell: RenderCell | undefined;
  /** Under the panel's grid: 'today', 'clear'. Choosing either closes it. */
  buttons: readonly CalendarButton[];
  onChange: ((value: PlainDate | null) => void) | undefined;
  onOpen: (() => void) | undefined;
  onClose: (() => void) | undefined;
}

export interface DateFieldOptions extends Partial<DateFieldSettings> {
  /** Replaces the ▾. A string is used as text, never as HTML. */
  icon?: Node | string | undefined;
  /**
   * Where the panel is attached. The body by default, so no ancestor's
   * `overflow: hidden` can clip it.
   */
  container?: HTMLElement | undefined;
  injectStyles?: boolean;
}

export interface DateFieldInstance {
  readonly value: PlainDate | null;
  readonly isOpen: boolean;
  /** Changes settings and redraws. Never calls onChange. */
  update(settings: Partial<DateFieldSettings>): void;
  /** No-op when already open, or when disabled. */
  open(): void;
  close(): void;
  toggle(): void;
  /** Empties the selection, and reports it through onChange. */
  clear(): void;
  setIcon(icon: Node | string): void;
  destroy(): void;
}

/**
 * A field that opens a calendar, anchored or centred.
 *
 * The third way to show a picker, after inline and embedded, and the one most
 * forms actually want. Both modes are the same panel with a different
 * position — a dialog is a popup that stopped following its trigger — so there
 * is one set of focus handling to keep correct, not two.
 *
 * The field is read-only on purpose. Parsing what someone types into a date is
 * its own problem — 03/04 is two different days depending on the reader — and
 * getting it half right is worse than not offering it.
 *
 * The panel lives on the body, outside the field's own tree, so nothing the
 * field sits in can clip it. The price is that it no longer inherits from the
 * field: the theme is carried across explicitly when it opens.
 */
export function createDateField(host: HTMLElement, options: DateFieldOptions = {}): DateFieldInstance {
  const doc = host.ownerDocument;
  const { icon, container, injectStyles = true, ...initial } = options;

  const s: DateFieldSettings = {
    value: null,
    mode: 'popup',
    placeholder: undefined,
    ariaLabel: undefined,
    locale: undefined,
    firstDayOfWeek: 1,
    min: null,
    max: null,
    isDateDisabled: undefined,
    disabled: false,
    displayWith: undefined,
    today: Temporal.Now.plainDateISO(),
    messages: EN,
    renderCell: undefined,
    buttons: [],
    onChange: undefined,
    onOpen: undefined,
    onClose: undefined,
    ...initial,
  };

  let stylesPending = injectStyles;

  const addedHostClass = !host.classList.contains('tz-field');
  host.classList.add('tz-field');

  const trigger = doc.createElement('button');
  trigger.type = 'button';
  trigger.className = 'tz-field__trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  const text = doc.createElement('span');
  text.className = 'tz-field__text';
  const iconSlot = doc.createElement('span');
  iconSlot.className = 'tz-field__icon';
  iconSlot.setAttribute('aria-hidden', 'true');
  iconSlot.append(icon ?? '▾');
  trigger.append(text, iconSlot);
  host.append(trigger);

  /** The calendar inside the panel, while there is one. */
  let calendar: CalendarInstance | null = null;

  const label = () => s.ariaLabel ?? s.messages.chooseDate;

  const display = (): string => {
    const date = s.value;
    if (!date) return '';
    if (s.displayWith) return s.displayWith(date);
    return new Intl.DateTimeFormat(s.locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
      new Date(Date.UTC(date.year, date.month - 1, date.day)),
    );
  };

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'field', FIELD_CSS);
      stylesPending = false;
    }
    text.textContent = display() || s.placeholder || s.messages.chooseDate;
    trigger.classList.toggle('tz-field__trigger--empty', s.value === null);
    trigger.setAttribute('aria-expanded', String(panel.isOpen));
    trigger.setAttribute('aria-label', label());
    trigger.disabled = s.disabled;
    if (s.disabled) panel.close({ restoreFocus: false });
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
      render();
      s.onClose?.();
    },
    // Into the panel, on the day that matters: the selection, else today.
    initialFocus: (node) => node.querySelector<HTMLElement>('.tz-cal__day[tabindex="0"]'),
    content: (node) => {
      const calendarHost = doc.createElement('div');
      node.append(calendarHost);
      calendar = createCalendar(calendarHost, {
        value: s.value,
        locale: s.locale,
        firstDayOfWeek: s.firstDayOfWeek,
        min: s.min,
        max: s.max,
        isDateDisabled: s.isDateDisabled,
        today: s.today,
        messages: s.messages,
        renderCell: s.renderCell,
        buttons: s.buttons,
        injectStyles: false,
        onChange: pick,
      });
      return () => calendar?.destroy();
    },
  });

  function pick(date: PlainDate | null): void {
    s.value = date;
    panel.close({ restoreFocus: true });
    s.onChange?.(date);
  }

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
      calendar?.update({
        value: s.value,
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
      render();
    },
    open: openPanel,
    close: () => panel.close(),
    toggle: () => (panel.isOpen ? panel.close() : openPanel()),
    clear() {
      s.value = null;
      render();
      s.onChange?.(null);
    },
    setIcon(next) {
      iconSlot.replaceChildren(next);
    },
    destroy() {
      // A panel left floating over the next page gets blamed on the router.
      panel.close({ restoreFocus: false });
      listening.abort();
      trigger.remove();
      if (addedHostClass) host.classList.remove('tz-field');
    },
  };
}
