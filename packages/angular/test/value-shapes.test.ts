import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { RangeField, DateTimeRange, TimeSlotPicker, provideTzslot } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * `provideTzslot({ valueAs: 'utc' })` says "every component". Four of them
 * did not listen, so one tag handed a form ISO strings and the tag beside it
 * handed Temporal objects — and their writeValue was typed as if a form could
 * only ever contain the library's own objects, and threw on the ISO string a
 * real back end sends.
 */
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RangeField, DateTimeRange, TimeSlotPicker],
  template: `
    <form [formGroup]="form">
      <tz-range-field formControlName="period" timeZone="Europe/Paris" locale="en-GB" />
      <tz-datetime-range formControlName="interval" timeZone="Europe/Paris" locale="en-GB" />
      <tz-time-slots formControlName="slot" [date]="'2026-09-21'" timeZone="Europe/Paris" [stepMinutes]="60" />
    </form>
  `,
})
class Host {
  readonly form = new FormGroup({
    period: new FormControl<unknown>(null),
    interval: new FormControl<unknown>(null),
    slot: new FormControl<unknown>(null),
  });
}

let fixture: ComponentFixture<Host>;
let host: Host;

beforeEach(async () => {
  TestBed.configureTestingModule({
    imports: [Host],
    providers: [provideTzslot({ valueAs: 'utc', timeZone: 'Europe/Paris' })],
  });
  fixture = TestBed.createComponent(Host);
  host = fixture.componentInstance;
  fixture.detectChanges();
  await fixture.whenStable();
});

const settle = async () => {
  fixture.detectChanges();
  await fixture.whenStable();
};

describe('a form holding ISO strings', () => {
  it('reaches the period field without throwing, and comes back as strings', async () => {
    const control = host.form.controls.period;
    // A back end sends this. writeValue used to call zoned() on it and throw
    // "toZonedDateTimeISO is not a function".
    control.setValue({ start: '2026-09-13T22:00:00Z', end: '2026-09-20T22:00:00Z', allDay: true });
    await settle();

    const field = (fixture.nativeElement as HTMLElement).querySelector('tz-range-field .tz-field__text')!;
    expect(field.textContent).toBe('14/09/2026 – 20/09/2026');

    const arrows = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      'tz-range-field .tz-field__shift',
    );
    if (arrows.length && !arrows[1]!.hidden) arrows[1]!.click();
    await settle();
    const held = control.value as { start: unknown; end: unknown };
    expect(typeof held.start).toBe('string');
  });

  it('and the interval takes a Date as well', async () => {
    const control = host.form.controls.interval;
    control.setValue({ start: new Date('2026-09-01T08:00:00Z'), end: new Date('2026-09-01T10:00:00Z') });
    await settle();
    const shown = [...(fixture.nativeElement as HTMLElement).querySelectorAll('tz-datetime-range .tz-field__trigger')];
    expect((shown[0] as HTMLInputElement).value).toContain('01/09/2026');
  });

  it('the slot picker too', async () => {
    const control = host.form.controls.slot;
    control.setValue('2026-09-21T08:00:00Z');
    await settle();
    const chosen = (fixture.nativeElement as HTMLElement).querySelector('.tz-slots__slot--selected');
    expect(chosen?.textContent).toContain('10:00');

    (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('.tz-slots__slot')[11]!
      .click();
    await settle();
    expect(typeof control.value).toBe('string');
    expect(String(control.value)).toMatch(/Z$/);
  });
});
