import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Calendar } from '../src/index.js';
import { Temporal, type PlainDate, type Weekday } from '../../core/src/index.js';

@Component({
  standalone: true,
  imports: [Calendar],
  template: `
    <tz-calendar
      [(value)]="chosen"
      [firstDayOfWeek]="firstDay()"
      [today]="today()"
      [min]="min()"
      [max]="max()"
      [locale]="'en-GB'"
    />
  `,
})
class Host {
  readonly chosen = signal<PlainDate | null>(null);
  readonly firstDay = signal<Weekday>(1);
  readonly today = signal(Temporal.PlainDate.from('2026-09-18'));
  readonly min = signal<PlainDate | null>(null);
  readonly max = signal<PlainDate | null>(null);
}

let fixture: ComponentFixture<Host>;
let host: Host;

const q = <T extends Element>(sel: string) => fixture.nativeElement.querySelector(sel) as T;
const qa = <T extends Element>(sel: string) =>
  Array.from(fixture.nativeElement.querySelectorAll(sel)) as T[];
const days = () => {
  fixture.detectChanges();
  return qa<HTMLButtonElement>('button.tz-cal__day');
};
const dayFor = (iso: string) => days().find((b) => b.dataset['date'] === iso)!;
const title = () => {
  fixture.detectChanges();
  return q<HTMLElement>('.tz-cal__title').textContent!.trim();
};

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  fixture = TestBed.createComponent(Host);
  host = fixture.componentInstance;
});

describe('the grid', () => {
  it('is always 42 cells, so the calendar never changes height', () => {
    expect(days()).toHaveLength(42);
    // February 2026 is 28 days starting on a Sunday — the case a five-row grid
    // would get away with.
    host.today.set(Temporal.PlainDate.from('2026-02-10'));
    expect(days()).toHaveLength(42);
  });

  it('opens on the month of today when nothing is selected', () => {
    expect(title()).toBe('September 2026');
  });

  it('opens on the month of the selection when there is one', () => {
    host.chosen.set(Temporal.PlainDate.from('2027-03-04'));
    expect(title()).toBe('March 2027');
  });

  it('marks the days either side of the month as outside', () => {
    const outside = days().filter((b) => b.classList.contains('tz-cal__day--outside'));
    expect(outside.map((b) => b.dataset['date'])).toContain('2026-08-31');
    expect(days().filter((b) => !b.classList.contains('tz-cal__day--outside'))).toHaveLength(30);
  });

  it('marks today, and only today', () => {
    const marked = days().filter((b) => b.classList.contains('tz-cal__day--today'));
    expect(marked).toHaveLength(1);
    expect(marked[0]!.dataset['date']).toBe('2026-09-18');
    expect(marked[0]!.getAttribute('aria-current')).toBe('date');
  });

  it('starts the week where it is told to', () => {
    fixture.detectChanges();
    expect(qa<HTMLElement>('.tz-cal__weekday')[0]!.textContent!.trim()).toBe('Mon');
    host.firstDay.set(7);
    fixture.detectChanges();
    expect(qa<HTMLElement>('.tz-cal__weekday')[0]!.textContent!.trim()).toBe('Sun');
    expect(days()[0]!.dataset['date']).toBe('2026-08-30');
  });
});

describe('selecting', () => {
  it('a click sets the date', () => {
    dayFor('2026-09-23').click();
    fixture.detectChanges();
    expect(host.chosen()!.toString()).toBe('2026-09-23');
    expect(dayFor('2026-09-23').classList.contains('tz-cal__day--selected')).toBe(true);
  });

  it('clicking a trailing day follows it into its month', () => {
    dayFor('2026-10-03').click();
    expect(host.chosen()!.toString()).toBe('2026-10-03');
    // Otherwise the selection would sit on a month the grid had stopped showing.
    expect(title()).toBe('October 2026');
  });

  it('respects min and max', () => {
    host.min.set(Temporal.PlainDate.from('2026-09-10'));
    host.max.set(Temporal.PlainDate.from('2026-09-20'));
    fixture.detectChanges();

    expect(dayFor('2026-09-09').disabled).toBe(true);
    expect(dayFor('2026-09-21').disabled).toBe(true);
    expect(dayFor('2026-09-15').disabled).toBe(false);

    dayFor('2026-09-09').click();
    fixture.detectChanges();
    expect(host.chosen()).toBeNull();
  });
});

describe('navigating with the mouse', () => {
  it('moves a month at a time, and across a year', () => {
    const [prev, next] = qa<HTMLButtonElement>('button.tz-cal__nav');
    next!.click();
    expect(title()).toBe('October 2026');
    for (let i = 0; i < 3; i++) next!.click();
    expect(title()).toBe('January 2027');
    prev!.click();
    expect(title()).toBe('December 2026');
  });
});

describe('navigating with the keyboard', () => {
  const press = (key: string) => {
    const grid = q<HTMLElement>('.tz-cal__grid');
    grid.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  };
  const tabbable = () => days().find((b) => b.getAttribute('tabindex') === '0')!;

  beforeEach(() => {
    dayFor('2026-09-18').focus();
    fixture.detectChanges();
  });

  it('arrows move by a day and by a week', () => {
    press('ArrowRight');
    expect(tabbable().dataset['date']).toBe('2026-09-19');
    press('ArrowDown');
    expect(tabbable().dataset['date']).toBe('2026-09-26');
    press('ArrowLeft');
    expect(tabbable().dataset['date']).toBe('2026-09-25');
    press('ArrowUp');
    expect(tabbable().dataset['date']).toBe('2026-09-18');
  });

  it('Home and End go to the ends of the week, as the week is configured', () => {
    press('Home');
    expect(tabbable().dataset['date']).toBe('2026-09-14'); // Monday
    press('End');
    expect(tabbable().dataset['date']).toBe('2026-09-20'); // Sunday
  });

  it('PageUp and PageDown change month', () => {
    press('PageDown');
    expect(title()).toBe('October 2026');
    expect(tabbable().dataset['date']).toBe('2026-10-18');
    press('PageUp');
    expect(title()).toBe('September 2026');
  });

  it('walking off the edge of the month follows into the next one', () => {
    for (let i = 0; i < 13; i++) press('ArrowDown');
    expect(title()).toBe('December 2026');
  });

  it('Enter selects the focused day', () => {
    press('ArrowRight');
    press('Enter');
    expect(host.chosen()!.toString()).toBe('2026-09-19');
  });

  it('only one cell is tabbable at a time', () => {
    expect(days().filter((b) => b.getAttribute('tabindex') === '0')).toHaveLength(1);
    press('ArrowRight');
    expect(days().filter((b) => b.getAttribute('tabindex') === '0')).toHaveLength(1);
  });
});

describe('the day the clocks change is an ordinary day here', () => {
  it('29 March 2026 is one cell like any other', () => {
    host.today.set(Temporal.PlainDate.from('2026-03-15'));
    const cell = dayFor('2026-03-29');
    expect(cell).toBeDefined();
    expect(cell.disabled).toBe(false);
    expect(days()).toHaveLength(42);
  });
});
