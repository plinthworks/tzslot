import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Demo } from '../demo.js';

/**
 * The page itself, mounted.
 *
 * This exists because of a failure the component tests could not see: every
 * component worked, every unit test passed, and the page showed nothing — the
 * application never started. Rendering the composition is the only check at
 * that level, and it costs one file.
 */
let fixture: ComponentFixture<Demo>;
const el = () => fixture.nativeElement as HTMLElement;

const tab = (label: string) => {
  const button = Array.from(el().querySelectorAll<HTMLButtonElement>('.tab')).find(
    (b) => b.textContent!.trim() === label,
  )!;
  button.click();
  fixture.detectChanges();
};
const chips = () => Array.from(el().querySelectorAll<HTMLButtonElement>('.chip'));
const chip = (text: string) => chips().find((b) => b.textContent!.includes(text))!;

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Demo] }).compileComponents();
  fixture = TestBed.createComponent(Demo);
  fixture.detectChanges();
});

describe('the page', () => {
  it('opens on the interval, which is the thing to look at first', () => {
    expect(el().querySelector('tz-datetime-range')).not.toBeNull();
    expect(el().querySelector('tz-time-slots')).not.toBeNull(); // inside the legs
    expect(el().querySelector('tz-calendar')).toBeNull(); // another tab
  });

  it('each tab shows its own component and only its own', () => {
    tab('Times');
    expect(el().querySelector('tz-datetime-range')).toBeNull();
    expect(el().querySelector('tz-time-slots')).not.toBeNull();

    tab('Dates');
    expect(el().querySelector('tz-calendar')).not.toBeNull();
    expect(el().querySelectorAll('tz-date-field').length).toBeGreaterThanOrEqual(2);
    expect(el().querySelector('tz-date-range')).not.toBeNull();
    expect(el().querySelector('tz-time-slots')).toBeNull();
  });
});

describe('the interval', () => {
  it('opens on the night that proves the point', () => {
    // 23:00 to 05:00 across the end of summer time: seven hours, not six.
    expect(el().querySelector('.tz-dtr__summary')!.textContent).toContain('7h');
    expect(el().querySelector('.tz-dtr__warning')!.textContent).toContain('lasts 7h');
  });

  it('an ordinary night drops the warning', () => {
    chip('An ordinary night').click();
    fixture.detectChanges();
    expect(el().querySelector('.tz-dtr__summary')!.textContent).toContain('6h');
    expect(el().querySelector('.tz-dtr__warning')).toBeNull();
  });
});

describe('the slot list', () => {
  beforeEach(() => tab('Times'));

  it('offers the days that break other pickers', () => {
    const labels = chips().map((b) => b.textContent!.trim());
    expect(labels).toContain('Paris — hour skipped');
    expect(labels).toContain('Lord Howe — half hour');
  });

  it('a preset changes what is shown', () => {
    chip('Lord Howe').click();
    fixture.detectChanges();
    expect(el().querySelectorAll('.tz-slots__slot--missing').length).toBeGreaterThan(0);
  });

  it('shows a slot that exists but is already taken', () => {
    const taken = Array.from(el().querySelectorAll<HTMLButtonElement>('.tz-slots__slot--unavailable'));
    expect(taken.length).toBeGreaterThan(0);
    expect(taken[0]!.disabled).toBe(true);
  });

  it('shows the three readings once a time is chosen', () => {
    const usable = Array.from(
      el().querySelectorAll<HTMLButtonElement>('button.tz-slots__slot'),
    ).find((b) => !b.disabled)!;

    usable.click();
    fixture.detectChanges();

    const values = Array.from(el().querySelectorAll('dd code')).map((c) => c.textContent!.trim());
    expect(values).toHaveLength(3);
    expect(values[0]).toMatch(/Z$/); // the instant, as stored
    expect(values[2]).toContain('UTC+09:00'); // read back in Tokyo
  });
});

describe('the date pickers', () => {
  beforeEach(() => tab('Dates'));

  it('the calendar renders a full six weeks', () => {
    expect(el().querySelectorAll('tz-calendar button.tz-cal__day')).toHaveLength(42);
  });

  it('the range refuses to step over a closed weekend', () => {
    const days = Array.from(
      el().querySelectorAll<HTMLButtonElement>('tz-date-range button.tz-range__day'),
    );
    const weekend = days.find((b) => b.disabled && !b.classList.contains('tz-range__day--outside'));
    expect(weekend, 'weekends should be disabled').toBeDefined();
  });
});

describe('the theme toggle', () => {
  it('sets an explicit choice on the document, which beats the system preference', () => {
    const toggle = chips().find((b) => /Dark|Light/.test(b.textContent!))!;
    toggle.click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    toggle.click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
