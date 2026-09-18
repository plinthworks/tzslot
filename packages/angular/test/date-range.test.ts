import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DateRange, type DateRangeValue } from '../src/index.js';
import { Temporal } from '../../core/src/index.js';
import type { PlainDate } from '../../core/src/index.js';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, DateRange],
  template: `
    <form [formGroup]="form">
      <tz-date-range
        formControlName="stay"
        [today]="today"
        [locale]="'en-GB'"
        [isDateDisabled]="blocked()"
        [blockAcrossDisabled]="blockAcross()"
      />
    </form>
  `,
})
class Host {
  readonly today = Temporal.PlainDate.from('2026-06-15');
  readonly form = new FormGroup({
    stay: new FormControl<DateRangeValue>({ start: null, end: null }),
  });
  readonly blocked = signal<((d: PlainDate) => boolean) | undefined>(undefined);
  readonly blockAcross = signal(true);
}

let fixture: ComponentFixture<Host>;
let host: Host;
const el = () => fixture.nativeElement as HTMLElement;
const day = (iso: string) => el().querySelector<HTMLButtonElement>(`button[data-date="${iso}"]`)!;
const classed = (name: string) =>
  Array.from(el().querySelectorAll<HTMLButtonElement>(`.tz-range__day--${name}`)).map(
    (b) => b.dataset['date'],
  );
const range = () => host.form.controls.stay.value!;

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  fixture = TestBed.createComponent(Host);
  host = fixture.componentInstance;
  fixture.detectChanges();
});

describe('choosing a span', () => {
  it('takes two clicks', () => {
    day('2026-06-10').click();
    fixture.detectChanges();
    expect(range().start!.toString()).toBe('2026-06-10');
    expect(range().end).toBeNull();

    day('2026-06-14').click();
    fixture.detectChanges();
    expect(range().end!.toString()).toBe('2026-06-14');
  });

  it('clicking before the start moves the start, rather than going backwards', () => {
    day('2026-06-20').click();
    day('2026-06-12').click();
    fixture.detectChanges();

    // What someone correcting a mis-click means, not a reversed range.
    expect(range().start!.toString()).toBe('2026-06-12');
    expect(range().end!.toString()).toBe('2026-06-20');
  });

  it('marks the ends and everything between', () => {
    day('2026-06-10').click();
    day('2026-06-13').click();
    fixture.detectChanges();

    expect(classed('start')).toContain('2026-06-10');
    expect(classed('end')).toContain('2026-06-13');
    expect(classed('within')).toEqual(
      expect.arrayContaining(['2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13']),
    );
    expect(classed('within')).not.toContain('2026-06-14');
  });

  it('a third click starts a new range', () => {
    day('2026-06-10').click();
    day('2026-06-13').click();
    fixture.detectChanges();

    day('2026-06-20').click();
    fixture.detectChanges();
    expect(range().start!.toString()).toBe('2026-06-20');
    expect(range().end).toBeNull();
  });

  it('a single day is a valid range', () => {
    day('2026-06-10').click();
    day('2026-06-10').click();
    fixture.detectChanges();
    expect(range().start!.toString()).toBe('2026-06-10');
    expect(range().end!.toString()).toBe('2026-06-10');
  });
});

describe('previewing while the pointer moves', () => {
  it('shows the span that would be chosen', () => {
    day('2026-06-10').click();
    fixture.detectChanges();

    day('2026-06-13').dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    fixture.detectChanges();

    // The run under the cursor is the run that will be chosen — the only way to
    // pick a span without counting cells.
    expect(classed('within')).toContain('2026-06-12');
    expect(range().end).toBeNull(); // nothing committed yet
  });

  it('stops previewing when the pointer leaves', () => {
    day('2026-06-10').click();
    day('2026-06-13').dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    day('2026-06-13').dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();

    expect(classed('within')).not.toContain('2026-06-12');
  });
});

describe('days ruled out', () => {
  beforeEach(() => {
    // The 12th is closed.
    host.blocked.set((d) => d.toString() === '2026-06-12');
    fixture.detectChanges();
  });

  it('cannot be chosen as an end', () => {
    expect(day('2026-06-12').disabled).toBe(true);
  });

  it('refuses a range that steps over one', () => {
    day('2026-06-10').click();
    day('2026-06-14').click();
    fixture.detectChanges();

    // A booking that spans a closure is a booking that cannot be honoured.
    expect(range().end).toBeNull();
    expect(el().querySelector('.tz-range__error')!.textContent).toContain('unavailable');
  });

  it('allows a range that stops short of one', () => {
    day('2026-06-10').click();
    day('2026-06-11').click();
    fixture.detectChanges();
    expect(range().end!.toString()).toBe('2026-06-11');
    expect(el().querySelector('.tz-range__error')).toBeNull();
  });

  it('allows stepping over when the caller says the days only bracket a period', () => {
    host.blockAcross.set(false);
    fixture.detectChanges();

    day('2026-06-10').click();
    day('2026-06-14').click();
    fixture.detectChanges();
    expect(range().end!.toString()).toBe('2026-06-14');
  });
});

describe('inside a form', () => {
  it('setting the control draws the range', () => {
    host.form.controls.stay.setValue({
      start: Temporal.PlainDate.from('2026-06-05'),
      end: Temporal.PlainDate.from('2026-06-08'),
    });
    fixture.detectChanges();

    expect(classed('start')).toContain('2026-06-05');
    expect(classed('end')).toContain('2026-06-08');
  });

  it('disabling the control disables every day', () => {
    host.form.controls.stay.disable();
    fixture.detectChanges();
    expect(
      Array.from(el().querySelectorAll<HTMLButtonElement>('.tz-range__day')).every((b) => b.disabled),
    ).toBe(true);
  });
});
