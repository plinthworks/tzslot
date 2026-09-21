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
import type { Instant, PlainDate, Slot } from '@tzslot/core';
import {
  createTimeSlots,
  getSlotChoices,
  type SlotChoice,
  type TimeSlotsInstance,
  type TimeSlotsSettings,
} from '@tzslot/dom';

export type { SlotChoice } from '@tzslot/dom';

/**
 * `<tz-time-slots>` — the slot list from @tzslot/dom, spoken in Angular.
 *
 * What it selects is an `Instant`, never a wall time. A wall time is what a
 * clock shows; an instant is when it happened. Only one of those can be stored.
 */
@Component({
  selector: 'tz-time-slots',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TimeSlotPicker), multi: true },
  ],
  template: '',
})
export class TimeSlotPicker implements ControlValueAccessor {
  /** Set once for the application with provideTzslot(); a binding still wins. */
  private readonly defaults = inject(TZSLOT_DEFAULTS);

  /** The day to list, as a PlainDate or an ISO date string. */
  readonly date = input.required<PlainDate | string>();

  /**
   * An IANA identifier. Required in spirit: given here, it wins; left out, it
   * is the zone provideTzslot() settled for the application, and only when
   * nothing was settled anywhere does it fall back to the browser's — which
   * is a guess, and the one thing this library exists not to do silently.
   */
  readonly timeZone = input<string>(this.defaults.timeZone ?? Temporal.Now.timeZoneId());

  readonly stepMinutes = input(30);

  /** The working day. Slots outside these bounds are not produced at all. */
  readonly minTime = input<string | undefined>(undefined);
  readonly maxTime = input<string | undefined>(undefined);

  /** Rules out individual slots while still showing them: booked, over capacity. */
  readonly isDisabled = input<((slot: Omit<Slot, 'disabled'>) => boolean) | undefined>(undefined);

  /** Leave out the times that cannot happen, rather than showing them struck through. */
  readonly skipNonExistent = input(false);

  readonly disabled = input(false);

  /** What is selected, as a moment. Two-way: `[(value)]`. */
  readonly value = model<Instant | null>(null);

  readonly ariaLabel = input<string | undefined>(undefined);
  readonly missingLabel = input<string | undefined>(undefined);
  readonly emptyLabel = input<string | undefined>(undefined);

  /** The rows listed, one per selectable moment: an ambiguous time gives two. */
  readonly choices = computed<SlotChoice[]>(() =>
    getSlotChoices(this.date(), this.timeZone(), {
      stepMinutes: this.stepMinutes(),
      skipNonExistent: this.skipNonExistent(),
      ...(this.minTime() !== undefined ? { minTime: this.minTime()! } : {}),
      ...(this.maxTime() !== undefined ? { maxTime: this.maxTime()! } : {}),
      ...(this.isDisabled() !== undefined ? { isDisabled: this.isDisabled()! } : {}),
    }),
  );

  protected readonly formDisabled = signal(false);
  private readonly messages = inject(TZSLOT_MESSAGES);

  private readonly settings = computed<Partial<TimeSlotsSettings>>(() => ({
    date: this.date(),
    timeZone: this.timeZone(),
    stepMinutes: this.stepMinutes(),
    minTime: this.minTime(),
    maxTime: this.maxTime(),
    isDisabled: this.isDisabled(),
    skipNonExistent: this.skipNonExistent(),
    disabled: this.disabled() || this.formDisabled(),
    value: this.value(),
    ariaLabel: this.ariaLabel(),
    missingLabel: this.missingLabel(),
    emptyLabel: this.emptyLabel(),
    messages: this.messages,
  }));

  /**
   * Created empty: `date` and `timeZone` are required inputs, which cannot be
   * read before they are bound. The first change detection fills it in.
   */
  private readonly slots: TimeSlotsInstance = createTimeSlots(inject(ElementRef).nativeElement, {
    messages: this.messages,
    onChange: (instant) => {
      this.value.set(instant);
      this.onChange(instant);
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
      untracked(() => this.slots.update(settings));
    });
    inject(DestroyRef).onDestroy(() => this.slots.destroy());
  }

  /** Clears the selection and tells any form control about it. */
  clear(): void {
    this.slots.clear();
  }

  // ── ControlValueAccessor ────────────────────────────────────

  private onChange: (value: Instant | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: Instant | null): void {
    this.value.set(value ?? null);
  }
  registerOnChange(fn: (value: Instant | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
