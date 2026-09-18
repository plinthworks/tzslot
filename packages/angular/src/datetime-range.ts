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
import { DateField } from './date-field.js';
import { TimeSlotPicker } from './time-slot-picker.js';
import { Temporal, getRangeInfo, isRangeProblem, formatDuration } from '../../core/src/index.js';
import type { Instant, PlainDate, Slot } from '../../core/src/index.js';

export interface DateTimeRangeValue {
  readonly start: Instant | null;
  readonly end: Instant | null;
}

const EMPTY: DateTimeRangeValue = { start: null, end: null };

/**
 * An interval with a time at both ends, which may cross midnight — or a change
 * of offset.
 *
 * This is where the whole library earns itself. A shift from 23:00 to 05:00 is
 * six hours on any other picker, and on the morning a zone puts its clocks back
 * it is seven. Nothing warns you: the numbers look ordinary afterwards, and the
 * error surfaces as a payroll discrepancy nobody can reproduce.
 *
 * So the duration shown here is the measured one, and when it disagrees with
 * the clock faces the component says so in words rather than leaving the reader
 * to notice.
 */
@Component({
  selector: 'tz-datetime-range',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DateField, TimeSlotPicker],
  host: { class: 'tz-dtr' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateTimeRange), multi: true },
  ],
  template: `
    <div class="tz-dtr__legs">
      @for (leg of legs; track leg.key) {
        <section class="tz-dtr__leg" [attr.aria-label]="leg.key === 'start' ? startLabel() : endLabel()">
          <h3 class="tz-dtr__legend">{{ leg.key === 'start' ? startLabel() : endLabel() }}</h3>

          <tz-date-field
            [value]="dayOf(leg.key)"
            (valueChange)="setDay(leg.key, $event)"
            [locale]="locale()"
            [min]="min()"
            [max]="max()"
            [disabled]="disabled() || formDisabled()"
          />

          @if (dayOf(leg.key); as day) {
            <tz-time-slots
              [date]="day"
              [timeZone]="timeZone()"
              [stepMinutes]="stepMinutes()"
              [minTime]="minTime()"
              [maxTime]="maxTime()"
              [isDisabled]="isSlotDisabled()"
              [value]="instantOf(leg.key)"
              (valueChange)="setInstant(leg.key, $event)"
              [disabled]="disabled() || formDisabled()"
            />
          }
        </section>
      }
    </div>

    @if (summary(); as text) {
      <p class="tz-dtr__summary">{{ text }}</p>
    }
    @if (warning(); as text) {
      <p class="tz-dtr__warning" role="status">{{ text }}</p>
    }
    @if (problem(); as text) {
      <p class="tz-dtr__error" role="alert">{{ text }}</p>
    }
  `,
  styles: `
    .tz-dtr { display: block; }
    .tz-dtr__legs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(var(--tz-dtr-leg-min, 16rem), 1fr));
      gap: var(--tz-dtr-gap, 1.5rem);
    }
    .tz-dtr__legend {
      margin: 0 0 var(--tz-dtr-legend-gap, 0.5rem);
      font-size: var(--tz-dtr-legend-size, 0.8em);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.7;
    }
    .tz-dtr__leg tz-date-field { margin-bottom: var(--tz-dtr-gap, 0.75rem); display: block; }
    .tz-dtr__summary { font-weight: var(--tz-dtr-summary-weight, 600); }
    .tz-dtr__warning { color: var(--tz-dtr-warning-fg, currentColor); font-size: 0.9em; }
    .tz-dtr__error { color: var(--tz-dtr-error-fg, currentColor); font-size: 0.9em; }
  `,
})
export class DateTimeRange implements ControlValueAccessor {
  readonly value = model<DateTimeRangeValue>(EMPTY);

  readonly timeZone = input.required<string>();
  readonly stepMinutes = input(30);
  readonly minTime = input<string | undefined>(undefined);
  readonly maxTime = input<string | undefined>(undefined);
  readonly isSlotDisabled = input<((slot: Omit<Slot, 'disabled'>) => boolean) | undefined>(undefined);
  readonly min = input<PlainDate | null>(null);
  readonly max = input<PlainDate | null>(null);
  readonly locale = input<string | undefined>(undefined);
  readonly disabled = input(false);

  readonly startLabel = input('From');
  readonly endLabel = input('To');
  readonly endBeforeStartMessage = input('The end is before the start.');

  protected readonly legs = [{ key: 'start' as const }, { key: 'end' as const }];

  /**
   * The day each leg is showing.
   *
   * Held separately from the value because a day is chosen before a time is:
   * between the two clicks there is a date with no instant, and forcing that
   * through the value would mean inventing a time nobody asked for.
   */
  private readonly days = signal<{ start: PlainDate | null; end: PlainDate | null }>({
    start: null,
    end: null,
  });

  protected dayOf(leg: 'start' | 'end'): PlainDate | null {
    const chosen = this.value()[leg];
    if (chosen) return chosen.toZonedDateTimeISO(this.timeZone()).toPlainDate();
    return this.days()[leg];
  }

  protected instantOf(leg: 'start' | 'end'): Instant | null {
    return this.value()[leg];
  }

  protected setDay(leg: 'start' | 'end', day: PlainDate | null): void {
    this.days.update((current) => ({ ...current, [leg]: day }));
    // Changing the day invalidates the time that was chosen on the old one.
    if (this.value()[leg]) this.commit({ ...this.value(), [leg]: null });
  }

  protected setInstant(leg: 'start' | 'end', instant: Instant | null): void {
    this.commit({ ...this.value(), [leg]: instant });
  }

  private readonly info = computed(() => {
    const { start, end } = this.value();
    if (!start || !end) return null;
    return getRangeInfo(start, end, this.timeZone());
  });

  protected readonly problem = computed(() => {
    const result = this.info();
    return result && isRangeProblem(result) ? this.endBeforeStartMessage() : null;
  });

  protected readonly summary = computed(() => {
    const result = this.info();
    if (!result || isRangeProblem(result)) return null;
    return formatDuration(result.duration);
  });

  /**
   * Said in words, because the number alone does not explain itself. Someone
   * who chose 23:00 to 05:00 and is shown "7h" will assume the component is
   * broken unless it tells them the clocks moved.
   */
  protected readonly warning = computed(() => {
    const result = this.info();
    if (!result || isRangeProblem(result) || !result.crossesTransition) return null;

    const apparent = formatDuration(
      Temporal.Duration.from({ minutes: Math.abs(result.wallMinutes) }),
    );
    const real = formatDuration(result.duration);
    const direction = result.shiftMinutes > 0 ? 'back' : 'forward';
    const by = formatDuration(Temporal.Duration.from({ minutes: Math.abs(result.shiftMinutes) }));

    return `The clocks go ${direction} by ${by} during this range, so it reads as ${apparent} but lasts ${real}.`;
  });

  private commit(next: DateTimeRangeValue): void {
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  }

  // ── ControlValueAccessor ────────────────────────────────────

  protected readonly formDisabled = signal(false);
  private onChange: (value: DateTimeRangeValue) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: DateTimeRangeValue | null): void {
    this.value.set(value ?? EMPTY);
  }
  registerOnChange(fn: (value: DateTimeRangeValue) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
