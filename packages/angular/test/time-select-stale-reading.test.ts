import { describe, it, expect } from 'vitest';
import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Temporal } from '@tzslot/core';
import type { PlainTime } from '@tzslot/core';
import { TimeSelect, TimeInput } from '../src/index.js';

/**
 * What happens to the reading of a repeated hour once it stops applying.
 *
 * `offset` is only ever meaningful on the morning an hour happens twice. The
 * day moves, or the form writes an ordinary time, and the reading that was
 * held belongs to nothing — and the hour menu was asking for a key no option
 * carried, so it came up blank with the control still holding a value.
 */
@Component({
  standalone: true,
  imports: [TimeSelect, ReactiveFormsModule],
  template: `
    <tz-time-select
      [formControl]="control"
      [date]="day()"
      timeZone="Europe/Paris"
      locale="fr-FR"
      [(offset)]="reading"
    />`,
})
class Host {
  readonly day = signal('2026-10-25');
  readonly control = new FormControl<PlainTime | null>(null);
  readonly reading = signal<string | null>(null);
}

const hourMenu = (root: HTMLElement) => root.querySelectorAll('select')[0] as HTMLSelectElement;

describe('a reading that no longer applies', () => {
  it('leaves the hour menu showing its hour when the day moves', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const hour = hourMenu(root);

    // The repeated hour, second reading.
    hour.value = '2|+01:00';
    hour.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.reading()).toBe('+01:00');
    expect(String(fixture.componentInstance.control.value)).toBe('02:00:00');

    // An ordinary day: 02:00 happens once, keyed `2|`.
    fixture.componentInstance.day.set('2026-10-26');
    fixture.detectChanges();
    expect(hourMenu(root).selectedIndex).not.toBe(-1);
    expect(hourMenu(root).value).toBe('2|');
  });

  it('leaves it showing an ordinary hour written by the form', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const hour = hourMenu(root);
    hour.value = '2|+01:00';
    hour.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    fixture.componentInstance.control.setValue(Temporal.PlainTime.from('09:00'));
    fixture.detectChanges();
    expect(hourMenu(root).selectedIndex).not.toBe(-1);
    expect(hourMenu(root).value).toBe('9|');
    // The reading went with the value it belonged to.
    expect(fixture.componentInstance.reading()).toBe(null);
  });

  it('shows an ambiguous hour handed in without a reading', () => {
    // The mirror of the case above, and the one a docs example was showing:
    // on the morning the clocks go back the only entries for 02 are keyed by
    // their two offsets, so a value arriving with no reading asked for `2|`
    // and selected nothing. The earlier of the two readings stands in.
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    fixture.componentInstance.control.setValue(Temporal.PlainTime.from('02:30'));
    fixture.detectChanges();
    const hour = hourMenu(fixture.nativeElement as HTMLElement);
    expect(hour.selectedIndex).not.toBe(-1);
    expect(hour.value).toBe('2|+02:00');
  });

  it('propagates a write to offset through [(offset)]', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    const select = fixture.debugElement.children[0]!.componentInstance as TimeSelect;
    select.offset.set('+02:00');
    fixture.detectChanges();
    expect(fixture.componentInstance.reading()).toBe('+02:00');
  });

  it('marks the control touched when the menus are left', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.control.touched).toBe(false);
    hourMenu(root).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.control.touched).toBe(true);
  });
});

/**
 * `hour12` was in both settings interfaces and on both generated API pages,
 * and on neither wrapper — so a twelve-hour field could not be asked for from
 * a template at all.
 */
@Component({
  standalone: true,
  imports: [TimeSelect, TimeInput, ReactiveFormsModule],
  template: `
    <tz-time-select [hour12]="true" locale="fr-FR" [value]="noon" />
    <tz-time-input [formControl]="typed" [hour12]="true" locale="fr-FR" />`,
})
class Twelve {
  readonly noon = Temporal.PlainTime.from('13:00');
  readonly typed = new FormControl<PlainTime | null>(Temporal.PlainTime.from('13:00'));
}

describe('hour12 on the two time controls', () => {
  it('puts a meridiem menu on the select and a meridiem button on the field', () => {
    const fixture = TestBed.createComponent(Twelve);
    fixture.autoDetectChanges();
    const root = fixture.nativeElement as HTMLElement;

    const menus = root.querySelector('tz-time-select')!;
    const selects = [...menus.querySelectorAll('select')];
    expect(selects.length).toBe(3);
    expect(selects[2]!.value).toBe('PM');
    // Thirteen o'clock is one in the afternoon, and the menu writes it that way.
    expect(selects[0]!.selectedOptions[0]!.textContent).toBe('1');

    const field = root.querySelector('tz-time-input')!;
    expect(field.textContent).toContain('PM');
  });

  it('marks the compact field touched when it is left', () => {
    const fixture = TestBed.createComponent(Twelve);
    fixture.autoDetectChanges();
    const field = (fixture.nativeElement as HTMLElement).querySelector('tz-time-input')!;
    expect(fixture.componentInstance.typed.touched).toBe(false);
    field.querySelector('input')!.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.typed.touched).toBe(true);
  });
});
