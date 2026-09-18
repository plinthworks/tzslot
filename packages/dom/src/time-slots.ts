import { getDaySlots } from '../../core/src/index.js';
import type { DaySlotsOptions, Instant, PlainDate, PlainTime, Slot } from '../../core/src/index.js';
import { EN, type TzslotMessages } from './messages.js';
import { SLOTS_CSS, ensureStyles } from './styles.js';

/**
 * One row in the list: a slot, plus which of its readings this row stands for.
 *
 * An ambiguous wall time produces two rows rather than one. That is the whole
 * point — "02:30" on the morning the clocks go back does not identify a
 * moment, and a picker that offers it once has already chosen on the user's
 * behalf, silently and half the time wrongly.
 */
export interface SlotChoice {
  readonly slot: Slot;
  /** The moment this row selects; null when the time does not exist. */
  readonly instant: Instant | null;
  /** The UTC offset that tells this reading from the other one. */
  readonly offset: string | null;
  /** True when the same clock face appears twice in the list. */
  readonly repeated: boolean;
  /** Stable identity, for keyed rendering. */
  readonly key: string;
}

export interface TimeSlotsSettings {
  /** The day to list. Nothing is drawn until there is one. */
  date: PlainDate | string | null;
  /** An IANA identifier — 'Europe/Paris', not an offset. Offsets change twice a year. */
  timeZone: string;
  stepMinutes: number;
  /**
   * The working day. Slots outside it are not produced at all — eighteen
   * greyed rows before nine o'clock make the real choices harder to find.
   */
  minTime: PlainTime | string | undefined;
  maxTime: PlainTime | string | undefined;
  /** Rules out slots while still showing them: booked, over capacity. */
  isDisabled: ((slot: Omit<Slot, 'disabled'>) => boolean) | undefined;
  /** Leave out the times that cannot happen, rather than striking them through. */
  skipNonExistent: boolean;
  disabled: boolean;
  /** The selection, as a moment — never a wall time. */
  value: Instant | null;
  ariaLabel: string | undefined;
  missingLabel: string | undefined;
  emptyLabel: string | undefined;
  messages: TzslotMessages;
  onChange: ((value: Instant | null) => void) | undefined;
}

export interface TimeSlotsOptions extends Partial<TimeSlotsSettings> {
  injectStyles?: boolean;
}

export interface TimeSlotsInstance {
  readonly value: Instant | null;
  /** The rows currently listed. */
  readonly choices: readonly SlotChoice[];
  update(settings: Partial<TimeSlotsSettings>): void;
  clear(): void;
  destroy(): void;
}

/**
 * The rows for one day. A slot with two instants becomes two rows, so every
 * row selects exactly one moment and a click is never ambiguous even when the
 * clock face is.
 */
export function getSlotChoices(
  date: PlainDate | string,
  timeZone: string,
  options: DaySlotsOptions = {},
): SlotChoice[] {
  return getDaySlots(date, timeZone, options).flatMap((slot): SlotChoice[] => {
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
}

/**
 * The times that can be chosen on one day in one time zone.
 *
 * What it selects is an Instant. A wall time is what a clock shows; an
 * instant is when it happened. Only one of those can be stored.
 */
export function createTimeSlots(host: HTMLElement, options: TimeSlotsOptions = {}): TimeSlotsInstance {
  const doc = host.ownerDocument;
  const { injectStyles = true, ...initial } = options;

  const s: TimeSlotsSettings = {
    date: null,
    timeZone: 'UTC',
    stepMinutes: 30,
    minTime: undefined,
    maxTime: undefined,
    isDisabled: undefined,
    skipNonExistent: false,
    disabled: false,
    value: null,
    ariaLabel: undefined,
    missingLabel: undefined,
    emptyLabel: undefined,
    messages: EN,
    onChange: undefined,
    ...initial,
  };

  let stylesPending = injectStyles;
  let choices: SlotChoice[] = [];
  /** Buttons are kept by key, so a repaint never replaces the one under the focus. */
  const buttons = new Map<string, HTMLButtonElement>();
  const choiceOf = new WeakMap<HTMLButtonElement, SlotChoice>();
  const empty = doc.createElement('p');
  empty.className = 'tz-slots__empty';

  const addedHostClass = !host.classList.contains('tz-slots');
  host.classList.add('tz-slots');
  host.setAttribute('role', 'listbox');

  const format = (slot: Slot) => slot.time.toString({ smallestUnit: 'minute' });

  /**
   * The tooltip, which is where the reason lives. A struck-through button with
   * no explanation reads as a bug; saying the clocks moved makes it information.
   */
  const describe = (choice: SlotChoice): string => {
    const time = format(choice.slot);
    if (!choice.slot.exists) return s.messages.nonExistentTime(time);
    if (choice.repeated) return s.messages.repeatedTime(time, choice.offset ?? '');
    return time;
  };

  const span = (className: string, text: string) => {
    const node = doc.createElement('span');
    node.className = className;
    node.textContent = text;
    return node;
  };

  function paint(button: HTMLButtonElement, choice: SlotChoice): void {
    const selected =
      s.value !== null && choice.instant !== null && s.value.equals(choice.instant);
    const missing = !choice.slot.exists;
    button.classList.toggle('tz-slots__slot--missing', missing);
    button.classList.toggle('tz-slots__slot--unavailable', choice.slot.disabled);
    button.classList.toggle('tz-slots__slot--repeated', choice.repeated);
    button.classList.toggle('tz-slots__slot--selected', selected);
    button.setAttribute('aria-selected', String(selected));
    if (missing) button.setAttribute('aria-disabled', 'true');
    else button.removeAttribute('aria-disabled');
    button.disabled = missing || choice.slot.disabled || s.disabled;
    button.title = describe(choice);

    const parts = [span('tz-slots__time', format(choice.slot))];
    if (choice.repeated) parts.push(span('tz-slots__offset', choice.offset ?? ''));
    if (missing) parts.push(span('tz-slots__note', s.missingLabel ?? s.messages.skipped));
    button.replaceChildren(...parts);
    choiceOf.set(button, choice);
  }

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'slots', SLOTS_CSS);
      stylesPending = false;
    }
    host.setAttribute('aria-label', s.ariaLabel ?? s.messages.availableTimes);

    choices =
      s.date === null
        ? []
        : getSlotChoices(s.date, s.timeZone, {
            stepMinutes: s.stepMinutes,
            skipNonExistent: s.skipNonExistent,
            ...(s.minTime !== undefined ? { minTime: s.minTime } : {}),
            ...(s.maxTime !== undefined ? { maxTime: s.maxTime } : {}),
            ...(s.isDisabled !== undefined ? { isDisabled: s.isDisabled } : {}),
          });

    const wanted = new Set(choices.map((c) => c.key));
    for (const [key, button] of buttons) {
      if (!wanted.has(key)) buttons.delete(key);
    }

    const nodes: HTMLElement[] = choices.map((choice) => {
      let button = buttons.get(choice.key);
      if (!button) {
        button = doc.createElement('button');
        button.type = 'button';
        button.className = 'tz-slots__slot';
        button.setAttribute('role', 'option');
        buttons.set(choice.key, button);
      }
      paint(button, choice);
      return button;
    });

    if (s.date !== null && nodes.length === 0) {
      empty.textContent = s.emptyLabel ?? s.messages.noTimes;
      nodes.push(empty);
    }

    const current = Array.from(host.children).filter(
      (n) => n.classList.contains('tz-slots__slot') || n === empty,
    );
    const same = current.length === nodes.length && current.every((n, i) => n === nodes[i]);
    if (!same) {
      current.forEach((n) => n.remove());
      host.prepend(...nodes);
    }
  }

  function choose(choice: SlotChoice): void {
    if (!choice.slot.exists || choice.slot.disabled || s.disabled) return;
    s.value = choice.instant;
    render();
    s.onChange?.(choice.instant);
  }

  const listening = new AbortController();
  host.addEventListener(
    'click',
    (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('.tz-slots__slot');
      const choice = button && choiceOf.get(button);
      if (choice && !button.disabled) choose(choice);
    },
    { signal: listening.signal },
  );

  render();

  return {
    get value() {
      return s.value;
    },
    get choices() {
      return choices;
    },
    update(settings) {
      Object.assign(s, settings);
      render();
    },
    clear() {
      s.value = null;
      render();
      s.onChange?.(null);
    },
    destroy() {
      listening.abort();
      buttons.forEach((b) => b.remove());
      empty.remove();
      host.removeAttribute('role');
      host.removeAttribute('aria-label');
      if (addedHostClass) host.classList.remove('tz-slots');
    },
  };
}
