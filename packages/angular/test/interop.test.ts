import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Calendar, DateField } from '../src/index.js';
import { Temporal } from '@tzslot/core';
import type { ValueShape } from '@tzslot/core';

/**
 * The migration path, tested.
 *
 * An application coming off flatpickr holds Date in its form controls. If the
 * components can speak that shape, replacing a picker is swapping a tag; if
 * they cannot, it is rewriting every screen that touches a date. These assert
 * the first.
 */
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, Calendar, DateField],
  template: `
    <form [formGroup]="form">
      <tz-calendar
        formControlName="day"
        [valueAs]="shape()"
        [valueTimeZone]="'Europe/Paris'"
        [today]="today"
      />
      <tz-date-field
        formControlName="other"
        [valueAs]="shape()"
        [valueTimeZone]="'Europe/Paris'"
        [locale]="'en-GB'"
      />
    </form>
  `,
})
class Host {
  readonly today = Temporal.PlainDate.from('2026-06-15');
  readonly shape = signal<ValueShape>('date');
  // Typed the way an application migrating off flatpickr already has it.
  readonly form = new FormGroup({
    day: new FormControl<Date | null>(null),
    other: new FormControl<Date | null>(null),
  });
}

let fixture: ComponentFixture<Host>;
let host: Host;
const el = () => fixture.nativeElement as HTMLElement;
const day = (iso: string) => el().querySelector<HTMLButtonElement>(`button[data-date="${iso}"]`)!;
const tick = () => fixture.detectChanges();

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  fixture = TestBed.createComponent(Host);
  host = fixture.componentInstance;
  tick();
});

describe('a control holding Date', () => {
  it('is written into the calendar', () => {
    host.form.controls.day.setValue(new Date('2026-06-20T12:00:00Z'));
    tick();
    expect(day('2026-06-20').classList.contains('tz-cal__day--selected')).toBe(true);
  });

  it('receives a Date back when a day is clicked', () => {
    day('2026-06-23').click();
    tick();

    const value = host.form.controls.day.value;
    expect(value).toBeInstanceOf(Date);
    // Midnight in Paris, which is what "the 23rd" means to a Date holder.
    expect(value!.toISOString()).toBe('2026-06-22T22:00:00.000Z');
  });

  it('round-trips without the day drifting', () => {
    day('2026-06-23').click();
    tick();
    const out = host.form.controls.day.value!;

    host.form.controls.day.setValue(out);
    tick();
    expect(day('2026-06-23').classList.contains('tz-cal__day--selected')).toBe(true);
  });

  it('the field shows the right day for a Date', () => {
    host.form.controls.other.setValue(new Date('2026-12-25T23:30:00Z'));
    tick();
    // 23:30 UTC on the 25th is already the 26th in Paris — which is the point
    // of the zone being explicit rather than assumed.
    expect(el().querySelector('.tz-field__trigger')!.textContent).toContain('26 Dec 2026');
  });
});

describe('the other shapes', () => {
  it('iso gives and takes a plain date string', () => {
    host.shape.set('iso');
    tick();

    day('2026-06-23').click();
    tick();
    expect(host.form.controls.day.value).toBe('2026-06-23');

    host.form.controls.day.setValue('2026-07-04' as unknown as Date);
    tick();
    expect(el().querySelector('.tz-cal__title')!.textContent!.trim()).toContain('July');
  });

  it('temporal is the default and hands out a PlainDate', () => {
    host.shape.set('temporal');
    tick();

    day('2026-06-23').click();
    tick();
    expect(String(host.form.controls.day.value)).toBe('2026-06-23');
  });
});
