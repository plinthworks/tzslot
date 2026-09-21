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
  viewChild,
  type AfterViewInit,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { TZSLOT_MESSAGES } from './messages.js';
import { TZSLOT_DEFAULTS } from './defaults.js';

import { Temporal, toPlainDate, fromPlainDate } from '@tzslot/core';
import type { PlainDate, Weekday, ValueShape, DateLike } from '@tzslot/core';
import {
  createMultiDate,
  type CalendarButton,
  type CalendarView,
  type MultiDateInstance,
  type MultiDateSettings,
  type RenderCell,
  type YearMonth,
} from '@tzslot/dom';

/**
 * `<tz-multi-date>` — several days, not necessarily next to each other, from
 * @tzslot/dom, spoken in Angular. The value is always in date order.
 */
@Component({
  selector: 'tz-multi-date',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MultiDate), multi: true },
  ],
  template: `
    <span #prev hidden><ng-content select="[tzPrev]" /></span>
    <span #next hidden><ng-content select="[tzNext]" /></span>
  `,
})
export class MultiDate implements ControlValueAccessor, AfterViewInit {
  /** Set once for the application with provideTzslot(); a binding still wins. */
  private readonly defaults = inject(TZSLOT_DEFAULTS);

  /** The chosen days, in date order. Two-way: `[(value)]`. */
  readonly value = model<readonly PlainDate[]>([]);

  /** Once this many are chosen, the other days stop taking clicks. */
  readonly maxDates = input<number | undefined>(undefined);

  readonly firstDayOfWeek = input<Weekday>(this.defaults.firstDayOfWeek ?? 1);
  readonly locale = input<string | undefined>(this.defaults.locale);
  readonly min = input<PlainDate | null>(null);
  readonly max = input<PlainDate | null>(null);
  readonly disabled = input(false);
  readonly isDateDisabled = input<((date: PlainDate) => boolean) | undefined>(undefined);
  readonly today = input<PlainDate>(Temporal.Now.plainDateISO());
  readonly view = model<CalendarView>('days');
  readonly renderCell = input<RenderCell | undefined>(undefined);
  /** A column of ISO week numbers down the left. */
  readonly weekNumbers = input(false);

  readonly buttons = input<readonly CalendarButton[]>([]);

  /** What the form control holds, each day as a Temporal date, a Date, or an ISO string. */
  readonly valueAs = input<ValueShape>(this.defaults.valueAs ?? 'temporal');
  /** The zone a Date is read in. Only consulted when valueAs is 'date'. */
  readonly valueTimeZone = input<string>(this.defaults.timeZone ?? Temporal.Now.timeZoneId());

  protected readonly formDisabled = signal(false);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly messages = inject(TZSLOT_MESSAGES);
  private readonly prevSlot = viewChild.required<ElementRef<HTMLElement>>('prev');
  private readonly nextSlot = viewChild.required<ElementRef<HTMLElement>>('next');

  private readonly settings = computed<Partial<MultiDateSettings>>(() => ({
    value: this.value(),
    maxDates: this.maxDates(),
    view: this.view(),
    firstDayOfWeek: this.firstDayOfWeek(),
    locale: this.locale(),
    min: this.min(),
    max: this.max(),
    disabled: this.disabled() || this.formDisabled(),
    isDateDisabled: this.isDateDisabled(),
    today: this.today(),
    renderCell: this.renderCell(),
    buttons: this.buttons(),
    weekNumbers: this.weekNumbers(),
    messages: this.messages,
  }));

  private readonly calendar: MultiDateInstance = createMultiDate(this.host, {
    ...untracked(this.settings),
    onChange: (dates) => {
      this.value.set(dates);
      this.onChange(dates);
      this.onTouched();
    },
    onViewChange: (view) => this.view.set(view),
  });

  constructor() {
    // The settings are read here, so the effect follows them; the call into the
    // widget runs untracked. A widget may answer by calling back — closing a
    // panel, say — and a callback that writes a signal inside an effect is an
    // error on Angular 18 (NG0600), and a hidden dependency on any version.
    effect(() => {
      const settings = this.settings();
      untracked(() => this.calendar.update(settings));
    });
    inject(DestroyRef).onDestroy(() => this.calendar.destroy());
  }

  ngAfterViewInit(): void {
    const projected = (slot: ElementRef<HTMLElement>) => {
      const nodes = Array.from(slot.nativeElement.childNodes);
      if (!nodes.some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent?.trim())) return undefined;
      const fragment = this.host.ownerDocument.createDocumentFragment();
      fragment.append(...nodes);
      return fragment;
    };
    this.calendar.setIcons({ prev: projected(this.prevSlot()), next: projected(this.nextSlot()) });
  }

  /** Moves the grid without choosing anything. */
  goTo(date: PlainDate | YearMonth): void {
    this.calendar.goTo({ year: date.year, month: date.month });
  }

  /** Empties the selection and tells any form control about it. */
  clear(): void {
    this.calendar.clear();
  }

  // ── ControlValueAccessor ────────────────────────────────────

  private onChange: (value: readonly PlainDate[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: readonly DateLike[] | null): void {
    const days = (value ?? []).map((d) => toPlainDate(d, this.valueTimeZone()));
    this.value.set([...days].sort(Temporal.PlainDate.compare));
  }
  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = (dates) =>
      fn(dates.map((d) => fromPlainDate(d, this.valueAs(), this.valueTimeZone())));
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
