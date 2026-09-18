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
const chips = () => Array.from(el().querySelectorAll<HTMLButtonElement>('.chip'));
const chip = (text: string) => chips().find((b) => b.textContent!.includes(text))!;

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Demo] }).compileComponents();
  fixture = TestBed.createComponent(Demo);
  fixture.detectChanges();
});

describe('the playground page', () => {
  it('mounts every component', () => {
    for (const tag of [
      'tz-datetime-range',
      'tz-time-slots',
      'tz-calendar',
      'tz-date-field',
      'tz-date-range',
    ]) {
      expect(el().querySelector(tag), tag).not.toBeNull();
    }
    // Two fields, to show both presentation modes.
    expect(el().querySelectorAll('tz-date-field').length).toBeGreaterThanOrEqual(2);
  });

  it('opens on the night that proves the point', () => {
    // 23:00 to 05:00 across the end of summer time: seven hours, not six.
    expect(el().querySelector('.tz-dtr__summary')!.textContent).toContain('7h');
    expect(el().querySelector('.tz-dtr__warning')!.textContent).toContain('lasts 7h');
  });

  it('switching to an ordinary night drops the warning', () => {
    chip('An ordinary night').click();
    fixture.detectChanges();

    expect(el().querySelector('.tz-dtr__summary')!.textContent).toContain('6h');
    expect(el().querySelector('.tz-dtr__warning')).toBeNull();
  });

  it('offers the days that break other pickers', () => {
    const labels = chips().map((b) => b.textContent!.trim());
    expect(labels).toContain('Paris — hour skipped');
    expect(labels).toContain('Lord Howe — half hour');
  });

  it('a preset changes what the slot list shows', () => {
    chip('Lord Howe').click();
    fixture.detectChanges();
    expect(
      el().querySelectorAll('.block:not(.block--feature) .tz-slots__slot--missing').length,
    ).toBeGreaterThan(0);
  });

  it('the calendar renders a full six weeks', () => {
    expect(el().querySelectorAll('tz-calendar button.tz-cal__day')).toHaveLength(42);
  });

  it('shows the three readings once a time is chosen', () => {
    // Scoped past the feature block: the interval picker contains slot lists of
    // its own, and clicking one of those sets a range rather than this value.
    const usable = Array.from(
      el().querySelectorAll<HTMLButtonElement>(
        '.block:not(.block--feature) tz-time-slots button.tz-slots__slot',
      ),
    ).find((b) => !b.disabled)!;

    usable.click();
    fixture.detectChanges();

    const values = Array.from(el().querySelectorAll('dd code')).map((c) => c.textContent!.trim());
    expect(values).toHaveLength(3);
    expect(values[0]).toMatch(/Z$/); // the instant, as stored
    expect(values[1]).toContain('UTC+'); // read back in Paris
    expect(values[2]).toContain('UTC+09:00'); // read back in Tokyo
  });

  it('shows a slot that exists but is already taken', () => {
    const lunch = Array.from(
      el().querySelectorAll<HTMLButtonElement>('.tz-slots__slot--unavailable'),
    );
    expect(lunch.length).toBeGreaterThan(0);
    expect(lunch[0]!.disabled).toBe(true);
  });
});
