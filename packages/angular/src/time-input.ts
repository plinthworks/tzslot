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
import { TZSLOT_MESSAGES, type TzslotMessages } from './messages.js';
import { TZSLOT_DEFAULTS } from './defaults.js';

import { Temporal } from '@tzslot/core';
import type { PlainDate, PlainTime } from '@tzslot/core';
import { createTimeInput, type TimeInputInstance, type TimeInputSettings } from '@tzslot/dom';

/**
 * `<tz-time-input>` — the compact time field, spoken in Angular.
 *
 * Arrows, the wheel, the up and down keys, and typing. It holds a `PlainTime`:
 * a clock face, with no day and no zone. Given `date` and `timeZone` it knows
 * which day it stands on, so the arrows step over an hour that does not happen
 * and a time typed into the gap settles on the first moment that does.
 */
@Component({
  selector: 'tz-time-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Leaving the field counts as having answered it, even with nothing typed:
  // without it a `touched && invalid` message never appears for the reader who
  // looked at a required field and walked away.
  host: { '(focusout)': 'onTouched()' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TimeInput), multi: true },
  ],
  template: '',
})
export class TimeInput implements ControlValueAccessor {
  /** Set once for the application with provideTzslot(); a binding still wins. */
  private readonly defaults = inject(TZSLOT_DEFAULTS);

  /** The clock face chosen. */
  readonly value = model<PlainTime | null>(null);

  /** What one press of an arrow, or the wheel, moves the minutes by. */
  readonly stepMinutes = input(5);
  /** A twelve-hour field with AM/PM beside it; the locale decides when unset. */
  readonly hour12 = input<boolean | undefined>(undefined);
  /** The window the arrows and the typing stay inside. */
  readonly minTime = input<PlainTime | string | undefined>(undefined);
  readonly maxTime = input<PlainTime | string | undefined>(undefined);
  /** A BCP-47 tag. Decides twelve or twenty-four hours, and nothing else here. */
  readonly locale = input<string | undefined>(this.defaults.locale);
  /**
   * The day the field stands on. Without it it is a clock face and nothing
   * more; with it the two mornings a year stop being ordinary.
   */
  readonly date = input<PlainDate | string | null>(null);
  /** An IANA identifier. Left out, `provideTzslot` answers. */
  readonly timeZone = input<string | undefined>(this.defaults.timeZone);
  /**
   * `'boxed'` is a bordered field. `'bare'` drops the box and stacks the
   * arrows above and below the figures, which is how a panel draws it.
   */
  readonly variant = input<'boxed' | 'bare'>('boxed');
  readonly disabled = input(false);

  /**
   * The words the widget says itself — not the figures, which are the locale's.
   *
   * An application speaks one language, so the usual place to say it once is
   * `provideTzslotMessages(FR)` or `provideTzslot({ messages: FR })`, and that
   * is what this falls back to. Written on the tag it wins, which is what a
   * screen switching language while it runs needs.
   */
  readonly messages = input<TzslotMessages>(inject(TZSLOT_MESSAGES));

  protected readonly formDisabled = signal(false);

  private readonly settings = computed<Partial<TimeInputSettings>>(() => ({
    value: this.value(),
    stepMinutes: this.stepMinutes(),
    hour12: this.hour12(),
    minTime: this.minTime(),
    maxTime: this.maxTime(),
    locale: this.locale(),
    date: this.date(),
    timeZone: this.timeZone(),
    variant: this.variant(),
    disabled: this.disabled() || this.formDisabled(),
    messages: this.messages(),
  }));

  private readonly field: TimeInputInstance = createTimeInput(inject(ElementRef).nativeElement, {
    messages: this.messages(),
    onChange: (time) => {
      this.value.set(time);
      this.onChange(time);
      this.onTouched();
    },
  });

  constructor() {
    effect(() => {
      const settings = this.settings();
      untracked(() => this.field.update(settings));
    });
    inject(DestroyRef).onDestroy(() => this.field.destroy());
  }

  // ── ControlValueAccessor ────────────────────────────────────

  private onChange: (value: PlainTime | null) => void = () => {};
  protected onTouched: () => void = () => {};

  /** Typed `unknown`: a form holds what the application put there. */
  writeValue(value: unknown): void {
    this.value.set(
      value === null || value === undefined
        ? null
        : typeof value === 'string'
          ? Temporal.PlainTime.from(value)
          : (value as PlainTime),
    );
  }
  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = (next) => fn(next);
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
