import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TimeSlotPicker } from '../src/index.js';
import { Temporal, type Instant } from '@tzslot/core';

/**
 * These render the real template.
 *
 * A component whose template fails to bind still compiles, and its class tests
 * still pass — which is exactly how a button reaches the screen with no click
 * handler behind it. Clicking a real DOM node is the only check that catches
 * that, so every test here goes through one.
 */
@Component({
  standalone: true,
  imports: [TimeSlotPicker],
  template: `
    <tz-time-slots
      [date]="date()"
      [timeZone]="zone()"
      [stepMinutes]="step()"
      [(value)]="chosen"
    />
  `,
})
class Host {
  readonly date = signal('2026-06-15');
  readonly zone = signal('Europe/Paris');
  readonly step = signal(60);
  readonly chosen = signal<Instant | null>(null);
}

let fixture: ComponentFixture<Host>;
let host: Host;

const render = () => {
  fixture.detectChanges();
  return Array.from(
    fixture.nativeElement.querySelectorAll('button.tz-slots__slot'),
  ) as HTMLButtonElement[];
};
const labelOf = (b: HTMLButtonElement) =>
  b.querySelector('.tz-slots__time')?.textContent?.trim() ?? '';

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  fixture = TestBed.createComponent(Host);
  host = fixture.componentInstance;
});

describe('an ordinary day', () => {
  it('renders one button per hour', () => {
    const buttons = render();
    expect(buttons).toHaveLength(24);
    expect(labelOf(buttons[0]!)).toBe('00:00');
    expect(labelOf(buttons[23]!)).toBe('23:00');
  });

  it('clicking selects the instant behind that time', () => {
    const buttons = render();
    buttons[9]!.click();
    fixture.detectChanges();

    const chosen = host.chosen();
    expect(chosen).not.toBeNull();
    // 09:00 in Paris in June is 07:00 UTC.
    expect(chosen!.toZonedDateTimeISO('UTC').toPlainTime().toString()).toBe('07:00:00');
    expect(chosen!.toZonedDateTimeISO('Europe/Paris').toPlainTime().toString()).toBe('09:00:00');
  });

  it('marks the chosen button as selected', () => {
    const buttons = render();
    buttons[9]!.click();
    fixture.detectChanges();

    const again = render();
    expect(again[9]!.classList.contains('tz-slots__slot--selected')).toBe(true);
    expect(again[9]!.getAttribute('aria-selected')).toBe('true');
    expect(again[8]!.classList.contains('tz-slots__slot--selected')).toBe(false);
  });
});

describe('the morning an hour goes missing', () => {
  beforeEach(() => {
    host.date.set('2026-03-29');
    host.step.set(60);
  });

  it('shows the skipped hour disabled rather than hiding it', () => {
    const buttons = render();
    const two = buttons.find((b) => labelOf(b) === '02:00')!;

    expect(two).toBeDefined();
    expect(two.disabled).toBe(true);
    expect(two.classList.contains('tz-slots__slot--missing')).toBe(true);
    expect(two.title).toContain('does not exist');
  });

  it('refuses to select it', () => {
    const buttons = render();
    buttons.find((b) => labelOf(b) === '02:00')!.click();
    fixture.detectChanges();

    expect(host.chosen()).toBeNull();
  });
});

describe('the morning an hour happens twice', () => {
  beforeEach(() => {
    host.date.set('2026-10-25');
    host.step.set(60);
  });

  it('offers both readings, told apart by their offset', () => {
    const buttons = render();
    const twos = buttons.filter((b) => labelOf(b) === '02:00');

    // This is the whole reason the library exists: one clock face, two moments,
    // and the user gets to say which.
    expect(twos).toHaveLength(2);
    expect(twos.map((b) => b.querySelector('.tz-slots__offset')?.textContent?.trim())).toEqual([
      '+02:00',
      '+01:00',
    ]);
    expect(twos[0]!.title).toContain('happens twice');
  });

  it('selects the one that was clicked, not the first', () => {
    const buttons = render();
    const twos = buttons.filter((b) => labelOf(b) === '02:00');

    twos[1]!.click();
    fixture.detectChanges();
    const second = host.chosen()!;

    twos[0]!.click();
    fixture.detectChanges();
    const first = host.chosen()!;

    expect(second.epochMilliseconds - first.epochMilliseconds).toBe(3_600_000);
    expect(first.toZonedDateTimeISO('UTC').toPlainTime().toString()).toBe('00:00:00');
    expect(second.toZonedDateTimeISO('UTC').toPlainTime().toString()).toBe('01:00:00');
  });

  it('a 25-hour day has 25 buttons', () => {
    expect(render()).toHaveLength(25);
  });
});

describe('reacting to its inputs', () => {
  it('re-lists when the zone changes', () => {
    host.date.set('2026-10-25');
    expect(render()).toHaveLength(25); // Paris: the extra hour

    host.zone.set('Asia/Tokyo');
    expect(render()).toHaveLength(24); // Tokyo has no daylight saving
  });

  it('honours the step', () => {
    host.step.set(15);
    expect(render()).toHaveLength(96);
  });
});

describe('what it stores', () => {
  it('round-trips through a string without losing the reading', () => {
    host.date.set('2026-10-25');
    const buttons = render();
    buttons.filter((b) => labelOf(b) === '02:00')[1]!.click();
    fixture.detectChanges();

    const stored = host.chosen()!.toString();
    const back = Temporal.Instant.from(stored);

    expect(back.equals(host.chosen()!)).toBe(true);
    expect(back.toZonedDateTimeISO('Europe/Paris').toPlainTime().toString()).toBe('02:00:00');
    expect(back.toZonedDateTimeISO('Europe/Paris').offset).toBe('+01:00');
  });
});
