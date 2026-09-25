import {
  Temporal,
  getMonthGrid,
  getWeekdayOrder,
  firstDayFor,
  getDecadeYears,
  isOutsideDecade,
} from '@tzslot/core';
import type { PlainDate, Weekday } from '@tzslot/core';
import type { YearMonth } from './calendar.js';
import { EN, type TzslotMessages } from './messages.js';
import { RANGE_CSS, ensureStyles } from './styles.js';
import { paintCell, type RenderCell } from './cells.js';

/** Either end may be unset while a range is being chosen. */
export interface DateRangeValue {
  readonly start: PlainDate | null;
  readonly end: PlainDate | null;
}

export interface DateRangeSettings {
  /** The two ends. Either may be unset while a range is being chosen. */
  value: DateRangeValue;
  /**
   * Where the week starts, 1 for Monday through 7 for Sunday.
   *
   * Left out, the locale decides — Monday in France, Sunday in the United
   * States. Set it only where a business disagrees with its own locale.
   */
  firstDayOfWeek: Weekday | undefined;
  locale: string | undefined;
  min: PlainDate | null;
  max: PlainDate | null;
  disabled: boolean;
  isDateDisabled: ((date: PlainDate) => boolean) | undefined;
  today: PlainDate;
  /**
   * Refuse a range that steps over a day ruled out by isDateDisabled.
   *
   * On by default, because the usual reason a day is unavailable is that the
   * thing being booked is not available then — and a booking that spans a
   * closure cannot be honoured. Turn it off for ranges that merely bracket a
   * period, like a report's dates.
   */
  blockAcrossDisabled: boolean;
  /** Overrides messages.rangeCrossesUnavailable for this one instance. */
  rangeSpansBlockedMessage: string | undefined;
  messages: TzslotMessages;
  /** Adds to each day: a price per night, places left, a class of your own. */
  renderCell: RenderCell | undefined;
  /** A column of ISO week numbers down the left. */
  weekNumbers: boolean;
  /**
   * How many months to show side by side. Two is what a range wants: most of
   * them cross a month boundary, and one month means navigating mid-choice.
   */
  months: number;
  onChange: ((value: DateRangeValue) => void) | undefined;
}

export interface DateRangeOptions extends Partial<DateRangeSettings> {
  icons?: { prev?: Node | string | undefined; next?: Node | string | undefined };
  injectStyles?: boolean;
}

export interface DateRangeInstance {
  readonly value: DateRangeValue;
  update(settings: Partial<DateRangeSettings>): void;
  goTo(target: YearMonth): void;
  setIcons(icons: { prev?: Node | string | undefined; next?: Node | string | undefined }): void;
  clear(): void;
  destroy(): void;
}

const EMPTY: DateRangeValue = { start: null, end: null };
const before = (a: PlainDate, b: PlainDate) => Temporal.PlainDate.compare(a, b) < 0;

/**
 * Two dates and everything between them.
 *
 * Separate from the calendar rather than a mode of it, because the value is a
 * different shape, and a widget whose value type changes with a flag cannot
 * go in a typed form. The grid comes from the same core function, so the two
 * cannot disagree about what a month looks like.
 */
export function createDateRange(host: HTMLElement, options: DateRangeOptions = {}): DateRangeInstance {
  const doc = host.ownerDocument;
  const { icons, injectStyles = true, ...initial } = options;

  const s: DateRangeSettings = {
    value: EMPTY,
    firstDayOfWeek: undefined,
    locale: undefined,
    min: null,
    max: null,
    disabled: false,
    isDateDisabled: undefined,
    today: Temporal.Now.plainDateISO(),
    blockAcrossDisabled: true,
    rangeSpansBlockedMessage: undefined,
    messages: EN,
    renderCell: undefined,
    weekNumbers: false,
    months: 1,
    onChange: undefined,
    ...initial,
  };

  /** The week's first day: what the screen asked for, or what the locale says. */
  const firstDay = (): Weekday => s.firstDayOfWeek ?? firstDayFor(s.locale);

  /** Days renderCell ruled out on the last paint. */
  let renderedOut = new Set<string>();

  let cursor: YearMonth | null = null;
  /** The day under the pointer, previewing where the range would end. */
  let hovered: PlainDate | null = null;
  /**
   * The day the keyboard is on.
   *
   * This calendar had no keyboard at all: forty-two tab stops a month — 
   * eighty-four in the period field's two — no arrow keys, and a preview of
   * the run about to be chosen that only a mouse could see. Its sibling,
   * createCalendar, has had all of it from the start.
   */
  let focusedIso: string | null = null;
  let error: string | null = null;
  let stylesPending = injectStyles;

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

  const addedHostClass = !host.classList.contains('tz-range');
  host.classList.add('tz-range');

  const header = el('div', 'tz-range__header');
  const prev = button('tz-range__nav');
  /**
   * The month, as a way in rather than a caption.
   *
   * It was a span, so the only way out of September was the arrows, one month
   * at a time — the single calendar has had months and years behind its title
   * since the start and this one never received them.
   */
  const title = button('tz-range__title');
  const next = button('tz-range__nav');
  title.setAttribute('aria-live', 'polite');
  prev.append(icons?.prev ?? '‹');
  next.append(icons?.next ?? '›');
  header.append(prev, title, next);

  /**
   * What the title opens: twelve months, then twelve years.
   *
   * One picker for the whole calendar, whatever it is showing. With two months
   * on screen the choice sets the first and the second follows — they are one
   * run of months, not two calendars side by side.
   */
  type RangeView = 'days' | 'months' | 'years';
  let view: RangeView = 'days';
  const coarse = el('div', 'tz-range__coarse');
  coarse.setAttribute('role', 'grid');
  const coarseCells = Array.from({ length: 12 }, () => {
    const cell = button('tz-range__coarse-cell');
    cell.setAttribute('role', 'gridcell');
    return cell;
  });
  for (let r = 0; r < 3; r += 1) {
    const row = el('div', 'tz-range__coarse-row');
    row.setAttribute('role', 'row');
    row.append(...coarseCells.slice(r * 4, r * 4 + 4));
    coarse.append(row);
  }

  const grid = el('div', 'tz-range__grid');
  grid.setAttribute('role', 'grid');
  /** Everything one month needs, kept so a repaint never rebuilds it. */
  interface MonthBlock {
    readonly block: HTMLElement;
    readonly title: HTMLElement;
    readonly weekdays: HTMLElement;
    readonly weekHeading: HTMLElement;
    readonly weekdayCells: HTMLElement[];
    readonly weekNumberCells: HTMLElement[];
    readonly weekRows: HTMLElement[];
    readonly dayCells: HTMLButtonElement[];
  }

  const blocks: MonthBlock[] = [];

  function buildMonth(): MonthBlock {
    const block = el('div', 'tz-range__month');
    const title = el('div', 'tz-range__month-title');
    const weekdays = el('div', 'tz-range__weekdays');
    weekdays.setAttribute('role', 'row');
    const weekHeading = el('span', 'tz-range__weeknumber tz-range__weeknumber--heading');
    weekHeading.setAttribute('role', 'columnheader');
    const weekNumberCells = Array.from({ length: 6 }, () => {
      const cell = el('span', 'tz-range__weeknumber');
      cell.setAttribute('role', 'rowheader');
      return cell;
    });
    const weekdayCells = Array.from({ length: 7 }, () => {
      const cell = el('span', 'tz-range__weekday');
      cell.setAttribute('role', 'columnheader');
      return cell;
    });
    weekdays.append(...weekdayCells);

    const dayCells: HTMLButtonElement[] = [];
    const weekRows: HTMLElement[] = [];
    block.append(title, weekdays);
    for (let w = 0; w < 6; w++) {
      const row = el('div', 'tz-range__week');
      row.setAttribute('role', 'row');
      weekRows.push(row);
      for (let d = 0; d < 7; d++) {
        const cell = button('tz-range__day');
        cell.setAttribute('role', 'gridcell');
        dayCells.push(cell);
        row.append(cell);
      }
      block.append(row);
    }
    grid.append(block);
    return { block, title, weekdays, weekHeading, weekdayCells, weekNumberCells, weekRows, dayCells };
  }

  /** As many blocks as months asked for, no more. */
  function fitMonths(): void {
    const wanted = Math.max(1, Math.floor(s.months));
    while (blocks.length < wanted) blocks.push(buildMonth());
    while (blocks.length > wanted) blocks.pop()!.block.remove();
  }

  const alert = el('p', 'tz-range__error');
  alert.setAttribute('role', 'alert');

  /*
   * The two views share one cell, so the calendar keeps its size when the
   * title is pressed. Sized apart they could not: a months grid built to the
   * width of one month grew the panel by 24px on a single month, and would
   * have shrunk it on two. Neither is a change the reader asked for.
   */
  const views = el('div', 'tz-range__views');
  views.append(grid, coarse);
  host.append(header, views);

  const shown = (): YearMonth => {
    if (cursor) return cursor;
    const anchor = s.value.start ?? s.today;
    return { year: anchor.year, month: anchor.month };
  };

  const ruledOut = (date: PlainDate) =>
    (s.min !== null && before(date, s.min)) ||
    (s.max !== null && before(s.max, date)) ||
    (s.isDateDisabled?.(date) ?? false);
  const blocked = (date: PlainDate) => ruledOut(date) || renderedOut.has(date.toString());

  /** The span the blocks are showing, first day to last. */
  function shownSpan(): { first: PlainDate; last: PlainDate } {
    const at = shown();
    const first = Temporal.PlainDate.from({ year: at.year, month: at.month, day: 1 });
    const last = first.add({ months: Math.max(1, blocks.length) }).subtract({ days: 1 });
    return { first, last };
  }

  const withinShown = (date: PlainDate) => {
    const { first, last } = shownSpan();
    return !before(date, first) && !before(last, date);
  };

  /** The first day on screen that may be chosen, for the keyboard to land on. */
  function firstUsable(): string | null {
    const { first, last } = shownSpan();
    for (let date = first; !before(last, date); date = date.add({ days: 1 })) {
      if (!blocked(date)) return date.toString();
    }
    return null;
  }

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'range', RANGE_CSS);
      stylesPending = false;
    }
    const at = shown();
    const off = s.disabled;

    prev.disabled = off;
    next.disabled = off;
    prev.setAttribute('aria-label', s.messages.previousMonth);
    next.setAttribute('aria-label', s.messages.nextMonth);

    fitMonths();
    // Where Tab lands: the day the keyboard is on, else the start of the
    // period, else the first day of the first month that can be chosen. A
    // disabled button cannot take focus, so an unusable one is no entry at
    // all.
    const usable = (iso: string | null): iso is string => {
      if (!iso) return false;
      const date = Temporal.PlainDate.from(iso);
      return !off && !blocked(date) && withinShown(date);
    };
    const tabbable =
      [focusedIso, s.value.start?.toString() ?? null].find(usable) ?? firstUsable();
    host.classList.toggle('tz-range--months', blocks.length > 1);
    host.classList.toggle('tz-range--weeks', s.weekNumbers);

    const monthName = (year: number, month: number) =>
      new Intl.DateTimeFormat(s.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(Date.UTC(year, month - 1, 1)),
      );
    const short = new Intl.DateTimeFormat(s.locale, { weekday: 'short', timeZone: 'UTC' });
    const long = new Intl.DateTimeFormat(s.locale, { dateStyle: 'full', timeZone: 'UTC' });
    const first = monthName(at.year, at.month);
    const last = Temporal.PlainDate.from({ year: at.year, month: at.month, day: 1 }).add({
      months: blocks.length - 1,
    });
    /*
     * The title says what the arrows would move, so it says the view: the
     * month among days, the year among months, the decade among years. With
     * two months on screen the days view has nothing to put there — each block
     * carries its own name — so it stays empty, and the picker is reached from
     * the same place either way.
     */
    const decade = getDecadeYears(at.year);
    const heading =
      view === 'days'
        ? // Two months name themselves above their own grids, so the header
          // says the year instead of repeating them. It says *something* in
          // every view on purpose: left empty it was a four-pixel button
          // nobody could press, and the header grew by those four pixels the
          // moment the picker put a year in it.
          blocks.length > 1
          ? String(at.year)
          : first
        : view === 'months'
          ? String(at.year)
          : `${decade[1]} – ${decade[10]}`;
    title.textContent = heading;
    title.disabled = off || view === 'years';
    title.setAttribute(
      'aria-label',
      view === 'days' ? s.messages.chooseMonth : view === 'months' ? s.messages.chooseYear : heading,
    );
    // Shown and hidden by visibility rather than by display: both keep their
    // place in the cell, so neither the width nor the height moves. A hidden
    // one is out of the tab order all the same.
    host.classList.toggle('tz-range--picking', view !== 'days');
    if (view !== 'days') {
      const monthShort = new Intl.DateTimeFormat(s.locale, { month: 'short', timeZone: 'UTC' });
      coarseCells.forEach((cell, index) => {
        const year = decade[index]!;
        cell.textContent =
          view === 'months' ? monthShort.format(new Date(Date.UTC(2000, index, 1))) : String(year);
        cell.disabled = off;
        // One tab stop for the grid, as the day grid has: the cell in force
        // takes the focus and the arrows move it from there.
        cell.tabIndex = index === (view === 'months' ? at.month - 1 : decade.indexOf(at.year))
          ? 0
          : -1;
        // The two cells a decade view borrows from its neighbours are shown
        // faintly, as the single calendar shows them.
        cell.classList.toggle(
          'tz-range__coarse-cell--outside',
          view === 'years' && isOutsideDecade(year, at.year),
        );
        cell.classList.toggle(
          'tz-range__coarse-cell--selected',
          view === 'months' ? index + 1 === at.month : year === at.year,
        );
      });
    }
    grid.setAttribute('aria-label', blocks.length > 1 ? `${first} – ${monthName(last.year, last.month)}` : first);

    // The end as it would be if the pointer stopped here, so the run under the
    // cursor is the run that will be chosen.
    const { start, end } = s.value;
    const finish = start && !end ? hovered : end;
    const [from, to] = start && finish && before(finish, start) ? [finish, start] : [start, finish];

    renderedOut = new Set();
    let notes = false;

    blocks.forEach((block, index) => {
      const on = Temporal.PlainDate.from({ year: at.year, month: at.month, day: 1 }).add({ months: index });
      block.title.textContent = blocks.length > 1 ? monthName(on.year, on.month) : '';
      getWeekdayOrder(firstDay()).forEach((weekday, i) => {
        block.weekdayCells[i]!.textContent = short.format(new Date(Date.UTC(1970, 0, 4 + weekday)));
      });

      const month = getMonthGrid(on.year, on.month, firstDay());
      block.weekHeading.textContent = s.weekNumbers ? s.messages.weekShort : '';
      block.weekHeading.setAttribute('aria-label', s.messages.weekLabel);
      if (s.weekNumbers) {
        if (!block.weekHeading.isConnected) block.weekdays.prepend(block.weekHeading);
        month.forEach((week, row) => {
          const cell = block.weekNumberCells[row]!;
          cell.textContent = String(week[0]!.weekOfYear ?? '');
          cell.setAttribute('aria-label', `${s.messages.weekLabel} ${cell.textContent}`);
          if (!cell.isConnected) block.weekRows[row]!.prepend(cell);
        });
      } else {
        block.weekHeading.remove();
        for (const cell of block.weekNumberCells) cell.remove();
      }

      month.flat().forEach((date, i) => {
        const cell = block.dayCells[i]!;
        const isStart = from !== null && date.equals(from);
        const isEnd = to !== null && date.equals(to);
        const within = from !== null && to !== null && !before(date, from) && !before(to, date);
        const outside = date.month !== on.month || date.year !== on.year;
        const render = s.renderCell?.({
          date,
          outside,
          today: date.equals(s.today),
          selected: isStart || isEnd,
          disabled: ruledOut(date),
        });
        if (render?.disabled) renderedOut.add(date.toString());
        notes = paintCell(cell, 'tz-range', String(date.day), render) || notes;
        cell.dataset['date'] = date.toString();
        cell.classList.toggle('tz-range__day--outside', outside);
        cell.classList.toggle('tz-range__day--today', date.equals(s.today));
        cell.classList.toggle('tz-range__day--start', isStart);
        cell.classList.toggle('tz-range__day--end', isEnd);
        cell.classList.toggle('tz-range__day--within', within);
        cell.setAttribute('aria-selected', String(isStart || isEnd || within));
        /*
         * What a screen reader hears.
         *
         * The cell's own text is the day number alone — "21" — so without
         * this the month, the year and the weekday are all missing, and so is
         * any word for where in the period the day falls. `aria-selected` was
         * true on the two ends and false on everything between, which
         * announced the middle of the range as unselected.
         */
        const said = long.format(new Date(Date.UTC(date.year, date.month - 1, date.day)));
        const where = isStart
          ? s.messages.dayIsStart
          : isEnd
            ? s.messages.dayIsEnd
            : within
              ? s.messages.dayWithin
              : null;
        cell.setAttribute('aria-label', where ? `${said}, ${where}` : said);
        // The grid says which day is today; it had the class and not the word.
        if (date.equals(s.today)) cell.setAttribute('aria-current', 'date');
        else cell.removeAttribute('aria-current');
        cell.disabled = off || blocked(date);
        // One stop for the whole grid, months included: Tab reaches the
        // calendar, the arrows move inside it.
        cell.tabIndex = date.toString() === tabbable && !cell.disabled ? 0 : -1;
      });
    });
    host.classList.toggle('tz-range--notes', notes);

    if (error) {
      alert.textContent = error;
      if (!alert.isConnected) host.append(alert);
    } else {
      alert.remove();
    }
  }

  /**
   * Walks the span looking for a day the caller ruled out — through
   * isDateDisabled or renderCell. A day renderCell ruled out in a month not
   * on screen is not known here; isDateDisabled is the one that sees them all.
   */
  function crossesBlocked(from: PlainDate, to: PlainDate): boolean {
    if (!s.isDateDisabled && renderedOut.size === 0) return false;
    for (let day = from; !before(to, day); day = day.add({ days: 1 })) {
      if (s.isDateDisabled?.(day) || renderedOut.has(day.toString())) return true;
    }
    return false;
  }

  function commit(next: DateRangeValue): void {
    s.value = next;
    render();
    s.onChange?.(next);
  }

  function choose(date: PlainDate): void {
    if (s.disabled || blocked(date)) return;
    const { start, end } = s.value;
    error = null;

    // A complete range, or none at all, means this click starts a new one.
    if (!start || end) {
      commit({ start: date, end: null });
      return;
    }

    // Clicking before the start moves the start rather than making a backwards
    // range, which is what someone correcting a mis-click expects.
    const [from, to] = before(date, start) ? [date, start] : [start, date];
    if (s.blockAcrossDisabled && crossesBlocked(from, to)) {
      error = s.rangeSpansBlockedMessage ?? s.messages.rangeCrossesUnavailable;
      render();
      return;
    }
    commit({ start: from, end: to });
  }

  function shift(delta: number): void {
    const { year, month } = shown();
    // One press means one screenful of whatever is on screen: a month among
    // days, a year among months, a decade among years.
    const moved =
      view === 'days'
        ? Temporal.PlainDate.from({ year, month, day: 1 }).add({ months: delta })
        : Temporal.PlainDate.from({ year, month, day: 1 }).add({
            years: delta * (view === 'months' ? 1 : 10),
          });
    cursor = { year: moved.year, month: moved.month };
    render();
  }

  /** Days → months → years, and no further: a decade is deep enough. */
  function openView(): void {
    view = view === 'days' ? 'months' : 'years';
    render();
  }

  /** A month or a year chosen: one step back towards the days. */
  function chooseCoarse(index: number): void {
    const { year, month } = shown();
    if (view === 'months') {
      cursor = { year, month: index + 1 };
      view = 'days';
    } else {
      cursor = { year: getDecadeYears(year)[index]!, month };
      view = 'months';
    }
    render();
  }

  const listening = new AbortController();
  const on = { signal: listening.signal };
  const dayAt = (event: Event) => {
    const target = event.target as Element;
    return target instanceof HTMLButtonElement && target.dataset['date'] ? target : null;
  };

  /**
   * Arrow keys move a day, PageUp/PageDown a month, Home/End across the week —
   * the pattern the ARIA grid guidance describes, and the one this widget's
   * sibling already follows.
   *
   * The run under the keyboard is previewed exactly as the run under the
   * pointer is: half a selection is hard enough to hold in the head without
   * the screen keeping it to itself.
   */
  function onKeydown(event: KeyboardEvent): void {
    if (view !== 'days') {
      // Four columns of three. Without this the twelve cells were twelve tab
      // stops and the arrow keys did nothing — a role="grid" that behaves
      // like a list of buttons is the pattern the role exists to avoid.
      const index = coarseCells.indexOf(doc.activeElement as HTMLButtonElement);
      if (index < 0) return;
      const moves: Record<string, number> = {
        ArrowLeft: index - 1,
        ArrowRight: index + 1,
        ArrowUp: index - 4,
        ArrowDown: index + 4,
        Home: 0,
        End: coarseCells.length - 1,
      };
      const wanted = moves[event.key];
      if (wanted === undefined) return;
      event.preventDefault();
      coarseCells[Math.min(Math.max(wanted, 0), coarseCells.length - 1)]?.focus();
      return;
    }
    if (s.disabled) return;
    const at = document.activeElement;
    const current =
      at instanceof HTMLElement && at.dataset['date'] ? at.dataset['date'] : focusedIso;

    if (event.key === 'Enter' || event.key === ' ') return; // the button does it

    const from = Temporal.PlainDate.from(current ?? s.value.start?.toString() ?? s.today.toString());
    const intoWeek = (from.dayOfWeek - firstDay() + 7) % 7;
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
    focusedIso = target.toString();
    // Walking off the months on screen brings them along.
    if (!withinShown(target)) cursor = { year: target.year, month: target.month };
    // The preview follows, so a keyboard user sees the run they would choose.
    if (s.value.start && !s.value.end) hovered = target;
    render();
    grid.querySelector<HTMLElement>(`[data-date="${focusedIso}"]`)?.focus();
  }

  // On the wrapper: the coarse grid is the grid's sibling, so a listener on
  // the day grid never heard a key pressed among the months.
  views.addEventListener('keydown', onKeydown, on);
  grid.addEventListener(
    'focusin',
    (event) => {
      const cell = (event.target as Element).closest<HTMLElement>('.tz-range__day');
      if (cell?.dataset['date']) focusedIso = cell.dataset['date'];
    },
    on,
  );
  prev.addEventListener('click', () => shift(-1), on);
  next.addEventListener('click', () => shift(1), on);
  title.addEventListener('click', openView, on);
  coarseCells.forEach((cell, index) =>
    cell.addEventListener('click', () => chooseCoarse(index), on),
  );
  grid.addEventListener(
    'click',
    (event) => {
      const cell = (event.target as Element).closest<HTMLButtonElement>('.tz-range__day');
      if (cell && !cell.disabled) choose(Temporal.PlainDate.from(cell.dataset['date']!));
    },
    on,
  );
  // mouseenter does not bubble; listening in the capture phase still sees it.
  grid.addEventListener(
    'mouseenter',
    (event) => {
      const cell = dayAt(event);
      if (!cell) return;
      hovered = Temporal.PlainDate.from(cell.dataset['date']!);
      if (s.value.start && !s.value.end) render();
    },
    { ...on, capture: true },
  );
  grid.addEventListener(
    'mouseleave',
    (event) => {
      if (!dayAt(event)) return;
      hovered = null;
      if (s.value.start && !s.value.end) render();
    },
    { ...on, capture: true },
  );

  render();

  return {
    get value() {
      return s.value;
    },
    update(settings) {
      Object.assign(s, settings);
      render();
    },
    goTo({ year, month }) {
      cursor = { year, month };
      render();
    },
    setIcons(next_) {
      if (next_.prev !== undefined) prev.replaceChildren(next_.prev);
      if (next_.next !== undefined) next.replaceChildren(next_.next);
    },
    clear() {
      error = null;
      commit(EMPTY);
    },
    destroy() {
      listening.abort();
      header.remove();
      // The wrapper, not the grid inside it: removing the grid left the box
      // behind with its twelve month cells, so a second calendar on the same
      // host inherited them — and `tz-range--picking` is matched on the host,
      // which made the dead grid visible beside the live one.
      views.remove();
      alert.remove();
      // Every class it put there, not the one that came to mind: a host
      // handed back with tz-range--months still on it is a host whose next
      // tenant inherits a layout nobody asked for.
      host.classList.remove(
        'tz-range--notes',
        'tz-range--weeks',
        'tz-range--months',
        'tz-range--picking',
      );
      if (addedHostClass) host.classList.remove('tz-range');
    },
  };
}
