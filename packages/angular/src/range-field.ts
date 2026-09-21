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
import { TZSLOT_MESSAGES } from './messages.js';
import { TZSLOT_DEFAULTS } from './defaults.js';

import { Temporal } from '@tzslot/core';
import type { PlainDate, PresetName, Weekday } from '@tzslot/core';
import {
  createRangeField,
  type FieldMode,
  type RangeFieldInstance,
  type RangeFieldSettings,
  type RangeFieldValue,
  type RangePreset,
  type RenderCell,
} from '@tzslot/dom';

import type { ShiftStep } from '@tzslot/core';

export type { RangeFieldValue, RangePreset } from '@tzslot/dom';

const EMPTY: RangeFieldValue = { start: null, end: null, allDay: true };

/**
 * `<tz-range-field>` — one field for a period, from @tzslot/dom, spoken in
 * Angular. Named ranges beside the calendar, months side by side, and whole
 * days or moments.
 */
@Component({
  selector: 'tz-range-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RangeField), multi: true },
  ],
  template: '',
})
export class RangeField implements ControlValueAccessor {
  /** Set once for the application with provideTzslot(); a binding still wins. */
  private readonly defaults = inject(TZSLOT_DEFAULTS);

  readonly value = model<RangeFieldValue>(EMPTY);

  /**
   * An IANA identifier. Required in spirit: given here, it wins; left out, it
   * is the zone provideTzslot() settled for the application, and only when
   * nothing was settled anywhere does it fall back to the browser's — which
   * is a guess, and the one thing this library exists not to do silently.
   */
  readonly timeZone = input<string>(this.defaults.timeZone ?? Temporal.Now.timeZoneId());

  /** Named ranges beside the calendar: the built-in names, or your own. */
  readonly presets = input<readonly (PresetName | RangePreset)[]>([
    'today',
    'yesterday',
    'last7Days',
    'last30Days',
    'thisMonth',
    'lastMonth',
  ]);

  /** Times as well as days, with a switch back to whole days. */
  readonly showTime = input(false);
  readonly stepMinutes = input(30);
  /** Nothing is reported until Apply is pressed. */
  readonly confirm = input(false);
  /**
   * Arrows that step the whole period without opening the panel. `false` —
   * the default — draws none. `'auto'` moves by what is selected; a duration
   * such as `{ months: 3 }` imposes the step.
   */
  readonly shift = input<ShiftStep | false>(false);
  readonly months = input(2);
  readonly weekNumbers = input(false);
  readonly firstDayOfWeek = input<Weekday>(this.defaults.firstDayOfWeek ?? 1);
  readonly mode = input<FieldMode>('popup');
  readonly placeholder = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly locale = input<string | undefined>(this.defaults.locale);
  readonly min = input<PlainDate | null>(null);
  readonly max = input<PlainDate | null>(null);
  readonly isDateDisabled = input<((date: PlainDate) => boolean) | undefined>(undefined);
  readonly renderCell = input<RenderCell | undefined>(undefined);
  readonly today = input<PlainDate>(Temporal.Now.plainDateISO());
  readonly disabled = input(false);
  /** A pattern for each end — `yyyy-MM-dd`. */
  readonly format = input<string | undefined>(undefined);
  readonly displayWith = input<((value: RangeFieldValue, timeZone: string) => string) | undefined>(undefined);

  readonly opened = output<void>();
  readonly closed = output<void>();

  /** Whether the panel is showing. Readable from a ViewChild. */
  readonly isOpen = signal(false);
  protected readonly formDisabled = signal(false);
  private gone = false;

  private readonly messages = inject(TZSLOT_MESSAGES);

  private readonly settings = computed<Partial<RangeFieldSettings>>(() => ({
    value: this.value(),
    timeZone: this.timeZone(),
    presets: this.presets(),
    showTime: this.showTime(),
    stepMinutes: this.stepMinutes(),
    confirm: this.confirm(),
    shift: this.shift(),
    months: this.months(),
    weekNumbers: this.weekNumbers(),
    firstDayOfWeek: this.firstDayOfWeek(),
    mode: this.mode(),
    placeholder: this.placeholder(),
    ariaLabel: this.ariaLabel(),
    locale: this.locale(),
    min: this.min(),
    max: this.max(),
    isDateDisabled: this.isDateDisabled(),
    renderCell: this.renderCell(),
    today: this.today(),
    disabled: this.disabled() || this.formDisabled(),
    format: this.format(),
    displayWith: this.displayWith(),
    messages: this.messages,
  }));

  /** Created before the required timeZone is bound; the first change detection fills it in. */
  private readonly field: RangeFieldInstance = createRangeField(inject(ElementRef).nativeElement, {
    messages: this.messages,
    onChange: (value) => {
      this.value.set(value);
      this.onChange(value);
      this.onTouched();
    },
    onOpen: () => {
      this.isOpen.set(true);
      if (!this.gone) this.opened.emit();
    },
    onClose: () => {
      this.isOpen.set(false);
      if (!this.gone) this.closed.emit();
    },
  });

  constructor() {
    effect(() => {
      const settings = this.settings();
      untracked(() => this.field.update(settings));
    });
    inject(DestroyRef).onDestroy(() => {
      this.gone = true;
      this.field.destroy();
    });
  }

  open(): void {
    this.field.open();
  }
  close(): void {
    this.field.close();
  }
  toggle(): void {
    this.field.toggle();
  }
  /** Empties the period and tells any form control about it. */
  clear(): void {
    this.field.clear();
  }

  // ── ControlValueAccessor ────────────────────────────────────

  private onChange: (value: RangeFieldValue) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: RangeFieldValue | null): void {
    this.value.set(value ?? EMPTY);
  }
  registerOnChange(fn: (value: RangeFieldValue) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
