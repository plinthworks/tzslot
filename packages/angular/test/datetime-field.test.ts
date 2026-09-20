import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DateTimeField, type TimeLayout } from '../src/index.js';
import { Temporal } from '@tzslot/core';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, DateTimeField],
  template: `
    <form [formGroup]="form">
      <tz-datetime-field formControlName="at" [timeZone]="'Europe/Paris'" [locale]="'en-GB'"
                         [today]="today" [timeLayout]="layout()" valueAs="iso" />
    </form>
  `,
})
class Host {
  readonly today = Temporal.PlainDate.from('2026-10-25');
  readonly layout = signal<TimeLayout>('input');
  readonly form = new FormGroup({ at: new FormControl<string | null>(null) });
}

let fixture: ComponentFixture<Host>;
const el = () => fixture.nativeElement as HTMLElement;
const panel = () => document.querySelector<HTMLElement>('.tz-field__panel')!;

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
});

describe('<tz-datetime-field> in a form', () => {
  it('writes an ISO instant once a day and a time are chosen', () => {
    el().querySelector<HTMLButtonElement>('.tz-field__trigger')!.click();
    fixture.detectChanges();

    panel().querySelector<HTMLButtonElement>('[data-date="2026-10-20"]')!.click();
    const hour = panel().querySelector<HTMLInputElement>('[data-part="hour"]')!;
    hour.focus();
    hour.value = '14';
    hour.dispatchEvent(new Event('input', { bubbles: true }));
    hour.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    // 14:00 in Paris on 20 October 2026 is 12:00 UTC.
    expect(fixture.componentInstance.form.controls.at.value).toBe('2026-10-20T12:00:00Z');
  });

  it('offers both readings of the hour that happens twice', () => {
    el().querySelector<HTMLButtonElement>('.tz-field__trigger')!.click();
    fixture.detectChanges();
    panel().querySelector<HTMLButtonElement>('[data-date="2026-10-25"]')!.click();
    for (const [part, text] of [['minute', '30'], ['hour', '02']] as const) {
      const box = panel().querySelector<HTMLInputElement>(`[data-part="${part}"]`)!;
      box.focus();
      box.value = text;
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
    fixture.detectChanges();

    const readings = Array.from(panel().querySelectorAll<HTMLButtonElement>('.tz-datetime__reading'));
    expect(readings.map((b) => b.textContent)).toEqual(['UTC+02:00', 'UTC+01:00']);
    readings[1]!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.at.value).toBe('2026-10-25T01:30:00Z');
  });

  it('shows the control it is given, and a disabled control cannot be opened', () => {
    fixture.componentInstance.form.controls.at.setValue('2026-10-20T12:00:00Z');
    fixture.detectChanges();
    expect(el().querySelector('.tz-field__trigger')!.textContent).toContain('14:00');

    fixture.componentInstance.form.controls.at.disable();
    fixture.detectChanges();
    const trigger = el().querySelector<HTMLButtonElement>('.tz-field__trigger')!;
    expect(trigger.disabled).toBe(true);
    trigger.click();
    fixture.detectChanges();
    expect(document.querySelector('.tz-field__panel')).toBeNull();
  });
});
