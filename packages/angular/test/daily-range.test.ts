import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DailyRange, type DailyRangeValue } from '../src/index.js';
import { Temporal } from '@tzslot/core';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, DailyRange],
  template: `
    <form [formGroup]="form">
      <tz-daily-range formControlName="rota" [timeZone]="'Europe/Paris'" [stepMinutes]="60"
                      [locale]="'en-GB'" [today]="today" />
    </form>
  `,
})
class Host {
  readonly today = Temporal.PlainDate.from('2026-06-15');
  readonly form = new FormGroup({
    rota: new FormControl<DailyRangeValue>({ start: null, end: null, from: null, to: null }),
  });
}

let fixture: ComponentFixture<Host>;
const el = () => fixture.nativeElement as HTMLElement;

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
});

describe('<tz-daily-range> in a form', () => {
  it('fills the control as the four parts are chosen', () => {
    el().querySelector<HTMLButtonElement>('[data-date="2026-06-15"]')!.click();
    el().querySelector<HTMLButtonElement>('[data-date="2026-06-19"]')!.click();
    el().querySelector<HTMLButtonElement>('[data-edge="from"] [data-time="09:00"]')!.click();
    el().querySelector<HTMLButtonElement>('[data-edge="to"] [data-time="17:00"]')!.click();
    fixture.detectChanges();

    const v = fixture.componentInstance.form.controls.rota.value!;
    expect(`${v.start} ${v.end} ${v.from} ${v.to}`).toBe('2026-06-15 2026-06-19 09:00:00 17:00:00');
    expect(el().querySelector('.tz-daily__summary')!.textContent).toBe('5 days · 40h');
  });

  it('setting the control draws it, and disabling it stops it', () => {
    fixture.componentInstance.form.controls.rota.setValue({
      start: Temporal.PlainDate.from('2026-10-24'),
      end: Temporal.PlainDate.from('2026-10-24'),
      from: Temporal.PlainTime.from('22:00'),
      to: Temporal.PlainTime.from('06:00'),
    });
    fixture.detectChanges();
    expect(el().querySelector('.tz-daily__summary')!.textContent).toBe('1 day · 9h');

    fixture.componentInstance.form.controls.rota.disable();
    fixture.detectChanges();
    expect(el().querySelector<HTMLButtonElement>('[data-edge="from"] [data-time="09:00"]')!.disabled).toBe(true);
  });
});
