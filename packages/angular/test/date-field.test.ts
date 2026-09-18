import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DateField, type FieldMode } from '../src/index.js';
import { Temporal } from '../../core/src/index.js';
import type { PlainDate } from '../../core/src/index.js';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, DateField],
  template: `
    <form [formGroup]="form">
      <tz-date-field formControlName="day" [mode]="mode()" [locale]="'en-GB'" />
    </form>
  `,
})
class Host {
  readonly mode = signal<FieldMode>('popup');
  readonly form = new FormGroup({ day: new FormControl<PlainDate | null>(null) });
}

let fixture: ComponentFixture<Host>;
let host: Host;

const trigger = () =>
  (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.tz-field__trigger')!;
/** The overlay renders outside the component, in a container on the body. */
const panel = () => document.querySelector('.tz-field__panel');
/**
 * Any day the open calendar is showing, taken from the DOM rather than written
 * down — the panel opens on the current month, so a hard-coded date makes the
 * test depend on the day it runs. That is the bug this very test caught.
 */
const someDayInPanel = (): HTMLButtonElement =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>('.tz-field__panel button.tz-cal__day'),
  ).find((b) => !b.disabled && !b.classList.contains('tz-cal__day--outside'))!;

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  fixture = TestBed.createComponent(Host);
  host = fixture.componentInstance;
  fixture.detectChanges();
});

afterEach(() => {
  fixture.destroy();
});

describe('the field', () => {
  it('shows its placeholder until something is chosen', () => {
    expect(trigger().textContent).toContain('Choose a date');
    expect(trigger().classList.contains('tz-field__trigger--empty')).toBe(true);
  });

  it('opens and closes a panel', () => {
    expect(panel()).toBeNull();

    trigger().click();
    fixture.detectChanges();
    expect(panel()).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    trigger().click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('choosing a day fills the field, updates the control and closes', () => {
    trigger().click();
    fixture.detectChanges();

    const day = someDayInPanel();
    const iso = day.dataset['date']!;
    day.click();
    fixture.detectChanges();

    expect(host.form.controls.day.value!.toString()).toBe(iso);
    expect(panel()).toBeNull();
    // Written the way the locale writes it, not the way the value is stored.
    const expected = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' })
      .format(new Date(`${iso}T00:00:00Z`));
    expect(trigger().textContent).toContain(expected);
  });

  it('Escape closes without choosing', () => {
    trigger().click();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(host.form.controls.day.value).toBeNull();
  });

  it('a disabled control cannot be opened', () => {
    host.form.controls.day.disable();
    fixture.detectChanges();

    expect(trigger().disabled).toBe(true);
    trigger().click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('setting the control fills the field without opening anything', () => {
    host.form.controls.day.setValue(Temporal.PlainDate.from('2026-12-25'));
    fixture.detectChanges();
    expect(trigger().textContent).toContain('25 Dec 2026');
    expect(panel()).toBeNull();
  });
});

describe('the two presentation modes', () => {
  it('a popup is anchored, a dialog is centred and marked as such', () => {
    trigger().click();
    fixture.detectChanges();
    expect(panel()!.classList.contains('tz-field__panel--dialog')).toBe(false);
    trigger().click();
    fixture.detectChanges();

    host.mode.set('dialog');
    fixture.detectChanges();

    trigger().click();
    fixture.detectChanges();
    expect(panel()!.classList.contains('tz-field__panel--dialog')).toBe(true);
    expect(panel()!.getAttribute('role')).toBe('dialog');
  });
});

describe('cleanup', () => {
  it('destroying the component takes the overlay with it', () => {
    trigger().click();
    fixture.detectChanges();
    expect(panel()).not.toBeNull();

    // An overlay outlives its component unless told otherwise, and a panel
    // left floating over the next page gets blamed on the router.
    fixture.destroy();
    expect(panel()).toBeNull();
  });
});
