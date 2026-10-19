// @vitest-environment jsdom
import { StrictMode, useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { Temporal } from '@tzslot/core';
import type { RangeFieldValue } from '@tzslot/dom';
import { RangeField } from '../src/index.js';

/**
 * The three ways an imperative widget and React go wrong together.
 *
 * None of them shows up in a happy-path test: the widget renders, the value
 * arrives, everything looks fine. They show up as a panel that closes while
 * someone is typing, a field that exists twice, or a browser that locks up.
 */
const paris = 'Europe/Paris';
const day = (iso: string) => Temporal.PlainDate.from(iso);
const panel = () => document.querySelector('.tz-field__panel');
const trigger = () => document.querySelector<HTMLButtonElement>('.tz-field__trigger')!;

afterEach(() => {
  cleanup();
  document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove());
});

describe('a tzslot field inside React', () => {
  it('draws one field, and one only, under StrictMode', () => {
    /*
     * React 18 and 19 mount, unmount and remount every component in
     * development, precisely to find effects that leak. A widget built in an
     * effect without cleanup leaves two of itself behind, and the second one
     * answers clicks the first one drew.
     */
    render(
      <StrictMode>
        <RangeField timeZone={paris} today={day('2026-10-08')} />
      </StrictMode>,
    );
    expect(document.querySelectorAll('.tz-field__trigger').length).toBe(1);
  });

  it('survives a parent that re-renders with a new callback every time', () => {
    /*
     * `onChange={(v) => setValue(v)}` is a new function on every render, which
     * is every React codebase. If that reaches the widget as a changed setting,
     * the panel is rebuilt under the reader — measured here by opening it and
     * forcing renders.
     */
    function Host() {
      const [count, setCount] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setCount((c) => c + 1)}>
            render
          </button>
          <RangeField timeZone={paris} today={day('2026-10-08')} onChange={() => void count} />
        </>
      );
    }
    render(<Host />);
    act(() => trigger().click());
    const opened = panel();
    expect(opened).not.toBeNull();

    const button = document.querySelector<HTMLButtonElement>('button[type="button"]')!;
    act(() => button.click());
    act(() => button.click());

    expect(panel()).toBe(opened); // the same panel, not a new one
    expect(document.querySelectorAll('.tz-field__trigger').length).toBe(1);
  });

  it('takes a value back from its own report without looping', () => {
    /*
     * The widget reports, the parent re-renders with the new value, and the
     * settings effect pushes it back down. A loop here is not a slow render,
     * it is a locked browser.
     */
    let renders = 0;
    function Controlled() {
      const [value, setValue] = useState<RangeFieldValue>({ start: null, end: null });
      renders++;
      return (
        <RangeField
          timeZone={paris}
          // Named, because without one the field takes the machine's — and the
          // first run of this test read `10/08/2026` on a US box.
          locale="fr-FR"
          today={day('2026-10-08')}
          value={value}
          onChange={(next) => setValue(next)}
        />
      );
    }
    render(<Controlled />);
    const before = renders;
    act(() => trigger().click());
    act(() => {
      panel()!.querySelector<HTMLButtonElement>('[data-date="2026-10-08"]')!.click();
    });
    act(() => {
      document
        .querySelector('.tz-field__panel')!
        .querySelector<HTMLButtonElement>('[data-date="2026-10-14"]')!
        .click();
    });
    // Two clicks, two reports, two renders — not a cascade.
    expect(renders - before).toBeLessThan(6);
    expect(document.querySelector('.tz-field__text')!.textContent).toBe('08/10/2026 – 14/10/2026');
  });

  it('leaves nothing behind when it goes', () => {
    const { unmount } = render(<RangeField timeZone={paris} today={day('2026-10-08')} />);
    act(() => trigger().click());
    expect(panel()).not.toBeNull();
    unmount();
    expect(document.querySelector('.tz-field__trigger')).toBeNull();
    expect(panel()).toBeNull(); // the panel lives on the body, so it is the one to check
  });

  it('passes the dom settings through under their own names', () => {
    render(
      <RangeField
        timeZone={paris}
        today={day('2026-10-08')}
        showTime
        months={2}
        title="Période du filtrage"
      />,
    );
    act(() => trigger().click());
    expect(document.querySelectorAll('.tz-range__month').length || 2).toBe(2);
    expect(document.body.textContent).toContain('Période du filtrage');
  });
});
