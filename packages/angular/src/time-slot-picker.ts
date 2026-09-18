import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  model,
  signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { getDaySlots } from '../../core/src/index.js';
import type { Instant, PlainDate, Slot } from '../../core/src/index.js';

/**
 * One row in the list: a slot, plus which of its readings this row stands for.
 *
 * An ambiguous wall time produces two rows rather than one. That is the whole
 * point of the component — "02:30" on the morning the clocks go back does not
 * identify a moment, and a picker that offers it once has already made the
 * choice on the user's behalf, silently and half the time wrongly.
 */
export interface SlotChoice {
  readonly slot: Slot;
  /** The moment this row selects; absent when the time does not exist. */
  readonly instant: Instant | null;
  /** The UTC offset that distinguishes this reading from the other one. */
  readonly offset: string | null;
  /** True when the same clock face appears twice in the list. */
  readonly repeated: boolean;
  /** Stable identity for @for tracking. */
  readonly key: string;
}

/**
 * A list of the times that can be chosen on one day in one time zone.
 *
 * Deliberately unstyled. The markup carries structural class names and the
 * colours come from CSS custom properties, so a consumer restyles it without
 * fighting specificity — and nothing here depends on a design system.
 *
 * What it selects is an `Instant`, never a wall time. A wall time is what a
 * clock shows; an instant is when it happened. Only one of those can be stored.
 */
@Component({
  selector: 'tz-time-slots',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tz-slots', role: 'listbox', '[attr.aria-label]': 'ariaLabel()' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeSlotPicker),
      multi: true,
    },
  ],
  template: `
    @for (choice of choices(); track choice.key) {
      <button
        type="button"
        class="tz-slots__slot"
        role="option"
        [class.tz-slots__slot--missing]="!choice.slot.exists"
        [class.tz-slots__slot--unavailable]="choice.slot.disabled"
        [class.tz-slots__slot--repeated]="choice.repeated"
        [class.tz-slots__slot--selected]="isSelected(choice)"
        [attr.aria-selected]="isSelected(choice)"
        [attr.aria-disabled]="!choice.slot.exists || null"
        [disabled]="!choice.slot.exists || choice.slot.disabled || disabled() || formDisabled()"
        [title]="describe(choice)"
        (click)="choose(choice)"
      >
        <span class="tz-slots__time">{{ format(choice.slot) }}</span>

        @if (choice.repeated) {
          <span class="tz-slots__offset">{{ choice.offset }}</span>
        }
        @if (!choice.slot.exists) {
          <span class="tz-slots__note">{{ missingLabel() }}</span>
        }
      </button>
    } @empty {
      <p class="tz-slots__empty">{{ emptyLabel() }}</p>
    }
  `,
  styles: `
    .tz-slots {
      display: grid;
      grid-template-columns: repeat(var(--tz-slot-columns, 4), minmax(0, 1fr));
      gap: var(--tz-slot-gap, 0.375rem);
    }
    .tz-slots__slot {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.125rem;
      padding: var(--tz-slot-padding, 0.5rem 0.25rem);
      border: 1px solid var(--tz-slot-border, currentColor);
      border-radius: var(--tz-slot-radius, 0.375rem);
      background: var(--tz-slot-bg, transparent);
      color: var(--tz-slot-fg, inherit);
      font: inherit;
      cursor: pointer;
    }
    .tz-slots__slot--selected {
      background: var(--tz-slot-bg-selected, currentColor);
      color: var(--tz-slot-fg-selected, canvas);
    }
    .tz-slots__slot--unavailable {
      opacity: var(--tz-slot-unavailable-opacity, 0.45);
      cursor: not-allowed;
    }
    .tz-slots__slot--missing {
      opacity: var(--tz-slot-missing-opacity, 0.4);
      cursor: not-allowed;
      text-decoration: line-through;
    }
    .tz-slots__slot--repeated {
      border-style: var(--tz-slot-repeated-border-style, dashed);
    }
    .tz-slots__offset,
    .tz-slots__note {
      font-size: var(--tz-slot-note-size, 0.75em);
      opacity: 0.8;
    }
  `,
})
export class TimeSlotPicker implements ControlValueAccessor {
  /** The day to list, as a PlainDate or an ISO date string. */
  readonly date = input.required<PlainDate | string>();

  /** An IANA identifier — 'Europe/Paris', not an offset. Offsets change twice a year. */
  readonly timeZone = input.required<string>();

  readonly stepMinutes = input(30);

  /**
   * The working day. Slots outside these bounds are not produced at all —
   * eighteen greyed rows before nine o'clock make the real choices harder to
   * find, not easier.
   */
  readonly minTime = input<string | undefined>(undefined);
  readonly maxTime = input<string | undefined>(undefined);

  /**
   * Rules out individual slots while still showing them: already booked, over
   * capacity, whatever the caller knows and this component does not.
   */
  readonly isDisabled = input<((slot: Omit<Slot, 'disabled'>) => boolean) | undefined>(undefined);

  /** Leave out the times that cannot happen, rather than showing them struck through. */
  readonly skipNonExistent = input(false);

  readonly disabled = input(false);

  /** What is selected, as a moment. Two-way: `[(value)]`. */
  readonly value = model<Instant | null>(null);

  readonly ariaLabel = input('Available times');
  readonly missingLabel = input('skipped');
  readonly emptyLabel = input('No times available.');

  /**
   * The rows to render.
   *
   * A slot with two instants becomes two rows. Flattening here rather than in
   * the template keeps the choice explicit: every row selects exactly one
   * moment, so clicking one can never be ambiguous even when the clock face is.
   */
  readonly choices = computed<SlotChoice[]>(() => {
    const slots = getDaySlots(this.date(), this.timeZone(), {
      stepMinutes: this.stepMinutes(),
      skipNonExistent: this.skipNonExistent(),
      ...(this.minTime() !== undefined ? { minTime: this.minTime()! } : {}),
      ...(this.maxTime() !== undefined ? { maxTime: this.maxTime()! } : {}),
      ...(this.isDisabled() !== undefined ? { isDisabled: this.isDisabled()! } : {}),
    });

    return slots.flatMap((slot) => {
      const time = slot.time.toString({ smallestUnit: 'minute' });

      if (!slot.exists) {
        return [{ slot, instant: null, offset: null, repeated: false, key: `${time}:missing` }];
      }

      return slot.instants.map((instant, index) => ({
        slot,
        instant,
        offset: slot.offsets[index] ?? null,
        repeated: slot.ambiguous,
        key: `${time}:${slot.offsets[index] ?? index}`,
      }));
    });
  });

  protected isSelected(choice: SlotChoice): boolean {
    const current = this.value();
    return current !== null && choice.instant !== null && current.equals(choice.instant);
  }

  protected choose(choice: SlotChoice): void {
    if (!choice.slot.exists || choice.slot.disabled || this.disabled()) return;
    this.value.set(choice.instant);
    this.onChange(choice.instant);
    this.onTouched();
  }

  // ── ControlValueAccessor ────────────────────────────────────
  //
  // So the component can sit in a FormGroup. The model input stays the API for
  // template use; these keep a form control in step with it rather than
  // duplicating the state, which is how the two drift apart.

  protected readonly formDisabled = signal(false);
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

  protected format(slot: Slot): string {
    return slot.time.toString({ smallestUnit: 'minute' });
  }

  /**
   * The tooltip, which is where the reason lives.
   *
   * A struck-through button with no explanation reads as a bug. Saying that the
   * clocks moved turns it into information the user can act on.
   */
  protected describe(choice: SlotChoice): string {
    const time = this.format(choice.slot);
    if (!choice.slot.exists) {
      return `${time} does not exist on this date — the clocks move forward.`;
    }
    if (choice.repeated) {
      return `${time} happens twice on this date. This is the reading at UTC${choice.offset}.`;
    }
    return time;
  }
}
