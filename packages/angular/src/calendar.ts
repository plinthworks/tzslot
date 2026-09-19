import {
  ChangeDetectionStrategy,
  Component,
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
  type OnDestroy,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { TZSLOT_MESSAGES } from './messages.js';

import { Temporal, toPlainDate, fromPlainDate } from '@tzslot/core';
import type { PlainDate, Weekday, ValueShape, DateLike } from '@tzslot/core';
import {
  createCalendar,
  type CalendarButton,
  type CalendarInstance,
  type CalendarSettings,
  type RenderCell,
  type CalendarView,
  type YearMonth,
} from '@tzslot/dom';

export type { CalendarView } from '@tzslot/dom';

/**
 * `<tz-calendar>` — the calendar from @tzslot/dom, spoken in Angular.
 *
 * Everything the user sees and does is drawn by `createCalendar`. This class
 * only translates: inputs and models into `update()`, the calendar's callbacks
 * into `valueChange` and form notifications, projected content into icons.
 */
@Component({
  selector: 'tz-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Calendar), multi: true },
  ],
  // The slots only collect projected icons; the calendar moves them into its
  // buttons and the slots stay empty and hidden.
  template: `
    <span #prev hidden><ng-content select="[tzPrev]" /></span>
    <span #next hidden><ng-content select="[tzNext]" /></span>
  `,
})
export class Calendar implements ControlValueAccessor, AfterViewInit, OnDestroy {
  /** The selected day. Two-way: `[(value)]`. */
  readonly value = model<PlainDate | null>(null);

  /** Monday by default, as ISO-8601 numbers the week. */
  readonly firstDayOfWeek = input<Weekday>(1);

  /** A BCP-47 tag for the month and weekday names. Defaults to the browser's. */
  readonly locale = input<string | undefined>(undefined);

  readonly min = input<PlainDate | null>(null);
  readonly max = input<PlainDate | null>(null);
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

  /** Rules out individual days inside the range: closures, weekends, full days. */
  readonly isDateDisabled = input<((date: PlainDate) => boolean) | undefined>(undefined);

  /** Today, injectable so a test does not depend on the day it runs. */
  readonly today = input<PlainDate>(Temporal.Now.plainDateISO());

  /**
   * Which level the grid is choosing between. A model, so a consumer can open
   * straight on years — a birthdate picker should not start on this month.
   */
  readonly view = model<CalendarView>('days');

  /** 'months' turns this into a month picker, 'years' into a year picker. */
  readonly minView = input<CalendarView>('days');

  /** Adds to each day: a price, places left, a class, a reason to rule it out. */
  readonly renderCell = input<RenderCell | undefined>(undefined);

  /** Buttons under the grid: `['today', 'clear']`. None by default. */
  readonly buttons = input<readonly CalendarButton[]>([]);

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly messages = inject(TZSLOT_MESSAGES);
  private readonly prevSlot = viewChild.required<ElementRef<HTMLElement>>('prev');
  private readonly nextSlot = viewChild.required<ElementRef<HTMLElement>>('next');
  protected readonly formDisabled = signal(false);

  private readonly settings = computed<Partial<CalendarSettings>>(() => ({
    value: this.value(),
    view: this.view(),
    minView: this.minView(),
    firstDayOfWeek: this.firstDayOfWeek(),
    locale: this.locale(),
    min: this.min(),
    max: this.max(),
    disabled: this.disabled() || this.formDisabled(),
    isDateDisabled: this.isDateDisabled(),
    today: this.today(),
    renderCell: this.renderCell(),
    buttons: this.buttons(),
    messages: this.messages,
  }));

  /**
   * Drawn at construction, so the cells exist as soon as the component does —
   * as they did when this was a template. Inputs are not bound yet at this
   * point; the effect below brings them in on the first change detection.
   */
  private readonly calendar: CalendarInstance = createCalendar(this.host, {
    ...untracked(this.settings),
    onChange: (date) => {
      this.value.set(date);
      this.onChange(date);
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
  }

  /** Projected content only exists once the view does. */
  ngAfterViewInit(): void {
    this.calendar.setIcons({
      prev: this.projected(this.prevSlot()),
      next: this.projected(this.nextSlot()),
    });
  }

  ngOnDestroy(): void {
    this.calendar.destroy();
  }

  /** Moves the grid without selecting anything — flatpickr's setViewDate. */
  goTo(date: PlainDate | YearMonth): void {
    this.calendar.goTo({ year: date.year, month: date.month });
  }

  /** Clears the selection and tells any form control about it. */
  clear(): void {
    this.calendar.clear();
  }

  /** Whatever was projected into a slot, or undefined so the default chevron stays. */
  private projected(slot: ElementRef<HTMLElement>): DocumentFragment | undefined {
    const nodes = Array.from(slot.nativeElement.childNodes);
    if (!nodes.some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent?.trim())) return undefined;
    const fragment = this.host.ownerDocument.createDocumentFragment();
    fragment.append(...nodes);
    return fragment;
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
