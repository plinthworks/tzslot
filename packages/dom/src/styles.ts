/**
 * The layout every widget needs to be usable at all: grids, sizes, the reset
 * that turns a <button> into a cell. Colour and taste stay in @tzslot/theme.
 *
 * Injected rather than shipped as a file to import, because a calendar that
 * renders as a column of unstyled buttons until someone finds the right CSS
 * import is a calendar that looks broken on first try. Pass
 * `injectStyles: false` and include `CALENDAR_CSS` yourself under a strict
 * Content-Security-Policy that forbids inline styles.
 *
 * Everything sits in `@layer tzslot`: a layered rule loses to any unlayered
 * one, whatever its specificity, so a consumer's own `.tz-cal__day { … }`
 * always wins without `!important` or a longer selector.
 */
export const CALENDAR_CSS = `
@layer tzslot {
  .tz-cal { display: inline-block; }
  .tz-cal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--tz-cal-gap, 0.25rem);
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
    border-radius: var(--tz-cal-radius, 0.25rem);
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
    gap: var(--tz-cal-gap, 0.25rem);
  }
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
  .tz-cal__coarse-cell--today { outline: 1px solid var(--tz-cal-today-border, currentColor); }
  .tz-cal__day--selected,
  .tz-cal__coarse-cell--selected {
    background: var(--tz-cal-selected-bg, currentColor);
    color: var(--tz-cal-selected-fg, canvas);
  }
  .tz-cal__day:disabled { opacity: 0.3; cursor: not-allowed; }
  /* Four columns: twelve months and twelve years both land on three tidy rows,
     and the block ends up as wide as the day grid, so the header does not jump
     when the view changes. */
  .tz-cal__coarse {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--tz-cal-gap, 0.25rem);
    width: calc(7 * var(--tz-cal-cell-size, 2rem) + 6 * var(--tz-cal-gap, 0.25rem));
  }
  .tz-cal__coarse-cell { padding: 0.5rem 0.25rem; }
}
`;

/**
 * The field and its panel. The panel is fixed-position and placed by script;
 * without a theme it still gets a surface and a border, so an unthemed page
 * does not open a transparent calendar over its content.
 */
export const FIELD_CSS = `
@layer tzslot {
  .tz-field { display: inline-block; }
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
    font: var(--tz-font, inherit);
    cursor: pointer;
    text-align: left;
  }
  .tz-field__trigger--empty .tz-field__text { opacity: var(--tz-field-placeholder-opacity, 0.6); }
  .tz-field__trigger:disabled { opacity: 0.5; cursor: not-allowed; }
  .tz-field__icon { opacity: 0.6; font-size: 0.75em; }
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
