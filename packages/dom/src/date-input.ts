import { Temporal } from '@tzslot/core';
import type { PlainDate, PlainTime } from '@tzslot/core';
import { icon as drawIcon } from './icons.js';
import { createTimeInput, type TimeInputInstance } from './time-input.js';
import { createTimeSelect, type TimeSelectInstance } from './time-select.js';
import { formatWith, maskWith, parseWith, patternFor } from './format.js';
import { EN, type TzslotMessages } from './messages.js';
import { DATEINPUT_CSS, ensureStyles } from './styles.js';

/** A day and, when asked for, a time — the two halves a clock face can say. */
export interface WallValue {
  readonly date: PlainDate | null;
  readonly time: PlainTime | null;
  /**
   * Which reading of a repeated hour, when the control could say. The menus
   * name both in the list itself — "02 — winter" — and that choice would be
   * lost if only the clock face came back.
   */
  readonly offset?: string | null;
}

export interface DateInputSettings {
  value: WallValue;
  /**
   * Whether a time is part of it. The day is typed; the hour gets the compact
   * field with arrows beside it, which is how every other widget here asks
   * for one — and an hour is stepped far more often than it is typed.
   */
  withTime: boolean;
  /**
   * How the hour is asked for: `'input'` for figures with an arrow above and
   * below, `'select'` for an hour menu and a minute menu. A menu is the
   * shorter road when the answer is one of a few dozen; the arrows suit
   * nudging a time already close to right.
   */
  timeLayout: 'input' | 'select';
  /**
   * How the menus tell the two readings of a repeated hour apart: by name, or
   * by a star with the naming left to whoever draws the field.
   */
  readingStyle: 'named' | 'marked';
  /** What the hour's arrows move by. */
  stepMinutes: number;
  /** Minutes between the options of a menu. */
  minuteStep: number;
  /** The day the hour belongs to, so its arrows can step over a missing one. */
  date: PlainDate | null;
  timeZone: string | undefined;
  /** A pattern of your own. The locale's numeric form otherwise. */
  format: string | undefined;
  locale: string | undefined;
  /** Separators appear as figures are typed, never while deleting. */
  mask: boolean;
  /**
   * What goes above the field: a word, an icon, or nothing at all. A node is
   * taken as it is, so an application can put its own mark there.
   */
  label: Node | string | null | undefined;
  /** Read out for the field itself, when the label is a picture or absent. */
  ariaLabel: string | undefined;
  placeholder: string | undefined;
  disabled: boolean;
  /** A cross that empties it, for a period allowed to stop at one end. */
  clearable: boolean;
  /**
   * A mark inside the field — the calendar every date field carries. `null`
   * draws none; a node of your own replaces it, so an application already
   * using an icon set keeps its own drawing.
   */
  icon: Node | string | null | undefined;
  /** Which end of the field it sits at. */
  iconSide: 'start' | 'end';
  messages: TzslotMessages;
  /** Every settled reading of the text. Null when it has been emptied. */
  onChange: ((value: WallValue) => void) | undefined;
  /** The field was reached — the panel around it uses this to arm it. */
  onFocus: (() => void) | undefined;
}

export interface DateInputOptions extends Partial<DateInputSettings> {
  injectStyles?: boolean;
}

export interface DateInputInstance {
  readonly value: WallValue;
  /** The element it was built in, for a caller that marks it armed. */
  readonly host: HTMLElement;
  /** Where the readings of a repeated hour, or anything else, can be hung. */
  readonly extra: HTMLElement;
  update(settings: Partial<DateInputSettings>): void;
  focus(): void;
  destroy(): void;
}

const EMPTY: WallValue = { date: null, time: null };

/**
 * A date, typed or written into, with no panel of its own.
 *
 * The fields carry a panel around with them everywhere else in this library,
 * which is right when one of them is the whole control. Inside a panel it is
 * not: a calendar is already open, and what is wanted there is somewhere to
 * type — so that a period ending eighteen months out is a line of text rather
 * than eighteen presses of an arrow.
 */
export function createDateInput(host: HTMLElement, options: DateInputOptions = {}): DateInputInstance {
  const doc = host.ownerDocument;
  const { injectStyles = true, ...initial } = options;

  const s: DateInputSettings = {
    value: EMPTY,
    withTime: false,
    timeLayout: 'input',
    readingStyle: 'named',
    stepMinutes: 30,
    minuteStep: 1,
    date: null,
    timeZone: undefined,
    format: undefined,
    locale: undefined,
    mask: true,
    label: undefined,
    ariaLabel: undefined,
    placeholder: undefined,
    disabled: false,
    clearable: false,
    icon: undefined,
    iconSide: 'start',
    messages: EN,
    onChange: undefined,
    onFocus: undefined,
    ...initial,
  };

  let stylesPending = injectStyles;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
    const node = doc.createElement(tag);
    node.className = className;
    return node;
  };

  const addedHostClass = !host.classList.contains('tz-dateinput');
  host.classList.add('tz-dateinput');

  const caption = el('span', 'tz-dateinput__label');
  const row = el('div', 'tz-dateinput__row');
  const input = doc.createElement('input');
  input.type = 'text';
  input.className = 'tz-dateinput__input';
  input.autocomplete = 'off';
  const mark = el('span', 'tz-dateinput__icon');
  const timeHost = el('div', 'tz-dateinput__time');
  const clear = doc.createElement('button');
  clear.type = 'button';
  clear.className = 'tz-dateinput__clear';
  clear.textContent = '×';
  const extra = el('div', 'tz-dateinput__extra');
  row.append(mark, input, timeHost, clear);
  let time: TimeInputInstance | TimeSelectInstance | null = null;
  /** Which shape is mounted, so a change of layout rebuilds it. */
  let mounted: 'input' | 'select' | null = null;
  host.append(caption, row, extra);

  const pattern = () => s.format ?? patternFor(s.locale);
  const written = () => (s.value.date ? formatWith(pattern(), { date: s.value.date }, s.locale) : '');
  const beingTyped = () => doc.activeElement === input;

  function settle(value: WallValue): void {
    const same =
      (value.date?.toString() ?? null) === (s.value.date?.toString() ?? null) &&
      (value.time?.toString() ?? null) === (s.value.time?.toString() ?? null) &&
      // The two readings of a repeated hour share a clock face: without this,
      // moving from winter back to summer looked like no change at all.
      (value.offset ?? null) === (s.value.offset ?? null);
    s.value = value;
    if (!same) s.onChange?.(value);
  }

  /**
   * What the text says, if it says anything whole.
   *
   * Reported as it is typed, so the calendar beside it can follow along — but
   * a half-typed year is not a date, and nothing is reported until the text
   * parses. `commit` is the stricter pass, when the field is left or Enter is
   * pressed: there, text that cannot be read is marked rather than ignored.
   */
  function read(commit: boolean): boolean {
    const text = input.value.trim();
    if (text === '') {
      input.classList.remove('tz-dateinput__input--invalid');
      settle(EMPTY);
      return true;
    }
    const parsed = parseWith(pattern(), text);
    if (!parsed || (!parsed.date && !parsed.time)) {
      if (commit) {
        input.classList.add('tz-dateinput__input--invalid');
        input.setAttribute('aria-invalid', 'true');
      }
      return false;
    }
    input.classList.remove('tz-dateinput__input--invalid');
    input.removeAttribute('aria-invalid');
    settle({
      offset: null,
      date: parsed.date,
      // A day typed where an hour is expected starts at midnight, and an hour
      // already chosen is not thrown away by retyping the day under it.
      time: s.withTime ? (parsed.time ?? s.value.time ?? Temporal.PlainTime.from('00:00')) : null,
    });
    return true;
  }

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'dateinput', DATEINPUT_CSS);
      stylesPending = false;
    }
    if (s.label === null || s.label === undefined) caption.replaceChildren();
    else if (typeof s.label === 'string') caption.textContent = s.label;
    else if (caption.firstChild !== s.label) caption.replaceChildren(s.label);
    caption.hidden = caption.childNodes.length === 0;
    // Never rewritten under the fingers: the text belongs to whoever is typing.
    if (!beingTyped()) input.value = written();
    input.placeholder = s.placeholder ?? '';
    // Read-only rather than disabled: a locked end is still something to read,
    // and a disabled input is skipped by the keyboard and unreadable by a
    // screen reader that is walking the form.
    input.readOnly = s.disabled;
    input.setAttribute('aria-readonly', String(s.disabled));
    // A picture above the field says nothing to a screen reader.
    input.setAttribute('aria-label', s.ariaLabel ?? (typeof s.label === 'string' ? s.label : ''));
    // The mark is decoration: a click on it lands in the field, which is what
    // a hand aiming at a field and hitting its icon meant to do.
    const wanted = s.icon === undefined ? drawIcon('calendar', doc) : s.icon;
    if (wanted === null) {
      mark.replaceChildren();
    } else if (typeof wanted === 'string') {
      mark.textContent = wanted;
    } else if (mark.firstChild !== wanted && !(mark.firstChild instanceof SVGElement && s.icon === undefined)) {
      mark.replaceChildren(wanted);
    }
    mark.hidden = mark.childNodes.length === 0;
    row.classList.toggle('tz-dateinput__row--icon-end', s.iconSide === 'end');
    timeHost.hidden = !s.withTime;
    if (s.withTime && mounted !== s.timeLayout) {
      time?.destroy();
      timeHost.replaceChildren();
      time =
        s.timeLayout === 'select'
          ? createTimeSelect(timeHost, {
              injectStyles: false,
              onChange: (picked, offset) => settle({ date: s.value.date, time: picked, offset }),
            })
          : createTimeInput(timeHost, {
              injectStyles: false,
              variant: 'bare',
              onChange: (picked) => settle({ date: s.value.date, time: picked }),
            });
      mounted = s.timeLayout;
    }
    time?.update({
      value: s.withTime ? s.value.time : null,
      offset: s.withTime ? (s.value.offset ?? null) : null,
      readingStyle: s.readingStyle,
      stepMinutes: s.stepMinutes,
      minuteStep: s.minuteStep,
      locale: s.locale,
      messages: s.messages,
      disabled: s.disabled || s.value.date === null,
      date: s.date ?? s.value.date,
      timeZone: s.timeZone,
    });
    clear.hidden = !s.clearable;
    clear.disabled = s.disabled || (s.value.date === null && s.value.time === null);
    clear.setAttribute('aria-label', s.messages.clearField);
    clear.title = s.messages.clearField;
  }

  const listening = new AbortController();
  const on = { signal: listening.signal };

  input.addEventListener('focus', () => s.onFocus?.(), on);
  input.addEventListener(
    'input',
    (event) => {
      const shape = pattern();
      const deleting = (event as InputEvent).inputType?.startsWith('delete') ?? false;
      const atEnd = input.selectionStart === input.value.length;
      if (s.mask && shape && !deleting && atEnd) {
        const helped = maskWith(shape, input.value);
        if (helped !== input.value) {
          input.value = helped;
          input.setSelectionRange(helped.length, helped.length);
        }
      }
      read(false);
    },
    on,
  );
  input.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      if (read(true)) input.value = written();
    },
    on,
  );
  input.addEventListener(
    'blur',
    () => {
      if (read(true)) input.value = written();
    },
    on,
  );
  clear.addEventListener(
    'click',
    () => {
      input.value = '';
      settle(EMPTY);
      render();
      input.focus();
    },
    on,
  );

  render();

  return {
    get value() {
      return s.value;
    },
    extra,
    host,
    update(settings) {
      Object.assign(s, settings);
      render();
    },
    focus() {
      input.focus();
      input.select();
    },
    destroy() {
      listening.abort();
      time?.destroy();
      caption.remove();
      row.remove();
      mark.remove();
      extra.remove();
      if (addedHostClass) host.classList.remove('tz-dateinput');
    },
  };
}
