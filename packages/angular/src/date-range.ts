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

import { Temporal } from '../../core/src/index.js';
import type { PlainDate, Weekday } from '../../core/src/index.js';
import {
  createDateRange,
  type DateRangeInstance,
  type DateRangeSettings,
  type DateRangeValue,
} from '../../dom/src/index.js';

export type { DateRangeValue } from '../../dom/src/index.js';

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
  readonly value = model<DateRangeValue>(EMPTY);

  readonly firstDayOfWeek = input<Weekday>(1);
  readonly locale = input<string | undefined>(undefined);
  readonly min = input<PlainDate | null>(null);
  readonly max = input<PlainDate | null>(null);
  readonly disabled = input(false);
  readonly isDateDisabled = input<((date: PlainDate) => boolean) | undefined>(undefined);
  readonly today = input<PlainDate>(Temporal.Now.plainDateISO());

  /** Refuse a range that steps over a day isDateDisabled rules out. On by default. */
  readonly blockAcrossDisabled = input(true);

  /** Overrides the bundle for this one instance. */
  readonly rangeSpansBlockedMessage = input<string | undefined>(undefined);

  protected readonly formDisabled = signal(false);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly messages = inject(TZSLOT_MESSAGES);
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
    messages: this.messages,
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
    effect(() => this.range.update(this.settings()));
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
