import { describe, it, expect } from 'vitest';
import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Temporal } from '@tzslot/core';
import type { PlainTime } from '@tzslot/core';
import { TimeSelect, TimeInput, FR } from '../src/index.js';

/**
 * The two time controls, in Angular.
 *
 * They were the only widgets without a wrapper, which meant a form choosing an
 * hour had to fall back to a list built by hand — walking a day hour by hour
 * and guessing the transitions, which is where the two mornings a year go
 * wrong.
 */
@Component({
  standalone: true,
  imports: [TimeSelect],
  template: `
    <tz-time-select
      [date]="day()"
      timeZone="Europe/Paris"
      locale="fr-FR"
      [minuteStep]="15"
      [(value)]="time"
      (offsetChange)="reading.set($event)"
    />`,
})
class Menus {
  readonly day = signal('2026-09-22');
  readonly time = signal<PlainTime | null>(null);
  readonly reading = signal<string | null>(null);
}

@Component({
  standalone: true,
  imports: [TimeInput, ReactiveFormsModule],
  template: `<tz-time-input [formControl]="control" [stepMinutes]="15" locale="fr-FR" />`,
})
class Compact {
  readonly control = new FormControl<PlainTime | null>(Temporal.PlainTime.from('09:30'));
}

const hours = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLSelectElement>('select')][0]!;

describe('tz-time-select', () => {
  it('offers the day as the zone really has it', () => {
    const f = TestBed.createComponent(Menus);
    f.detectChanges();
    const ordinary = [...hours(f.nativeElement).options].map((o) => o.value);
    expect(ordinary.filter((v) => v.startsWith('2|'))).toHaveLength(1);

    // 25 October: 02 happens twice, and the menu says so.
    f.componentInstance.day.set('2026-10-25');
    f.detectChanges();
    const repeated = [...hours(f.nativeElement).options].map((o) => o.value);
    expect(repeated).toContain('2|+02:00');
    expect(repeated).toContain('2|+01:00');

    // 29 March: 02 never happens, so it is not there to be chosen.
    f.componentInstance.day.set('2026-03-29');
    f.detectChanges();
    const skipped = [...hours(f.nativeElement).options].map((o) => o.value);
    expect(skipped.filter((v) => v.startsWith('2|'))).toHaveLength(0);
  });

  it('hands back the reading taken, which two instants an hour apart need', () => {
    const f = TestBed.createComponent(Menus);
    f.componentInstance.day.set('2026-10-25');
    f.detectChanges();
    const select = hours(f.nativeElement);
    select.value = '2|+01:00'; // the second 02:00, after the clocks go back
    select.dispatchEvent(new Event('change', { bubbles: true }));
    f.detectChanges();
    expect(f.componentInstance.time()?.toString({ smallestUnit: 'minute' })).toBe('02:00');
    expect(f.componentInstance.reading()).toBe('+01:00');
  });

  it('says its words in the language the tag asks for', () => {
    @Component({
      standalone: true,
      imports: [TimeSelect],
      template: `<tz-time-select [messages]="words()" locale="fr-FR" />`,
    })
    class Spoken {
      readonly words = signal(FR);
    }
    const f = TestBed.createComponent(Spoken);
    f.detectChanges();
    expect(hours(f.nativeElement).getAttribute('aria-label')).toBe(FR.hourLabel);
  });
});

describe('tz-time-input', () => {
  it('writes what the form control holds', () => {
    const f = TestBed.createComponent(Compact);
    f.detectChanges();
    const figures = [...f.nativeElement.querySelectorAll('input')].map((i: HTMLInputElement) => i.value);
    expect(figures).toContain('09');
    expect(figures).toContain('30');
  });

  it('and tells the control when the reader changes it', () => {
    const f = TestBed.createComponent(Compact);
    f.detectChanges();
    const minutes = [...f.nativeElement.querySelectorAll('input')][1]! as HTMLInputElement;
    minutes.value = '45';
    minutes.dispatchEvent(new Event('input', { bubbles: true }));
    minutes.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    f.detectChanges();
    expect(f.componentInstance.control.value?.toString({ smallestUnit: 'minute' })).toBe('09:45');
  });

  it('is disabled when the form disables it', () => {
    const f = TestBed.createComponent(Compact);
    f.detectChanges();
    f.componentInstance.control.disable();
    f.detectChanges();
    const inputs = [...f.nativeElement.querySelectorAll('input')] as HTMLInputElement[];
    expect(inputs.every((i) => i.disabled)).toBe(true);
  });
});
