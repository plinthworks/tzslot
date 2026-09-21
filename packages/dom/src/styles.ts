/**
 * The layout every widget needs to be usable at all: grids, sizes, the reset
 * that turns a <button> into a cell. Colour and taste stay in @tzslot/theme.
 *
 * Every colour is `var(--tz-specific, var(--tz-palette, plain))`: the specific
 * variable if someone set it, else the theme's palette, else something
 * legible with no theme at all. Resolved here, where it is drawn, so a palette
 * set on any ancestor reaches it.
 *
 * Injected rather than shipped as a file to import, because a calendar that
 * renders as a column of unstyled buttons until someone finds the right CSS
 * import is a calendar that looks broken on first try. Pass
 * `injectStyles: false` and include `CALENDAR_CSS` yourself under a strict
 * Content-Security-Policy that forbids inline styles.
 *
 * Plain class selectors, not a cascade layer. A layer would lose to every
 * unlayered rule of the page — `output { display: block }`, a `button` reset,
 * Tailwind's preflight — and those would quietly take the layout apart. A
 * class beats a bare element selector, and since the stylesheet is inserted
 * first in the head, any class rule the page loads after it wins on equal
 * specificity: `.tz-cal__day { … }` in your CSS still overrides this.
 */
export const CALENDAR_CSS = `
.tz-cal { display: inline-block; }
.tz-cal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tz-cal-gap, var(--tz-gap, 0.25rem));
  padding: var(--tz-cal-header-padding, 0.25rem 0);
}
.tz-cal__nav,
.tz-cal__day,
.tz-cal__title,
.tz-cal__coarse-cell {
  border: 0;
  background: transparent;
  color: inherit;
  font: var(--tz-font, inherit);
  cursor: pointer;
  border-radius: var(--tz-cal-radius, var(--tz-radius, 0.25rem));
}
.tz-cal__title {
  font-weight: var(--tz-cal-title-weight, 600);
  padding: 0.125rem 0.5rem;
}
.tz-cal__title--static { cursor: default; }
.tz-cal__weekdays,
.tz-cal__week {
  display: grid;
  grid-template-columns: repeat(7, var(--tz-cal-cell-size, 2rem));
  gap: var(--tz-cal-gap, var(--tz-gap, 0.25rem));
}
/* One column more, for the week numbers, when they are asked for. */
.tz-cal--weeks .tz-cal__weekdays,
.tz-cal--weeks .tz-cal__week {
  grid-template-columns: var(--tz-cal-week-size, 1.75rem) repeat(7, var(--tz-cal-cell-size, 2rem));
}
.tz-cal__weeknumber {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--tz-cal-weekday-size, 0.75em);
  opacity: 0.55;
  border-right: 1px solid var(--tz-border, color-mix(in srgb, currentColor 20%, transparent));
  margin-right: 0.15rem;
}
.tz-cal__weeknumber--heading { border-right-color: transparent; }
.tz-cal__weekday {
  text-align: center;
  font-size: var(--tz-cal-weekday-size, 0.75em);
  opacity: 0.7;
}
.tz-cal__day {
  height: var(--tz-cal-cell-size, 2rem);
  text-align: center;
}
.tz-cal__day--outside,
.tz-cal__coarse-cell--outside { opacity: var(--tz-cal-outside-opacity, 0.35); }
.tz-cal__day--today,
.tz-cal__coarse-cell--today { outline: 1px solid var(--tz-cal-today-border, var(--tz-accent, currentColor)); }
.tz-cal__day--selected,
.tz-cal__coarse-cell--selected {
  background: var(--tz-cal-selected-bg, var(--tz-accent, currentColor));
  color: var(--tz-cal-selected-fg, var(--tz-accent-fg, canvas));
}
.tz-cal__day:disabled { opacity: 0.3; cursor: not-allowed; }
/* Four columns: twelve months and twelve years both land on three tidy rows,
   and the block ends up as wide as the day grid, so the header does not jump
   when the view changes. */
.tz-cal__coarse {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--tz-cal-gap, var(--tz-gap, 0.25rem));
  width: calc(7 * var(--tz-cal-cell-size, 2rem) + 6 * var(--tz-cal-gap, var(--tz-gap, 0.25rem)));
}
.tz-cal__coarse-cell { padding: 0.5rem 0.25rem; }
/* A note under the number: the cells widen and grow, and only then. */
.tz-cal--notes { --tz-cal-cell-size: var(--tz-cal-note-cell-size, 2.75rem); }
.tz-cal--notes .tz-cal__day {
  height: auto;
  min-height: calc(var(--tz-cal-cell-size) * 1.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.0625rem;
  padding: 0.25rem 0;
}
.tz-cal__note {
  font-size: var(--tz-cal-note-size, 0.625rem);
  line-height: 1;
  opacity: 0.75;
  white-space: nowrap;
}
.tz-cal__footer {
  display: flex;
  justify-content: space-between;
  gap: var(--tz-cal-gap, var(--tz-gap, 0.25rem));
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--tz-border, color-mix(in srgb, currentColor 20%, transparent));
}
.tz-cal__action {
  border: 0;
  background: transparent;
  color: var(--tz-accent, inherit);
  font: var(--tz-font, inherit);
  font-size: 0.875em;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: var(--tz-cal-radius, var(--tz-radius, 0.25rem));
  cursor: pointer;
}
.tz-cal__action:disabled { opacity: 0.4; cursor: default; }
`;

/**
 * The field and its panel. The panel is fixed-position and placed by script;
 * without a theme it still gets a surface and a border, so an unthemed page
 * does not open a transparent calendar over its content.
 */
export const FIELD_CSS = `
.tz-field { display: inline-block; }
.tz-field__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tz-field-gap, 0.5rem);
  min-width: var(--tz-field-width, 12rem);
  padding: var(--tz-field-padding, 0.5rem 0.75rem);
  border: 1px solid var(--tz-field-border, var(--tz-border, currentColor));
  border-radius: var(--tz-field-radius, var(--tz-radius, 0.375rem));
  background: var(--tz-field-bg, var(--tz-bg, transparent));
  color: var(--tz-field-fg, var(--tz-fg));
  font: var(--tz-font, inherit);
  cursor: pointer;
  text-align: left;
}
.tz-field__trigger--empty .tz-field__text { opacity: var(--tz-field-placeholder-opacity, 0.6); }
.tz-field__trigger:disabled { opacity: 0.5; cursor: not-allowed; }
.tz-field__icon { opacity: 0.6; font-size: 0.75em; }
/* The field, its step menu and its two arrows on one line — but a narrow
   column is not a reason to push the forward arrow off the edge, so the row
   wraps and the trigger gives up its minimum width rather than the arrows
   giving up their place. */
.tz-field--shift {
  display: inline-flex;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 0.25rem;
  max-width: 100%;
}
.tz-field--shift > .tz-field__trigger,
.tz-field--shift > .tz-field__wrap { flex: 1 1 8rem; }
/* The trigger's own minimum has to go too, or it overflows the box it was
   just told to shrink and covers the buttons beside it. */
.tz-field--shift .tz-field__trigger,
.tz-field--shift .tz-field__wrap { min-width: 0; }
.tz-field__shift {
  border: 1px solid var(--tz-field-border, var(--tz-border, currentColor));
  border-radius: var(--tz-field-radius, var(--tz-radius, 0.375rem));
  background: var(--tz-field-bg, var(--tz-bg, transparent));
  color: inherit;
  font: var(--tz-font, inherit);
  padding: 0 0.6rem;
  cursor: pointer;
  line-height: 1;
}
.tz-field__shift:disabled { opacity: 0.4; cursor: not-allowed; }
.tz-field__step[hidden] { display: none; }
.tz-field__step[hidden] { display: none; }
.tz-field__step {
  border: 1px solid var(--tz-field-border, var(--tz-border, currentColor));
  border-radius: var(--tz-field-radius, var(--tz-radius, 0.375rem));
  background: var(--tz-field-bg, var(--tz-bg, transparent));
  color: var(--tz-field-fg, var(--tz-fg, inherit));
  font: var(--tz-font, inherit);
  font-size: 0.85em;
  padding: 0 0.6rem;
  white-space: nowrap;
  cursor: pointer;
}
.tz-field__step:hover:not(:disabled) { background: var(--tz-hover, color-mix(in srgb, currentColor 10%, transparent)); }
.tz-field__step:disabled { opacity: 0.5; cursor: not-allowed; }
.tz-field__step:disabled { opacity: 0.5; cursor: not-allowed; }
.tz-field__wrap { display: inline-flex; align-items: stretch; position: relative; }
.tz-field__trigger--editable {
  min-width: var(--tz-field-width, 12rem);
  padding-right: 2rem;
  font: var(--tz-font, inherit);
  font-variant-numeric: tabular-nums;
}
.tz-field__trigger--invalid { border-color: var(--tz-danger, currentColor); }
.tz-field__icon-button {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  display: inline-flex;
  align-items: center;
  padding: 0 0.6rem;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.tz-field__panel {
  position: fixed;
  z-index: var(--tz-panel-z, 1000);
  padding: 0.75rem;
  border: 1px solid;
  border-radius: 0.5rem;
  background: Canvas;
  color: CanvasText;
  font: var(--tz-font, inherit);
}
.tz-field__panel--dialog {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.tz-field__backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(var(--tz-panel-z, 1000) - 1);
  background: rgb(0 0 0 / 0.3);
}
`;

/** The slot list. Struck through = impossible, dashed = twice, faded = taken. */
export const SLOTS_CSS = `
.tz-slots {
  display: grid;
  /* As many columns as fit by default, none narrower than a time with its
     offset under it; --tz-slot-columns fixes the count instead. */
  grid-template-columns: repeat(
    var(--tz-slot-columns, auto-fill),
    minmax(var(--tz-slot-min-width, 4rem), 1fr)
  );
  gap: var(--tz-slot-gap, 0.375rem);
}
.tz-slots__slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* A row holding a repeated hour is taller; the others centre in it. */
  justify-content: center;
  gap: 0.125rem;
  padding: var(--tz-slot-padding, 0.5rem 0.25rem);
  border: 1px solid var(--tz-slot-border, var(--tz-border, currentColor));
  border-radius: var(--tz-slot-radius, var(--tz-radius, 0.375rem));
  background: var(--tz-slot-bg, var(--tz-bg, transparent));
  color: var(--tz-slot-fg, var(--tz-fg));
  font: var(--tz-font, inherit);
  cursor: pointer;
}
.tz-slots__slot--selected {
  background: var(--tz-slot-bg-selected, var(--tz-accent, currentColor));
  color: var(--tz-slot-fg-selected, var(--tz-accent-fg, canvas));
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
.tz-slots__slot--repeated { border-style: var(--tz-slot-repeated-border-style, dashed); }
.tz-slots__offset,
.tz-slots__note {
  font-size: var(--tz-slot-note-size, 0.75em);
  opacity: 0.8;
}
.tz-slots__empty { grid-column: 1 / -1; margin: 0; opacity: 0.7; }
`;

/**
 * The range. The middle has square edges so the run reads as one shape, and
 * only the ends are rounded — which is how a user sees at a glance where it
 * starts and stops.
 */
export const RANGE_CSS = `
.tz-range { display: inline-block; }
.tz-range__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tz-cal-gap, var(--tz-gap, 0.25rem));
  padding: var(--tz-cal-header-padding, 0.25rem 0);
}
.tz-range__title { font-weight: var(--tz-cal-title-weight, 600); }
/* Side by side, and wrapping to one column when there is no room. */
.tz-range--months .tz-range__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--tz-range-month-gap, 1.25rem);
}
.tz-range__month-title {
  font-weight: var(--tz-cal-title-weight, 600);
  text-align: center;
  padding: var(--tz-cal-header-padding, 0.25rem 0);
}
.tz-range__month-title:empty { display: none; }
.tz-range__nav,
.tz-range__day {
  border: 0;
  background: transparent;
  color: inherit;
  font: var(--tz-font, inherit);
  cursor: pointer;
  border-radius: var(--tz-cal-radius, var(--tz-radius, 0.25rem));
}
.tz-range__weekdays,
.tz-range__week {
  display: grid;
  grid-template-columns: repeat(7, var(--tz-cal-cell-size, 2rem));
}
.tz-range--weeks .tz-range__weekdays,
.tz-range--weeks .tz-range__week {
  grid-template-columns: var(--tz-cal-week-size, 1.75rem) repeat(7, var(--tz-cal-cell-size, 2rem));
}
.tz-range__weeknumber {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--tz-cal-weekday-size, 0.75em);
  opacity: 0.55;
  border-right: 1px solid var(--tz-border, color-mix(in srgb, currentColor 20%, transparent));
  margin-right: 0.15rem;
}
.tz-range__weeknumber--heading { border-right-color: transparent; }
.tz-range__weekday {
  text-align: center;
  font-size: var(--tz-cal-weekday-size, 0.75em);
  opacity: 0.7;
}
.tz-range__day { height: var(--tz-cal-cell-size, 2rem); text-align: center; }
.tz-range__day--outside { opacity: var(--tz-cal-outside-opacity, 0.35); }
.tz-range__day--today { outline: 1px solid var(--tz-cal-today-border, var(--tz-accent, currentColor)); }
.tz-range__day--within {
  background: var(--tz-range-within-bg, color-mix(in srgb, var(--tz-accent, currentColor) 16%, var(--tz-bg, transparent)));
  border-radius: 0;
}
.tz-range__day--start,
.tz-range__day--end {
  background: var(--tz-cal-selected-bg, var(--tz-accent, currentColor));
  color: var(--tz-cal-selected-fg, var(--tz-accent-fg, canvas));
}
.tz-range__day--start { border-radius: var(--tz-cal-radius, var(--tz-radius, 0.25rem)) 0 0 var(--tz-cal-radius, var(--tz-radius, 0.25rem)); }
.tz-range__day--end { border-radius: 0 var(--tz-cal-radius, var(--tz-radius, 0.25rem)) var(--tz-cal-radius, var(--tz-radius, 0.25rem)) 0; }
.tz-range__day--start.tz-range__day--end { border-radius: var(--tz-cal-radius, var(--tz-radius, 0.25rem)); }
.tz-range__day:disabled { opacity: 0.3; cursor: not-allowed; }
.tz-range--notes { --tz-cal-cell-size: var(--tz-cal-note-cell-size, 2.75rem); }
.tz-range--notes .tz-range__day {
  height: auto;
  min-height: calc(var(--tz-cal-cell-size) * 1.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.0625rem;
  padding: 0.25rem 0;
}
.tz-range__note {
  font-size: var(--tz-cal-note-size, 0.625rem);
  line-height: 1;
  opacity: 0.75;
  white-space: nowrap;
}
.tz-range__error { font-size: 0.8em; color: var(--tz-range-error-fg, var(--tz-danger, currentColor)); }
`;

/** The interval: the answer on top, then the two legs side by side when there is room. */
export const DTR_CSS = `
.tz-dtr { display: block; }
.tz-dtr__allday {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: var(--tz-dtr-gap, 1rem);
  font-size: 0.9em;
}
.tz-dtr__allday-text { cursor: pointer; }
.tz-dtr__allday-box {
  position: relative;
  width: 2.25rem;
  height: 1.25rem;
  flex: none;
  padding: 0;
  border: 1px solid var(--tz-border, currentColor);
  border-radius: 999px;
  background: var(--tz-bg-raised, transparent);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}
.tz-dtr__allday-box:focus-visible {
  outline: var(--tz-focus-ring, 2px solid var(--tz-accent));
  outline-offset: 2px;
}
.tz-dtr__allday-knob {
  position: absolute;
  top: 50%;
  left: 0.175rem;
  width: 0.875rem;
  height: 0.875rem;
  border-radius: 50%;
  background: var(--tz-fg-muted, currentColor);
  transform: translateY(-50%);
  transition: left 120ms ease, background-color 120ms ease;
}
.tz-dtr__allday-box--on {
  border-color: var(--tz-accent, currentColor);
  background: var(--tz-accent, currentColor);
}
.tz-dtr__allday-box--on .tz-dtr__allday-knob {
  left: calc(100% - 1.05rem);
  background: var(--tz-accent-fg, canvas);
}
.tz-dtr__allday-box:disabled { opacity: 0.5; cursor: not-allowed; }
.tz-dtr__legs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--tz-dtr-leg-min, 16rem), 1fr));
  gap: var(--tz-dtr-gap, 1.5rem);
}
.tz-dtr__legend {
  margin: 0 0 var(--tz-dtr-legend-gap, 0.5rem);
  font-size: var(--tz-dtr-legend-size, 0.8em);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}
.tz-dtr__leg tz-date-field { margin-bottom: var(--tz-dtr-gap, 0.75rem); display: block; }
/* Twenty-four times is a long list. Capping it keeps both ends of the
   interval, and the answer above them, on one screen. A leg is narrower than
   a page, so it sets its own column count. */
.tz-dtr__leg tz-time-slots {
  --tz-slot-columns: var(--tz-dtr-slot-columns, 3);
  display: grid;
  max-height: var(--tz-dtr-slots-height, 15rem);
  overflow-y: auto;
  padding-right: 0.25rem;
}
.tz-dtr__result {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.75rem;
  margin-bottom: var(--tz-dtr-gap, 1.25rem);
}
.tz-dtr__summary {
  font-weight: var(--tz-dtr-summary-weight, 600);
  font-size: var(--tz-dtr-summary-size, 1.375rem);
}
.tz-dtr__warning { color: var(--tz-dtr-warning-fg, var(--tz-warning, currentColor)); font-size: 0.9em; }
.tz-dtr__error { color: var(--tz-dtr-error-fg, var(--tz-danger, currentColor)); font-size: 0.9em; }
`;

/** The daily range: the answer on top, then the days beside the two lists of hours. */
export const DAILY_CSS = `
.tz-daily { display: block; }
.tz-daily__body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
  gap: var(--tz-dtr-gap, 1.25rem);
  align-items: start;
}
.tz-daily__legend {
  margin: 0 0 var(--tz-dtr-legend-gap, 0.5rem);
  font-size: var(--tz-dtr-legend-size, 0.8em);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}
.tz-daily__times {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.tz-daily__column-label { margin: 0 0 0.375rem; font-size: 0.8125em; font-weight: 600; }
.tz-daily__list {
  --tz-slot-columns: var(--tz-daily-slot-columns, 2);
  max-height: var(--tz-daily-list-height, 16rem);
  overflow-y: auto;
  align-content: start;
  padding-right: 0.25rem;
}
.tz-daily__note { display: block; margin-top: 0.25rem; font-size: 0.75em; opacity: 0.7; }
.tz-daily__result {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.75rem;
  margin-bottom: var(--tz-dtr-gap, 1.25rem);
}
.tz-daily__summary {
  font-weight: var(--tz-dtr-summary-weight, 600);
  font-size: var(--tz-dtr-summary-size, 1.375rem);
}
.tz-daily__overnight { font-size: 0.9em; opacity: 0.75; }
.tz-daily__unusual {
  flex-basis: 100%;
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.9em;
  color: var(--tz-dtr-warning-fg, var(--tz-warning, currentColor));
}
`;

/** The compact time input: two fields, their arrows, and an AM/PM button. */
export const TIME_CSS = `
.tz-time {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font: var(--tz-font, inherit);
}
.tz-time__field {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--tz-time-border, var(--tz-border, currentColor));
  border-radius: var(--tz-time-radius, var(--tz-radius, 0.375rem));
  background: var(--tz-time-bg, var(--tz-bg, transparent));
  overflow: hidden;
}
.tz-time__input {
  width: var(--tz-time-width, 2.5rem);
  border: 0;
  padding: 0.375rem 0.25rem;
  background: transparent;
  color: var(--tz-time-fg, var(--tz-fg));
  font: inherit;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.tz-time__input:focus { outline: none; }
.tz-time__field:focus-within {
  border-color: var(--tz-accent, currentColor);
  outline: var(--tz-focus-ring, 2px solid var(--tz-accent));
  outline-offset: 1px;
}
.tz-time__input:disabled { opacity: 0.5; cursor: not-allowed; }
.tz-time__arrows { display: flex; flex-direction: column; }
.tz-time__arrow {
  flex: 1;
  border: 0;
  border-left: 1px solid var(--tz-time-border, var(--tz-border, currentColor));
  padding: 0 0.3rem;
  background: transparent;
  color: inherit;
  font-size: 0.6rem;
  line-height: 1;
  cursor: pointer;
}
.tz-time__arrow + .tz-time__arrow { border-top: 1px solid var(--tz-time-border, var(--tz-border, currentColor)); }
.tz-time__separator { opacity: 0.6; }
.tz-time__meridiem {
  margin-left: 0.25rem;
  border: 1px solid var(--tz-time-border, var(--tz-border, currentColor));
  border-radius: var(--tz-time-radius, var(--tz-radius, 0.375rem));
  padding: 0.375rem 0.5rem;
  background: var(--tz-time-bg, var(--tz-bg, transparent));
  color: inherit;
  font: inherit;
  font-size: 0.8125em;
  cursor: pointer;
}

/* The row under a calendar, as flatpickr draws it: large figures, no frames,
   and arrows that only appear when they are wanted. */
.tz-time--bare {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 100%;
  font-size: 1.05rem;
}
.tz-time--bare .tz-time__field {
  flex: none;
  min-width: 3.25rem;
  border: 0;
  border-radius: var(--tz-radius, 0.375rem);
  background: transparent;
  justify-content: center;
}
.tz-time--bare .tz-time__input {
  width: 2.75rem;
  padding: 0.15rem 0.1rem;
  font-size: 1.25em;
  font-weight: 600;
}
/* In a panel there is room, so the arrows go where a hand expects them: one
   above the figures and one below, standing on their own. Nothing moves in
   the DOM for this — the column is made here, so the reading order stays
   input-then-arrows for a screen reader. */
.tz-time--bare .tz-time__field { flex-direction: column; gap: 0.1rem; }
.tz-time--bare .tz-time__arrows { display: contents; }
.tz-time--bare .tz-time__arrow {
  border: 0;
  opacity: 0.55;
  padding: 0.1rem 0.75rem;
  font-size: 0.8em;
  line-height: 1;
  border-radius: var(--tz-radius, 0.375rem);
}
.tz-time--bare .tz-time__arrow--up { order: -1; }
.tz-time--bare .tz-time__arrow:hover:not(:disabled) {
  opacity: 1;
  background: var(--tz-hover, color-mix(in srgb, currentColor 10%, transparent));
}
.tz-time--bare .tz-time__separator { align-self: center; }
.tz-time--bare .tz-time__meridiem {
  border: 0;
  background: transparent;
  font-size: 0.95rem;
  font-weight: 600;
}
.tz-time--bare .tz-time__field:focus-within {
  background: var(--tz-bg-raised, transparent);
  outline: none;
}
`;

/** The date-and-time panel: the calendar, then the time under it. */
export const DATETIME_CSS = `
.tz-datetime__panel { display: grid; gap: 0.5rem; }
.tz-datetime__time {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--tz-border, color-mix(in srgb, currentColor 20%, transparent));
}
.tz-datetime__time--list,
.tz-datetime__time--select { display: block; }
.tz-datetime__time--select .tz-datetime__label { display: block; margin-bottom: 0.375rem; }
.tz-datetime__label { font-size: 0.8125em; opacity: 0.7; }
.tz-datetime__time--list .tz-datetime__label { display: block; margin-bottom: 0.375rem; }
.tz-datetime__time--list .tz-slots {
  max-height: var(--tz-datetime-slots-height, 11rem);
  overflow-y: auto;
  align-content: start;
}
.tz-datetime__note {
  margin: 0;
  font-size: 0.8125em;
  color: var(--tz-warning, currentColor);
  max-width: 18rem;
}
.tz-datetime__readings { display: flex; gap: 0.375rem; }
.tz-datetime__reading {
  border: 1px solid var(--tz-border, currentColor);
  border-radius: var(--tz-radius, 0.375rem);
  padding: 0.25rem 0.5rem;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.8125em;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.tz-datetime__reading--on {
  border-color: var(--tz-accent, currentColor);
  background: var(--tz-accent, currentColor);
  color: var(--tz-accent-fg, canvas);
}
`;

/** Two menus: the browser's own, dressed to match. */
export const TIMESELECT_CSS = `
.tz-timeselect {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font: var(--tz-font, inherit);
}
.tz-timeselect__menu {
  border: 1px solid var(--tz-time-border, var(--tz-border, currentColor));
  border-radius: var(--tz-time-radius, var(--tz-radius, 0.375rem));
  padding: 0.35rem 0.4rem;
  background: var(--tz-time-bg, var(--tz-bg, transparent));
  color: var(--tz-time-fg, var(--tz-fg));
  font: inherit;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.tz-timeselect__menu:focus-visible {
  outline: var(--tz-focus-ring, 2px solid var(--tz-accent));
  outline-offset: 1px;
}
.tz-timeselect__menu:disabled { opacity: 0.5; cursor: not-allowed; }
.tz-timeselect__separator { opacity: 0.6; }
`;

/** The range field's panel: the calendar, the named ranges beside it, a footer. */
export const DATEINPUT_CSS = `
.tz-dateinput { display: inline-flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
.tz-dateinput__label {
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.6;
}
.tz-dateinput__label[hidden] { display: none; }
/* The same field as everywhere else in the library — same border, same
   radius, same ground — because one of these sitting next to a tz-field that
   looks different reads as a mistake. */
.tz-dateinput__row {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--tz-field-border, var(--tz-border, currentColor));
  border-radius: var(--tz-field-radius, var(--tz-radius, 0.375rem));
  background: var(--tz-field-bg, var(--tz-bg, transparent));
  min-width: 0;
}
.tz-dateinput__row:focus-within { border-color: var(--tz-accent, currentColor); }
.tz-dateinput__input {
  flex: 0 1 auto;
  min-width: 0;
  /* Wide enough for the longest date the locale writes, and no wider: a field
     stretched across the panel invites text that does not belong in it. */
  width: 8.5rem;
  box-sizing: border-box;
  border: 0;
  background: transparent;
  color: var(--tz-field-fg, var(--tz-fg, inherit));
  font: var(--tz-font, inherit);
  padding: var(--tz-field-padding, 0.5rem 0.75rem);
}
.tz-dateinput__input:focus { outline: none; }
.tz-dateinput__input:disabled { opacity: 0.5; cursor: not-allowed; }
.tz-dateinput__input--invalid { color: var(--tz-danger, currentColor); }
.tz-dateinput__clear[hidden] { display: none; }
.tz-dateinput__clear {
  border: 0;
  background: transparent;
  color: inherit;
  font: var(--tz-font, inherit);
  line-height: 1;
  padding: 0.2rem 0.45rem;
  opacity: 0.55;
  cursor: pointer;
}
.tz-dateinput__clear:hover:not(:disabled) { opacity: 1; }
.tz-dateinput__clear:disabled { opacity: 0.2; cursor: default; }
/* The field the next click in the calendar will fill. Said with a ring rather
   than a colour alone, so it survives a palette and a colour-blind reader. */
.tz-dateinput--armed .tz-dateinput__row {
  border-color: var(--tz-accent, currentColor);
  box-shadow: 0 0 0 2px var(--tz-ring, color-mix(in srgb, var(--tz-accent, currentColor) 35%, transparent));
}
/* The hour beside the day, not on a row of its own: one field, two halves.
   Its arrows sit above and below the figures, as they do in a panel, and the
   field around it is its frame — it brings none of its own here. */
.tz-dateinput__time { padding-right: 0.3rem; }
.tz-dateinput__time.tz-time { width: auto; gap: 0.1rem; font-size: 1rem; }
.tz-dateinput__time .tz-time__field { border: 0; background: transparent; min-width: 0; }
.tz-dateinput__time .tz-time__input { width: 1.7rem; padding: 0; font-size: 1em; text-align: center; }
.tz-dateinput__time .tz-time__arrow { padding: 0 0.5rem; font-size: 0.6em; opacity: 0.5; }
.tz-dateinput__time .tz-time__separator { padding: 0 0.05rem; }
.tz-dateinput__time[hidden] { display: none; }
.tz-dateinput__extra:empty { display: none; }
.tz-dateinput__extra { display: flex; gap: 0.375rem; margin-top: 0.15rem; }
`;

export const RANGEFIELD_CSS = `
.tz-rangefield__panel { display: grid; gap: 0.75rem; }
/* The dates and their arrows are one thing; the calendar and its shortcuts
   are another. Without a line between them the panel reads as one long column
   of controls. */
.tz-rangefield__title {
  margin: 0 0 0.25rem;
  font-size: 0.95em;
  font-weight: 600;
}
/* The menus of an hour, inside a field: no frame of their own either. */
.tz-dateinput__time .tz-timeselect { gap: 0.15rem; }
.tz-dateinput__time .tz-timeselect__menu {
  border: 0;
  background: transparent;
  padding: 0.2rem 0.1rem;
}
.tz-rangefield__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.75rem 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--tz-border, color-mix(in srgb, currentColor 18%, transparent));
}
/* The two fields sit side by side, with whatever separates them between
   them — a word, an arrow, nothing. They drop onto two lines only when the
   panel is too narrow to hold them. */
.tz-rangefield__inputs {
  display: flex;
  flex-wrap: wrap;
  /* Tops aligned, not bottoms: the two readings of a repeated hour appear
     under one of the two fields, and aligning bottoms let that lift the other
     field half an inch off the line. */
  align-items: flex-start;
  gap: 0.5rem 0.75rem;
  min-width: 0;
}
/* The switch and the mark between the fields stand on the line of the fields,
   not of the words above them. */
.tz-rangefield__head > .tz-dtr__allday { padding-top: 1.35rem; }
.tz-rangefield__between {
  padding-top: 1.75rem;
  opacity: 0.6;
  font-size: 1.1em;
}
.tz-rangefield__bounds {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.tz-rangefield__bound-group {
  display: inline-flex;
  border: 1px solid var(--tz-border, color-mix(in srgb, currentColor 25%, transparent));
  border-radius: var(--tz-radius, 0.375rem);
  overflow: hidden;
}
.tz-rangefield__bound {
  border: 0;
  background: transparent;
  color: inherit;
  font: var(--tz-font, inherit);
  font-size: 0.85em;
  padding: 0.3rem 0.65rem;
  cursor: pointer;
}
.tz-rangefield__bound + .tz-rangefield__bound {
  border-left: 1px solid var(--tz-border, color-mix(in srgb, currentColor 25%, transparent));
}
.tz-rangefield__bound--on {
  background: var(--tz-accent, currentColor);
  color: var(--tz-accent-fg, canvas);
}
.tz-rangefield__ends { display: flex; gap: 0.35rem; }
/* display on the element itself beats [hidden]'s display:none, so it has to be
   said again — the chip for an end that is not there must really go. */
.tz-rangefield__end[hidden] { display: none; }
.tz-rangefield__end {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid var(--tz-border, color-mix(in srgb, currentColor 25%, transparent));
  border-radius: var(--tz-radius, 0.375rem);
  padding: 0.2rem 0.2rem 0.2rem 0.5rem;
  font-size: 0.85em;
}
.tz-rangefield__end-clear {
  border: 0;
  background: transparent;
  color: inherit;
  font: var(--tz-font, inherit);
  line-height: 1;
  padding: 0.1rem 0.3rem;
  opacity: 0.6;
  cursor: pointer;
}
.tz-rangefield__end-clear:hover:not(:disabled) { opacity: 1; }
.tz-rangefield__shift {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.tz-rangefield__shift-label { font-size: 0.9em; font-weight: 600; }
.tz-rangefield__shift-arrow {
  border: 0;
  border-radius: var(--tz-radius, 0.375rem);
  background: transparent;
  color: inherit;
  font: var(--tz-font, inherit);
  font-size: 1.1em;
  padding: 0.15rem 0.5rem;
  cursor: pointer;
}
.tz-rangefield__shift-arrow:hover:not(:disabled) { background: var(--tz-hover, color-mix(in srgb, currentColor 10%, transparent)); }
.tz-rangefield__shift-arrow:disabled { opacity: 0.4; cursor: not-allowed; }
.tz-rangefield__body {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}
.tz-rangefield__presets {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 9rem;
  max-height: var(--tz-rangefield-presets-height, 17rem);
  overflow-y: auto;
  order: var(--tz-rangefield-presets-order, 1);
}
.tz-rangefield__preset-list { display: flex; flex-direction: column; gap: 0.125rem; }
.tz-rangefield__length { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.4rem; }
.tz-rangefield__length-row { display: flex; align-items: center; gap: 0.25rem; }
.tz-rangefield__length-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 5rem;
  border: 1px solid var(--tz-field-border, var(--tz-border, currentColor));
  border-radius: var(--tz-field-radius, var(--tz-radius, 0.375rem));
  background: var(--tz-field-bg, var(--tz-bg, transparent));
  color: var(--tz-field-fg, var(--tz-fg, inherit));
  font: var(--tz-font, inherit);
  font-size: 0.875em;
  padding: 0.3rem 0.5rem;
}
.tz-rangefield__length-input:focus { outline: none; border-color: var(--tz-accent, currentColor); }
.tz-rangefield__length-input--invalid { border-color: var(--tz-danger, currentColor); }
.tz-rangefield__length-help {
  border: 0;
  background: transparent;
  color: inherit;
  font: var(--tz-font, inherit);
  opacity: 0.6;
  cursor: help;
  padding: 0.1rem 0.2rem;
}
.tz-rangefield__length-help:hover { opacity: 1; }
.tz-rangefield__length-note[hidden] { display: none; }
.tz-rangefield__length-note {
  margin: 0;
  font-size: 0.75em;
  line-height: 1.35;
  opacity: 0.75;
  max-width: 13rem;
}
.tz-rangefield__preset {
  border: 0;
  border-radius: var(--tz-radius, 0.375rem);
  padding: 0.35rem 0.6rem;
  background: transparent;
  color: inherit;
  font: var(--tz-font, inherit);
  font-size: 0.875em;
  text-align: left;
  cursor: pointer;
}
.tz-rangefield__preset--on {
  background: var(--tz-accent, currentColor);
  color: var(--tz-accent-fg, canvas);
}
.tz-rangefield__times {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--tz-border, color-mix(in srgb, currentColor 20%, transparent));
}
.tz-rangefield__pair { display: flex; gap: 1rem; }
.tz-rangefield__time[hidden] { display: none; }
.tz-rangefield__readings[hidden] { display: none; }
.tz-rangefield__readings { margin-left: 0.25rem; }
.tz-rangefield__time { display: flex; align-items: center; gap: 0.4rem; }
.tz-rangefield__time-label { font-size: 0.8125em; opacity: 0.7; }
.tz-rangefield__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--tz-border, color-mix(in srgb, currentColor 20%, transparent));
}
.tz-rangefield__cancel,
.tz-rangefield__apply {
  border: 1px solid var(--tz-border, currentColor);
  border-radius: var(--tz-radius, 0.375rem);
  padding: 0.35rem 0.9rem;
  background: transparent;
  color: inherit;
  font: var(--tz-font, inherit);
  font-size: 0.875em;
  cursor: pointer;
}
.tz-rangefield__apply {
  border-color: var(--tz-accent, currentColor);
  background: var(--tz-accent, currentColor);
  color: var(--tz-accent-fg, canvas);
  font-weight: 600;
}
`;

/**
 * Puts a stylesheet where the host will see it, once.
 *
 * "Where the host will see it" is not always the document: inside a shadow
 * root, a <style> in <head> does not apply, so it goes into the shadow root.
 */
export function ensureStyles(host: HTMLElement, id: string, css: string): void {
  const root = host.getRootNode();
  const target = root instanceof ShadowRoot ? root : host.ownerDocument.head;
  if (target.querySelector(`style[data-tzslot="${id}"]`)) return;

  const style = host.ownerDocument.createElement('style');
  style.dataset['tzslot'] = id;
  style.textContent = css;
  // First, so anything the page itself declares comes after it.
  target.prepend(style);
}
