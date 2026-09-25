import { FIELD_CSS, ensureStyles } from './styles.js';

/** Anchored under the field, or centred over the page. */
export type FieldMode = 'popup' | 'dialog';

export interface PanelOptions {
  /**
   * The element the panel hangs from, and returns the focus to.
   *
   * Asked for each time rather than kept: a field that swaps its trigger —
   * `<tz-datetime-field>` does, between a button and an input, whenever
   * `editable` changes — left the panel holding a node no longer in the
   * document. It then measured a zero rectangle and landed in the corner of
   * the viewport, treated the real trigger as "outside" so a click closed and
   * reopened it, and returned the focus to nothing at all.
   */
  trigger: HTMLElement | (() => HTMLElement);
  /** Where the theme is read from — usually the field itself. */
  source: HTMLElement;
  /** Where the panel is attached. The body by default. */
  container: HTMLElement | undefined;
  mode: () => FieldMode;
  label: () => string;
  /** Fills a freshly opened panel, and returns how to take it apart. */
  content: (panel: HTMLElement) => () => void;
  /**
   * What the keyboard lands on. Left out, it is the panel's first tab stop;
   * returning null leaves the focus where it was, which is what a field being
   * typed into needs.
   */
  initialFocus?: ((panel: HTMLElement) => HTMLElement | null | undefined) | undefined;
  onOpen?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
}

export interface PanelController {
  readonly isOpen: boolean;
  readonly element: HTMLElement | null;
  open(): void;
  close(options?: { restoreFocus?: boolean }): void;
  /** After something inside changed size. */
  place(): void;
  /** Put the focus inside an open panel — the way in for a field that is typed into. */
  focusInside(): void;
}

/** What a panel must take with it from where its field sits. */
const CARRIED = [
  '--tz-color-scheme',
  '--tz-bg',
  '--tz-bg-raised',
  '--tz-fg',
  '--tz-fg-muted',
  '--tz-border',
  '--tz-accent',
  '--tz-accent-fg',
  '--tz-danger',
  '--tz-warning',
  '--tz-font',
  '--tz-radius',
];

/**
 * The panel lives on the body, so it inherits nothing from the field: a dark
 * card on a light page would open a light calendar, and a card with its own
 * accent would open one in the page's. Carry the attributes the stylesheets
 * select on, every palette variable that differs from the page's, and the
 * font — the body is often not where an application set it.
 */
function carryTheme(field: HTMLElement, panel: HTMLElement): void {
  for (const name of ['theme', 'contrast']) {
    const source = field.closest<HTMLElement>(`[data-${name}]`);
    if (source) panel.dataset[name] = source.dataset[name];
  }
  const win = field.ownerDocument.defaultView;
  if (!win) return;
  const here = win.getComputedStyle(field);
  const page = win.getComputedStyle(field.ownerDocument.documentElement);
  for (const name of CARRIED) {
    const value = here.getPropertyValue(name).trim();
    if (value && value !== page.getPropertyValue(name).trim()) panel.style.setProperty(name, value);
  }
  const font = here.getPropertyValue('--tz-font').trim();
  if (!font || font === 'inherit') {
    panel.style.fontFamily = here.fontFamily;
    panel.style.fontSize = here.fontSize;
    panel.style.lineHeight = here.lineHeight;
  }
}

/**
 * The floating half of a field: a panel on the body, placed under the trigger
 * or centred over the page, with the focus, the theme and the ways out that
 * both of those need.
 *
 * Shared rather than written twice, so a date field and a date-and-time field
 * cannot drift apart on Escape, on a click elsewhere, or on where the focus
 * goes when they close.
 */
export function createPanel(options: PanelOptions): PanelController {
  const { source, container } = options;
  const trigger = () => (typeof options.trigger === 'function' ? options.trigger() : options.trigger);
  const doc = trigger().ownerDocument;
  const win = doc.defaultView!;

  let opened: {
    panel: HTMLElement;
    backdrop: HTMLElement | null;
    dispose: () => void;
    listening: AbortController;
    overflow: string;
  } | null = null;

  /**
   * Under the field, or above it when there is no room below — a panel that
   * opens off the bottom of the screen is a panel nobody can use. Kept inside
   * the viewport sideways too.
   */
  function place(): void {
    if (!opened || options.mode() === 'dialog') return; // a dialog is centred by the stylesheet
    const { panel } = opened;
    const gap = 4;
    const edge = 8;
    const field = trigger().getBoundingClientRect();
    const height = panel.offsetHeight;
    const below = win.innerHeight - field.bottom;
    const flip = below < height + gap && field.top > below;
    const wanted = flip ? field.top - height - gap : field.bottom + gap;
    /*
     * Clamped to the window, both ways.
     *
     * It chose above or below and never "and then fit". On a 375px screen the
     * two-month panel came out 466 x 785 at top -378: 378px of it above the
     * fold, 99 past the right edge, and neither the panel nor the page
     * scrolled. The calendar was there and could not be reached.
     *
     * The stylesheet caps the panel at the viewport, so what is left here is
     * to keep its top edge on screen. Sticking to the bottom rather than the
     * top when the panel is taller than the window keeps the trigger's own
     * line visible — a field one scrolls back to is better than one hidden
     * under a panel.
     */
    const room = win.innerHeight - 2 * edge;
    const top = height >= room ? edge : Math.max(edge, Math.min(wanted, win.innerHeight - height - edge));
    const left = Math.max(edge, Math.min(field.left, win.innerWidth - panel.offsetWidth - edge));
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
  }

  /** Tab stays inside a panel that is open; leaving it would strand the keyboard. */
  function trapTab(panel: HTMLElement, event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    // Every kind of stop, not two of them. The list said button and input,
    // and the period field's default time layout builds <select> elements —
    // six of them in an open panel, none of them in the trap, so Tab walked
    // straight out of a panel that was supposed to hold it.
    const stops = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]',
      ),
    ).filter((node) => node.getAttribute('tabindex') !== '-1' && !node.hasAttribute('hidden'));
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function open(): void {
    if (opened) return;
    const dialog = options.mode() === 'dialog';
    const target = container ?? doc.body;

    const panel = doc.createElement('div');
    panel.className = dialog ? 'tz-field__panel tz-field__panel--dialog' : 'tz-field__panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', options.label());
    if (dialog) panel.setAttribute('aria-modal', 'true');
    carryTheme(source, panel);

    let backdrop: HTMLElement | null = null;
    if (dialog) {
      backdrop = doc.createElement('div');
      backdrop.className = 'tz-field__backdrop';
      target.append(backdrop);
    }
    target.append(panel);
    ensureStyles(panel, 'field', FIELD_CSS);

    const dispose = options.content(panel);

    const listening = new AbortController();
    const on = { signal: listening.signal };
    doc.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') close({ restoreFocus: true });
      },
      on,
    );
    panel.addEventListener('keydown', (event) => trapTab(panel, event), on);
    // A popup closes on a click anywhere else; the focus stays where that
    // click put it. A dialog closes on its backdrop.
    doc.addEventListener(
      'pointerdown',
      (event) => {
        const where = event.target as Node;
        if (!dialog && !panel.contains(where) && !trigger().contains(where)) {
          close({ restoreFocus: false });
        }
      },
      on,
    );
    backdrop?.addEventListener('click', () => close({ restoreFocus: true }), on);
    if (!dialog) {
      win.addEventListener('resize', place, on);
      // Capture, so scrolling any ancestor — not only the window — moves it.
      win.addEventListener('scroll', place, { ...on, capture: true, passive: true });
    }

    // A dialog holds the page still behind it; a popup follows it instead.
    const overflow = doc.documentElement.style.overflow;
    if (dialog) doc.documentElement.style.overflow = 'hidden';

    opened = { panel, backdrop, dispose, listening, overflow };
    place();
    // Painted before it is focused. onOpen is what fills the panel from the
    // value, and focusing an empty field first meant its blur — a moment
    // later, as the reader moved on — read the empty text back as a cleared
    // value.
    options.onOpen?.();
    const landing = options.initialFocus
      ? options.initialFocus(panel)
      : panel.querySelector<HTMLElement>('button:not(:disabled)');
    landing?.focus();
  }

  function close({ restoreFocus = true }: { restoreFocus?: boolean } = {}): void {
    if (!opened) return;
    const { panel, backdrop, dispose, listening, overflow } = opened;
    opened = null;
    listening.abort();
    dispose();
    panel.remove();
    backdrop?.remove();
    doc.documentElement.style.overflow = overflow;
    // Said before the focus moves: a field that opens on focus needs to know
    // the panel has closed, or handing the focus back opens it straight again
    // and Escape closes nothing.
    options.onClose?.();
    // Back to the field, or the keyboard user lands at the top of the document.
    if (restoreFocus) trigger().focus();
  }

  return {
    get isOpen() {
      return opened !== null;
    },
    get element() {
      return opened?.panel ?? null;
    },
    open,
    close,
    place,
    /**
     * Put the focus inside an open panel.
     *
     * A field that can be typed into keeps the focus in its text, so nothing
     * ever moved it into the panel: the calendar was reachable only by
     * tabbing through the rest of the document.
     */
    focusInside() {
      if (!opened) return;
      const landing = options.initialFocus
        ? options.initialFocus(opened.panel)
        : opened.panel.querySelector<HTMLElement>('button:not(:disabled)');
      (landing ?? opened.panel.querySelector<HTMLElement>('[tabindex="0"], button:not(:disabled)'))?.focus();
    },
  };
}
