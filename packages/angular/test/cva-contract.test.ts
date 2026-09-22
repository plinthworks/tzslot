import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DateTimeRange, RangeField } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * A programmatic write is not the user typing.
 *
 * `writeValue` reporting back through `onChange` breaks three promises at
 * once: `emitEvent: false` stops meaning anything, the control is marked
 * dirty by code the user never touched, and — worst — the widget can rewrite
 * the very value the application just set and hand the rewrite back as if it
 * were a choice.
 */
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, DateTimeRange, RangeField],
  template: `
    <form [formGroup]="form">
      <tz-datetime-range formControlName="interval" timeZone="Europe/Paris" [allDay]="allDay()" />
      <tz-range-field formControlName="period" timeZone="Europe/Paris" />
    </form>
  `,
})
class Host {
  readonly allDay = signal(true);
  readonly form = new FormGroup({
    interval: new FormControl<unknown>(null),
    period: new FormControl<unknown>(null),
  });
}

let fixture: ComponentFixture<Host>;
let host: Host;

beforeEach(async () => {
  TestBed.configureTestingModule({ imports: [Host] });
  fixture = TestBed.createComponent(Host);
  host = fixture.componentInstance;
  fixture.detectChanges();
  await fixture.whenStable();
});

describe('writing a value into the form', () => {
  it('says nothing back, and changes nothing about the value', async () => {
    const control = host.form.controls.interval;
    const written = {
      start: Temporal.Instant.from('2026-09-01T00:00:00Z'), // 02:00 in Paris
      end: Temporal.Instant.from('2026-09-03T00:00:00Z'),
    };
    let emissions = 0;
    control.valueChanges.subscribe(() => (emissions += 1));

    control.setValue(written, { emitEvent: false });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(emissions).toBe(0);
    expect(control.pristine).toBe(true);
    // The instants the application set, not a whole-day rewrite of them.
    const held = control.value as { start: Temporal.Instant; end: Temporal.Instant };
    expect(held.start.toString()).toBe('2026-09-01T00:00:00Z');
    expect(held.end.toString()).toBe('2026-09-03T00:00:00Z');
  });

  it('the period field keeps the same promise', async () => {
    const control = host.form.controls.period;
    let emissions = 0;
    control.valueChanges.subscribe(() => (emissions += 1));

    control.setValue(
      {
        start: Temporal.Instant.from('2026-09-13T22:00:00Z'),
        end: Temporal.Instant.from('2026-09-20T22:00:00Z'),
        allDay: true,
      },
      { emitEvent: false },
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(emissions).toBe(0);
    expect(control.pristine).toBe(true);
  });
});
