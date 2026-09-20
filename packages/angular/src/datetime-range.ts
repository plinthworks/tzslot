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
  untracked,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { TZSLOT_MESSAGES } from './messages.js';

import type { PlainDate, PlainTime, Slot } from '@tzslot/core';
import {
  createDateTimeRange,
  type DateTimeRangeInstance,
  type DateTimeRangeSettings,
  type DateTimeRangeValue,
  type RenderCell,
  type TimeLayout,
  type CalendarButton,
} from '@tzslot/dom';

export type { DateTimeRangeValue } from '@tzslot/dom';

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
  /** How each end asks for its time: 'input', 'select' or 'list'. */
  readonly timeLayout = input<TimeLayout>('input');
  readonly stepMinutes = input(30);
  /** With 'select': minutes between the options. Every minute by default. */
  readonly minuteStep = input(1);
  readonly hour12 = input<boolean | undefined>(undefined);
  /** The time a newly chosen day starts at. Midnight by default. */
  readonly defaultTime = input<PlainTime | string>('00:00');
  /** Both ends can be typed into as well as chosen from. */
  readonly editable = input(true);
  /** A pattern for both ends — `yyyy-MM-dd HH:mm`. */
  readonly format = input<string | undefined>(undefined);
  readonly isDateDisabled = input<((date: PlainDate) => boolean) | undefined>(undefined);
  readonly renderCell = input<RenderCell | undefined>(undefined);
  readonly buttons = input<readonly CalendarButton[]>([]);
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
    timeLayout: this.timeLayout(),
    stepMinutes: this.stepMinutes(),
    minuteStep: this.minuteStep(),
    hour12: this.hour12(),
    defaultTime: this.defaultTime(),
    editable: this.editable(),
    format: this.format(),
    isDateDisabled: this.isDateDisabled(),
    renderCell: this.renderCell(),
    buttons: this.buttons(),
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
    // The settings are read here, so the effect follows them; the call into the
    // widget runs untracked. A widget may answer by calling back — closing a
    // panel, say — and a callback that writes a signal inside an effect is an
    // error on Angular 18 (NG0600), and a hidden dependency on any version.
    effect(() => {
      const settings = this.settings();
      untracked(() => this.range.update(settings));
    });
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
