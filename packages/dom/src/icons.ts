/**
 * The few marks the widgets draw, as SVG.
 *
 * Drawn here rather than taken from an icon set: a library that pulls in
 * Lucide or Feather makes every consumer carry it, and a library that asks
 * for one makes every consumer install it before a field will render. These
 * follow the same drawing rules as that family — a 24 by 24 box, a two-unit
 * stroke, round caps and joins — so they sit beside those icons without
 * looking borrowed, and any of them can be replaced with your own node.
 */
const NS = 'http://www.w3.org/2000/svg';

export type IconName = 'calendar' | 'clock' | 'chevronLeft' | 'chevronRight' | 'x';

const PATHS: Record<IconName, string[]> = {
  calendar: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  chevronLeft: ['M15 18l-6-6 6-6'],
  chevronRight: ['M9 18l6-6-6-6'],
  x: ['M18 6 6 18', 'M6 6l12 12'],
};

/**
 * One of them, as an element ready to be put in a document.
 *
 * `currentColor` and `1em` rather than a colour and a size: an icon inside a
 * field should be the weight of the text beside it, and follow it into a dark
 * theme without being told.
 */
export function icon(name: IconName, doc: Document = document): SVGElement {
  const svg = doc.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('tz-icon', `tz-icon--${name}`);
  for (const d of PATHS[name]) {
    const path = doc.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
