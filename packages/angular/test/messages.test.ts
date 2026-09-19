import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  Calendar,
  DateField,
  DateTimeRange,
  TimeSlotPicker,
  provideTzslotMessages,
  FR,
  EN,
  type DateTimeRangeValue,
} from '../src/index.js';
import { Temporal } from '@tzslot/core';

const paris = (iso: string) =>
  Temporal.PlainDateTime.from(iso)
    .toZonedDateTime('Europe/Paris', { disambiguation: 'earlier' })
    .toInstant();

@Component({
  standalone: true,
  imports: [Calendar, DateField, TimeSlotPicker, DateTimeRange],
  template: `
    <tz-calendar [today]="today" [locale]="locale" />
    <tz-date-field [locale]="locale" />
    <tz-time-slots [date]="'2026-03-29'" [timeZone]="'Europe/Paris'" [stepMinutes]="60" />
    <tz-datetime-range [(value)]="shift" [timeZone]="'Europe/Paris'" [stepMinutes]="60" />
  `,
})
class Host {
  readonly today = Temporal.PlainDate.from('2026-06-15');
  locale = 'en-GB';
  readonly shift = signal<DateTimeRangeValue>({
    start: paris('2026-10-24T23:00'),
    end: paris('2026-10-25T05:00'),
  });
}

const mount = (messages = EN, locale = 'en-GB') => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [Host],
    providers: [provideTzslotMessages(messages)],
  });
  const f: ComponentFixture<Host> = TestBed.createComponent(Host);
  f.componentInstance.locale = locale;
  f.detectChanges();
  return f;
};
const el = (f: ComponentFixture<Host>) => f.nativeElement as HTMLElement;
const text = (f: ComponentFixture<Host>, sel: string) =>
  el(f).querySelector(sel)?.textContent?.trim() ?? '';
const attr = (f: ComponentFixture<Host>, sel: string, name: string) =>
  el(f).querySelector(sel)?.getAttribute(name) ?? '';

describe('English by default', () => {
  it('says what it has always said', () => {
    const f = mount();
    expect(text(f, '.tz-field__trigger')).toContain('Choose a date');
    expect(attr(f, '.tz-cal__nav', 'aria-label')).toBe('Previous month');
    expect(text(f, '.tz-dtr__warning')).toContain('reads as 6h but lasts 7h');
  });
});

describe('with the French bundle provided', () => {
  it('translates the labels', () => {
    const f = mount(FR, 'fr-FR');
    expect(text(f, '.tz-field__trigger')).toContain('Choisir une date');
    expect(attr(f, '.tz-cal__nav', 'aria-label')).toBe('Mois précédent');
    expect(attr(f, '.tz-cal__title', 'aria-label')).toBe('Choisir un mois');
  });

  it('translates the marks on the slots', () => {
    const f = mount(FR, 'fr-FR');
    const missing = el(f).querySelector('.tz-slots__slot--missing')!;
    expect(missing.textContent).toContain('inexistant');
    expect(missing.getAttribute('title')).toContain("n'existe pas");
  });

  it('rewrites the clock-change sentence, not just its words', () => {
    const f = mount(FR, 'fr-FR');
    const warning = text(f, '.tz-dtr__warning');

    // French leads with the real duration; English leads with the cause. A
    // format string with holes could not express both, which is why the bundle
    // takes a function.
    expect(warning).toBe(
      'Cet intervalle dure 7h et non 6h : les pendules reculent de 1h pendant cette période.',
    );
    expect(warning.indexOf('7h')).toBeLessThan(warning.indexOf('reculent'));
  });

  it('leaves month names to Intl, which already knows them', () => {
    const f = mount(FR, 'fr-FR');
    // Not in the bundle, and it should never be: the browser ships these.
    expect(text(f, '.tz-cal__title')).toContain('juin');
  });
});

describe('a per-instance override still wins', () => {
  it('an input beats the bundle', () => {
    TestBed.resetTestingModule();
    @Component({
      standalone: true,
      imports: [DateField],
      template: `<tz-date-field [placeholder]="'Quand ?'" />`,
    })
    class One {}
    TestBed.configureTestingModule({ imports: [One], providers: [provideTzslotMessages(FR)] });
    const f = TestBed.createComponent(One);
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('.tz-field__trigger')!.textContent).toContain(
      'Quand ?',
    );
  });
});
