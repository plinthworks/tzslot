import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DateTimeRange, type DateTimeRangeValue } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/** An instant from a wall time in Paris, earlier reading. */
const paris = (iso: string) =>
  Temporal.PlainDateTime.from(iso)
    .toZonedDateTime('Europe/Paris', { disambiguation: 'earlier' })
    .toInstant();

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, DateTimeRange],
  template: `
    <form [formGroup]="form">
      <tz-datetime-range
        formControlName="shift"
        [timeZone]="'Europe/Paris'"
        [stepMinutes]="60"
        [locale]="'en-GB'"
      />
    </form>
  `,
})
class Host {
  readonly form = new FormGroup({
    shift: new FormControl<DateTimeRangeValue>({ start: null, end: null }),
  });
}

let fixture: ComponentFixture<Host>;
let host: Host;
const el = () => fixture.nativeElement as HTMLElement;
const text = (sel: string) => el().querySelector(sel)?.textContent?.trim() ?? null;

const set = (start: string | null, end: string | null) => {
  host.form.controls.shift.setValue({
    start: start ? paris(start) : null,
    end: end ? paris(end) : null,
  });
  fixture.detectChanges();
};

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  fixture = TestBed.createComponent(Host);
  host = fixture.componentInstance;
  fixture.detectChanges();
});

describe('an ordinary interval', () => {
  it('shows its duration and says nothing else', () => {
    set('2026-06-14T23:00', '2026-06-15T05:00');
    expect(text('.tz-dtr__summary')).toBe('6h');
    expect(text('.tz-dtr__warning')).toBeNull();
    expect(text('.tz-dtr__error')).toBeNull();
  });

  it('says nothing at all until both ends are chosen', () => {
    set('2026-06-14T23:00', null);
    expect(text('.tz-dtr__summary')).toBeNull();
  });
});

describe('a night shift across the end of summer time', () => {
  it('reports seven hours, not the six the clocks suggest', () => {
    set('2026-10-24T23:00', '2026-10-25T05:00');
    expect(text('.tz-dtr__summary')).toBe('7h');
  });

  it('explains itself, because 7h for 23:00 to 05:00 looks like a bug', () => {
    set('2026-10-24T23:00', '2026-10-25T05:00');
    const warning = text('.tz-dtr__warning')!;

    expect(warning).toContain('back');
    expect(warning).toContain('reads as 6h');
    expect(warning).toContain('lasts 7h');
  });
});

describe('a morning across the start of summer time', () => {
  it('reports five hours and says why', () => {
    set('2026-03-29T01:00', '2026-03-29T07:00');
    expect(text('.tz-dtr__summary')).toBe('5h');
    const warning = text('.tz-dtr__warning')!;
    expect(warning).toContain('forward');
    expect(warning).toContain('lasts 5h');
  });
});

describe('an end before its start', () => {
  it('is refused rather than shown as a negative duration', () => {
    set('2026-06-15T17:00', '2026-06-15T09:00');
    expect(text('.tz-dtr__error')).toContain('before the start');
    expect(text('.tz-dtr__summary')).toBeNull();
  });
});

describe('inside a form', () => {
  it('renders two legs, each with its own field', () => {
    expect(el().querySelectorAll('.tz-dtr__leg')).toHaveLength(2);
    expect(el().querySelectorAll('tz-date-field')).toHaveLength(2);
  });

  it('shows the slot list for a leg once its day is known', () => {
    expect(el().querySelectorAll('tz-time-slots')).toHaveLength(0);
    set('2026-06-14T23:00', null);
    expect(el().querySelectorAll('tz-time-slots')).toHaveLength(1);
  });

  it('disabling the control disables both fields', () => {
    host.form.controls.shift.disable();
    fixture.detectChanges();
    expect(
      Array.from(el().querySelectorAll<HTMLButtonElement>('.tz-field__trigger')).every(
        (b) => b.disabled,
      ),
    ).toBe(true);
  });
});
