import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  signal,
  viewChild,
  type TemplateRef,
  ViewContainerRef,
  DestroyRef,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ConfigurableFocusTrapFactory, type ConfigurableFocusTrap } from '@angular/cdk/a11y';
import { Calendar } from './calendar.js';
import { Temporal } from '../../core/src/index.js';
import type { PlainDate, Weekday } from '../../core/src/index.js';

/** Anchored under the field, or centred over the page. */
export type FieldMode = 'popup' | 'dialog';

/**
 * A text field that opens a calendar.
 *
 * The third way to show a picker, after inline and embedded, and the one most
 * forms actually want. Both modes are the same overlay with a different
 * position strategy — a dialog is a popup that stopped following its trigger,
 * and treating them as two components would mean two sets of focus handling to
 * keep correct.
 *
 * The field is read-only on purpose. Parsing what someone types into a date is
 * a separate problem with its own ambiguities — 03/04 is two different days
 * depending on where the reader lives — and getting it half right is worse
 * than not offering it.
 */
@Component({
  selector: 'tz-date-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Calendar],
  host: { class: 'tz-field' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateField), multi: true },
  ],
  template: `
    <button
      #trigger
      type="button"
      class="tz-field__trigger"
      [class.tz-field__trigger--empty]="!value()"
      [attr.aria-haspopup]="'dialog'"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="ariaLabel()"
      [disabled]="disabled() || formDisabled()"
      (click)="toggle()"
    >
      <span class="tz-field__text">{{ display() || placeholder() }}</span>
      <span class="tz-field__icon" aria-hidden="true">▾</span>
    </button>

    <ng-template #panel>
      <div
        class="tz-field__panel"
        [class.tz-field__panel--dialog]="mode() === 'dialog'"
        role="dialog"
        [attr.aria-label]="ariaLabel()"
        (keydown.escape)="close()"
      >
        <tz-calendar
          [value]="value()"
          (valueChange)="pick($event)"
          [firstDayOfWeek]="firstDayOfWeek()"
          [locale]="locale()"
          [min]="min()"
          [max]="max()"
          [isDateDisabled]="isDateDisabled()"
        />
      </div>
    </ng-template>
  `,
  styles: `
    :host { display: inline-block; }
    .tz-field__trigger {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--tz-field-gap, 0.5rem);
      min-width: var(--tz-field-width, 12rem);
      padding: var(--tz-field-padding, 0.5rem 0.75rem);
      border: 1px solid var(--tz-field-border, currentColor);
      border-radius: var(--tz-field-radius, 0.375rem);
      background: var(--tz-field-bg, transparent);
      color: var(--tz-field-fg, inherit);
      font: inherit;
      cursor: pointer;
      text-align: left;
    }
    .tz-field__trigger--empty .tz-field__text { opacity: var(--tz-field-placeholder-opacity, 0.6); }
    .tz-field__trigger:disabled { opacity: 0.5; cursor: not-allowed; }
    .tz-field__icon { opacity: 0.6; font-size: 0.75em; }
  `,
})
export class DateField implements ControlValueAccessor {
  readonly value = model<PlainDate | null>(null);
  readonly mode = input<FieldMode>('popup');
  readonly placeholder = input('Choose a date');
  readonly ariaLabel = input('Choose a date');
  readonly locale = input<string | undefined>(undefined);
  readonly firstDayOfWeek = input<Weekday>(1);
  readonly min = input<PlainDate | null>(null);
  readonly max = input<PlainDate | null>(null);
  readonly isDateDisabled = input<((date: PlainDate) => boolean) | undefined>(undefined);
  readonly disabled = input(false);

  /** How the chosen date is written in the field. Defaults to the locale's medium form. */
  readonly displayWith = input<((date: PlainDate) => string) | undefined>(undefined);

  protected readonly open = signal(false);
  protected readonly formDisabled = signal(false);

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  private readonly overlay = inject(Overlay);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly focusTraps = inject(ConfigurableFocusTrapFactory);
  private overlayRef: OverlayRef | null = null;
  private focusTrap: ConfigurableFocusTrap | null = null;

  constructor() {
    // An overlay outlives the component that opened it unless someone says
    // otherwise, and a detached panel floating over the next page is the kind
    // of bug that gets blamed on the router.
    inject(DestroyRef).onDestroy(() => this.close());
  }

  protected display(): string {
    const date = this.value();
    if (!date) return '';
    const custom = this.displayWith();
    if (custom) return custom(date);
    return new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', timeZone: 'UTC' }).format(
      new Date(Date.UTC(date.year, date.month - 1, date.day)),
    );
  }

  protected toggle(): void {
    this.open() ? this.close() : this.openPanel();
  }

  private openPanel(): void {
    if (this.overlayRef) return;

    const dialog = this.mode() === 'dialog';

    this.overlayRef = this.overlay.create({
      positionStrategy: dialog
        ? this.overlay.position().global().centerHorizontally().centerVertically()
        : this.overlay
            .position()
            .flexibleConnectedTo(this.trigger())
            .withPush(false)
            .withPositions([
              { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
              { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
            ]),
      // A popup that scrolls away from its field looks broken; one that blocks
      // the page feels broken. Reposition for popups, block for dialogs.
      scrollStrategy: dialog ? this.overlay.scrollStrategies.block() : this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: dialog ? 'tz-field__backdrop' : 'cdk-overlay-transparent-backdrop',
    });

    this.overlayRef.attach(new TemplatePortal(this.panel(), this.viewContainer));
    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.overlayRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') this.close();
    });

    // Keyboard focus has to go into the panel and come back out to the field,
    // or a keyboard user opens a calendar they cannot reach and lands at the
    // top of the document when it closes.
    const element = this.overlayRef.overlayElement;
    this.focusTrap = this.focusTraps.create(element);
    this.focusTrap.focusInitialElementWhenReady();

    this.open.set(true);
    this.onTouched();
  }

  protected close(): void {
    this.focusTrap?.destroy();
    this.focusTrap = null;
    this.overlayRef?.dispose();
    this.overlayRef = null;
    if (this.open()) {
      this.open.set(false);
      this.trigger().nativeElement.focus();
    }
  }

  protected pick(date: PlainDate | null): void {
    this.value.set(date);
    this.onChange(date);
    this.close();
  }

  // ── ControlValueAccessor ────────────────────────────────────

  private onChange: (value: PlainDate | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: PlainDate | null): void {
    this.value.set(value ?? null);
  }
  registerOnChange(fn: (value: PlainDate | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
    if (isDisabled) this.close();
  }
}

/** Kept here so the type is reachable without importing Temporal separately. */
export type { PlainDate as DateFieldValue };
export { Temporal };
