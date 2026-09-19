import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { TZSLOT_MESSAGES } from './messages.js';

import { Temporal } from '../../core/src/index.js';
import type { DailyWindowsSummary, PlainDate, Weekday } from '../../core/src/index.js';
import {
  createDailyRange,
  type DailyRangeInstance,
  type DailyRangeSettings,
  type DailyRangeValue,
  type RenderCell,
} from '../../dom/src/index.js';

export type { DailyRangeValue } from '../../dom/src/index.js';

const EMPTY: DailyRangeValue = { start: null, end: null, from: null, to: null };

/**
 * `<tz-daily-range>` — a range of days with the same hours on each, from
 * @tzslot/dom, spoken in Angular. "The 3rd to the 7th, 09:00 to 17:00."
 */
@Component({
  selector: 'tz-daily-range',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DailyRange), multi: true },
  ],
  template: '',
})
export class DailyRange implements ControlValueAccessor {
  readonly value = model<DailyRangeValue>(EMPTY);

  /** An IANA identifier. The hours are read on the clocks of this zone. */
  readonly timeZone = input.required<string>();
  readonly stepMinutes = input(30);
  /** The first and last times offered. */
  readonly minTime = input<string | undefined>(undefined);
  readonly maxTime = input<string | undefined>(undefined);
  readonly firstDayOfWeek = input<Weekday>(1);
  readonly locale = input<string | undefined>(undefined);
  readonly min = input<PlainDate | null>(null);
  readonly max = input<PlainDate | null>(null);
  readonly isDateDisabled = input<((date: PlainDate) => boolean) | undefined>(undefined);
  readonly renderCell = input<RenderCell | undefined>(undefined);
  readonly today = input<PlainDate>(Temporal.Now.plainDateISO());
  readonly disabled = input(false);

  /** Every day's window and the real total, once all four parts are chosen. */
  readonly summary = signal<DailyWindowsSummary | null>(null);

  protected readonly formDisabled = signal(false);
  private readonly messages = inject(TZSLOT_MESSAGES);

  private readonly settings = computed<Partial<DailyRangeSettings>>(() => ({
    value: this.value(),
    timeZone: this.timeZone(),
    stepMinutes: this.stepMinutes(),
    minTime: this.minTime(),
    maxTime: this.maxTime(),
    firstDayOfWeek: this.firstDayOfWeek(),
    locale: this.locale(),
    min: this.min(),
    max: this.max(),
    isDateDisabled: this.isDateDisabled(),
    renderCell: this.renderCell(),
    today: this.today(),
    disabled: this.disabled() || this.formDisabled(),
    messages: this.messages,
  }));

  /** Created before the required timeZone is bound; the first change detection fills it in. */
  private readonly range: DailyRangeInstance = createDailyRange(inject(ElementRef).nativeElement, {
    messages: this.messages,
    onChange: (next) => {
      this.value.set(next);
      this.onChange(next);
      this.onTouched();
    },
  });

  constructor() {
    effect(() => {
      this.range.update(this.settings());
      this.summary.set(this.range.summary);
    });
    inject(DestroyRef).onDestroy(() => this.range.destroy());
  }

  /** Clears all four parts and tells any form control about it. */
  clear(): void {
    this.range.clear();
  }

  // ── ControlValueAccessor ────────────────────────────────────

  private onChange: (value: DailyRangeValue) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: DailyRangeValue | null): void {
    this.value.set(value ?? EMPTY);
  }
  registerOnChange(fn: (value: DailyRangeValue) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
