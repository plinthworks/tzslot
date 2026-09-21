import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Calendar, DateField, DateTimeField, RangeField } from '../src/index.js';
import { Temporal } from '@tzslot/core';
import type { Instant, PlainDate } from '@tzslot/core';

/**
 * A screen that opens on a date already chosen.
 *
 * Editing an appointment, reopening a saved search: the value exists before
 * the component does. It has to be on screen at the first render — not after
 * a click, not after a tick — whether it arrives through the binding or
 * through a form control built with it. And code must be able to move it
 * afterwards.
 */
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, Calendar, DateField, DateTimeField, RangeField],
  template: `
    <tz-calendar [(value)]="day" [today]="today" />
    <tz-date-field [(value)]="day" [locale]="'en-GB'" />
    <tz-datetime-field [(value)]="moment" [timeZone]="zone" [locale]="'en-GB'" />
    <tz-range-field [(value)]="period" [timeZone]="zone" [locale]="'en-GB'" />
    <form [formGroup]="form">
      <tz-calendar formControlName="legacy" [valueAs]="'date'" [valueTimeZone]="zone" [today]="today" />
    </form>
  `,
})
class Host {
  readonly zone = 'Europe/Paris';
  readonly today = Temporal.PlainDate.from('2026-09-01');
  readonly day = signal<PlainDate | null>(Temporal.PlainDate.from('2026-09-23'));
  readonly moment = signal<Instant | null>(Temporal.Instant.from('2026-09-23T12:30:00Z'));
  readonly period = signal({
    start: Temporal.Instant.from('2026-09-22T22:00:00Z'),
    end: Temporal.Instant.from('2026-09-26T22:00:00Z'),
    allDay: true,
  });
  // The shape an application migrating off flatpickr already holds.
  readonly form = new FormGroup({
    legacy: new FormControl<Date | null>(new Date('2026-09-23T10:00:00Z')),
  });
}

let fixture: ComponentFixture<Host>;
let host: Host;
const el = () => fixture.nativeElement as HTMLElement;
const trigger = (tag: string) => {
  const node = el().querySelector(`${tag} .tz-field__trigger`)!;
  return node instanceof HTMLInputElement ? node.value : (node.textContent ?? '');
};
const calendars = () => el().querySelectorAll('tz-calendar');

beforeEach(async () => {
  TestBed.configureTestingModule({ imports: [Host] });
  fixture = TestBed.createComponent(Host);
  host = fixture.componentInstance;
  fixture.detectChanges();
  await fixture.whenStable();
});

describe('a value that exists before the component', () => {
  it('is on screen at the first render, in every shape', () => {
    expect(calendars()[0]!.querySelector('.tz-cal__title')!.textContent).toBe('September 2026');
    expect(calendars()[0]!.querySelector('[data-date="2026-09-23"]')!.classList).toContain('tz-cal__day--selected');
    expect(trigger('tz-date-field')).toContain('23 Sept 2026');
    expect(trigger('tz-datetime-field')).toBe('23/09/2026 14:30');
    const period = el().querySelector('tz-range-field .tz-field__trigger')!;
    expect(period.textContent).toContain('23/09/2026 – 26/09/2026');
  });

  it('reaches a calendar through a form control built with a Date', () => {
    const legacy = calendars()[1]!;
    expect(legacy.querySelector('.tz-cal__title')!.textContent).toBe('September 2026');
    expect(legacy.querySelector('[data-date="2026-09-23"]')!.classList).toContain('tz-cal__day--selected');
    expect(host.form.controls.legacy.pristine).toBe(true); // shown, not reported as an edit
  });
});

describe('a value moved from code afterwards', () => {
  it('follows the signal', async () => {
    host.day.set(Temporal.PlainDate.from('2026-12-25'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(calendars()[0]!.querySelector('.tz-cal__title')!.textContent).toBe('December 2026');
    expect(calendars()[0]!.querySelector('[data-date="2026-12-25"]')!.classList).toContain('tz-cal__day--selected');
    expect(trigger('tz-date-field')).toContain('25 Dec 2026');
  });

  it('follows setValue on a form control', async () => {
    host.form.controls.legacy.setValue(new Date('2026-12-25T10:00:00Z'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(calendars()[1]!.querySelector('.tz-cal__title')!.textContent).toBe('December 2026');
  });

  it('clears when the code clears it', async () => {
    host.day.set(null);
    host.moment.set(null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(calendars()[0]!.querySelectorAll('.tz-cal__day--selected')).toHaveLength(0);
    expect(trigger('tz-date-field')).toContain('Choose a date'); // back to the placeholder
    expect(trigger('tz-datetime-field')).toBe('');
  });
});
