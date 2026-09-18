import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  model,
  signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import {
  Temporal,
  getMonthGrid,
  getWeekdayOrder,
  getDecadeYears,
  isOutsideDecade,
  toPlainDate,
  fromPlainDate,
} from '../../core/src/index.js';
import type { PlainDate, Weekday, ValueShape, DateLike } from '../../core/src/index.js';

/** Days, months or years — what the grid is currently choosing between. */
export type CalendarView = 'days' | 'months' | 'years';

/** A month or a year cell: the same shape, since they behave the same way. */
interface CoarseCell {
  readonly label: string;
  readonly value: number;
  readonly outside: boolean;
  readonly current: boolean;
  readonly selected: boolean;
}

interface DayCell {
  readonly date: PlainDate;
  readonly iso: string;
  readonly label: string;
  /** Belongs to the month either side of the one being shown. */
  readonly outside: boolean;
  readonly today: boolean;
  readonly selected: boolean;
  readonly disabled: boolean;
}

/**
 * A month grid: pick a day.
 *
 * It knows nothing about time zones, and that is deliberate. Which day it is
 * does not depend on whether the clocks changed that morning — only what time
 * it is does. Keeping the two apart is what stops calendar code turning into
 * the kind of thing nobody dares edit.
 *
 * Month and weekday names come from `Intl`, which every browser already has.
 * Air Datepicker ships thirty locale files to do the same job; those go stale,
 * and they are bytes every visitor downloads for languages they do not read.
 */
@Component({
  selector: 'tz-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tz-cal' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Calendar), multi: true },
  ],
  template: `
    <div class="tz-cal__header">
      <button
        type="button"
        class="tz-cal__nav"
        [attr.aria-label]="previousMonthLabel()"
        [disabled]="disabled() || formDisabled()"
        (click)="shiftMonth(-1)"
      >
        ‹
      </button>

      <button
        type="button"
        class="tz-cal__title"
        [class.tz-cal__title--static]="view() === 'years'"
        [attr.aria-live]="'polite'"
        [attr.aria-label]="zoomOutLabel()"
        [disabled]="view() === 'years' || disabled() || formDisabled()"
        (click)="zoomOut()"
      >
        {{ title() }}
      </button>

      <button
        type="button"
        class="tz-cal__nav"
        [attr.aria-label]="nextMonthLabel()"
        [disabled]="disabled() || formDisabled()"
        (click)="shiftMonth(1)"
      >
        ›
      </button>
    </div>

    <div class="tz-cal__grid" role="grid" [attr.aria-label]="title()" (keydown)="onKeydown($event)">
      @if (view() !== 'days') {
        <div class="tz-cal__coarse">
          @for (cell of coarseCells(); track cell.value) {
            <button
              type="button"
              role="gridcell"
              class="tz-cal__coarse-cell"
              [class.tz-cal__coarse-cell--outside]="cell.outside"
              [class.tz-cal__coarse-cell--today]="cell.current"
              [class.tz-cal__coarse-cell--selected]="cell.selected"
              [attr.aria-selected]="cell.selected"
              [attr.data-value]="cell.value"
              [disabled]="disabled() || formDisabled()"
              (click)="zoomIn(cell)"
            >
              {{ cell.label }}
            </button>
          }
        </div>
      } @else {
      <div class="tz-cal__weekdays" role="row">
        @for (name of weekdayNames(); track name.short) {
          <span class="tz-cal__weekday" role="columnheader" [attr.aria-label]="name.long">
            {{ name.short }}
          </span>
        }
      </div>

      @for (week of weeks(); track week[0]!.iso) {
        <div class="tz-cal__week" role="row">
          @for (cell of week; track cell.iso) {
            <button
              type="button"
              role="gridcell"
              class="tz-cal__day"
              [class.tz-cal__day--outside]="cell.outside"
              [class.tz-cal__day--today]="cell.today"
              [class.tz-cal__day--selected]="cell.selected"
              [attr.aria-selected]="cell.selected"
              [attr.aria-current]="cell.today ? 'date' : null"
              [attr.data-date]="cell.iso"
              [attr.tabindex]="cell.iso === focused() ? 0 : -1"
              [disabled]="cell.disabled || disabled() || formDisabled()"
              (click)="select(cell)"
              (focus)="focused.set(cell.iso)"
            >
              {{ cell.label }}
            </button>
          }
        </div>
      }
      }
    </div>
  `,
  styles: `
    :host { display: inline-block; }
    .tz-cal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--tz-cal-gap, 0.25rem);
      padding: var(--tz-cal-header-padding, 0.25rem 0);
    }
    .tz-cal__title { font-weight: var(--tz-cal-title-weight, 600); }
    .tz-cal__nav,
    .tz-cal__day {
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      border-radius: var(--tz-cal-radius, 0.25rem);
    }
    .tz-cal__weekdays,
    .tz-cal__week {
      display: grid;
      grid-template-columns: repeat(7, var(--tz-cal-cell-size, 2rem));
      gap: var(--tz-cal-gap, 0.25rem);
    }
    .tz-cal__weekday {
      text-align: center;
      font-size: var(--tz-cal-weekday-size, 0.75em);
      opacity: 0.7;
    }
    .tz-cal__day {
      height: var(--tz-cal-cell-size, 2rem);
      text-align: center;
    }
    .tz-cal__day--outside { opacity: var(--tz-cal-outside-opacity, 0.35); }
    .tz-cal__day--today { outline: 1px solid var(--tz-cal-today-border, currentColor); }
    .tz-cal__day--selected {
      background: var(--tz-cal-selected-bg, currentColor);
      color: var(--tz-cal-selected-fg, canvas);
    }
    .tz-cal__day:disabled { opacity: 0.3; cursor: not-allowed; }
    .tz-cal__title {
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: var(--tz-cal-title-weight, 600);
      cursor: pointer;
      padding: 0.125rem 0.5rem;
      border-radius: var(--tz-cal-radius, 0.25rem);
    }
    .tz-cal__title--static { cursor: default; }
    /* Four columns: twelve months and twelve years both land on three tidy
       rows, and the block ends up about as wide as the day grid so the header
       does not jump when the view changes. */
    .tz-cal__coarse {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--tz-cal-gap, 0.25rem);
      width: calc(7 * var(--tz-cal-cell-size, 2rem) + 6 * var(--tz-cal-gap, 0.25rem));
    }
    .tz-cal__coarse-cell {
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      padding: 0.5rem 0.25rem;
      border-radius: var(--tz-cal-radius, 0.25rem);
    }
    .tz-cal__coarse-cell--outside { opacity: var(--tz-cal-outside-opacity, 0.35); }
    .tz-cal__coarse-cell--today { outline: 1px solid var(--tz-cal-today-border, currentColor); }
    .tz-cal__coarse-cell--selected {
      background: var(--tz-cal-selected-bg, currentColor);
      color: var(--tz-cal-selected-fg, canvas);
    }
  `,
})
export class Calendar implements ControlValueAccessor {
  /** The selected day. Two-way: `[(value)]`. */
  readonly value = model<PlainDate | null>(null);

  /** Monday by default, as ISO-8601 numbers the week. */
  readonly firstDayOfWeek = input<Weekday>(1);

  /** A BCP-47 tag for the month and weekday names. Defaults to the browser's. */
  readonly locale = input<string | undefined>(undefined);

  readonly min = input<PlainDate | null>(null);
  readonly max = input<PlainDate | null>(null);
  readonly disabled = input(false);

  /**
   * What the form control holds. 'temporal' by default; 'date' lets an
   * existing FormControl<Date> keep working untouched, which is the whole of a
   * flatpickr migration on most screens.
   */
  readonly valueAs = input<ValueShape>('temporal');

  /**
   * The zone used to turn a Date into a calendar day and back.
   *
   * Only consulted when valueAs is 'date'. A Date is an instant, and which day
   * it falls on depends on where you are standing — so this is required to be
   * explicit rather than guessed, and defaults to the system's.
   */
  readonly valueTimeZone = input<string>(Temporal.Now.timeZoneId());


  /**
   * Rules out individual days inside the range: closures, weekends, days that
   * are already full. Bounds cut the ends off; this takes holes out of the
   * middle, which bounds cannot express.
   */
  readonly isDateDisabled = input<((date: PlainDate) => boolean) | undefined>(undefined);

  /**
   * Today, injectable so a test does not depend on the day it runs.
   * A calendar that highlights the wrong day is a small bug that is very hard
   * to reproduce six months later.
   */
  readonly today = input<PlainDate>(Temporal.Now.plainDateISO());

  /**
   * Which level the grid is choosing between.
   *
   * A model rather than internal state, so a consumer can open straight on
   * years — a birthdate picker that starts on the current month makes the user
   * click the arrow three hundred times.
   */
  readonly view = model<CalendarView>('days');

  /**
   * How far down the view may go. 'months' turns this into a month picker,
   * 'years' into a year picker, with no further code.
   */
  readonly minView = input<CalendarView>('days');

  /** The month on screen, which is not the same as the selection. */
  private readonly cursor = signal<{ year: number; month: number } | null>(null);

  /** The cell the keyboard is on, as an ISO string. Drives the roving tabindex. */
  protected readonly focused = signal<string | null>(null);

  private readonly shownMonth = computed(() => {
    const explicit = this.cursor();
    if (explicit) return explicit;
    const anchor = this.value() ?? this.today();
    return { year: anchor.year, month: anchor.month };
  });

  protected readonly weeks = computed<DayCell[][]>(() => {
    const { year, month } = this.shownMonth();
    const selected = this.value();
    const today = this.today();
    const min = this.min();
    const max = this.max();
    const ruledOut = this.isDateDisabled();

    return getMonthGrid(year, month, this.firstDayOfWeek()).map((week) =>
      week.map((date) => ({
        date,
        iso: date.toString(),
        label: String(date.day),
        outside: date.month !== month || date.year !== year,
        today: date.equals(today),
        selected: selected !== null && date.equals(selected),
        disabled:
          (min !== null && Temporal.PlainDate.compare(date, min) < 0) ||
          (max !== null && Temporal.PlainDate.compare(date, max) > 0) ||
          (ruledOut?.(date) ?? false),
      })),
    );
  });

  protected readonly monthTitle = computed(() => {
    const { year, month } = this.shownMonth();
    return this.formatter({ month: 'long', year: 'numeric' }).format(
      new Date(Date.UTC(year, month - 1, 1)),
    );
  });

  /** What the header says, which is also what clicking it zooms out of. */
  protected readonly title = computed(() => {
    const { year } = this.shownMonth();
    switch (this.view()) {
      case 'days':
        return this.monthTitle();
      case 'months':
        return String(year);
      case 'years': {
        const years = getDecadeYears(year);
        return `${years[1]} – ${years[10]}`;
      }
    }
  });

  protected readonly zoomOutLabel = computed(() =>
    this.view() === 'days' ? 'Choose a month' : 'Choose a year',
  );

  protected readonly coarseCells = computed<CoarseCell[]>(() => {
    const { year, month } = this.shownMonth();
    const selected = this.value();
    const today = this.today();

    if (this.view() === 'months') {
      const format = this.formatter({ month: 'short' });
      return Array.from({ length: 12 }, (_, i) => ({
        label: format.format(new Date(Date.UTC(year, i, 1))),
        value: i + 1,
        outside: false,
        current: today.year === year && today.month === i + 1,
        selected: selected !== null && selected.year === year && selected.month === i + 1,
      }));
    }

    return getDecadeYears(year).map((y) => ({
      label: String(y),
      value: y,
      outside: isOutsideDecade(y, year),
      current: today.year === y,
      selected: selected !== null && selected.year === y,
    }));
  });

  protected readonly weekdayNames = computed(() => {
    const short = this.formatter({ weekday: 'short' });
    const long = this.formatter({ weekday: 'long' });
    // 4 January 1970 was a Sunday, so ISO weekday n falls on 4 + n.
    return getWeekdayOrder(this.firstDayOfWeek()).map((weekday) => {
      const reference = new Date(Date.UTC(1970, 0, 4 + weekday));
      return { short: short.format(reference), long: long.format(reference) };
    });
  });

  protected readonly previousMonthLabel = computed(() => `Previous month`);
  protected readonly nextMonthLabel = computed(() => `Next month`);

  private formatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    return new Intl.DateTimeFormat(this.locale(), { ...options, timeZone: 'UTC' });
  }

  /**
   * The arrows move by whatever the grid is showing: a month, a year, or a
   * decade. An arrow that always moved a month would be useless in a decade
   * view, which is the state these buttons exist to escape.
   */
  protected shiftMonth(delta: number): void {
    const { year, month } = this.shownMonth();
    const step =
      this.view() === 'days'
        ? { months: delta }
        : this.view() === 'months'
          ? { years: delta }
          : { years: delta * 10 };
    const moved = Temporal.PlainDate.from({ year, month, day: 1 }).add(step);
    this.cursor.set({ year: moved.year, month: moved.month });
  }

  private readonly order: CalendarView[] = ['days', 'months', 'years'];

  protected zoomOut(): void {
    if (this.disabled() || this.formDisabled()) return;
    const next = this.order[this.order.indexOf(this.view()) + 1];
    if (next) this.view.set(next);
  }

  /**
   * Going down from months or years. At minView the choice is the answer, so
   * a month picker selects the first of the month rather than descending into
   * days it is not meant to show.
   */
  protected zoomIn(cell: CoarseCell): void {
    if (this.disabled() || this.formDisabled()) return;

    const { year, month } = this.shownMonth();
    const target =
      this.view() === 'months' ? { year, month: cell.value } : { year: cell.value, month };
    this.cursor.set(target);

    const below = this.order[this.order.indexOf(this.view()) - 1]!;
    if (this.order.indexOf(below) < this.order.indexOf(this.minView())) {
      const date = Temporal.PlainDate.from({ ...target, day: 1 });
      this.value.set(date);
      this.onChange(date);
      this.onTouched();
      return;
    }
    this.view.set(below);
  }

  protected select(cell: DayCell): void {
    if (cell.disabled || this.disabled() || this.formDisabled()) return;
    this.value.set(cell.date);
    this.onChange(cell.date);
    this.onTouched();
    // Clicking a trailing day of the next month should follow it there, or the
    // selection lands on a date the grid no longer highlights.
    if (cell.outside) this.cursor.set({ year: cell.date.year, month: cell.date.month });
  }

  // ── ControlValueAccessor ────────────────────────────────────

  protected readonly formDisabled = signal(false);
  private onChange: (value: PlainDate | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: DateLike | null): void {
    this.value.set(value === null || value === undefined
      ? null
      : toPlainDate(value, this.valueTimeZone()));
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = (date) => fn(fromPlainDate(date, this.valueAs(), this.valueTimeZone()));
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  /**
   * Arrow keys move a day, PageUp/PageDown a month, Home/End to the ends of the
   * week — the pattern the ARIA grid guidance describes, and the one a keyboard
   * user will already expect from every other calendar they have used.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const from = this.focused()
      ? Temporal.PlainDate.from(this.focused()!)
      : (this.value() ?? this.today());

    const moves: Record<string, () => PlainDate> = {
      ArrowLeft: () => from.subtract({ days: 1 }),
      ArrowRight: () => from.add({ days: 1 }),
      ArrowUp: () => from.subtract({ weeks: 1 }),
      ArrowDown: () => from.add({ weeks: 1 }),
      PageUp: () => from.subtract({ months: 1 }),
      PageDown: () => from.add({ months: 1 }),
      Home: () => from.subtract({ days: (from.dayOfWeek - this.firstDayOfWeek() + 7) % 7 }),
      End: () => from.add({ days: 6 - ((from.dayOfWeek - this.firstDayOfWeek() + 7) % 7) }),
    };

    if (event.key === 'Enter' || event.key === ' ') {
      const cell = this.weeks()
        .flat()
        .find((c) => c.iso === this.focused());
      if (cell) {
        event.preventDefault();
        this.select(cell);
      }
      return;
    }

    const move = moves[event.key];
    if (!move) return;

    event.preventDefault();
    const target = move();
    this.focused.set(target.toString());
    this.cursor.set({ year: target.year, month: target.month });
  }
}
