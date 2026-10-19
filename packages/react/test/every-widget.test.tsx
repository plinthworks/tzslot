// @vitest-environment jsdom
import { StrictMode, createRef, type ReactElement } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { Temporal } from '@tzslot/core';
import * as tz from '../src/index.js';

/**
 * Every component mounts, survives a double mount, and leaves nothing behind.
 *
 * Twelve wrappers built from one factory, which is the argument for testing
 * them together: what could differ between them is what each widget needs to
 * be given, and that is exactly what a per-component test would hide behind
 * its own fixture.
 */
const zone = 'Europe/Paris';
const today = Temporal.PlainDate.from('2026-10-08');

/** The least each widget needs to draw something. */
const CASES = [
  ['Calendar', { today }],
  ['DailyRange', { timeZone: zone, today }],
  ['DateField', { today }],
  ['DateInput', {}],
  ['DateRange', { today }],
  ['DateTimeField', { timeZone: zone, today }],
  ['DateTimeRange', { timeZone: zone, today }],
  ['MultiDate', { today }],
  ['RangeField', { timeZone: zone, today }],
  ['TimeInput', {}],
  ['TimeSelect', {}],
  ['TimeSlots', { timeZone: zone, date: today }],
] as const;

afterEach(() => {
  cleanup();
  document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove());
});

describe('every component', () => {
  it.each(CASES)('%s draws, once, under StrictMode', (name, props) => {
    const Component = tz[name] as (p: Record<string, unknown>) => ReactElement;
    const { container } = render(
      <StrictMode>
        <Component {...props} locale="fr-FR" />
      </StrictMode>,
    );
    // Something was drawn, and the host is not left empty.
    const host = container.firstElementChild!;
    expect(host.childElementCount).toBeGreaterThan(0);
    /*
     * And drawn once. A widget built in an effect with no cleanup leaves two of
     * itself behind under StrictMode, and the second answers clicks the first
     * one drew — so the count is the assertion, not the presence.
     *
     * `getAttribute('class')` rather than `.className`: on an SVG element that
     * property is an SVGAnimatedString, which has no `split`. Five of the
     * twelve draw a calendar icon, and all five failed the first run of this.
     */
    const widgetClass = host.getAttribute('class')!.split(' ')[0]!;
    expect(widgetClass.startsWith('tz-')).toBe(true);
    expect(document.querySelectorAll(`.${widgetClass}`).length).toBe(1);
  });

  it.each(CASES)('%s leaves nothing behind when unmounted', (name, props) => {
    const Component = tz[name] as (p: Record<string, unknown>) => ReactElement;
    const { unmount, container } = render(<Component {...props} locale="fr-FR" />);
    expect(container.firstElementChild!.childElementCount).toBeGreaterThan(0);
    unmount();
    // The panels live on the body, so the container alone would not show a leak.
    expect(document.querySelectorAll('.tz-field__panel').length).toBe(0);
  });

  it('hands back the widget through a ref, so a screen can drive it', () => {
    const ref = createRef<{ open(): void; close(): void } | null>();
    render(<tz.RangeField ref={ref as never} timeZone={zone} today={today} locale="fr-FR" />);
    expect(ref.current).not.toBeNull();
    act(() => ref.current!.open());
    expect(document.querySelector('.tz-field__panel')).not.toBeNull();
    act(() => ref.current!.close());
    expect(document.querySelector('.tz-field__panel')).toBeNull();
  });

  it('keeps its own value when none is given, which is what uncontrolled means', () => {
    const seen: string[] = [];
    render(
      <tz.RangeField
        timeZone={zone}
        locale="fr-FR"
        today={today}
        onChange={(v) => seen.push(v.start ? v.start.toString() : 'null')}
      />,
    );
    act(() => document.querySelector<HTMLButtonElement>('.tz-field__trigger')!.click());
    for (const d of ['2026-10-08', '2026-10-14']) {
      act(() => {
        document
          .querySelector('.tz-field__panel')!
          .querySelector<HTMLButtonElement>(`[data-date="${d}"]`)!
          .click();
      });
    }
    expect(document.querySelector('.tz-field__text')!.textContent).toBe('08/10/2026 – 14/10/2026');
    expect(seen.length).toBeGreaterThan(0);
  });
});
