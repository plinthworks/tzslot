import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { RangeField, type RangeFieldValue } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * Teardown, with a change still in hand.
 *
 * Holding the report opened a door that did not exist before: until then every
 * change had already been reported by the time the component was destroyed.
 * Reporting on the way out wrote a `model()` belonging to a half-dead
 * component — `NG0953` — and the change was lost regardless, since nobody was
 * left to hear it.
 */
@Component({
  standalone: true,
  imports: [RangeField],
  template: `
    <tz-range-field
      [value]="period()"
      (valueChange)="onValue($event)"
      [today]="today"
      [locale]="'en-GB'"
      [presets]="none"
      reportOn="close"
    />
  `,
})
class Host {
  readonly today = Temporal.PlainDate.from('2026-09-21');
  readonly none: readonly [] = [];
  readonly period = signal<RangeFieldValue>({ start: null, end: null });
  reports = 0;
  onValue(value: RangeFieldValue): void {
    this.reports += 1;
    this.period.set(value);
  }
}

let fixture: ComponentFixture<Host>;
let warned: unknown[][];

beforeEach(() => {
  warned = [];
  vi.spyOn(console, 'warn').mockImplementation((...args) => void warned.push(args));
  vi.spyOn(console, 'error').mockImplementation((...args) => void warned.push(args));
  fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
});
afterEach(() => vi.restoreAllMocks());

describe('a field destroyed with a change held', () => {
  it('says nothing, and says it without complaining', () => {
    document.querySelector<HTMLElement>('.tz-field__text')!.click();
    fixture.detectChanges();
    document.querySelector<HTMLButtonElement>('.tz-rangefield__preset, .tz-range__day')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.reports).toBe(0);

    fixture.destroy();

    expect(fixture.componentInstance.reports).toBe(0);
    const noisy = warned.flat().filter((a) => String(a).includes('NG0953'));
    expect(noisy).toEqual([]);
  });
});
