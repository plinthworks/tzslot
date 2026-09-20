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
  viewChild,
  type AfterViewInit,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { TZSLOT_MESSAGES } from './messages.js';

import { Temporal, toInstant, fromInstant } from '@tzslot/core';
import type { Instant, InstantLike, PlainDate, PlainTime, Slot, ValueShape, Weekday } from '@tzslot/core';
import {
  createDateTimeField,
  type CalendarButton,
  type DateTimeFieldInstance,
  type DateTimeFieldSettings,
  type FieldMode,
  type RenderCell,
  type TimeLayout,
} from '@tzslot/dom';

/**
 * `<tz-datetime-field>` — a field that opens a calendar and a time, from
 * @tzslot/dom, spoken in Angular.
 *
 * Its value is an Instant, so it says which moment was meant even when the
 * clock face does not: a time the zone skips is moved on and explained, and
 * one that happens twice is offered by its two offsets rather than guessed.
 */
@Component({
  selector: 'tz-datetime-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateTimeField), multi: true },
  ],
  template: `<span #icon hidden><ng-content select="[tzIcon]" /></span>`,
})
export class DateTimeField implements ControlValueAccessor, AfterViewInit {
  readonly value = model<Instant | null>(null);

  /** An IANA identifier. The date and the time are read on this zone's clocks. */
  readonly timeZone = input.required<string>();

  readonly mode = input<FieldMode>('popup');
  readonly placeholder = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly locale = input<string | undefined>(undefined);
  readonly firstDayOfWeek = input<Weekday>(1);
  readonly min = input<PlainDate | null>(null);
  readonly max = input<PlainDate | null>(null);
  readonly isDateDisabled = input<((date: PlainDate) => boolean) | undefined>(undefined);

  /** 'input' (default) for a compact time field, 'list' for the day's times. */
  readonly timeLayout = input<TimeLayout>('input');
  readonly stepMinutes = input(30);
  /** With timeLayout 'columns': minutes between the options. Every minute by default. */
  readonly minuteStep = input(1);
  readonly minTime = input<PlainTime | string | undefined>(undefined);
  readonly maxTime = input<PlainTime | string | undefined>(undefined);
  /** Only with timeLayout 'list': rules out slots while still showing them. */
  readonly isSlotDisabled = input<((slot: Omit<Slot, 'disabled'>) => boolean) | undefined>(undefined);
  readonly hour12 = input<boolean | undefined>(undefined);

  /** The time a newly chosen day starts at. Midnight by default. */
  readonly defaultTime = input<PlainTime | string>('00:00');

  readonly disabled = input(false);

  /** The text can be typed as well as chosen. On by default. */
  readonly editable = input(true);

  /** Separators appear as the figures are typed, like a card number. On by default. */
  readonly mask = input(true);

  /** A pattern — `yyyy-MM-dd HH:mm` — when the shape matters more than the reader. */
  readonly format = input<string | undefined>(undefined);

  /** Used when the field is not typable and no pattern is given. */
  readonly dateStyle = input<'full' | 'long' | 'medium' | 'short'>('medium');
  readonly timeStyle = input<'full' | 'long' | 'medium' | 'short'>('short');

  /** The last word on the text. Given both, this one wins. */
  readonly displayWith = input<((value: Instant, timeZone: string) => string) | undefined>(undefined);
  readonly today = input<PlainDate>(Temporal.Now.plainDateISO());
  readonly renderCell = input<RenderCell | undefined>(undefined);
  readonly buttons = input<readonly CalendarButton[]>([]);

  /** What the form control holds: a Temporal Instant, a Date, or an ISO string. */
  readonly valueAs = input<ValueShape>('temporal');

  readonly opened = output<void>();
  readonly closed = output<void>();

  /** Whether the panel is showing. Readable from a ViewChild. */
  readonly isOpen = signal(false);
  protected readonly formDisabled = signal(false);
  /** Set while the component is being destroyed, so no output fires after it. */
  private gone = false;

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly messages = inject(TZSLOT_MESSAGES);
  private readonly iconSlot = viewChild.required<ElementRef<HTMLElement>>('icon');

  private readonly settings = computed<Partial<DateTimeFieldSettings>>(() => ({
    value: this.value(),
    timeZone: this.timeZone(),
    mode: this.mode(),
    placeholder: this.placeholder(),
    ariaLabel: this.ariaLabel(),
    locale: this.locale(),
    firstDayOfWeek: this.firstDayOfWeek(),
    min: this.min(),
    max: this.max(),
    isDateDisabled: this.isDateDisabled(),
    timeLayout: this.timeLayout(),
    stepMinutes: this.stepMinutes(),
    minuteStep: this.minuteStep(),
    minTime: this.minTime(),
    maxTime: this.maxTime(),
    isSlotDisabled: this.isSlotDisabled(),
    hour12: this.hour12(),
    defaultTime: this.defaultTime(),
    disabled: this.disabled() || this.formDisabled(),
    editable: this.editable(),
    mask: this.mask(),
    format: this.format(),
    dateStyle: this.dateStyle(),
    timeStyle: this.timeStyle(),
    displayWith: this.displayWith(),
    today: this.today(),
    renderCell: this.renderCell(),
    buttons: this.buttons(),
    messages: this.messages,
  }));

  /** Created before the required timeZone is bound; the first change detection fills it in. */
  private readonly field: DateTimeFieldInstance = createDateTimeField(this.host, {
    messages: this.messages,
    onChange: (value) => {
      this.value.set(value);
      this.onChange(value);
    },
    onOpen: () => {
      this.isOpen.set(true);
      this.onTouched();
      if (!this.gone) this.opened.emit();
    },
    onClose: () => {
      this.isOpen.set(false);
      // Destroying the component closes its panel; an output that fires then
      // is an emit on a destroyed ref (NG0953), and nothing is listening.
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

  ngAfterViewInit(): void {
    const slot = this.iconSlot().nativeElement;
    if (Array.from(slot.childNodes).some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent?.trim())) {
      const fragment = this.host.ownerDocument.createDocumentFragment();
      fragment.append(...Array.from(slot.childNodes));
      this.field.setIcon(fragment);
    }
  }

  toggle(): void {
    this.field.toggle();
  }
  /** No-op when already open. */
  open(): void {
    this.field.open();
  }
  close(): void {
    this.field.close();
  }
  /** Clears the selection and tells any form control about it. */
  clear(): void {
    this.field.clear();
  }

  // ── ControlValueAccessor ────────────────────────────────────

  private onChange: (value: Instant | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: InstantLike | null): void {
    this.value.set(value === null || value === undefined ? null : toInstant(value));
  }
  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = (value) => fn(fromInstant(value, this.valueAs()));
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
