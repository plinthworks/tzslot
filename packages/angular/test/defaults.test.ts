import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Calendar, DateField, DateTimeField, provideTzslot, FR } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * The convention an application settles once.
 *
 * A zone, a locale, the shape a value leaves in: decisions about the
 * application, not about the field. Set here, they reach every component, and
 * a binding still wins over them — otherwise the default would be a law, and
 * the one screen that needs something else would have to stop using the
 * library.
 */
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, Calendar, DateField, DateTimeField],
  template: `
    <form [formGroup]="form">
      <tz-date-field formControlName="day" />
      <tz-datetime-field formControlName="at" />
      <tz-calendar formControlName="other" [locale]="'en-GB'" />
    </form>
  `,
})
class Host {
  readonly form = new FormGroup({
    day: new FormControl<unknown>(null),
    at: new FormControl<unknown>(null),
    other: new FormControl<unknown>(null),
  });
}

let fixture: ComponentFixture<Host>;
let host: Host;
const el = () => fixture.nativeElement as HTMLElement;
const day = (iso: string) => el().querySelector<HTMLButtonElement>(`button[data-date="${iso}"]`)!;

beforeEach(async () => {
  TestBed.configureTestingModule({
    imports: [Host],
    providers: [provideTzslot({ valueAs: 'utc', timeZone: 'Europe/Paris', locale: 'fr-FR', messages: FR })],
  });
  fixture = TestBed.createComponent(Host);
  host = fixture.componentInstance;
  fixture.detectChanges();
  await fixture.whenStable();
});

describe('provideTzslot', () => {
  it('a chosen day leaves as the instant that opens it, in UTC', async () => {
    el().querySelector<HTMLElement>('tz-date-field .tz-field__trigger')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    document.querySelector<HTMLButtonElement>('.tz-field__panel [data-date="2026-09-14"]')!.click();
    fixture.detectChanges();

    // Midnight in Paris on 14 September is 22:00 the day before, in UTC.
    expect(host.form.controls.day.value).toBe('2026-09-13T22:00:00Z');
  });

  it('a moment leaves as itself, already UTC', async () => {
    const at = Temporal.Instant.from('2026-09-23T12:30:00Z');
    host.form.controls.at.setValue(at.toString());
    fixture.detectChanges();
    await fixture.whenStable();
    const field = el().querySelector<HTMLInputElement>('tz-datetime-field input.tz-field__trigger')!;
    expect(field.value).toBe('23/09/2026 14:30'); // read in Paris, written in French
    expect(host.form.controls.at.value).toBe('2026-09-23T12:30:00Z');
  });

  it('carries the words, so the panel speaks French', async () => {
    el().querySelector<HTMLElement>('tz-date-field .tz-field__trigger')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const weekdays = [...document.querySelectorAll('.tz-field__panel .tz-cal__weekday')].map((n) => n.textContent);
    expect(weekdays[0]).toBe('lun.'); // fr-FR, from the provider, with its own abbreviation
  });

  it('a binding still wins: the calendar asked for en-GB and got it', () => {
    expect(el().querySelector('tz-calendar .tz-cal__title')!.textContent).toMatch(/September|October/);
  });

  it('and a day clicked in that calendar still leaves in UTC', () => {
    day('2026-09-14').click();
    fixture.detectChanges();
    expect(host.form.controls.other.value).toBe('2026-09-13T22:00:00Z');
  });
});
