import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import {
  Temporal,
  getMonthGrid,
  getWeekdayOrder,
  type PlainDate,
  type Weekday,
} from '../../core/src/index.js';

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
  selector: 'ngx-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngx-cal' },
  template: `
    <div class="ngx-cal__header">
      <button
        type="button"
        class="ngx-cal__nav"
        [attr.aria-label]="previousMonthLabel()"
        [disabled]="disabled()"
        (click)="shiftMonth(-1)"
      >
        ‹
      </button>

      <span class="ngx-cal__title" aria-live="polite">{{ monthTitle() }}</span>

      <button
        type="button"
        class="ngx-cal__nav"
        [attr.aria-label]="nextMonthLabel()"
        [disabled]="disabled()"
        (click)="shiftMonth(1)"
      >
        ›
      </button>
    </div>

    <div class="ngx-cal__grid" role="grid" [attr.aria-label]="monthTitle()" (keydown)="onKeydown($event)">
      <div class="ngx-cal__weekdays" role="row">
        @for (name of weekdayNames(); track name.short) {
          <span class="ngx-cal__weekday" role="columnheader" [attr.aria-label]="name.long">
            {{ name.short }}
          </span>
        }
      </div>

      @for (week of weeks(); track week[0]!.iso) {
        <div class="ngx-cal__week" role="row">
          @for (cell of week; track cell.iso) {
            <button
              type="button"
              role="gridcell"
              class="ngx-cal__day"
              [class.ngx-cal__day--outside]="cell.outside"
              [class.ngx-cal__day--today]="cell.today"
              [class.ngx-cal__day--selected]="cell.selected"
              [attr.aria-selected]="cell.selected"
              [attr.aria-current]="cell.today ? 'date' : null"
              [attr.data-date]="cell.iso"
              [attr.tabindex]="cell.iso === focused() ? 0 : -1"
              [disabled]="cell.disabled || disabled()"
              (click)="select(cell)"
              (focus)="focused.set(cell.iso)"
            >
              {{ cell.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .ngx-cal { display: inline-block; }
    .ngx-cal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--dp-cal-gap, 0.25rem);
      padding: var(--dp-cal-header-padding, 0.25rem 0);
    }
    .ngx-cal__title { font-weight: var(--dp-cal-title-weight, 600); }
    .ngx-cal__nav,
    .ngx-cal__day {
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      border-radius: var(--dp-cal-radius, 0.25rem);
    }
    .ngx-cal__weekdays,
    .ngx-cal__week {
      display: grid;
      grid-template-columns: repeat(7, var(--dp-cal-cell-size, 2rem));
      gap: var(--dp-cal-gap, 0.25rem);
    }
    .ngx-cal__weekday {
      text-align: center;
      font-size: var(--dp-cal-weekday-size, 0.75em);
      opacity: 0.7;
    }
    .ngx-cal__day {
      height: var(--dp-cal-cell-size, 2rem);
      text-align: center;
    }
    .ngx-cal__day--outside { opacity: var(--dp-cal-outside-opacity, 0.35); }
    .ngx-cal__day--today { outline: 1px solid var(--dp-cal-today-border, currentColor); }
    .ngx-cal__day--selected {
      background: var(--dp-cal-selected-bg, currentColor);
      color: var(--dp-cal-selected-fg, canvas);
    }
    .ngx-cal__day:disabled { opacity: 0.3; cursor: not-allowed; }
  `,
})
export class Calendar {
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
   * Today, injectable so a test does not depend on the day it runs.
   * A calendar that highlights the wrong day is a small bug that is very hard
   * to reproduce six months later.
   */
  readonly today = input<PlainDate>(Temporal.Now.plainDateISO());

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
          (max !== null && Temporal.PlainDate.compare(date, max) > 0),
      })),
    );
  });

  protected readonly monthTitle = computed(() => {
    const { year, month } = this.shownMonth();
    return this.formatter({ month: 'long', year: 'numeric' }).format(
      new Date(Date.UTC(year, month - 1, 1)),
    );
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

  protected shiftMonth(delta: number): void {
    const { year, month } = this.shownMonth();
    const moved = Temporal.PlainDate.from({ year, month, day: 1 }).add({ months: delta });
    this.cursor.set({ year: moved.year, month: moved.month });
  }

  protected select(cell: DayCell): void {
    if (cell.disabled || this.disabled()) return;
    this.value.set(cell.date);
    // Clicking a trailing day of the next month should follow it there, or the
    // selection lands on a date the grid no longer highlights.
    if (cell.outside) this.cursor.set({ year: cell.date.year, month: cell.date.month });
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
