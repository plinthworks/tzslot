import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { useWidget, type Widget } from './use-widget.js';

/**
 * The props a caller actually gave, without the ones JSX invented.
 *
 * A prop left out of a tag arrives as `undefined`, and spreading that over the
 * library's defaults replaces them with nothing: `<RangeField timeZone="..."/>`
 * handed `value: undefined` to a field whose default is an empty period, and it
 * threw on the first paint reading `.start` of it. Every optional prop on every
 * component has the same shape, so it is done once, here.
 *
 * It is also what makes an uncontrolled field work without an API for it:
 * leave `value` out and the widget keeps its own, exactly as the dom one does.
 */
const given = <T extends Record<string, unknown>>(props: T): T =>
  Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined)) as T;

/**
 * One React component around one tzslot widget.
 *
 * Written once rather than twelve times, because the hard parts are the same
 * every time and a copy is a place for them to drift: the callback that must
 * not rebuild the widget, the props that must not clobber defaults, the
 * settings that must be rebuilt only when something really changed.
 *
 * What differs between widgets is their settings type and the name of their
 * change callback — `onChange` throughout — so the factory takes the creator
 * and nothing else.
 */
export function widgetComponent<S extends object, I extends Widget>(
  create: (host: HTMLElement, settings: Partial<S>) => I,
  displayName: string,
) {
  type Props = Partial<S> & { className?: string | undefined };

  const Component = forwardRef<I | null, Props>(function Component(props, forwarded) {
    const { className, onChange, ...rest } = props as Props & { onChange?: unknown };

    /*
     * The callback lives in a ref, and the widget gets a stable wrapper.
     *
     * A parent writing `onChange={(v) => setValue(v)}` hands a new function on
     * every render, which is every React codebase. Letting that reach the
     * widget as a changed setting rebuilds the panel under whoever is using it.
     */
    const reported = useRef(onChange);
    reported.current = onChange;
    const report = useCallback(
      (...args: unknown[]) => (reported.current as ((...a: unknown[]) => void) | undefined)?.(...args),
      [],
    );

    /*
     * Rebuilt when a prop changes, and not otherwise.
     *
     * The dependency is the entries, not the object: an object literal is new
     * on every render, so depending on it would defeat the memo entirely.
     */
    const keys = Object.keys(rest).sort();
    const settings = useMemo(
      () => given({ ...(rest as Record<string, unknown>), onChange: report }) as unknown as Partial<S>,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [report, keys.join('|'), ...keys.map((k) => (rest as Record<string, unknown>)[k])],
    );

    const { ref, widget } = useWidget(create as never, settings as never);
    // `open()`, `close()`, `clear()` — the same handle the dom hands back, for
    // a screen that drives the field from a button of its own.
    useImperativeHandle(forwarded, () => widget as I, [widget]);

    // The widget claims the element it is given — display, class and all — so
    // it gets one of its own rather than whatever the caller is laying out in.
    return <div ref={ref} className={className} />;
  });

  Component.displayName = displayName;
  return Component;
}
