import { Temporal, presetRange, matchesPreset } from '@tzslot/core';
import type { DayRange, Instant, PlainDate, PlainTime, PresetName } from '@tzslot/core';
import { createDateRange, type DateRangeInstance } from './date-range.js';
import { createTimeInput, type TimeInputInstance } from './time-input.js';
import { createPanel, type FieldMode } from './panel.js';
import { formatWith, patternFor } from './format.js';
import type { RenderCell } from './cells.js';
import { EN, type TzslotMessages } from './messages.js';
import { FIELD_CSS, RANGEFIELD_CSS, RANGE_CSS, TIME_CSS, ensureStyles } from './styles.js';

/** What the field holds: two moments, and whether they are whole days. */
export interface RangeFieldValue {
  readonly start: Instant | null;
  /**
   * Whole days end at the midnight *after* the last of them, so a search
   * reads `start >= from AND start < to` with nothing falling through a gap
   * at 23:59:59.
   */
  readonly end: Instant | null;
  readonly allDay?: boolean;
}

/** A named range offered beside the calendar. */
export interface RangePreset {
  readonly name: string;
  readonly label: string;
  readonly range: (today: PlainDate) => DayRange;
}

export interface RangeFieldSettings {
  value: RangeFieldValue;
  /** An IANA identifier. Days become moments on this zone's clocks. */
  timeZone: string;
  /** Named ranges beside the calendar. The ten built-in names, or your own. */
  presets: readonly (PresetName | RangePreset)[];
  /** Times as well as days, with a switch back to whole days. */
  showTime: boolean;
  /** Minutes the time fields step by. */
  stepMinutes: number;
  /** Nothing is reported until Apply is pressed. For searches that cost. */
  confirm: boolean;
  /** How many months the panel shows side by side. */
  months: number;
  weekNumbers: boolean;
  firstDayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  mode: FieldMode;
  placeholder: string | undefined;
  ariaLabel: string | undefined;
  locale: string | undefined;
  min: PlainDate | null;
  max: PlainDate | null;
  isDateDisabled: ((date: PlainDate) => boolean) | undefined;
  renderCell: RenderCell | undefined;
  today: PlainDate;
  disabled: boolean;
  /** A pattern for each end — `yyyy-MM-dd`. The locale's own form otherwise. */
  format: string | undefined;
  /** The last word on the text the field shows. */
  displayWith: ((value: RangeFieldValue, timeZone: string) => string) | undefined;
  messages: TzslotMessages;
  onChange: ((value: RangeFieldValue) => void) | undefined;
  onOpen: (() => void) | undefined;
  onClose: (() => void) | undefined;
}

export interface RangeFieldOptions extends Partial<RangeFieldSettings> {
  icon?: Node | string | undefined;
  container?: HTMLElement | undefined;
  injectStyles?: boolean;
}

export interface RangeFieldInstance {
  readonly value: RangeFieldValue;
  readonly isOpen: boolean;
  update(settings: Partial<RangeFieldSettings>): void;
  open(): void;
  close(): void;
  toggle(): void;
  clear(): void;
  destroy(): void;
}

const EMPTY: RangeFieldValue = { start: null, end: null, allDay: true };
const BUILT_IN: PresetName[] = ['today', 'yesterday', 'last7Days', 'last30Days', 'thisMonth', 'lastMonth'];

/**
 * One field for a period: "22/08/2026 – 20/09/2026".
 *
 * Two fields and four clicks is what a range usually costs. This is one field
 * and, most of the time, one click: the named ranges beside the calendar —
 * last 7 days, this month — are what people actually ask for, and they are
 * counted in the zone, so "the last 7 days" is 169 hours the week the clocks
 * go back rather than a silent 168.
 */
export function createRangeField(host: HTMLElement, options: RangeFieldOptions = {}): RangeFieldInstance {
  const doc = host.ownerDocument;
  const { icon, container, injectStyles = true, ...initial } = options;

  const s: RangeFieldSettings = {
    value: EMPTY,
    timeZone: Temporal.Now.timeZoneId(),
    presets: BUILT_IN,
    showTime: false,
    stepMinutes: 30,
    confirm: false,
    months: 2,
    weekNumbers: false,
    firstDayOfWeek: 1,
    mode: 'popup',
    placeholder: undefined,
    ariaLabel: undefined,
    locale: undefined,
    min: null,
    max: null,
    isDateDisabled: undefined,
    renderCell: undefined,
    today: Temporal.Now.plainDateISO(),
    disabled: false,
    format: undefined,
    displayWith: undefined,
    messages: EN,
    onChange: undefined,
    onOpen: undefined,
    onClose: undefined,
    ...initial,
  };

  let stylesPending = injectStyles;
  /** What the panel is showing. The same as the value unless Apply is awaited. */
  let draft: RangeFieldValue = s.value;

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
    const node = doc.createElement(tag);
    node.className = className;
    return node;
  };

  const addedHostClass = !host.classList.contains('tz-field');
  host.classList.add('tz-field');

  const trigger = doc.createElement('button');
  trigger.type = 'button';
  trigger.className = 'tz-field__trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  const text = el('span', 'tz-field__text');
  const iconSlot = el('span', 'tz-field__icon');
  iconSlot.setAttribute('aria-hidden', 'true');
  iconSlot.append(icon ?? '▾');
  trigger.append(text, iconSlot);
  host.append(trigger);

  let range: DateRangeInstance | null = null;
  let fromTime: TimeInputInstance | null = null;
  let toTime: TimeInputInstance | null = null;
  let presetList: HTMLElement | null = null;
  let allDayBox: HTMLButtonElement | null = null;

  const wholeDays = () => draft.allDay !== false;
  const zoned = (value: Instant) => value.toZonedDateTimeISO(s.timeZone);
  const midnight = (day: PlainDate) => day.toZonedDateTime({ timeZone: s.timeZone }).toInstant();
  const at = (day: PlainDate, time: PlainTime) =>
    day.toZonedDateTime({ timeZone: s.timeZone, plainTime: time }).toInstant();

  /** The days the value covers, both included — what the calendar highlights. */
  function days(value: RangeFieldValue): { start: PlainDate | null; end: PlainDate | null } {
    const start = value.start ? zoned(value.start).toPlainDate() : null;
    if (!value.end) return { start, end: null };
    const end = zoned(value.end);
    const last =
      value.allDay !== false && end.toPlainTime().equals(Temporal.PlainTime.from('00:00'))
        ? end.toPlainDate().subtract({ days: 1 })
        : end.toPlainDate();
    return { start, end: last };
  }

  /** And the other way: two days become two moments, whole or with times. */
  function fromDays(range_: { start: PlainDate | null; end: PlainDate | null }): RangeFieldValue {
    const allDay = wholeDays();
    const times = {
      start: draft.start && !allDay ? zoned(draft.start).toPlainTime() : null,
      end: draft.end && !allDay ? zoned(draft.end).toPlainTime() : null,
    };
    return {
      start: range_.start
        ? allDay
          ? midnight(range_.start)
          : at(range_.start, times.start ?? Temporal.PlainTime.from('00:00'))
        : null,
      end: range_.end
        ? allDay
          ? midnight(range_.end.add({ days: 1 }))
          : at(range_.end, times.end ?? Temporal.PlainTime.from('00:00'))
        : null,
      allDay,
    };
  }

  const pattern = () => s.format ?? patternFor(s.locale, { time: false });

  /** What the closed field says. */
  function display(): string {
    if (s.displayWith) return s.displayWith(s.value, s.timeZone);
    const { start, end } = days(s.value);
    if (!start && !end) return '';
    const shape = pattern();
    const time = (value: Instant | null) =>
      s.value.allDay === false && value
        ? ` ${formatWith('HH:mm', { time: zoned(value).toPlainTime() }, s.locale)}`
        : '';
    const first = start ? formatWith(shape, { date: start }, s.locale) + time(s.value.start) : '…';
    const last = end ? formatWith(shape, { date: end }, s.locale) + time(s.value.end) : '…';
    return first === last ? first : `${first} – ${last}`;
  }

  function commit(next: RangeFieldValue): void {
    s.value = next;
    render();
    s.onChange?.(next);
  }

  /** Chosen in the panel: reported at once, or held until Apply. */
  function choose(next: RangeFieldValue, { close = false } = {}): void {
    draft = next;
    if (s.confirm) {
      paintPanel();
      return;
    }
    commit(next);
    if (close) panel.close();
    else paintPanel();
  }

  const presets = (): RangePreset[] =>
    s.presets.map((preset) =>
      typeof preset === 'string'
        ? {
            name: preset,
            label: s.messages.presets[preset],
            range: (today: PlainDate) =>
              presetRange(preset, { today, firstDayOfWeek: s.firstDayOfWeek }),
          }
        : preset,
    );

  function paintPresets(): void {
    if (!presetList) return;
    const chosen = days(draft);
    presetList.replaceChildren(
      ...presets().map((preset) => {
        const button = el('button', 'tz-rangefield__preset');
        button.type = 'button';
        button.textContent = preset.label;
        const on =
          chosen.start !== null &&
          chosen.end !== null &&
          (typeof preset.name === 'string' && isBuiltIn(preset.name)
            ? matchesPreset(preset.name, { start: chosen.start, end: chosen.end }, {
                today: s.today,
                firstDayOfWeek: s.firstDayOfWeek,
              })
            : sameRange(preset.range(s.today), { start: chosen.start, end: chosen.end }));
        button.classList.toggle('tz-rangefield__preset--on', on);
        button.setAttribute('aria-pressed', String(on));
        button.disabled = s.disabled;
        button.onclick = () => {
          const picked = preset.range(s.today);
          choose(fromDays({ start: picked.start, end: picked.end }), { close: !s.confirm });
        };
        return button;
      }),
    );
  }

  const isBuiltIn = (name: string): name is PresetName => (BUILT_IN as string[]).includes(name) || [
    'last14Days',
    'thisWeek',
    'lastWeek',
    'thisYear',
  ].includes(name);
  const sameRange = (a: DayRange, b: { start: PlainDate; end: PlainDate }) =>
    a.start.equals(b.start) && a.end.equals(b.end);

  function paintPanel(): void {
    const shown = days(draft);
    range?.update({
      value: { start: shown.start, end: shown.end },
      months: s.months,
      weekNumbers: s.weekNumbers,
      firstDayOfWeek: s.firstDayOfWeek,
      locale: s.locale,
      min: s.min,
      max: s.max,
      isDateDisabled: s.isDateDisabled,
      renderCell: s.renderCell,
      today: s.today,
      disabled: s.disabled,
      messages: s.messages,
    });
    const times = {
      start: draft.start && !wholeDays() ? zoned(draft.start).toPlainTime() : null,
      end: draft.end && !wholeDays() ? zoned(draft.end).toPlainTime() : null,
    };
    // Whole days have no times to set: the fields stay in place, greyed, so
    // the panel does not jump when the switch moves.
    const timesOff = s.disabled || wholeDays();
    const shownDays = days(draft);
    for (const [input, time, day] of [
      [fromTime, times.start, shownDays.start],
      [toTime, times.end, shownDays.end],
    ] as const) {
      input?.update({
        value: time,
        stepMinutes: s.stepMinutes,
        locale: s.locale,
        messages: s.messages,
        disabled: timesOff || day === null,
        date: day,
        timeZone: s.timeZone,
      });
    }
    if (allDayBox) {
      allDayBox.setAttribute('aria-checked', String(wholeDays()));
      allDayBox.classList.toggle('tz-dtr__allday-box--on', wholeDays());
    }
    paintPresets();
    panel.place();
  }

  function render(): void {
    if (stylesPending && host.isConnected) {
      ensureStyles(host, 'field', FIELD_CSS);
      stylesPending = false;
    }
    text.textContent = display() || s.placeholder || s.messages.chooseRange;
    trigger.classList.toggle('tz-field__trigger--empty', s.value.start === null);
    trigger.setAttribute('aria-expanded', String(panel.isOpen));
    trigger.setAttribute('aria-label', s.ariaLabel ?? s.messages.chooseRange);
    trigger.disabled = s.disabled;
    if (s.disabled) panel.close({ restoreFocus: false });
    paintPanel();
  }

  const panel = createPanel({
    trigger,
    source: host,
    container,
    mode: () => s.mode,
    label: () => s.ariaLabel ?? s.messages.chooseRange,
    onOpen: () => {
      draft = s.value;
      render();
      s.onOpen?.();
    },
    onClose: () => {
      range = null;
      fromTime = null;
      toTime = null;
      presetList = null;
      allDayBox = null;
      render();
      s.onClose?.();
    },
    initialFocus: (node) => node.querySelector<HTMLElement>('.tz-range__day[tabindex="0"], button'),
    content: (node) => {
      node.classList.add('tz-rangefield__panel');
      ensureStyles(node, 'rangefield', RANGEFIELD_CSS);
      ensureStyles(node, 'range', RANGE_CSS);
      ensureStyles(node, 'time', TIME_CSS);

      const body = el('div', 'tz-rangefield__body');
      const rangeHost = doc.createElement('div');
      body.append(rangeHost);
      if (s.presets.length > 0) {
        presetList = el('div', 'tz-rangefield__presets');
        body.append(presetList);
      }
      node.append(body);

      range = createDateRange(rangeHost, {
        injectStyles: false,
        onChange: ({ start, end }) => {
          // A first click starts a range; the second finishes it, and a
          // finished range is the answer — so the panel can step out of the way.
          choose(fromDays({ start, end }), { close: end !== null && !s.showTime });
        },
      });

      if (s.showTime) {
        const times = el('div', 'tz-rangefield__times');
        const allDayRow = el('div', 'tz-dtr__allday');
        allDayBox = doc.createElement('button');
        allDayBox.type = 'button';
        allDayBox.className = 'tz-dtr__allday-box';
        allDayBox.setAttribute('role', 'switch');
        allDayBox.append(el('span', 'tz-dtr__allday-knob'));
        const allDayText = el('span', 'tz-dtr__allday-text');
        allDayText.textContent = s.messages.allDay;
        allDayRow.append(allDayBox, allDayText);
        const toggle = () => {
          const shown = days(draft);
          draft = { ...draft, allDay: !wholeDays() };
          choose(fromDays({ start: shown.start, end: shown.end }));
        };
        allDayBox.addEventListener('click', toggle);
        allDayText.addEventListener('click', toggle);

        const pair = el('div', 'tz-rangefield__pair');
        for (const edge of ['start', 'end'] as const) {
          const column = el('div', 'tz-rangefield__time');
          const label = el('span', 'tz-rangefield__time-label');
          label.textContent = edge === 'start' ? s.messages.timeFrom : s.messages.timeTo;
          const timeHost = doc.createElement('div');
          column.append(label, timeHost);
          pair.append(column);
          const input = createTimeInput(timeHost, {
            injectStyles: false,
            onChange: (time) => {
              const shown = days(draft);
              const day = edge === 'start' ? shown.start : shown.end;
              if (!day || !time) return;
              draft = { ...draft, allDay: false, [edge]: at(day, time) } as RangeFieldValue;
              choose(draft);
            },
          });
          if (edge === 'start') fromTime = input;
          else toTime = input;
        }
        times.append(allDayRow, pair);
        node.append(times);
      }

      if (s.confirm) {
        const footer = el('div', 'tz-rangefield__footer');
        const cancel = el('button', 'tz-rangefield__cancel');
        cancel.type = 'button';
        cancel.textContent = s.messages.cancel;
        cancel.onclick = () => panel.close();
        const apply = el('button', 'tz-rangefield__apply');
        apply.type = 'button';
        apply.textContent = s.messages.apply;
        apply.onclick = () => {
          commit(draft);
          panel.close();
        };
        footer.append(cancel, apply);
        node.append(footer);
      }

      return () => {
        range?.destroy();
        fromTime?.destroy();
        toTime?.destroy();
      };
    },
  });

  const openPanel = () => {
    if (!s.disabled) panel.open();
  };

  const listening = new AbortController();
  trigger.addEventListener('click', () => (panel.isOpen ? panel.close() : openPanel()), {
    signal: listening.signal,
  });

  render();

  return {
    get value() {
      return s.value;
    },
    get isOpen() {
      return panel.isOpen;
    },
    update(settings) {
      Object.assign(s, settings);
      if ('value' in settings) draft = s.value;
      render();
    },
    open: openPanel,
    close: () => panel.close(),
    toggle: () => (panel.isOpen ? panel.close() : openPanel()),
    clear() {
      draft = { ...EMPTY, allDay: wholeDays() };
      commit(draft);
    },
    destroy() {
      panel.close({ restoreFocus: false });
      listening.abort();
      trigger.remove();
      if (addedHostClass) host.classList.remove('tz-field');
    },
  };
}
