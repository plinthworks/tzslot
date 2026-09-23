import { describe, it, expect } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RangeField, Calendar, EN, FR, provideTzslotMessages, type TzslotMessages } from '../src/index.js';

/**
 * The words a widget says itself, switchable while it runs.
 *
 * They used to arrive only through injection, which Angular reads once: a
 * screen with a language switch saw its month names change and its buttons
 * stay put. `locale` was an input and `messages` was not — the one asymmetry
 * in the wrappers.
 */
@Component({
  standalone: true,
  imports: [RangeField],
  template: `<tz-range-field timeZone="Europe/Paris" locale="fr-FR" [messages]="words()" [months]="1" />`,
})
class Switcher {
  readonly words = signal<TzslotMessages>(EN);
}

@Component({
  standalone: true,
  imports: [Calendar],
  providers: [provideTzslotMessages(FR)],
  template: `<tz-calendar timeZone="Europe/Paris" locale="fr-FR" [buttons]="['today', 'clear']" />`,
})
class Provided {}

const label = (root: HTMLElement) =>
  root.ownerDocument.querySelector('.tz-field__panel .tz-dateinput__label')?.textContent ?? '';

describe('messages', () => {
  it('follow the input, while the widget runs', () => {
    const f = TestBed.createComponent(Switcher);
    f.detectChanges();
    f.nativeElement.querySelector('.tz-field__trigger').click();
    f.detectChanges();
    expect(label(f.nativeElement)).toBe('From');

    f.componentInstance.words.set(FR);
    f.detectChanges();
    expect(label(f.nativeElement)).toBe('Du');

    f.componentInstance.words.set(EN);
    f.detectChanges();
    expect(label(f.nativeElement)).toBe('From');
  });

  it('and fall back to what the application provided once', () => {
    const f = TestBed.createComponent(Provided);
    f.detectChanges();
    const words = [...f.nativeElement.querySelectorAll('button')].map((b: HTMLElement) => b.textContent);
    expect(words).toContain("Aujourd'hui");
  });
});
