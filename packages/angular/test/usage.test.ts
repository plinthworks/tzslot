import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Calendar, DateField } from '../src/index.js';
import { Temporal } from '@tzslot/core';
import type { PlainDate } from '@tzslot/core';

/**
 * The four ways to use these, because not every application has reactive
 * forms — and a component that only works inside a FormGroup is a component
 * half the people who want it cannot use.
 */

// ── 1. Two-way binding on a signal, no forms module at all ────
@Component({
  standalone: true,
  imports: [Calendar],
  template: `<tz-calendar [(value)]="day" [today]="today" />`,
})
class WithSignal {
  readonly today = Temporal.PlainDate.from('2026-06-15');
  readonly day = signal<PlainDate | null>(null);
}

// ── 2. One-way in, event out ──────────────────────────────────
@Component({
  standalone: true,
  imports: [Calendar],
  template: `<tz-calendar [value]="day" (valueChange)="day = $event" [today]="today" />`,
})
class WithEvent {
  readonly today = Temporal.PlainDate.from('2026-06-15');
  day: PlainDate | null = null;
}

// ── 3. Template-driven forms ──────────────────────────────────
@Component({
  standalone: true,
  imports: [FormsModule, Calendar],
  template: `<tz-calendar [(ngModel)]="day" name="day" [today]="today" />`,
})
class WithNgModel {
  readonly today = Temporal.PlainDate.from('2026-06-15');
  day: PlainDate | null = null;
}

// ── 4. Driven from outside, the way flatpickr is ──────────────
@Component({
  standalone: true,
  imports: [Calendar, DateField],
  template: `
    <tz-calendar [(value)]="day" [today]="today" />
    <tz-date-field [(value)]="fieldDay" [locale]="'en-GB'" />
  `,
})
class Imperative {
  readonly today = Temporal.PlainDate.from('2026-06-15');
  readonly day = signal<PlainDate | null>(null);
  readonly fieldDay = signal<PlainDate | null>(null);
  readonly calendar = viewChild.required(Calendar);
  readonly field = viewChild.required(DateField);
}

const dayIn = (f: ComponentFixture<unknown>, iso: string) =>
  (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
    `button[data-date="${iso}"]`,
  )!;

describe('without any forms module', () => {
  it('two-way binding on a signal works', () => {
    const f = TestBed.createComponent(WithSignal);
    f.detectChanges();

    dayIn(f, '2026-06-23').click();
    f.detectChanges();
    expect(f.componentInstance.day()!.toString()).toBe('2026-06-23');

    f.componentInstance.day.set(Temporal.PlainDate.from('2026-06-10'));
    f.detectChanges();
    expect(dayIn(f, '2026-06-10').classList.contains('tz-cal__day--selected')).toBe(true);
  });

  it('one-way in and an event out works', () => {
    const f = TestBed.createComponent(WithEvent);
    f.detectChanges();

    dayIn(f, '2026-06-23').click();
    f.detectChanges();
    expect(f.componentInstance.day!.toString()).toBe('2026-06-23');
  });
});

describe('with template-driven forms', () => {
  it('ngModel works, because the accessor serves both kinds', async () => {
    const f = TestBed.createComponent(WithNgModel);
    f.detectChanges();
    await f.whenStable();

    dayIn(f, '2026-06-23').click();
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.day!.toString()).toBe('2026-06-23');
  });
});

describe('driven from outside', () => {
  let f: ComponentFixture<Imperative>;
  beforeEach(() => {
    f = TestBed.createComponent(Imperative);
    f.detectChanges();
  });

  it('goTo moves the grid without selecting anything', () => {
    // Showing a month is not choosing a day in it.
    f.componentInstance.calendar().goTo({ year: 2027, month: 3 });
    f.detectChanges();

    const title = (f.nativeElement as HTMLElement).querySelector('.tz-cal__title')!;
    expect(title.textContent).toContain('2027');
    expect(f.componentInstance.day()).toBeNull();
  });

  it('the field opens and closes on command', () => {
    const field = f.componentInstance.field();

    expect(field.isOpen()).toBe(false);
    field.open();
    f.detectChanges();
    expect(field.isOpen()).toBe(true);
    expect(document.querySelector('.tz-field__panel')).not.toBeNull();

    field.close();
    f.detectChanges();
    expect(document.querySelector('.tz-field__panel')).toBeNull();
  });

  it('clear empties the selection', () => {
    dayIn(f, '2026-06-23').click();
    f.detectChanges();
    expect(f.componentInstance.day()).not.toBeNull();

    f.componentInstance.calendar().clear();
    f.detectChanges();
    expect(f.componentInstance.day()).toBeNull();
  });
});

describe('inputs are reactive', () => {
  it('changing one re-renders without anything being told to refresh', () => {
    const f = TestBed.createComponent(WithSignal);
    f.detectChanges();
    const before = (f.nativeElement as HTMLElement).querySelector('.tz-cal__title')!.textContent;

    f.componentInstance.day.set(Temporal.PlainDate.from('2028-11-02'));
    f.detectChanges();
    const after = (f.nativeElement as HTMLElement).querySelector('.tz-cal__title')!.textContent;

    expect(after).not.toBe(before);
    expect(after).toContain('2028');
  });
});

describe('custom icons', () => {
  @Component({
    standalone: true,
    imports: [Calendar],
    template: `
      <tz-calendar [today]="today">
        <span tzPrev class="mine">PREV</span>
        <span tzNext class="mine">NEXT</span>
      </tz-calendar>
    `,
  })
  class WithIcons {
    readonly today = Temporal.PlainDate.from('2026-06-15');
  }

  it('replace the built-in chevrons', () => {
    const f = TestBed.createComponent(WithIcons);
    f.detectChanges();
    const navs = Array.from(
      (f.nativeElement as HTMLElement).querySelectorAll('.tz-cal__nav'),
    );

    expect(navs[0]!.textContent!.trim()).toBe('PREV');
    expect(navs[1]!.textContent!.trim()).toBe('NEXT');
    expect(navs[0]!.textContent).not.toContain('‹');
  });

  it('the chevrons remain when nothing is projected', () => {
    const f = TestBed.createComponent(WithSignal);
    f.detectChanges();
    const nav = (f.nativeElement as HTMLElement).querySelector('.tz-cal__nav')!;
    // ng-content fallback: a consumer who wants nothing keeps something.
    expect(nav.textContent!.trim()).toBe('‹');
  });
});

describe('renderCell and buttons, from a template', () => {
  @Component({
    standalone: true,
    imports: [Calendar],
    template: `<tz-calendar [(value)]="day" [today]="today" [renderCell]="prices" [buttons]="['today', 'clear']" />`,
  })
  class WithExtras {
    readonly today = Temporal.PlainDate.from('2026-06-15');
    readonly day = signal<PlainDate | null>(null);
    readonly prices = ({ date }: { date: PlainDate }) =>
      date.day === 20 ? { note: 'Full', disabled: true } : { note: '89€' };
  }

  it('reach the calendar, and Today updates the bound value', () => {
    const f = TestBed.createComponent(WithExtras);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;

    expect(el.querySelector('[data-date="2026-06-10"] .tz-cal__note')!.textContent).toBe('89€');
    expect(el.querySelector<HTMLButtonElement>('[data-date="2026-06-20"]')!.disabled).toBe(true);

    el.querySelector<HTMLButtonElement>('.tz-cal__action--today')!.click();
    f.detectChanges();
    expect(f.componentInstance.day()!.toString()).toBe('2026-06-15');
  });
});
