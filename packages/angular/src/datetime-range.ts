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

import type { PlainDate, Slot } from '../../core/src/index.js';
import {
  createDateTimeRange,
  type DateTimeRangeInstance,
  type DateTimeRangeSettings,
  type DateTimeRangeValue,
} from '../../dom/src/index.js';

export type { DateTimeRangeValue } from '../../dom/src/index.js';

const EMPTY: DateTimeRangeValue = { start: null, end: null };

/**
 * `<tz-datetime-range>` — the interval from @tzslot/dom, spoken in Angular.
 *
 * The duration shown is the measured one, and when it disagrees with the clock
 * faces the widget says so in words.
 */
@Component({
  selector: 'tz-datetime-range',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateTimeRange), multi: true },
  ],
  template: '',
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

  readonly startLabel = input<string | undefined>(undefined);
  readonly endLabel = input<string | undefined>(undefined);
  readonly endBeforeStartMessage = input<string | undefined>(undefined);

  protected readonly formDisabled = signal(false);
  private readonly messages = inject(TZSLOT_MESSAGES);

  private readonly settings = computed<Partial<DateTimeRangeSettings>>(() => ({
    value: this.value(),
    timeZone: this.timeZone(),
    stepMinutes: this.stepMinutes(),
    minTime: this.minTime(),
    maxTime: this.maxTime(),
    isSlotDisabled: this.isSlotDisabled(),
    min: this.min(),
    max: this.max(),
    locale: this.locale(),
    disabled: this.disabled() || this.formDisabled(),
    startLabel: this.startLabel(),
    endLabel: this.endLabel(),
    endBeforeStartMessage: this.endBeforeStartMessage(),
    messages: this.messages,
  }));

  /** Created before the required timeZone is bound; the first change detection fills it in. */
  private readonly range: DateTimeRangeInstance = createDateTimeRange(inject(ElementRef).nativeElement, {
    messages: this.messages,
    onChange: (next) => {
      this.value.set(next);
      this.onChange(next);
      this.onTouched();
    },
  });

  constructor() {
    effect(() => this.range.update(this.settings()));
    inject(DestroyRef).onDestroy(() => this.range.destroy());
  }

  /** Clears the selection and tells any form control about it. */
  clear(): void {
    this.range.clear();
  }

  // ── ControlValueAccessor ────────────────────────────────────

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
