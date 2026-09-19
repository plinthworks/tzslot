import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Calendar, type CalendarView } from '../src/index.js';
import { Temporal } from '@tzslot/core';
import type { PlainDate } from '@tzslot/core';

@Component({
  standalone: true,
  imports: [Calendar],
  template: `
    <tz-calendar
      [(value)]="chosen"
      [(view)]="view"
      [minView]="minView()"
      [today]="today"
      [locale]="'en-GB'"
    />
  `,
})
class Host {
  readonly today = Temporal.PlainDate.from('2026-06-15');
  readonly chosen = signal<PlainDate | null>(null);
  readonly view = signal<CalendarView>('days');
  readonly minView = signal<CalendarView>('days');
}

let fixture: ComponentFixture<Host>;
let host: Host;
const el = () => fixture.nativeElement as HTMLElement;
const title = () => el().querySelector<HTMLButtonElement>('.tz-cal__title')!;
const coarse = () =>
  Array.from(el().querySelectorAll<HTMLButtonElement>('.tz-cal__coarse-cell'));
const cell = (value: number | string) =>
  coarse().find((b) => b.dataset['value'] === String(value))!;
const days = () => Array.from(el().querySelectorAll<HTMLButtonElement>('.tz-cal__day'));
const navs = () => Array.from(el().querySelectorAll<HTMLButtonElement>('.tz-cal__nav'));
const tick = () => fixture.detectChanges();

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  fixture = TestBed.createComponent(Host);
  host = fixture.componentInstance;
  tick();
});

describe('zooming out', () => {
  it('the title goes days → months → years', () => {
    expect(title().textContent!.trim()).toBe('June 2026');

    title().click();
    tick();
    expect(host.view()).toBe('months');
    expect(title().textContent!.trim()).toBe('2026');
    expect(coarse()).toHaveLength(12);

    title().click();
    tick();
    expect(host.view()).toBe('years');
    expect(title().textContent!.trim()).toBe('2020 – 2029');
    expect(coarse()).toHaveLength(12);
  });

  it('stops at years — there is nowhere further to go', () => {
    title().click();
    title().click();
    tick();
    expect(title().disabled).toBe(true);
  });
});

describe('zooming back in', () => {
  it('a year leads to its months, a month to its days', () => {
    title().click();
    title().click();
    tick();

    cell(2028).click();
    tick();
    expect(host.view()).toBe('months');
    expect(title().textContent!.trim()).toBe('2028');

    cell(3).click(); // March
    tick();
    expect(host.view()).toBe('days');
    expect(title().textContent!.trim()).toBe('March 2028');

    // And the day grid really is that month.
    expect(days().some((b) => b.dataset['date'] === '2028-03-15')).toBe(true);
  });

  it('reaching a date three hundred clicks away takes four', () => {
    // The whole reason this exists: months and years, not an arrow held down.
    title().click();
    title().click();
    tick();
    cell(2029).click();
    tick();
    cell(12).click();
    tick();
    const target = days().find((b) => b.dataset['date'] === '2029-12-25')!;
    target.click();
    tick();

    expect(host.chosen()!.toString()).toBe('2029-12-25');
  });
});

describe('the arrows follow the view', () => {
  it('move a month, a year, then a decade', () => {
    const [prev, next] = navs();

    next!.click();
    tick();
    expect(title().textContent!.trim()).toBe('July 2026');

    title().click();
    tick();
    next!.click();
    tick();
    expect(title().textContent!.trim()).toBe('2027');

    title().click();
    tick();
    next!.click();
    tick();
    // An arrow that moved a month here would be useless: a decade view is the
    // state these buttons exist to escape.
    expect(title().textContent!.trim()).toBe('2030 – 2039');

    prev!.click();
    tick();
    expect(title().textContent!.trim()).toBe('2020 – 2029');
  });
});

describe('minView turns it into a coarser picker', () => {
  it("'months' selects the first of the month instead of showing days", () => {
    host.minView.set('months');
    host.view.set('months');
    tick();

    cell(9).click(); // September
    tick();

    expect(host.chosen()!.toString()).toBe('2026-09-01');
    expect(host.view()).toBe('months'); // never descended
    expect(days()).toHaveLength(0);
  });

  it("'years' selects the first of the year", () => {
    host.minView.set('years');
    host.view.set('years');
    tick();

    // Within the decade on screen — 2026 shows 2019 to 2030.
    cell(2028).click();
    tick();
    expect(host.chosen()!.toString()).toBe('2028-06-01');
    expect(host.view()).toBe('years'); // never descended
  });
});

describe('what the coarse cells show', () => {
  it('marks the current month and the selected one', () => {
    host.chosen.set(Temporal.PlainDate.from('2026-02-10'));
    host.view.set('months');
    tick();

    expect(cell(6).classList.contains('tz-cal__coarse-cell--today')).toBe(true);
    expect(cell(2).classList.contains('tz-cal__coarse-cell--selected')).toBe(true);
  });

  it('fades the two years borrowed from the neighbouring decades', () => {
    host.view.set('years');
    tick();
    expect(cell(2019).classList.contains('tz-cal__coarse-cell--outside')).toBe(true);
    expect(cell(2025).classList.contains('tz-cal__coarse-cell--outside')).toBe(false);
  });

  it('names the months in the given locale', () => {
    host.view.set('months');
    tick();
    expect(cell(1).textContent!.trim()).toBe('Jan');
  });
});
