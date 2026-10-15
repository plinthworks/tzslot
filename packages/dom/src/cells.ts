import type { PlainDate } from '@tzslot/core';

/** What a grid knows about a day, handed to renderCell. */
export interface DayCellInfo {
  readonly date: PlainDate;
  /** Belongs to the month either side of the one shown. */
  readonly outside: boolean;
  readonly today: boolean;
  /** Selected — or, in a range, one of its two ends. */
  readonly selected: boolean;
  /** Already ruled out by min, max or isDateDisabled. */
  readonly disabled: boolean;
}

/** What renderCell may add to a day. Every field is optional. */
export interface CellRender {
  /** A short line under the number: a price, places left, "full". Text, never HTML. */
  readonly note?: string | undefined;
  /** Your own classes on the cell, to style it from your CSS. */
  readonly className?: string | readonly string[] | undefined;
  /** Rules the day out, on top of min, max and isDateDisabled. */
  readonly disabled?: boolean | undefined;
  /** A tooltip, and extra words for a screen reader. */
  readonly title?: string | undefined;
}

/**
 * Called for every day each time the grid is drawn — keep it cheap: a lookup,
 * not a request. Returning nothing leaves the day as it is.
 */
export type RenderCell = (cell: DayCellInfo) => CellRender | undefined | void;

/** Classes renderCell added last time, so a repaint can take them off again. */
const added = new WeakMap<Element, readonly string[]>();

/**
 * Applies a renderCell result to a day button. Returns whether it carries a
 * note, so the grid can make room for one.
 */
export function paintCell(
  cell: HTMLButtonElement,
  prefix: string,
  label: string,
  render: CellRender | undefined | void,
): boolean {
  const previous = added.get(cell);
  if (previous) cell.classList.remove(...previous);
  const classes = render?.className
    ? (typeof render.className === 'string' ? render.className.split(/\s+/) : [...render.className]).filter(Boolean)
    : [];
  if (classes.length) cell.classList.add(...classes);
  added.set(cell, classes);

  if (render?.title) cell.title = render.title;
  else cell.removeAttribute('title');

  const note = render?.note;
  if (!note) {
    cell.textContent = label;
    return false;
  }
  const doc = cell.ownerDocument;
  const number = doc.createElement('span');
  number.className = `${prefix}__num`;
  number.textContent = label;
  const small = doc.createElement('span');
  small.className = `${prefix}__note`;
  small.textContent = note;
  cell.replaceChildren(number, small);
  return true;
}

/**
 * What an arrow key means, which is not which way it points.
 *
 * Left and right mean "the day before" and "the day after", and in a
 * right-to-left calendar the day after is drawn to the *left*. The grids read
 * the key straight into a table of moves, so an Arabic reader pressing the
 * arrow towards tomorrow went to yesterday -- and the cell that took focus was
 * the one on the far side of where they were looking.
 *
 * Swapped here rather than in each table, so the six grids that navigate by
 * arrow cannot drift apart. Up and down are untouched: a week is below the one
 * before it in every writing direction.
 *
 * The direction is read from the element rather than from the document,
 * because a page may be left-to-right with one container reversed, and the
 * panel is told its own direction when it opens.
 */
export function readingKey(key: string, within: Element): string {
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return key;
  const view = within.ownerDocument.defaultView;
  if (!view || view.getComputedStyle(within).direction !== 'rtl') return key;
  return key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
}
