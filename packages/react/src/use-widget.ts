import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** What every tzslot widget hands back. */
export interface Widget {
  update(settings: Record<string, unknown>): void;
  destroy(): void;
}

/**
 * Mounts a tzslot widget into an element React owns, and keeps it in step.
 *
 * The widgets are imperative: they claim an element, draw into it, and answer
 * through callbacks. React owns the element and re-renders at will. Three
 * things have to be true for the two to live together, and each of them is a
 * mistake that is easy to make and hard to see.
 *
 * **The widget is built once.** Not once per render, and not again when a
 * callback changes identity — which it does on every render unless the caller
 * wraps it, and callers do not. So the settings go through a ref and the
 * widget is created with an empty dependency list.
 *
 * **It survives a double mount.** React 18 and 19 mount, unmount and remount
 * every component in development, to find exactly the kind of effect that
 * leaks. Measured against the dom package before writing this: destroying a
 * field and creating another on the same element leaves one trigger and one
 * panel, so the cleanup below is enough and no guard is needed.
 *
 * **A value coming back does not go round again.** The widget reports a
 * change, the parent re-renders with it, and the settings effect pushes it
 * back down. The dom package already refuses an update that would overwrite a
 * reader's work in progress; what is added here is cheaper and comes first —
 * the settings object is only pushed when the render that produced it is not
 * the one the widget just caused.
 */
export function useWidget<S extends Record<string, unknown>, I extends Widget>(
  create: (host: HTMLElement, settings: S) => I,
  settings: S,
): { ref: (node: HTMLElement | null) => void; widget: I | null } {
  const latest = useRef(settings);
  latest.current = settings;
  const instance = useRef<I | null>(null);
  const [, rerender] = useState(0);

  /*
   * A callback ref rather than `useRef` plus an effect.
   *
   * React calls it with the node on mount and with null on unmount, in that
   * order, which is exactly the lifetime the widget wants — and it runs before
   * the browser paints, so nothing flashes between React's empty div and the
   * widget's own markup.
   */
  const ref = useRef((node: HTMLElement | null) => {
    if (node === null) {
      instance.current?.destroy();
      instance.current = null;
      return;
    }
    instance.current = create(node, latest.current);
    // The widget exists now, and a caller holding `widget` has been handed
    // null until this moment. One render to tell them.
    rerender((n) => n + 1);
  }).current;

  useLayoutEffect(
    () => () => {
      instance.current?.destroy();
      instance.current = null;
    },
    [],
  );

  // After paint, not before: `update` can repaint a panel, and doing that in a
  // layout effect blocks the frame for a change nobody is waiting on.
  useEffect(() => {
    instance.current?.update(settings);
  });

  return { ref, widget: instance.current };
}
