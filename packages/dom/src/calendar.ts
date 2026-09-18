import {
  Temporal,
  getMonthGrid,
  getWeekdayOrder,
  getDecadeYears,
  isOutsideDecade,
} from '../../core/src/index.js';
import type { PlainDate, Weekday } from '../../core/src/index.js';
import { EN, type TzslotMessages } from './messages.js';
import { CALENDAR_CSS, ensureStyles } from './styles.js';

/** Days, months or years — what the grid is currently choosing between. */
export type CalendarView = 'days' | 'months' | 'years';

/** Where a month is on screen, independently of what is selected. */
export interface YearMonth {
  readonly year: number;
  readonly month: number;
}

/** Everything that can change after the calendar exists. */
export interface CalendarSettings {
  /** The selected day. */
  value: PlainDate | null;
  /** Which level the grid is choosing between. */
  view: CalendarView;
  /**
   * How far down the view may go. 'months' turns this into a month picker,
   * 'years' into a year picker, with no further code.
   */
  minView: CalendarView;
  /** Monday by default, as ISO-8601 numbers the week. */
  firstDayOfWeek: Weekday;
  /** A BCP-47 tag for the month and weekday names. Defaults to the browser's. */
  locale: string | undefined;
  min: PlainDate | null;
  max: PlainDate | null;
  disabled: boolean;
  /**
   * Rules out individual days inside the range: closures, weekends, days that
   * are already full. Bounds cut the ends off; this takes holes out of the
   * middle, which bounds cannot express.
   */
  isDateDisabled: ((date: PlainDate) => boolean) | undefined;
  /** Today, settable so a test does not depend on the day it runs. */
  today: PlainDate;
  messages: TzslotMessages;
  /** A day was chosen, or the selection cleared — by the user or by `clear()`. */
  onChange: ((value: PlainDate | null) => void) | undefined;
  onViewChange: ((view: CalendarView) => void) | undefined;
}

/** Replaces the chevrons. A string is used as text, never as HTML. */
export interface CalendarIcons {
  prev?: Node | string | undefined;
  next?: Node | string | undefined;
}

export interface CalendarOptions extends Partial<CalendarSettings> {
  icons?: CalendarIcons;
  /** False under a CSP that forbids inline styles; include CALENDAR_CSS yourself. */
  injectStyles?: boolean;
}

export interface CalendarInstance {
  readonly value: PlainDate | null;
  readonly view: CalendarView;
  /**
   * Changes settings and redraws. Never calls onChange: it is how the outside
   * tells the calendar something, not something the user did.
   */
  update(settings: Partial<CalendarSettings>): void;
  /**
   * Moves the grid without selecting anything. Showing a month is not the same
   * as choosing a day in it.
   */
  goTo(target: YearMonth): void;
  /** Swaps the arrow icons. An icon left out keeps what it had. */
  setIcons(icons: CalendarIcons): void;
  /** Empties the selection, and reports it through onChange. */
  clear(): void;
  /** Removes everything it drew and every listener it added. */
  destroy(): void;
}

const ORDER: readonly CalendarView[] = ['days', 'months', 'years'];

/**
 * A month grid: pick a day. Plain DOM, so it works in any framework or none.
 *
 *   const cal = createCalendar(element, { onChange: (day) => … });
 *
 * It knows nothing about time zones, and that is deliberate. Which day it is
 * does not depend on whether the clocks changed that morning — only what time
 * it is does.
 *
 * Month and weekday names come from `Intl`, which every browser already has,
 * rather than from locale files that go stale.
 *
 * The cells are created once and repainted in place. Nothing is rebuilt on a
 * click, so the element under the keyboard focus is never thrown away.
 */
export function createCalendar(host: HTMLElement, options: CalendarOptions = {}): CalendarInstance {
  const doc = host.ownerDocument;
  const { icons, injectStyles = true, ...initial } = options;

  const s: CalendarSettings = {
    value: null,
    view: 'days',
    minView: 'days',
    firstDayOfWeek: 1,
    locale: undefined,
    min: null,
    max: null,
    disabled: false,
    isDateDisabled: undefined,
    today: Temporal.Now.plainDateISO(),
    messages: EN,
    onChange: undefined,
    onViewChange: undefined,
    ...initial,
  };

  /** The month on screen when the user has moved it; otherwise it follows the value. */
  let cursor: YearMonth | null = null;
  /** The day the keyboard is on. Drives the roving tabindex. */
  let focusedIso: string | null = null;
  let mounted: 'days' | 'coarse' | null = null;

  // Waits until the host is in a document: an element not yet attached cannot
  // say whether it will end up inside a shadow root.
  let stylesPending = injectStyles;

  // ── build, once ─────────────────────────────────────────────

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
    const node = doc.createElement(tag);
    node.className = className;
    return node;
  };
  const button = (className: string) => {
    const b = el('button', className);
    b.type = 'button';
    return b;
  };

  const addedHostClass = !host.classList.contains('tz-cal');
  host.classList.add('tz-cal');

  const header = el('div', 'tz-cal__header');
  const prev = button('tz-cal__nav');
  const title = button('tz-cal__title');
  const next = button('tz-cal__nav');
  title.setAttribute('aria-live', 'polite');
  prev.append(icons?.prev ?? '‹');
  next.append(icons?.next ?? '›');
  header.append(prev, title, next);

  const grid = el('div', 'tz-cal__grid');
  grid.setAttribute('role', 'grid');

  const weekdays = el('div', 'tz-cal__weekdays');
  weekdays.setAttribute('role', 'row');
  const weekdayCells = Array.from({ length: 7 }, () => {
    const cell = el('span', 'tz-cal__weekday');
    cell.setAttribute('role', 'columnheader');
    return cell;
  });
  weekdays.append(...weekdayCells);

  const dayCells: HTMLButtonElement[] = [];
  const weekRows = Array.from({ length: 6 }, () => {
    const row = el('div', 'tz-cal__week');
    row.setAttribute('role', 'row');
    for (let i = 0; i < 7; i++) {
      const cell = button('tz-cal__day');
      cell.setAttribute('role', 'gridcell');
      dayCells.push(cell);
      row.append(cell);
    }
    return row;
  });

  const coarse = el('div', 'tz-cal__coarse');
  const coarseCells = Array.from({ length: 12 }, () => {
    const cell = button('tz-cal__coarse-cell');
    cell.setAttribute('role', 'gridcell');
    return cell;
  });
  coarse.append(...coarseCells);

  host.append(header, grid);

  // ── what is on screen ───────────────────────────────────────

  const shown = (): YearMonth => {
    if (cursor) return cursor;
    const anchor = s.value ?? s.today;
    return { year: anchor.year, month: anchor.month };
  };

  const ruledOut = (date: PlainDate) =>
    (s.min !== null && Temporal.PlainDate.compare(date, s.min) < 0) ||
    (s.max !== null && Temporal.PlainDate.compare(date, s.max) > 0) ||
    (s.isDateDisabled?.(date) ?? false);

  const formatter = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(s.locale, { ...options, timeZone: 'UTC' });

  const titleText = ({ year, month }: YearMonth): string => {
    switch (s.view) {
      case 'days':
        return formatter({ month: 'long', year: 'numeric' }).format(
          new Date(Date.UTC(year, month - 1, 1)),
        );
      case 'months':
        return String(year);
      case 'years': {
        const years = getDecadeYears(year);
        return `${years[1]} – ${years[10]}`;
      }
    }
  };

  /**
   * The one cell Tab lands on. Without a fallback, a calendar nobody has
   * clicked yet would have no tabbable cell at all and the keyboard could not
   * enter it.
   */
  const tabbableIso = (dates: PlainDate[], { year, month }: YearMonth): string | null => {
    const inMonth = dates.filter((d) => d.year === year && d.month === month && !ruledOut(d));
    const candidates = [focusedIso, s.value?.toString(), s.today.toString()];
    for (const iso of candidates) {
      if (iso && dates.some((d) => d.toString() === iso)) return iso;
    }
    return inMonth[0]?.toString() ?? null;
  };

  const flag = (node: Element, name: string, on: boolean) => node.classList.toggle(name, on);

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'calendar', CALENDAR_CSS);
      stylesPending = false;
    }
    const at = shown();
    const off = s.disabled;
    const text = titleText(at);

    prev.disabled = off;
    next.disabled = off;
    prev.setAttribute('aria-label', s.messages.previousMonth);
    next.setAttribute('aria-label', s.messages.nextMonth);

    title.textContent = text;
    title.disabled = s.view === 'years' || off;
    flag(title, 'tz-cal__title--static', s.view === 'years');
    title.setAttribute('aria-label', s.view === 'days' ? s.messages.chooseMonth : s.messages.chooseYear);
    grid.setAttribute('aria-label', text);

    // Swapped only when the view changes: detaching a node takes the focus with it.
    const want = s.view === 'days' ? 'days' : 'coarse';
    if (mounted !== want) {
      grid.replaceChildren(...(want === 'days' ? [weekdays, ...weekRows] : [coarse]));
      mounted = want;
    }

    if (want === 'days') paintDays(at, off);
    else paintCoarse(at, off);
  }

  function paintDays(at: YearMonth, off: boolean): void {
    const short = formatter({ weekday: 'short' });
    const long = formatter({ weekday: 'long' });
    getWeekdayOrder(s.firstDayOfWeek).forEach((weekday, i) => {
      // 4 January 1970 was a Sunday, so ISO weekday n falls on 4 + n.
      const reference = new Date(Date.UTC(1970, 0, 4 + weekday));
      const cell = weekdayCells[i]!;
      cell.textContent = short.format(reference);
      cell.setAttribute('aria-label', long.format(reference));
    });

    const dates = getMonthGrid(at.year, at.month, s.firstDayOfWeek).flat();
    const tabbable = tabbableIso(dates, at);

    dates.forEach((date, i) => {
      const cell = dayCells[i]!;
      const iso = date.toString();
      const today = date.equals(s.today);
      const selected = s.value !== null && date.equals(s.value);

      cell.textContent = String(date.day);
      cell.dataset['date'] = iso;
      flag(cell, 'tz-cal__day--outside', date.month !== at.month || date.year !== at.year);
      flag(cell, 'tz-cal__day--today', today);
      flag(cell, 'tz-cal__day--selected', selected);
      cell.setAttribute('aria-selected', String(selected));
      if (today) cell.setAttribute('aria-current', 'date');
      else cell.removeAttribute('aria-current');
      cell.tabIndex = iso === tabbable ? 0 : -1;
      cell.disabled = off || ruledOut(date);
    });
  }

  function paintCoarse({ year }: YearMonth, off: boolean): void {
    const months = s.view === 'months';
    const format = formatter({ month: 'short' });
    const values = months ? Array.from({ length: 12 }, (_, i) => i + 1) : getDecadeYears(year);

    values.forEach((value, i) => {
      const cell = coarseCells[i]!;
      const current = months
        ? s.today.year === year && s.today.month === value
        : s.today.year === value;
      const selected =
        s.value !== null &&
        (months ? s.value.year === year && s.value.month === value : s.value.year === value);

      cell.textContent = months ? format.format(new Date(Date.UTC(year, value - 1, 1))) : String(value);
      cell.dataset['value'] = String(value);
      flag(cell, 'tz-cal__coarse-cell--outside', !months && isOutsideDecade(value, year));
      flag(cell, 'tz-cal__coarse-cell--today', current);
      flag(cell, 'tz-cal__coarse-cell--selected', selected);
      cell.setAttribute('aria-selected', String(selected));
      cell.disabled = off;
    });
  }

  // ── what the user does ──────────────────────────────────────

  function choose(date: PlainDate | null): void {
    s.value = date;
    render();
    s.onChange?.(date);
  }

  function setView(view: CalendarView): void {
    s.view = view;
    render();
    s.onViewChange?.(view);
  }

  function select(date: PlainDate): void {
    if (s.disabled || ruledOut(date)) return;
    // Clicking a trailing day of the next month follows it there, or the
    // selection lands on a date the grid no longer highlights.
    const at = shown();
    if (date.month !== at.month || date.year !== at.year) {
      cursor = { year: date.year, month: date.month };
    }
    choose(date);
  }

  /**
   * The arrows move by whatever the grid is showing: a month, a year, or a
   * decade. An arrow that always moved a month would be useless in a decade
   * view, which is the state these buttons exist to escape.
   */
  function shift(delta: number): void {
    const { year, month } = shown();
    const step =
      s.view === 'days' ? { months: delta } : s.view === 'months' ? { years: delta } : { years: delta * 10 };
    const moved = Temporal.PlainDate.from({ year, month, day: 1 }).add(step);
    cursor = { year: moved.year, month: moved.month };
    render();
  }

  function zoomOut(): void {
    if (s.disabled) return;
    const up = ORDER[ORDER.indexOf(s.view) + 1];
    if (up) setView(up);
  }

  /**
   * Going down from months or years. At minView the choice is the answer, so
   * a month picker selects the first of the month rather than descending into
   * days it is not meant to show.
   */
  function zoomIn(value: number): void {
    if (s.disabled) return;
    const { year, month } = shown();
    const target = s.view === 'months' ? { year, month: value } : { year: value, month };
    cursor = target;

    const below = ORDER[ORDER.indexOf(s.view) - 1]!;
    if (ORDER.indexOf(below) < ORDER.indexOf(s.minView)) {
      choose(Temporal.PlainDate.from({ ...target, day: 1 }));
      return;
    }
    setView(below);
  }

  /**
   * Arrow keys move a day, PageUp/PageDown a month, Home/End to the ends of the
   * week — the pattern the ARIA grid guidance describes.
   */
  function onKeydown(event: KeyboardEvent): void {
    if (s.view !== 'days' || s.disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      if (!focusedIso) return;
      event.preventDefault();
      select(Temporal.PlainDate.from(focusedIso));
      return;
    }

    const from = focusedIso ? Temporal.PlainDate.from(focusedIso) : (s.value ?? s.today);
    const intoWeek = (from.dayOfWeek - s.firstDayOfWeek + 7) % 7;
    const moves: Record<string, () => PlainDate> = {
      ArrowLeft: () => from.subtract({ days: 1 }),
      ArrowRight: () => from.add({ days: 1 }),
      ArrowUp: () => from.subtract({ weeks: 1 }),
      ArrowDown: () => from.add({ weeks: 1 }),
      PageUp: () => from.subtract({ months: 1 }),
      PageDown: () => from.add({ months: 1 }),
      Home: () => from.subtract({ days: intoWeek }),
      End: () => from.add({ days: 6 - intoWeek }),
    };
    const move = moves[event.key];
    if (!move) return;

    event.preventDefault();
    const target = move();
    const hadFocus = grid.contains(doc.activeElement);
    focusedIso = target.toString();
    cursor = { year: target.year, month: target.month };
    render();
    // The tabindex alone only says where Tab would land; the focus itself has
    // to follow, or the keyboard user is left on the day they walked away from.
    if (hadFocus) dayCells.find((c) => c.dataset['date'] === focusedIso)?.focus();
  }

  const listening = new AbortController();
  const on = { signal: listening.signal };

  prev.addEventListener('click', () => shift(-1), on);
  next.addEventListener('click', () => shift(1), on);
  title.addEventListener('click', zoomOut, on);
  grid.addEventListener('keydown', onKeydown, on);
  grid.addEventListener(
    'click',
    (event) => {
      const cell = (event.target as Element).closest('button');
      if (!cell || cell.disabled) return;
      const { date, value } = cell.dataset;
      if (date) select(Temporal.PlainDate.from(date));
      else if (value) zoomIn(Number(value));
    },
    on,
  );
  grid.addEventListener(
    'focusin',
    (event) => {
      const iso = (event.target as HTMLElement).dataset?.['date'];
      if (iso && iso !== focusedIso) {
        focusedIso = iso;
        render();
      }
    },
    on,
  );

  render();

  return {
    get value() {
      return s.value;
    },
    get view() {
      return s.view;
    },
    update(settings) {
      Object.assign(s, settings);
      render();
    },
    setIcons(icons) {
      if (icons.prev !== undefined) prev.replaceChildren(icons.prev);
      if (icons.next !== undefined) next.replaceChildren(icons.next);
    },
    goTo({ year, month }) {
      cursor = { year, month };
      render();
    },
    clear() {
      choose(null);
    },
    destroy() {
      listening.abort();
      header.remove();
      grid.remove();
      if (addedHostClass) host.classList.remove('tz-cal');
    },
  };
}
