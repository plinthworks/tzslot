import { describe, it, expect, afterEach } from 'vitest';
import { Component, CSP_NONCE } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Calendar, provideTzslot } from '../src/index.js';
import { setStyleNonce, styleNonce } from '@tzslot/dom';

/**
 * Angular's nonce, reaching the sheets the dom package injects.
 *
 * An application under a Content-Security-Policy that forbids inline styles
 * already provides `CSP_NONCE`, because Angular needs it for its own. So
 * `provideTzslot` reads it and there is nothing for the application to write —
 * the alternative, reported by a consumer, was injecting all eleven exported
 * sheets by hand to get one attribute onto them.
 */
@Component({ standalone: true, imports: [Calendar], template: `<tz-calendar />` })
class Host {}

afterEach(() => {
  setStyleNonce(null);
  document.head.querySelectorAll('style[data-tzslot]').forEach((sheet) => sheet.remove());
});

describe('provideTzslot and CSP_NONCE', () => {
  it('hands Angular’s nonce to the dom package', () => {
    TestBed.configureTestingModule({
      providers: [provideTzslot({ timeZone: 'Europe/Paris' }), { provide: CSP_NONCE, useValue: 'ng-abc' }],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(styleNonce()).toBe('ng-abc');
    const sheets = [...document.head.querySelectorAll<HTMLStyleElement>('style[data-tzslot]')];
    expect(sheets.length).toBeGreaterThan(0);
    for (const sheet of sheets) expect(sheet.getAttribute('nonce')).toBe('ng-abc');
  });

  it('and leaves a hand-set one alone when Angular has none', () => {
    // Clearing it would undo a `setStyleNonce` made before bootstrapping,
    // which is how an application without Angular's token would do it.
    setStyleNonce('by-hand');
    TestBed.configureTestingModule({ providers: [provideTzslot({ timeZone: 'Europe/Paris' })] });
    TestBed.createComponent(Host).detectChanges();
    expect(styleNonce()).toBe('by-hand');
  });
});
