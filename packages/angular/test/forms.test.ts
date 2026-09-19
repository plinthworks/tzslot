import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Calendar, TimeSlotPicker } from '../src/index.js';
import { Temporal } from '@tzslot/core';
import type { Instant, PlainDate, PlainTime } from '@tzslot/core';

/**
 * The components inside a reactive form.
 *
 * Without a ControlValueAccessor a component cannot go in a FormGroup at all,
 * which rules it out of most Angular applications — this is the difference
 * between a demo and something someone can adopt. These tests go through the
 * form, never through the model input, so they fail if the two drift apart.
 */
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, Calendar, TimeSlotPicker],
  template: `
    <form [formGroup]="form">
      <tz-calendar
        formControlName="day"
        [today]="today"
        [isDateDisabled]="noWeekends"
      />
      <tz-time-slots
        formControlName="at"
        [date]="'2026-06-15'"
        [timeZone]="'Europe/Paris'"
        [stepMinutes]="60"
        [minTime]="'09:00'"
        [maxTime]="'17:00'"
        [isDisabled]="lunch"
      />
    </form>
  `,
})
class Host {
  readonly today = Temporal.PlainDate.from('2026-06-15');
  readonly form = new FormGroup({
    day: new FormControl<PlainDate | null>(null),
    at: new FormControl<Instant | null>(null),
  });
  readonly noWeekends = (d: PlainDate) => d.dayOfWeek > 5;
  readonly lunch = (s: { time: PlainTime }) => s.time.hour === 13;
}

let fixture: ComponentFixture<Host>;
let host: Host;
const el = () => fixture.nativeElement as HTMLElement;
const days = () => Array.from(el().querySelectorAll<HTMLButtonElement>('button.tz-cal__day'));
const slots = () => Array.from(el().querySelectorAll<HTMLButtonElement>('button.tz-slots__slot'));
const dayFor = (iso: string) => days().find((b) => b.dataset['date'] === iso)!;

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  fixture = TestBed.createComponent(Host);
  host = fixture.componentInstance;
  fixture.detectChanges();
});

describe('inside a FormGroup', () => {
  it('a click updates the control', () => {
    dayFor('2026-06-17').click();
    fixture.detectChanges();
    expect(host.form.controls.day.value!.toString()).toBe('2026-06-17');
  });

  it('setting the control updates the view', () => {
    host.form.controls.day.setValue(Temporal.PlainDate.from('2026-06-22'));
    fixture.detectChanges();
    expect(dayFor('2026-06-22').classList.contains('tz-cal__day--selected')).toBe(true);
  });

  it('the control starts pristine and untouched, and a click changes both', () => {
    expect(host.form.controls.at.pristine).toBe(true);
    expect(host.form.controls.at.touched).toBe(false);

    slots().find((b) => !b.disabled)!.click();
    fixture.detectChanges();

    expect(host.form.controls.at.pristine).toBe(false);
    expect(host.form.controls.at.touched).toBe(true);
  });

  it('disabling the control disables every button', () => {
    expect(days().some((b) => !b.disabled)).toBe(true);

    host.form.controls.day.disable();
    fixture.detectChanges();

    expect(days().every((b) => b.disabled)).toBe(true);
    // And a click on a disabled control changes nothing.
    dayFor('2026-06-17').click();
    fixture.detectChanges();
    expect(host.form.controls.day.value).toBeNull();
  });

  it('reset clears the selection', () => {
    dayFor('2026-06-17').click();
    fixture.detectChanges();
    host.form.reset();
    fixture.detectChanges();
    expect(days().some((b) => b.classList.contains('tz-cal__day--selected'))).toBe(false);
  });
});

describe('opening hours and exclusions, through the template', () => {
  it('bounds cut the day down to the working hours', () => {
    expect(slots()).toHaveLength(9); // 09:00 to 17:00 inclusive
    expect(slots()[0]!.textContent).toContain('09:00');
    expect(slots().at(-1)!.textContent).toContain('17:00');
  });

  it('a ruled-out slot is shown but cannot be chosen', () => {
    const one = slots().find((b) => b.textContent!.includes('13:00'))!;
    expect(one).toBeDefined();
    expect(one.disabled).toBe(true);
    expect(one.classList.contains('tz-slots__slot--unavailable')).toBe(true);

    one.click();
    fixture.detectChanges();
    expect(host.form.controls.at.value).toBeNull();
  });

  it('weekends are ruled out in the middle of the range', () => {
    expect(dayFor('2026-06-20').disabled).toBe(true); // Saturday
    expect(dayFor('2026-06-21').disabled).toBe(true); // Sunday
    expect(dayFor('2026-06-19').disabled).toBe(false); // Friday
  });
});
