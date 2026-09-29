import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { RangeField, type RangeFieldValue } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * The shape a real screen has, and the one that froze the browser.
 *
 * A screen keeps the period and the shortcut's name in two signals, writes
 * both when the field reports, and binds both back. That round trip is the
 * whole point of `(presetChange)` — a saved filter that still says what it
 * meant. It also closed a circle: the name came back down, `update` resolved
 * it again, a fresh range was committed, which reported, which came back down.
 *
 * Checked here rather than only at the DOM layer because this is where it was
 * seen: the effect that pushes settings is Angular's, and it re-runs because
 * writing `value` invalidates it.
 */
@Component({
  standalone: true,
  imports: [RangeField],
  template: `
    <tz-range-field
      [value]="period()"
      (valueChange)="onValue($event)"
      [preset]="preset()"
      (presetChange)="preset.set($event)"
      [presets]="shortcuts"
      [today]="today"
      [locale]="'en-GB'"
    />
  `,
})
class Host {
  readonly today = Temporal.PlainDate.from('2026-09-21');
  /** A field, not a literal in the template: a new array every pass is churn. */
  readonly shortcuts = ['last7Days', 'thisMonth'] as const;
  readonly period = signal<RangeFieldValue>({ start: null, end: null });
  readonly preset = signal<string | null>(null);
  reports = 0;

  onValue(value: RangeFieldValue): void {
    this.reports += 1;
    this.period.set(value);
  }
}

let fixture: ComponentFixture<Host>;

beforeEach(() => {
  fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
});

describe('a screen that stores the shortcut it used', () => {
  it('settles after one press', { timeout: 4000 }, () => {
    fixture.componentInstance.period.set({ start: null, end: null });
    fixture.detectChanges();

    const button = document.querySelector<HTMLButtonElement>('.tz-rangefield__preset');
    // The panel has to be open for the shortcuts to exist.
    if (!button) {
      document.querySelector<HTMLElement>('.tz-field__text')!.click();
      fixture.detectChanges();
    }
    document.querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();
    fixture.detectChanges();

    const host = fixture.componentInstance;
    expect(host.reports).toBe(1);
    expect(host.preset()).toBe('last7Days');
    expect(host.period().start).not.toBeNull();

    // A second pass changes nothing: the name is an echo now.
    fixture.detectChanges();
    expect(host.reports).toBe(1);
  });

  it('still lets the same shortcut be pressed twice', { timeout: 4000 }, () => {
    document.querySelector<HTMLElement>('.tz-field__text')!.click();
    fixture.detectChanges();
    const press = () => {
      document.querySelector<HTMLButtonElement>('.tz-rangefield__preset')!.click();
      fixture.detectChanges();
    };
    press();
    const first = fixture.componentInstance.reports;
    document.querySelector<HTMLElement>('.tz-field__text')!.click();
    fixture.detectChanges();
    press();
    // Pressing the button never goes through `update`, so the guard cannot
    // swallow it — the reader gets an answer both times.
    expect(fixture.componentInstance.reports).toBeGreaterThan(first);
  });
});
