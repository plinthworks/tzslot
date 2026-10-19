// @vitest-environment jsdom
import { useRef, useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import type { Instant, PlainDate } from '@tzslot/core';
import { Temporal } from '@tzslot/core';
import { FR } from '@tzslot/dom';
import type { RangeFieldInstance, RangeFieldValue } from '@tzslot/dom';
import { Calendar, RangeField, TimeSlots } from '../src/index.js';

/**
 * The examples in the React guide, run.
 *
 * Written out rather than linked to, because a guide that compiles is not the
 * same as a guide that works: the singleDay section of the period guide said
 * the opposite of what the field did for two commits, and the Hijri snippet
 * told a reader to import something the package did not export. Both read
 * perfectly well.
 */
afterEach(() => {
  cleanup();
  document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove());
});

describe('the guide examples', () => {
  it('Booking: a calendar, then the times of the day it chose', () => {
    function Booking() {
      const [day, setDay] = useState<PlainDate | null>(null);
      const [moment, setMoment] = useState<Instant | null>(null);
      return (
        <>
          <Calendar value={day} onChange={setDay} buttons={['today', 'clear']} today={Temporal.PlainDate.from('2026-10-08')} />
          {day && <TimeSlots date={day} timeZone="Europe/Paris" value={moment} onChange={setMoment} />}
        </>
      );
    }
    render(<Booking />);
    // No day yet, so no list.
    expect(document.querySelector('.tz-slots')).toBeNull();
    act(() => {
      document.querySelector<HTMLButtonElement>('[data-date="2026-10-08"]')!.click();
    });
    expect(document.querySelector('.tz-slots')).not.toBeNull();
  });

  it('controlled: value and onChange, as React means it', () => {
    function Controlled() {
      const [period, setPeriod] = useState<RangeFieldValue>({ start: null, end: null });
      return (
        <RangeField
          timeZone="Europe/Paris"
          locale="fr-FR"
          today={Temporal.PlainDate.from('2026-10-08')}
          value={period}
          onChange={setPeriod}
        />
      );
    }
    render(<Controlled />);
    act(() => document.querySelector<HTMLButtonElement>('.tz-field__trigger')!.click());
    act(() => {
      document.querySelector('.tz-field__panel')!
        .querySelector<HTMLButtonElement>('[data-date="2026-10-08"]')!.click();
    });
    expect(document.querySelector('.tz-field__text')!.textContent).toContain('08/10/2026');
  });

  it('Filters: open() and clear() through a ref', () => {
    function Filters() {
      const field = useRef<RangeFieldInstance>(null);
      return (
        <>
          <RangeField ref={field} timeZone="Europe/Paris" locale="fr-FR" today={Temporal.PlainDate.from('2026-10-08')} />
          <button type="button" onClick={() => field.current?.open()}>Pick dates</button>
          <button type="button" onClick={() => field.current?.clear()}>Reset</button>
        </>
      );
    }
    render(<Filters />);
    // By their words: the field's own trigger is a `button[type="button"]`
    // too, and picking the first two matched it instead of these.
    const byText = (label: string) =>
      [...document.querySelectorAll<HTMLButtonElement>('button')].find(
        (b) => b.textContent === label,
      )!;
    const open = byText('Pick dates');
    const reset = byText('Reset');
    act(() => open.click());
    expect(document.querySelector('.tz-field__panel')).not.toBeNull();
    act(() => {
      document.querySelector('.tz-field__panel')!
        .querySelector<HTMLButtonElement>('[data-date="2026-10-08"]')!.click();
    });
    act(() => reset.click());
    expect(document.querySelector('.tz-field__text')!.textContent).not.toContain('08/10/2026');
  });

  it('words: locale and messages are two settings', () => {
    render(
      <RangeField
        timeZone="Europe/Paris"
        locale="fr-FR"
        messages={FR}
        today={Temporal.PlainDate.from('2026-10-08')}
      />,
    );
    act(() => document.querySelector<HTMLButtonElement>('.tz-field__trigger')!.click());
    // The library's own words come from the catalogue, not from the locale.
    expect(document.querySelector('.tz-field__panel')!.textContent).toContain(FR.clear);
  });
});
