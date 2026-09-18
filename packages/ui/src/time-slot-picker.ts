import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { getDaySlots, type Instant, type PlainDate, type Slot } from '../../core/src/index.js';

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
  selector: 'ngx-time-slot-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngx-tsp', role: 'listbox', '[attr.aria-label]': 'ariaLabel()' },
  template: `
    @for (choice of choices(); track choice.key) {
      <button
        type="button"
        class="ngx-tsp__slot"
        role="option"
        [class.ngx-tsp__slot--missing]="!choice.slot.exists"
        [class.ngx-tsp__slot--repeated]="choice.repeated"
        [class.ngx-tsp__slot--selected]="isSelected(choice)"
        [attr.aria-selected]="isSelected(choice)"
        [attr.aria-disabled]="!choice.slot.exists || null"
        [disabled]="!choice.slot.exists || disabled()"
        [title]="describe(choice)"
        (click)="choose(choice)"
      >
        <span class="ngx-tsp__time">{{ format(choice.slot) }}</span>

        @if (choice.repeated) {
          <span class="ngx-tsp__offset">{{ choice.offset }}</span>
        }
        @if (!choice.slot.exists) {
          <span class="ngx-tsp__note">{{ missingLabel() }}</span>
        }
      </button>
    } @empty {
      <p class="ngx-tsp__empty">{{ emptyLabel() }}</p>
    }
  `,
  styles: `
    .ngx-tsp {
      display: grid;
      grid-template-columns: repeat(var(--dp-slot-columns, 4), minmax(0, 1fr));
      gap: var(--dp-slot-gap, 0.375rem);
    }
    .ngx-tsp__slot {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.125rem;
      padding: var(--dp-slot-padding, 0.5rem 0.25rem);
      border: 1px solid var(--dp-slot-border, currentColor);
      border-radius: var(--dp-slot-radius, 0.375rem);
      background: var(--dp-slot-bg, transparent);
      color: var(--dp-slot-fg, inherit);
      font: inherit;
      cursor: pointer;
    }
    .ngx-tsp__slot--selected {
      background: var(--dp-slot-bg-selected, currentColor);
      color: var(--dp-slot-fg-selected, canvas);
    }
    .ngx-tsp__slot--missing {
      opacity: var(--dp-slot-missing-opacity, 0.4);
      cursor: not-allowed;
      text-decoration: line-through;
    }
    .ngx-tsp__slot--repeated {
      border-style: var(--dp-slot-repeated-border-style, dashed);
    }
    .ngx-tsp__offset,
    .ngx-tsp__note {
      font-size: var(--dp-slot-note-size, 0.75em);
      opacity: 0.8;
    }
  `,
})
export class TimeSlotPicker {
  /** The day to list, as a PlainDate or an ISO date string. */
  readonly date = input.required<PlainDate | string>();

  /** An IANA identifier — 'Europe/Paris', not an offset. Offsets change twice a year. */
  readonly timeZone = input.required<string>();

  readonly stepMinutes = input(30);

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
    if (!choice.slot.exists || this.disabled()) return;
    this.value.set(choice.instant);
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
