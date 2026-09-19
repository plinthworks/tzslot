import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { MultiDate } from '../src/index.js';
import { Temporal, type PlainDate } from '@tzslot/core';

@Component({
  standalone: true,
  imports: [MultiDate],
  template: `<tz-multi-date [(value)]="days" [today]="today" [maxDates]="3" />`,
})
class WithSignal {
  readonly today = Temporal.PlainDate.from('2026-09-18');
  readonly days = signal<readonly PlainDate[]>([]);
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MultiDate],
  template: `<form [formGroup]="form"><tz-multi-date formControlName="sessions" valueAs="iso"
             [today]="today" /></form>`,
})
class InForm {
  readonly today = Temporal.PlainDate.from('2026-09-18');
  readonly form = new FormGroup({ sessions: new FormControl<string[]>(['2026-09-22', '2026-09-08']) });
}

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [WithSignal, InForm] }).compileComponents();
});

const click = (root: HTMLElement, iso: string) =>
  root.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!.click();

describe('<tz-multi-date>', () => {
  it('binds an array to a signal, in date order', () => {
    const f = TestBed.createComponent(WithSignal);
    f.detectChanges();
    click(f.nativeElement, '2026-09-20');
    click(f.nativeElement, '2026-09-03');
    f.detectChanges();
    expect(f.componentInstance.days().map(String)).toEqual(['2026-09-03', '2026-09-20']);
  });

  it('holds ISO strings in a form, read and written back', () => {
    const f = TestBed.createComponent(InForm);
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    expect(root.querySelector('[data-date="2026-09-08"]')!.classList.contains('tz-cal__day--selected')).toBe(true);

    click(root, '2026-09-15');
    f.detectChanges();
    expect(f.componentInstance.form.controls.sessions.value).toEqual(['2026-09-08', '2026-09-15', '2026-09-22']);
  });
});
