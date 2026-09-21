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
import { TZSLOT_DEFAULTS } from './defaults.js';

import { Temporal } from '@tzslot/core';
import type { DailyWindowsSummary, PlainDate, Weekday } from '@tzslot/core';
import {
  createDailyRange,
  type DailyRangeInstance,
  type DailyRangeSettings,
  type DailyRangeValue,
  type RenderCell,
  type TimeLayout,
} from '@tzslot/dom';

export type { DailyRangeValue } from '@tzslot/dom';

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
  /** Set once for the application with provideTzslot(); a binding still wins. */
  private readonly defaults = inject(TZSLOT_DEFAULTS);

  readonly value = model<DailyRangeValue>(EMPTY);

  /**
   * An IANA identifier. Required in spirit: given here, it wins; left out, it
   * is the zone provideTzslot() settled for the application, and only when
   * nothing was settled anywhere does it fall back to the browser's — which
   * is a guess, and the one thing this library exists not to do silently.
   */
  readonly timeZone = input<string>(this.defaults.timeZone ?? Temporal.Now.timeZoneId());
  readonly stepMinutes = input(30);

  /** 'input' (default) for two compact fields, 'list' for times to click. */
  readonly timeLayout = input<TimeLayout>('input');

  /** 12-hour fields with an AM/PM button; the locale decides when unset. */
  readonly hour12 = input<boolean | undefined>(undefined);

  /** With timeLayout 'columns': minutes between the options. Every minute by default. */
  readonly minuteStep = input(1);
  /** The first and last times offered. */
  readonly minTime = input<string | undefined>(undefined);
  readonly maxTime = input<string | undefined>(undefined);
  readonly firstDayOfWeek = input<Weekday>(this.defaults.firstDayOfWeek ?? 1);
  readonly locale = input<string | undefined>(this.defaults.locale);
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
    timeLayout: this.timeLayout(),
    hour12: this.hour12(),
    minuteStep: this.minuteStep(),
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
    // The settings are read here, so the effect follows them; the call into the
    // widget runs untracked. A widget may answer by calling back — closing a
    // panel, say — and a callback that writes a signal inside an effect is an
    // error on Angular 18 (NG0600), and a hidden dependency on any version.
    effect(() => {
      const settings = this.settings();
      untracked(() => {
        this.range.update(settings);
        this.summary.set(this.range.summary);
      });
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
