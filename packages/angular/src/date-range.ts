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
import { Temporal, getMonthGrid, getWeekdayOrder } from '../../core/src/index.js';
import type { PlainDate, Weekday } from '../../core/src/index.js';

/** Either end may be unset while a range is being chosen. */
export interface DateRangeValue {
  readonly start: PlainDate | null;
  readonly end: PlainDate | null;
}

interface RangeCell {
  readonly date: PlainDate;
  readonly iso: string;
  readonly label: string;
  readonly outside: boolean;
  readonly today: boolean;
  readonly disabled: boolean;
  readonly isStart: boolean;
  readonly isEnd: boolean;
  readonly within: boolean;
}

const EMPTY: DateRangeValue = { start: null, end: null };

/**
 * Two dates and everything between them.
 *
 * A separate component rather than a mode on the calendar, because the value is
 * a different shape and a component whose type changes with a boolean is a
 * component nobody can put in a typed form. The grid comes from the same core
 * function, so the two cannot disagree about what a month looks like.
 */
@Component({
  selector: 'tz-date-range',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tz-range' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateRange), multi: true },
  ],
  template: `
    <div class="tz-range__header">
      <button
        type="button"
        class="tz-range__nav"
        aria-label="Previous month"
        [disabled]="disabled() || formDisabled()"
        (click)="shiftMonth(-1)"
      >
        ‹
      </button>
      <span class="tz-range__title" aria-live="polite">{{ monthTitle() }}</span>
      <button
        type="button"
        class="tz-range__nav"
        aria-label="Next month"
        [disabled]="disabled() || formDisabled()"
        (click)="shiftMonth(1)"
      >
        ›
      </button>
    </div>

    <div class="tz-range__grid" role="grid" [attr.aria-label]="monthTitle()">
      <div class="tz-range__weekdays" role="row">
        @for (name of weekdayNames(); track name) {
          <span class="tz-range__weekday" role="columnheader">{{ name }}</span>
        }
      </div>

      @for (week of weeks(); track week[0]!.iso) {
        <div class="tz-range__week" role="row">
          @for (cell of week; track cell.iso) {
            <button
              type="button"
              role="gridcell"
              class="tz-range__day"
              [class.tz-range__day--outside]="cell.outside"
              [class.tz-range__day--today]="cell.today"
              [class.tz-range__day--start]="cell.isStart"
              [class.tz-range__day--end]="cell.isEnd"
              [class.tz-range__day--within]="cell.within"
              [attr.aria-selected]="cell.isStart || cell.isEnd"
              [attr.data-date]="cell.iso"
              [disabled]="cell.disabled || disabled() || formDisabled()"
              (click)="choose(cell)"
              (mouseenter)="hover.set(cell.iso)"
              (mouseleave)="hover.set(null)"
            >
              {{ cell.label }}
            </button>
          }
        </div>
      }
    </div>

    @if (error()) {
      <p class="tz-range__error" role="alert">{{ error() }}</p>
    }
  `,
  styles: `
    .tz-range { display: inline-block; }
    .tz-range__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--tz-cal-gap, 0.25rem);
    }
    .tz-range__title { font-weight: var(--tz-cal-title-weight, 600); }
    .tz-range__nav,
    .tz-range__day {
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .tz-range__weekdays,
    .tz-range__week {
      display: grid;
      grid-template-columns: repeat(7, var(--tz-cal-cell-size, 2rem));
    }
    .tz-range__weekday {
      text-align: center;
      font-size: var(--tz-cal-weekday-size, 0.75em);
      opacity: 0.7;
    }
    .tz-range__day {
      height: var(--tz-cal-cell-size, 2rem);
      text-align: center;
    }
    .tz-range__day--outside { opacity: var(--tz-cal-outside-opacity, 0.35); }
    .tz-range__day--today { outline: 1px solid var(--tz-cal-today-border, currentColor); }
    /* The middle has square edges so the run reads as one shape, and only the
       ends are rounded — the standard way a range is drawn, and the reason a
       user can see at a glance where it starts and stops. */
    .tz-range__day--within {
      background: var(--tz-range-within-bg, color-mix(in srgb, currentColor 12%, transparent));
    }
    .tz-range__day--start,
    .tz-range__day--end {
      background: var(--tz-cal-selected-bg, currentColor);
      color: var(--tz-cal-selected-fg, canvas);
    }
    .tz-range__day--start { border-radius: var(--tz-cal-radius, 0.25rem) 0 0 var(--tz-cal-radius, 0.25rem); }
    .tz-range__day--end { border-radius: 0 var(--tz-cal-radius, 0.25rem) var(--tz-cal-radius, 0.25rem) 0; }
    .tz-range__day--start.tz-range__day--end { border-radius: var(--tz-cal-radius, 0.25rem); }
    .tz-range__day:disabled { opacity: 0.3; cursor: not-allowed; }
    .tz-range__error { font-size: 0.8em; color: var(--tz-range-error-fg, currentColor); }
  `,
})
export class DateRange implements ControlValueAccessor {
  readonly value = model<DateRangeValue>(EMPTY);

  readonly firstDayOfWeek = input<Weekday>(1);
  readonly locale = input<string | undefined>(undefined);
  readonly min = input<PlainDate | null>(null);
  readonly max = input<PlainDate | null>(null);
  readonly disabled = input(false);
  readonly isDateDisabled = input<((date: PlainDate) => boolean) | undefined>(undefined);
  readonly today = input<PlainDate>(Temporal.Now.plainDateISO());

  /**
   * Refuse a range that steps over a day the caller ruled out.
   *
   * On by default, because the usual reason a day is unavailable is that the
   * thing being booked is not available then — and a booking that spans a
   * closure is a booking that cannot be honoured. Turn it off for ranges that
   * merely bracket a period, like a report's dates.
   */
  readonly blockAcrossDisabled = input(true);

  readonly rangeSpansBlockedMessage = input('That range crosses an unavailable day.');

  private readonly cursor = signal<{ year: number; month: number } | null>(null);
  protected readonly hover = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  private readonly shownMonth = computed(() => {
    const explicit = this.cursor();
    if (explicit) return explicit;
    const anchor = this.value().start ?? this.today();
    return { year: anchor.year, month: anchor.month };
  });

  /**
   * The end of the range as it would be if the pointer stopped here — so the
   * run under the cursor is the run that will be chosen, which is the only way
   * to pick a span without counting cells.
   */
  private readonly provisionalEnd = computed<PlainDate | null>(() => {
    const { start, end } = this.value();
    if (!start || end) return end;
    const hovered = this.hover();
    return hovered ? Temporal.PlainDate.from(hovered) : null;
  });

  protected readonly weeks = computed<RangeCell[][]>(() => {
    const { year, month } = this.shownMonth();
    const { start } = this.value();
    const finish = this.provisionalEnd();
    const today = this.today();
    const min = this.min();
    const max = this.max();
    const ruledOut = this.isDateDisabled();

    const [from, to] =
      start && finish && Temporal.PlainDate.compare(finish, start) < 0
        ? [finish, start]
        : [start, finish];

    return getMonthGrid(year, month, this.firstDayOfWeek()).map((week) =>
      week.map((date) => {
        const afterFrom = from !== null && Temporal.PlainDate.compare(date, from) >= 0;
        const beforeTo = to !== null && Temporal.PlainDate.compare(date, to) <= 0;
        return {
          date,
          iso: date.toString(),
          label: String(date.day),
          outside: date.month !== month || date.year !== year,
          today: date.equals(today),
          disabled:
            (min !== null && Temporal.PlainDate.compare(date, min) < 0) ||
            (max !== null && Temporal.PlainDate.compare(date, max) > 0) ||
            (ruledOut?.(date) ?? false),
          isStart: from !== null && date.equals(from),
          isEnd: to !== null && date.equals(to),
          within: afterFrom && beforeTo,
        };
      }),
    );
  });

  protected readonly monthTitle = computed(() => {
    const { year, month } = this.shownMonth();
    return new Intl.DateTimeFormat(this.locale(), {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  });

  protected readonly weekdayNames = computed(() => {
    const format = new Intl.DateTimeFormat(this.locale(), { weekday: 'short', timeZone: 'UTC' });
    return getWeekdayOrder(this.firstDayOfWeek()).map((weekday) =>
      format.format(new Date(Date.UTC(1970, 0, 4 + weekday))),
    );
  });

  protected shiftMonth(delta: number): void {
    const { year, month } = this.shownMonth();
    const moved = Temporal.PlainDate.from({ year, month, day: 1 }).add({ months: delta });
    this.cursor.set({ year: moved.year, month: moved.month });
  }

  protected choose(cell: RangeCell): void {
    if (cell.disabled || this.disabled() || this.formDisabled()) return;

    const { start, end } = this.value();
    this.error.set(null);

    // A complete range, or none at all, means this click starts a new one.
    if (!start || end) {
      this.commit({ start: cell.date, end: null });
      return;
    }

    // Clicking before the start moves the start rather than making a backwards
    // range, which is what someone correcting a mis-click expects.
    const [from, to] =
      Temporal.PlainDate.compare(cell.date, start) < 0 ? [cell.date, start] : [start, cell.date];

    if (this.blockAcrossDisabled() && this.crossesBlocked(from, to)) {
      this.error.set(this.rangeSpansBlockedMessage());
      return;
    }

    this.commit({ start: from, end: to });
  }

  /** Walks the span looking for a day the caller ruled out. */
  private crossesBlocked(from: PlainDate, to: PlainDate): boolean {
    const ruledOut = this.isDateDisabled();
    if (!ruledOut) return false;
    for (let day = from; Temporal.PlainDate.compare(day, to) <= 0; day = day.add({ days: 1 })) {
      if (ruledOut(day)) return true;
    }
    return false;
  }

  private commit(next: DateRangeValue): void {
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  }

  // ── ControlValueAccessor ────────────────────────────────────

  protected readonly formDisabled = signal(false);
  private onChange: (value: DateRangeValue) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: DateRangeValue | null): void {
    this.value.set(value ?? EMPTY);
  }
  registerOnChange(fn: (value: DateRangeValue) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
