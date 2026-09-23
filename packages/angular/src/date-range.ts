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
import { TZSLOT_MESSAGES, type TzslotMessages } from './messages.js';
import { TZSLOT_DEFAULTS } from './defaults.js';

import { Temporal } from '@tzslot/core';
import type { PlainDate, Weekday } from '@tzslot/core';
import {
  createDateRange,
  type DateRangeInstance,
  type DateRangeSettings,
  type DateRangeValue,
  type RenderCell,
} from '@tzslot/dom';

export type { DateRangeValue } from '@tzslot/dom';

const EMPTY: DateRangeValue = { start: null, end: null };

/** `<tz-date-range>` — the range from @tzslot/dom, spoken in Angular. */
@Component({
  selector: 'tz-date-range',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateRange), multi: true },
  ],
  template: `
    <span #prev hidden><ng-content select="[tzPrev]" /></span>
    <span #next hidden><ng-content select="[tzNext]" /></span>
  `,
})
export class DateRange implements ControlValueAccessor, AfterViewInit {
  /** Set once for the application with provideTzslot(); a binding still wins. */
  private readonly defaults = inject(TZSLOT_DEFAULTS);

  readonly value = model<DateRangeValue>(EMPTY);

  /** Left out, the locale decides — see `provideTzslot` to settle it once. */
  readonly firstDayOfWeek = input<Weekday | undefined>(this.defaults.firstDayOfWeek);
  readonly locale = input<string | undefined>(this.defaults.locale);
  readonly min = input<PlainDate | null>(null);
  readonly max = input<PlainDate | null>(null);
  readonly disabled = input(false);
  readonly isDateDisabled = input<((date: PlainDate) => boolean) | undefined>(undefined);
  readonly today = input<PlainDate>(Temporal.Now.plainDateISO());

  /** Refuse a range that steps over a day isDateDisabled rules out. On by default. */
  readonly blockAcrossDisabled = input(true);

  /** A column of ISO week numbers down the left. */
  readonly weekNumbers = input(false);

  /** How many months to show side by side. Two is what most ranges want. */
  readonly months = input(1);

  /** Adds to each day: a price per night, places left, a class of your own. */
  readonly renderCell = input<RenderCell | undefined>(undefined);

  /** Overrides the bundle for this one instance. */
  readonly rangeSpansBlockedMessage = input<string | undefined>(undefined);

  protected readonly formDisabled = signal(false);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  /**
   * The words the widget says itself — not the month names, which come from
   * `locale`.
   *
   * An application speaks one language, so the usual place to say it once is
   * `provideTzslotMessages(FR)` or `provideTzslot({ messages: FR })`, and that
   * is what this falls back to. Written on the tag it wins, which is what a
   * screen switching language while it runs needs: an injected value is read
   * once and never changes again.
   */
  readonly messages = input<TzslotMessages>(inject(TZSLOT_MESSAGES));
  private readonly prevSlot = viewChild.required<ElementRef<HTMLElement>>('prev');
  private readonly nextSlot = viewChild.required<ElementRef<HTMLElement>>('next');

  private readonly settings = computed<Partial<DateRangeSettings>>(() => ({
    value: this.value(),
    firstDayOfWeek: this.firstDayOfWeek(),
    locale: this.locale(),
    min: this.min(),
    max: this.max(),
    disabled: this.disabled() || this.formDisabled(),
    isDateDisabled: this.isDateDisabled(),
    today: this.today(),
    blockAcrossDisabled: this.blockAcrossDisabled(),
    rangeSpansBlockedMessage: this.rangeSpansBlockedMessage(),
    renderCell: this.renderCell(),
    weekNumbers: this.weekNumbers(),
    months: this.months(),
    messages: this.messages(),
  }));

  private readonly range: DateRangeInstance = createDateRange(this.host, {
    ...untracked(this.settings),
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

  ngAfterViewInit(): void {
    this.range.setIcons({
      prev: projected(this.host, this.prevSlot()),
      next: projected(this.host, this.nextSlot()),
    });
  }

  /** Clears the selection and tells any form control about it. */
  clear(): void {
    this.range.clear();
  }

  // ── ControlValueAccessor ────────────────────────────────────

  private onChange: (value: DateRangeValue) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: DateRangeValue | null): void {
    this.value.set(value ?? EMPTY);
  }
  registerOnChange(fn: (value: DateRangeValue) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}

/** Whatever was projected into a slot, or undefined so the default chevron stays. */
function projected(host: HTMLElement, slot: ElementRef<HTMLElement>): DocumentFragment | undefined {
  const nodes = Array.from(slot.nativeElement.childNodes);
  if (!nodes.some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent?.trim())) return undefined;
  const fragment = host.ownerDocument.createDocumentFragment();
  fragment.append(...nodes);
  return fragment;
}
