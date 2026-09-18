import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Demo } from '../demo.js';

/**
 * The page itself, mounted.
 *
 * This exists because of a failure the component tests could not see: both
 * components worked, every unit test passed, and the page showed nothing —
 * the application never started. Rendering the composition is the only check
 * at that level, and it costs one file.
 */
let fixture: ComponentFixture<Demo>;
const el = () => fixture.nativeElement as HTMLElement;

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [Demo] }).compileComponents();
  fixture = TestBed.createComponent(Demo);
  fixture.detectChanges();
});

describe('the playground page', () => {
  it('mounts both components', () => {
    expect(el().querySelector('ngx-calendar')).not.toBeNull();
    expect(el().querySelector('ngx-time-slot-picker')).not.toBeNull();
  });

  it('renders a full calendar and a day of slots', () => {
    expect(el().querySelectorAll('button.ngx-cal__day')).toHaveLength(42);
    // Opens on 25 October 2026 in Paris: a 25-hour day, at half-hour steps,
    // so 50 rows — one of which is doubled by the repeated hour.
    expect(el().querySelectorAll('button.ngx-tsp__slot').length).toBeGreaterThan(48);
  });

  it('offers the preset days that break other pickers', () => {
    const labels = Array.from(el().querySelectorAll('.presets button')).map((b) =>
      b.textContent!.trim(),
    );
    expect(labels).toContain('Paris — hour skipped');
    expect(labels).toContain('Lord Howe — half hour');
  });

  it('a preset changes what the pickers show', () => {
    const lordHowe = Array.from(el().querySelectorAll('.presets button')).find((b) =>
      b.textContent!.includes('Lord Howe'),
    ) as HTMLButtonElement;

    lordHowe.click();
    fixture.detectChanges();

    const struck = el().querySelectorAll('button.ngx-tsp__slot--missing');
    expect(struck.length).toBeGreaterThan(0);
  });

  it('shows the three readings once a time is chosen', () => {
    const usable = Array.from(
      el().querySelectorAll<HTMLButtonElement>('button.ngx-tsp__slot'),
    ).find((b) => !b.disabled)!;

    usable.click();
    fixture.detectChanges();

    const values = Array.from(el().querySelectorAll('dd code')).map((c) => c.textContent!.trim());
    expect(values).toHaveLength(3);
    expect(values[0]).toMatch(/^2026-.*Z$/); // the instant, as stored
    expect(values[1]).toContain('UTC+'); // read back in Paris
    expect(values[2]).toContain('UTC+09:00'); // read back in Tokyo
  });
});
