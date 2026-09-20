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

import { Temporal, toPlainDate, fromPlainDate } from '@tzslot/core';
import type { PlainDate, Weekday, ValueShape, DateLike } from '@tzslot/core';
import {
  createDateField,
  type CalendarButton,
  type DateFieldInstance,
  type DateFieldSettings,
  type RenderCell,
  type FieldMode,
} from '@tzslot/dom';

export type { FieldMode } from '@tzslot/dom';

/**
 * `<tz-date-field>` — the field from @tzslot/dom, spoken in Angular.
 *
 * The trigger, the panel, its position, focus and theme are all drawn by
 * `createDateField`. This class maps inputs to `update()`, callbacks to
 * `valueChange`, `opened`, `closed` and form notifications, and a projected
 * `[tzIcon]` to the field's icon.
 */
@Component({
  selector: 'tz-date-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateField), multi: true },
  ],
  template: `<span #icon hidden><ng-content select="[tzIcon]" /></span>`,
})
export class DateField implements ControlValueAccessor, AfterViewInit {
  readonly value = model<PlainDate | null>(null);
  readonly mode = input<FieldMode>('popup');
  readonly placeholder = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly locale = input<string | undefined>(undefined);
  readonly firstDayOfWeek = input<Weekday>(1);
  readonly min = input<PlainDate | null>(null);
  readonly max = input<PlainDate | null>(null);
  readonly isDateDisabled = input<((date: PlainDate) => boolean) | undefined>(undefined);
  readonly disabled = input(false);

  /**
   * What the form control holds. 'temporal' by default; 'date' lets an
   * existing FormControl<Date> keep working untouched, which is the whole of a
   * flatpickr migration on most screens.
   */
  readonly valueAs = input<ValueShape>('temporal');

  /**
   * The zone used to turn a Date into a calendar day and back. Only consulted
   * when valueAs is 'date': which day an instant falls on depends on where you
   * are standing, so it is explicit rather than guessed.
   */
  readonly valueTimeZone = input<string>(Temporal.Now.timeZoneId());

  /** How the chosen date is written in the field. Defaults to the locale's medium form. */
  readonly displayWith = input<((date: PlainDate) => string) | undefined>(undefined);

  /** Passed to the calendar in the panel. */
  readonly renderCell = input<RenderCell | undefined>(undefined);

  /** A column of ISO week numbers down the left. */
  readonly weekNumbers = input(false);

  /** Under the panel's grid: `['today', 'clear']`. Choosing either closes it. */
  readonly buttons = input<readonly CalendarButton[]>([]);

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

  private readonly settings = computed<Partial<DateFieldSettings>>(() => ({
    value: this.value(),
    mode: this.mode(),
    placeholder: this.placeholder(),
    ariaLabel: this.ariaLabel(),
    locale: this.locale(),
    firstDayOfWeek: this.firstDayOfWeek(),
    min: this.min(),
    max: this.max(),
    isDateDisabled: this.isDateDisabled(),
    disabled: this.disabled() || this.formDisabled(),
    displayWith: this.displayWith(),
    renderCell: this.renderCell(),
    buttons: this.buttons(),
    weekNumbers: this.weekNumbers(),
    messages: this.messages,
  }));

  private readonly field: DateFieldInstance = createDateField(this.host, {
    ...untracked(this.settings),
    onChange: (date) => {
      this.value.set(date);
      this.onChange(date);
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
    // The settings are read here, so the effect follows them; the call into the
    // widget runs untracked. A widget may answer by calling back — closing a
    // panel, say — and a callback that writes a signal inside an effect is an
    // error on Angular 18 (NG0600), and a hidden dependency on any version.
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

  /**
   * Opening and closing are public so a ViewChild can drive the field — a
   * button elsewhere on the page, a wizard step, a keyboard shortcut.
   */
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

  private onChange: (value: PlainDate | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: DateLike | null): void {
    this.value.set(value === null || value === undefined ? null : toPlainDate(value, this.valueTimeZone()));
  }
  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = (date) => fn(fromPlainDate(date, this.valueAs(), this.valueTimeZone()));
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}

/** Kept here so the type is reachable without importing Temporal separately. */
export type { PlainDate as DateFieldValue };
export { Temporal };
