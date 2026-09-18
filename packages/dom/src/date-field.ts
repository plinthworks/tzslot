import { Temporal } from '../../core/src/index.js';
import type { PlainDate, Weekday } from '../../core/src/index.js';
import { createCalendar, type CalendarInstance } from './calendar.js';
import { EN, type TzslotMessages } from './messages.js';
import { CALENDAR_CSS, FIELD_CSS, ensureStyles } from './styles.js';

/** Anchored under the field, or centred over the page. */
export type FieldMode = 'popup' | 'dialog';

/** Everything that can change after the field exists. */
export interface DateFieldSettings {
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
  const win = doc.defaultView!;
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

  /** Everything that exists only while the panel is open. */
  let opened: {
    panel: HTMLElement;
    backdrop: HTMLElement | null;
    calendar: CalendarInstance;
    listening: AbortController;
    overflow: string;
  } | null = null;

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
    trigger.setAttribute('aria-expanded', String(opened !== null));
    trigger.setAttribute('aria-label', label());
    trigger.disabled = s.disabled;
    if (s.disabled) close({ restoreFocus: false });
  }

  /**
   * Under the field, or above it when there is no room below — a panel that
   * opens off the bottom of the screen is a panel nobody can use. Kept inside
   * the viewport sideways too.
   */
  function place(panel: HTMLElement): void {
    if (s.mode === 'dialog') return; // centred by the stylesheet
    const gap = 4;
    const edge = 8;
    const field = trigger.getBoundingClientRect();
    const height = panel.offsetHeight;
    const below = win.innerHeight - field.bottom;
    const flip = below < height + gap && field.top > below;
    const top = flip ? field.top - height - gap : field.bottom + gap;
    const left = Math.max(edge, Math.min(field.left, win.innerWidth - panel.offsetWidth - edge));
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
  }

  /** Tab stays inside a panel that is open; leaving it would strand the keyboard. */
  function trapTab(panel: HTMLElement, event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const stops = Array.from(
      panel.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"])'),
    );
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function open(): void {
    if (opened || s.disabled) return;
    const dialog = s.mode === 'dialog';
    const target = container ?? doc.body;

    const panel = doc.createElement('div');
    panel.className = dialog ? 'tz-field__panel tz-field__panel--dialog' : 'tz-field__panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', label());
    if (dialog) panel.setAttribute('aria-modal', 'true');

    // The panel is not inside the field, so it cannot inherit the theme the
    // field sits in. Carry it across, or a dark card on a light page opens a
    // light calendar.
    const themed = host.closest<HTMLElement>('[data-theme]');
    if (themed) panel.dataset['theme'] = themed.dataset['theme'];

    const calendarHost = doc.createElement('div');
    panel.append(calendarHost);

    let backdrop: HTMLElement | null = null;
    if (dialog) {
      backdrop = doc.createElement('div');
      backdrop.className = 'tz-field__backdrop';
      target.append(backdrop);
    }
    target.append(panel);
    ensureStyles(panel, 'calendar', CALENDAR_CSS);
    ensureStyles(panel, 'field', FIELD_CSS);

    const calendar = createCalendar(calendarHost, {
      value: s.value,
      locale: s.locale,
      firstDayOfWeek: s.firstDayOfWeek,
      min: s.min,
      max: s.max,
      isDateDisabled: s.isDateDisabled,
      today: s.today,
      messages: s.messages,
      injectStyles: false,
      onChange: pick,
    });

    const listening = new AbortController();
    const on = { signal: listening.signal };

    doc.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') close({ restoreFocus: true });
      },
      on,
    );
    panel.addEventListener('keydown', (event) => trapTab(panel, event), on);
    // A popup closes on a click anywhere else; the focus stays where that
    // click put it. A dialog closes on its backdrop.
    doc.addEventListener(
      'pointerdown',
      (event) => {
        const where = event.target as Node;
        if (!dialog && !panel.contains(where) && !trigger.contains(where)) {
          close({ restoreFocus: false });
        }
      },
      on,
    );
    backdrop?.addEventListener('click', () => close({ restoreFocus: true }), on);
    if (!dialog) {
      const follow = () => place(panel);
      win.addEventListener('resize', follow, on);
      // Capture, so scrolling any ancestor — not only the window — moves it.
      win.addEventListener('scroll', follow, { ...on, capture: true, passive: true });
    }

    // A dialog holds the page still behind it; a popup follows it instead.
    const overflow = doc.documentElement.style.overflow;
    if (dialog) doc.documentElement.style.overflow = 'hidden';

    opened = { panel, backdrop, calendar, listening, overflow };
    place(panel);
    render();

    // Into the panel, on the day that matters: the selection, else today.
    calendarHost.querySelector<HTMLElement>('.tz-cal__day[tabindex="0"]')?.focus();
    s.onOpen?.();
  }

  function close({ restoreFocus }: { restoreFocus: boolean } = { restoreFocus: true }): void {
    if (!opened) return;
    const { panel, backdrop, calendar, listening, overflow } = opened;
    opened = null;
    listening.abort();
    calendar.destroy();
    panel.remove();
    backdrop?.remove();
    doc.documentElement.style.overflow = overflow;
    render();
    // Back to the field, or the keyboard user lands at the top of the document.
    if (restoreFocus) trigger.focus();
    s.onClose?.();
  }

  function pick(date: PlainDate | null): void {
    s.value = date;
    close({ restoreFocus: true });
    s.onChange?.(date);
  }

  const listening = new AbortController();
  trigger.addEventListener('click', () => (opened ? close() : open()), { signal: listening.signal });

  render();

  return {
    get value() {
      return s.value;
    },
    get isOpen() {
      return opened !== null;
    },
    update(settings) {
      Object.assign(s, settings);
      opened?.calendar.update({
        value: s.value,
        locale: s.locale,
        firstDayOfWeek: s.firstDayOfWeek,
        min: s.min,
        max: s.max,
        isDateDisabled: s.isDateDisabled,
        today: s.today,
        messages: s.messages,
      });
      render();
    },
    open,
    close: () => close(),
    toggle: () => (opened ? close() : open()),
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
      close({ restoreFocus: false });
      listening.abort();
      trigger.remove();
      if (addedHostClass) host.classList.remove('tz-field');
    },
  };
}
