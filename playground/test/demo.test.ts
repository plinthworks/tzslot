import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
    expect(el().querySelectorAll('tz-datetime-field').length).toBeGreaterThanOrEqual(2); // the two ends
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
    expect(el().querySelector('tz-calendar')!.querySelectorAll('button.tz-cal__day')).toHaveLength(42);
  });

  it('the range refuses to step over a closed weekend', () => {
    const days = Array.from(
      el().querySelectorAll<HTMLButtonElement>('tz-date-range button.tz-range__day'),
    );
    const weekend = days.find((b) => b.disabled && !b.classList.contains('tz-range__day--outside'));
    expect(weekend, 'weekends should be disabled').toBeDefined();
  });
});

describe('the same hours every day', () => {
  it('opens on night shifts across the end of summer time, one of them nine hours', () => {
    expect(el().querySelector('.tz-daily__summary')!.textContent).toBe('4 days · 33h');
    expect(el().querySelector('.tz-daily__day')!.textContent).toContain('9h');
  });

  it('an office week has nothing unusual to say', () => {
    chip('An office week').click();
    fixture.detectChanges();
    expect(el().querySelector('.tz-daily__summary')!.textContent).toBe('5 days · 40h');
    expect(el().querySelector('.tz-daily__unusual')).toBeNull();
  });
});

describe('the date-and-time field', () => {
  it('asks which reading of a repeated hour was meant', () => {
    tab('Dates');
    el().querySelector<HTMLButtonElement>('tz-datetime-field .tz-field__icon-button')!.click();
    fixture.detectChanges();

    const panel = document.querySelector('.tz-field__panel')!;
    // It opens on today; walk forward until the night the clocks go back shows.
    for (let i = 0; i < 24 && !panel.querySelector('[data-date="2026-10-25"]'); i++) {
      panel.querySelectorAll<HTMLButtonElement>('.tz-cal__nav')[1]!.click();
    }
    panel.querySelector<HTMLButtonElement>('[data-date="2026-10-25"]')!.click();
    for (const [part, value] of [['minute', '30'], ['hour', '02']] as const) {
      const box = panel.querySelector<HTMLInputElement>(`[data-part="${part}"]`)!;
      box.focus();
      box.value = value;
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
    fixture.detectChanges();
    expect(
      Array.from(panel.querySelectorAll('.tz-datetime__reading')).map((b) => b.textContent),
    ).toEqual(['UTC+02:00', 'UTC+01:00']);
  });
});

describe('the hours, compact or listed', () => {
  it('starts compact and switches to a list on request', () => {
    expect(el().querySelectorAll('.tz-daily__input')).toHaveLength(2);
    // Two blocks on this tab offer the same choice; this is the daily one.
    const daily = el().querySelector('.block:has(tz-daily-range)')!;
    Array.from(daily.querySelectorAll<HTMLButtonElement>('.chip'))
      .find((b) => b.textContent!.trim() === 'list')!
      .click();
    fixture.detectChanges();
    expect(el().querySelectorAll('.tz-daily__list')).toHaveLength(2);
    expect(el().querySelector('.tz-daily__summary')!.textContent).toBe('4 days · 33h');
  });
});

describe('the theme controls', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-contrast');
    document.documentElement.removeAttribute('style');
  });

  it('an explicit choice goes on the document, and System takes it off', () => {
    chip('Dark').click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    chip('Light').click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    chip('System').click();
    fixture.detectChanges();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('contrast is its own switch', () => {
    chip('More contrast').click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-contrast')).toBe('more');
  });

  it('an accent brings a legible text colour with it', () => {
    const picker = el().querySelector<HTMLInputElement>('input[type="color"]')!;
    picker.value = '#fde047'; // pale yellow: white text would be unreadable
    picker.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--tz-accent')).toBe('#fde047');
    expect(style.getPropertyValue('--tz-accent-fg')).toBe('#000000');
  });
});

describe('the theming tab', () => {
  it('shows a dark card, a branded card and a high-contrast card', () => {
    tab('Theming');
    const cards = Array.from(el().querySelectorAll<HTMLElement>('.card'));
    expect(cards).toHaveLength(3);
    expect(cards[0]!.dataset['theme']).toBe('dark');
    expect(cards[1]!.style.getPropertyValue('--tz-accent')).toBe('#e11d48');
    expect(cards[2]!.dataset['contrast']).toBe('more');
    expect(cards[0]!.querySelectorAll('button.tz-cal__day')).toHaveLength(42);
  });
});
