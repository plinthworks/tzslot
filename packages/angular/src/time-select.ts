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
  output,
  signal,
  untracked,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { TZSLOT_MESSAGES, type TzslotMessages } from './messages.js';
import { TZSLOT_DEFAULTS } from './defaults.js';

import { Temporal } from '@tzslot/core';
import type { PlainDate, PlainTime } from '@tzslot/core';
import { createTimeSelect, type TimeSelectInstance, type TimeSelectSettings } from '@tzslot/dom';

/**
 * `<tz-time-select>` — an hour menu and a minute menu, spoken in Angular.
 *
 * What it holds is a `PlainTime`: a clock face, with no day and no zone. Give
 * it `date` and `timeZone` and the menus show that day as the zone really has
 * it — the hour that is skipped is absent, the hour that happens twice is
 * offered twice — and `offsetChange` says which of the two was taken.
 *
 * A screen that fills two of these from a list built by hand is the screen
 * this replaces: walking a day hour by hand and guessing the transitions is
 * where the two mornings a year go wrong.
 */
@Component({
  selector: 'tz-time-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TimeSelect), multi: true },
  ],
  template: '',
})
export class TimeSelect implements ControlValueAccessor {
  /** Set once for the application with provideTzslot(); a binding still wins. */
  private readonly defaults = inject(TZSLOT_DEFAULTS);

  /** The clock face chosen. */
  readonly value = model<PlainTime | null>(null);

  /**
   * Which reading of an ambiguous time is held, as `+02:00` or `+01:00`.
   *
   * It means nothing on an ordinary hour and is ignored there. On the morning
   * an hour happens twice it is the difference between two moments an hour
   * apart, so a screen that stores instants has to carry it.
   */
  readonly offset = model<string | null>(null);

  /**
   * The day the menus stand on. Without it they are a plain clock face; with
   * it they are that day as the zone has it.
   */
  readonly date = input<PlainDate | string | null>(null);

  /** An IANA identifier. Left out, `provideTzslot` answers. */
  readonly timeZone = input<string | undefined>(this.defaults.timeZone);

  /** Minutes between the options of the minute menu. */
  readonly minuteStep = input(1);
  /** Hours between the options of the hour menu. */
  readonly hourStep = input(1);
  /** The first and last times offered. */
  readonly minTime = input<PlainTime | string | undefined>(undefined);
  readonly maxTime = input<PlainTime | string | undefined>(undefined);
  /**
   * How the repeated hour is shown: `'named'` writes it once and names the
   * reading in force underneath, `'marked'` puts both in the menu as `02` and
   * `02*`.
   */
  readonly readingStyle = input<'named' | 'marked'>('named');
  /** A BCP-47 tag. Decides twelve or twenty-four hours, and nothing else here. */
  readonly locale = input<string | undefined>(this.defaults.locale);
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

  /** The reading taken, each time the value changes. */
  readonly offsetChange = output<string | null>();

  protected readonly formDisabled = signal(false);

  private readonly settings = computed<Partial<TimeSelectSettings>>(() => ({
    value: this.value(),
    offset: this.offset(),
    date: this.date(),
    timeZone: this.timeZone(),
    minuteStep: this.minuteStep(),
    hourStep: this.hourStep(),
    minTime: this.minTime(),
    maxTime: this.maxTime(),
    readingStyle: this.readingStyle(),
    locale: this.locale(),
    disabled: this.disabled() || this.formDisabled(),
    messages: this.messages(),
  }));

  private readonly menus: TimeSelectInstance = createTimeSelect(inject(ElementRef).nativeElement, {
    messages: this.messages(),
    onChange: (time, offset) => {
      this.value.set(time);
      this.offset.set(offset);
      this.offsetChange.emit(offset);
      this.onChange(time);
      this.onTouched();
    },
  });

  constructor() {
    // The settings are read here so the effect follows them; the call into the
    // widget runs untracked, because a widget may answer by calling back and a
    // callback that writes a signal inside an effect is an error on Angular 18.
    effect(() => {
      const settings = this.settings();
      untracked(() => this.menus.update(settings));
    });
    inject(DestroyRef).onDestroy(() => this.menus.destroy());
  }

  // ── ControlValueAccessor ────────────────────────────────────

  private onChange: (value: PlainTime | null) => void = () => {};
  private onTouched: () => void = () => {};

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
