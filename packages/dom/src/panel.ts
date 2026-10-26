import { FIELD_CSS, ensureStyles } from './styles.js';

/** Anchored under the field, or centred over the page. */
/**
 * Why a panel closed, because it is not always the same answer.
 *
 * `escape` is a way out: a reader pressing it expects to leave nothing behind.
 * `outside` — a click anywhere else, or on a dialog's backdrop — is someone
 * finished and moving on. `api` is the screen or a button of its own asking.
 */
export type CloseReason = 'escape' | 'outside' | 'api';

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
  /**
   * Whether this panel may inject its own stylesheet.
   *
   * It did, unconditionally, however the field it belongs to was configured —
   * so `injectStyles: false` stopped the host's sheets and not the panel's,
   * and a consumer under a strict Content-Security-Policy had a blocked
   * <style> on every open. Reported by them, with the line number.
   *
   * A panel told `false` comes up unstyled unless the application has put the
   * sheets somewhere itself, which is the bargain the setting has always made.
   * `setStyleNonce` is the other answer and the better one: the sheets are
   * injected as before, carrying a nonce the policy accepts.
   */
  injectStyles?: boolean | undefined;
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
  onClose?: ((reason: CloseReason) => void) | undefined;
}

export interface PanelController {
  readonly isOpen: boolean;
  readonly element: HTMLElement | null;
  open(): void;
  close(options?: { restoreFocus?: boolean; reason?: CloseReason }): void;
  /** After something inside changed size. */
  place(): void;
  /** Put the focus inside an open panel — the way in for a field that is typed into. */
  focusInside(): void;
}

/** What a panel must take with it from where its field sits. */
/** Enough to tell two open panels apart on one page. */
let panels = 0;

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
  /*
   * And which way it reads, which nothing else here would tell it.
   *
   * The panel lives on the body, so an application that sets dir="rtl" on a
   * container rather than on <html> had its field laid out right-to-left and
   * the panel it opened laid out left-to-right. Everything in the panel that
   * follows the writing direction -- the logical properties, the order of the
   * two date boxes, the mirrored chevrons -- went the wrong way at once.
   *
   * Read from the field rather than copied from an attribute, because the
   * direction in force is a computed thing: it may come from any ancestor, or
   * from the page's own default.
   */
  panel.dir = here.direction === 'rtl' ? 'rtl' : 'ltr';
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
/**
 * The panels that are open, oldest first.
 *
 * Two things need to know about each other across instances. Escape belongs to
 * the topmost one: its handler sits on the document, so without this every open
 * panel heard the same press and closed — and with a report held, leaving one
 * field abandoned another field's change. And the scroll lock has to be undone
 * by whoever took it, not by whoever happens to close last.
 */
const stack: HTMLElement[] = [];

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
    /** The page's own value, kept only by the panel that locked it. */
    overflow: string | null;
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
    /*
     * Anchored on the edge the reader starts from.
     *
     * It was always `field.left`, so a panel wider than its field spilled to
     * the right. That is correct left-to-right and wrong the other way: in
     * Arabic the two line up on their right edges and the panel grows
     * leftwards. The clamp is unchanged and still wins — a panel is kept on
     * screen before it is kept aligned.
     */
    const rtl = win.getComputedStyle(panel).direction === 'rtl';
    const anchored = rtl ? field.right - panel.offsetWidth : field.left;
    const left = Math.max(edge, Math.min(anchored, win.innerWidth - panel.offsetWidth - edge));
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
  }

  /**
   * Whether a stop is really on screen, ancestors included.
   *
   * `hidden` on the node itself was not enough: a field hides a whole end by
   * putting the attribute on the wrapper, so the input inside it kept the
   * attribute-free look of a perfectly good tab stop. It then sat last in the
   * list, and being unfocusable the wrap-around test could never match — so
   * Tab walked out of a panel whose entire job is to hold it.
   */
  function onScreen(node: HTMLElement, panel: HTMLElement): boolean {
    for (let at: HTMLElement | null = node; at && at !== panel; at = at.parentElement) {
      if (at.hasAttribute('hidden')) return false;
    }
    return true;
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
    ).filter((node) => node.getAttribute('tabindex') !== '-1' && onScreen(node, panel));
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
    /*
     * An id, so the trigger can name what it opens.
     *
     * `aria-haspopup` says a popup exists; `aria-controls` says which element
     * it is, and a screen reader needs the second to let its reader move to
     * it. There was nothing to point at before — reported by a consumer
     * reading the markup, and true of all four fields.
     */
    panel.id = `tz-panel-${++panels}`;
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
    if (options.injectStyles !== false) ensureStyles(panel, 'field', FIELD_CSS);

    const dispose = options.content(panel);

    const listening = new AbortController();
    const on = { signal: listening.signal };
    doc.addEventListener(
      'keydown',
      (event) => {
        // The topmost panel only. One press used to close every open panel.
        if (event.key === 'Escape' && stack[stack.length - 1] === panel) {
          close({ restoreFocus: true, reason: 'escape' });
        }
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
          close({ restoreFocus: false, reason: 'outside' });
        }
      },
      on,
    );
    backdrop?.addEventListener('click', () => close({ restoreFocus: true, reason: 'outside' }), on);
    if (!dialog) {
      win.addEventListener('resize', place, on);
      // Capture, so scrolling any ancestor — not only the window — moves it.
      win.addEventListener('scroll', place, { ...on, capture: true, passive: true });
    }

    /*
     * A dialog holds the page still behind it; a popup follows it instead.
     *
     * Saved only by the panel that locks it. A popup saved the value too, and
     * restored it on the way out — so a dialog opening first, then a popup,
     * then both closing in that order left `hidden` on the page for good and
     * nothing on screen explained why it had stopped scrolling.
     */
    const overflow = dialog ? doc.documentElement.style.overflow : null;
    if (dialog) doc.documentElement.style.overflow = 'hidden';

    stack.push(panel);
    opened = { panel, backdrop, dispose, listening, overflow };
    place();
    // Painted before it is focused. onOpen is what fills the panel from the
    // value, and focusing an empty field first meant its blur — a moment
    // later, as the reader moved on — read the empty text back as a cleared
    // value.
    options.onOpen?.();
    /*
     * Placed again, now that there is something in it.
     *
     * `place()` above runs on an empty panel, and left-to-right that is fine:
     * the anchor is the field's left edge, which does not depend on how wide
     * the panel turns out to be. Right-to-left it does -- the anchor is
     * `field.right - panel.offsetWidth` -- so the first placement used a width
     * measured before `onOpen` filled the panel. Measured: 20px out, the right
     * edge past the field's and past the window, corrected only by the next
     * scroll or resize.
     */
    place();
    const landing = options.initialFocus
      ? options.initialFocus(panel)
      : panel.querySelector<HTMLElement>('button:not(:disabled)');
    landing?.focus();
  }

  function close({
    restoreFocus = true,
    reason = 'api',
  }: { restoreFocus?: boolean; reason?: CloseReason } = {}): void {
    if (!opened) return;
    const { panel, backdrop, dispose, listening, overflow } = opened;
    opened = null;
    listening.abort();
    dispose();
    panel.remove();
    backdrop?.remove();
    const at = stack.indexOf(panel);
    if (at !== -1) stack.splice(at, 1);
    if (overflow !== null) doc.documentElement.style.overflow = overflow;
    // Said before the focus moves: a field that opens on focus needs to know
    // the panel has closed, or handing the focus back opens it straight again
    // and Escape closes nothing.
    options.onClose?.(reason);
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
