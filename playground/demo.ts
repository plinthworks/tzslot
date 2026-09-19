import { Component, signal } from '@angular/core';
import {
  Calendar,
  DateField,
  DateRange,
  DateTimeRange,
  TimeSlotPicker,
  type DateRangeValue,
  type DateTimeRangeValue,
} from '../packages/angular/src/index.js';
import { Temporal, usingPolyfill } from '../packages/core/src/index.js';
import type { Instant, PlainDate, PlainTime } from '../packages/core/src/index.js';

/** Black or white, whichever reads better on a #rrggbb colour (WCAG luminance). */
function readableOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return luminance > 0.179 ? '#000000' : '#ffffff';
}

/** The earlier reading of a wall time in Paris — enough for a demonstration. */
function parisAt(iso: string): Instant {
  return Temporal.PlainDateTime.from(iso)
    .toZonedDateTime('Europe/Paris', { disambiguation: 'earlier' })
    .toInstant();
}

/**
 * Somewhere to look at all of it, with the days that break other pickers one
 * click away.
 *
 * The presets are not decoration: they are the spring gap, the autumn
 * repetition, and Lord Howe's half-hour shift. Anyone evaluating this wants
 * those three, and nowhere else makes them reachable without arithmetic.
 */
@Component({
  selector: 'demo-root',
  standalone: true,
  imports: [Calendar, TimeSlotPicker, DateField, DateRange, DateTimeRange],
  template: `
    <header>
      <div class="titlebar">
        <h1>tzslot</h1>
        <a class="chip" href="/playground/vanilla.html">Without Angular →</a>
      </div>
      <div class="row controls">
        <div class="seg" role="group" aria-label="Theme">
          @for (t of themes; track t.id) {
            <button type="button" class="chip" [class.on]="theme() === t.id"
                    [attr.aria-pressed]="theme() === t.id" (click)="setTheme(t.id)">
              {{ t.label }}
            </button>
          }
        </div>
        <button type="button" class="chip" [class.on]="contrast()"
                [attr.aria-pressed]="contrast()" (click)="toggleContrast()">
          More contrast
        </button>
        <label class="chip">
          Accent
          <input type="color" [value]="accent() ?? '#2563eb'"
                 (input)="setAccent($any($event.target).value)" />
        </label>
        @if (accent()) {
          <button type="button" class="chip" (click)="setAccent(null)">Reset accent</button>
        }
      </div>
      <p class="sub">
        Timezone-aware time slots · Temporal is
        <b>{{ usingPolyfill ? 'polyfilled' : 'native' }}</b>
      </p>

      <nav class="tabs">
        @for (t of tabs; track t.id) {
          <button
            type="button"
            class="tab"
            [class.tab--on]="tab() === t.id"
            [attr.aria-current]="tab() === t.id"
            (click)="tab.set(t.id)"
          >
            {{ t.label }}
          </button>
        }
      </nav>
    </header>

    @if (tab() === 'interval') {
    <section class="block block--feature">
      <h2>An interval with a time at both ends</h2>
      <p class="lede">
        A night shift across the end of summer time. Every other picker calls this six hours.
      </p>

      <div class="row">
        @for (p of shiftPresets; track p.label) {
          <button type="button" class="chip"
                  [class.on]="shiftLabel() === p.label" (click)="useShift(p)">
            {{ p.label }}
          </button>
        }
      </div>

      <tz-datetime-range [(value)]="shift" [timeZone]="'Europe/Paris'"
                         [stepMinutes]="60" [locale]="'en-GB'" />
    </section>
    }

    @if (tab() === 'times') {
    <section class="block times">
      <h2>Times on one day</h2>
      <div class="row">
        @for (p of dayPresets; track p.label) {
          <button type="button" class="chip"
                  [class.on]="day().toString() === p.date && zone() === p.zone"
                  (click)="useDay(p)">
            {{ p.label }}
          </button>
        }
      </div>
      <div class="row">
        <label>Zone
          <select [value]="zone()" (change)="zone.set($any($event.target).value)">
            @for (z of zones; track z) { <option [value]="z">{{ z }}</option> }
          </select>
        </label>
        <label>Step
          <select [value]="step()" (change)="step.set(+$any($event.target).value)">
            @for (s of [15, 30, 60]; track s) { <option [value]="s">{{ s }} min</option> }
          </select>
        </label>
        <label>Hours
          <select [value]="hours()" (change)="hours.set($any($event.target).value)">
            <option value="all">all day</option>
            <option value="office">09:00 – 17:00</option>
          </select>
        </label>
      </div>

      <tz-time-slots [date]="day()" [timeZone]="zone()" [stepMinutes]="step()"
                     [minTime]="hours() === 'office' ? '09:00' : undefined"
                     [maxTime]="hours() === 'office' ? '17:00' : undefined"
                     [isDisabled]="lunchIsTaken" [(value)]="instant" />

      @if (instant(); as chosen) {
        <dl>
          <dt>Stored</dt><dd><code>{{ chosen.toString() }}</code></dd>
          <dt>In {{ zone() }}</dt><dd><code>{{ read(chosen, zone()) }}</code></dd>
          <dt>In Asia/Tokyo</dt><dd><code>{{ read(chosen, 'Asia/Tokyo') }}</code></dd>
        </dl>
      } @else {
        <p class="note">
          Struck through = cannot happen. Dashed = happens twice. Faded = already taken.
        </p>
      }
    </section>
    }

    @if (tab() === 'theming') {
    <p class="lede">
      Each card sets one attribute or one variable, nothing else. Open the fields: the panel
      is drawn on the body, outside the card, and still looks like it belongs to it.
    </p>
    <div class="grid">
      <section class="block card" data-theme="dark">
        <h2>data-theme="dark"</h2>
        <p class="note">A dark card on whatever the page is.</p>
        <tz-calendar [(value)]="date" [locale]="'en-GB'" />
        <div class="gap"><tz-date-field [(value)]="popupDate" [locale]="'en-GB'" /></div>
      </section>

      <section class="block card" style="--tz-accent: #e11d48; --tz-accent-fg: #ffffff">
        <h2>--tz-accent: #e11d48</h2>
        <p class="note">One brand colour; the range tint is derived from it.</p>
        <tz-date-range [(value)]="stay" [locale]="'en-GB'" />
        <div class="gap"><tz-date-field [(value)]="dialogDate" [locale]="'en-GB'" mode="dialog" /></div>
      </section>

      <section class="block card" data-contrast="more">
        <h2>data-contrast="more"</h2>
        <p class="note">Also applies by itself when the system asks for more contrast.</p>
        <tz-calendar [(value)]="date" [locale]="'en-GB'" />
        <div class="gap">
          <tz-time-slots [date]="'2026-10-25'" [timeZone]="'Europe/Paris'" [stepMinutes]="60"
                         [minTime]="'01:00'" [maxTime]="'04:00'" [(value)]="instant" />
        </div>
      </section>
    </div>
    }

    @if (tab() === 'dates') {
    <div class="grid">
      <section class="block">
        <h2>Calendar</h2>
        <tz-calendar [(value)]="date" [locale]="'en-GB'" />
        <p class="note">{{ date()?.toString() ?? 'nothing chosen' }}</p>
      </section>

      <section class="block">
        <h2>Field</h2>
        <p class="note">Anchored to the field:</p>
        <tz-date-field [(value)]="popupDate" [locale]="'en-GB'" mode="popup" />
        <p class="note">Centred over the page:</p>
        <tz-date-field [(value)]="dialogDate" [locale]="'en-GB'" mode="dialog" />
      </section>

      <section class="block">
        <h2>Range</h2>
        <p class="note">Weekends are closed — a range may not step over one.</p>
        <tz-date-range [(value)]="stay" [locale]="'en-GB'" [isDateDisabled]="noWeekends" />
        <p class="note">{{ stayText() }}</p>
      </section>
    </div>
    }
  `,
  styles: `
    :host {
      /* Only what this page overrides; every colour comes from @tzslot/theme. */
      display: block;
      max-width: 68rem;
      margin: 2rem auto 4rem;
      padding: 0 1rem;
      font: 15px/1.5 system-ui, sans-serif;
      color: var(--tz-fg);
    }
    h1 { font-size: 1.5rem; margin: 0; }
    a.chip { text-decoration: none; }
    .controls { margin: 0.75rem 0 0; }
    .seg { display: inline-flex; gap: 0.25rem; }
    input[type='color'] { width: 1.5rem; height: 1.1rem; padding: 0; border: 0; background: none; }
    /* A card resolves the palette itself, so its own data-theme decides it. */
    .card { color-scheme: var(--tz-color-scheme, light dark); background: var(--tz-bg);
            color: var(--tz-fg); }
    .gap { margin-top: 1rem; }
    /* A full-width day reads better as tidy rows of six than as one long run. */
    .times tz-time-slots { --tz-slot-columns: 6; }
    .titlebar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .tabs { display: flex; gap: 0.25rem; border-bottom: 1px solid var(--tz-border);
            margin-bottom: 1.5rem; }
    .tab { border: 0; background: none; font: inherit; font-size: 0.875rem;
           padding: 0.5rem 0.9rem; cursor: pointer; color: var(--tz-fg-muted);
           border-bottom: 2px solid transparent; margin-bottom: -1px; }
    /* Marked by the accent's line, written in the text colour: an accent pale
       enough to pick is often too pale to read. */
    .tab--on { color: var(--tz-fg); font-weight: 600; border-bottom-color: var(--tz-accent); }
    h2 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em;
         opacity: 0.55; margin: 0 0 0.75rem; }
    .sub { margin: 0.25rem 0 2rem; opacity: 0.7; font-size: 0.875rem; }
    .lede { margin: -0.5rem 0 0.75rem; font-size: 0.9rem; opacity: 0.8; }
    .block { border: 1px solid var(--tz-border); border-radius: 0.5rem; padding: 1.25rem;
             margin-bottom: 1.5rem; }
    .block--feature { border-color: var(--tz-accent); border-width: 2px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
            gap: 1.5rem; }
    .grid .block { margin: 0; }
    .row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;
           margin-bottom: 1rem; }
    .chip { border: 1px solid var(--tz-border); background: var(--tz-bg); border-radius: 999px;
            color: inherit;
            padding: 0.3rem 0.75rem; font: inherit; font-size: 0.8125rem; cursor: pointer; }
    .chip.on { border-color: var(--tz-accent); color: var(--tz-fg);
               background: color-mix(in srgb, var(--tz-accent) 18%, var(--tz-bg)); }
    label { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8125rem; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 0.3rem 1rem;
         margin: 1rem 0 0; font-size: 0.8125rem; }
    dt { opacity: 0.55; }
    code { background: var(--tz-bg-raised); padding: 0.1rem 0.35rem; border-radius: 0.25rem; }
    .note { font-size: 0.8125rem; opacity: 0.7; margin: 0.75rem 0 0; }
  `,
})
export class Demo {
  protected readonly usingPolyfill = usingPolyfill;

  protected readonly zones = [
    'Europe/Paris', 'America/Chicago', 'Australia/Lord_Howe', 'Asia/Tokyo', 'UTC',
  ];

  protected readonly dayPresets = [
    { label: 'Paris — hour skipped', date: '2026-03-29', zone: 'Europe/Paris' },
    { label: 'Paris — hour repeated', date: '2026-10-25', zone: 'Europe/Paris' },
    { label: 'Chicago — hour skipped', date: '2026-03-08', zone: 'America/Chicago' },
    { label: 'Lord Howe — half hour', date: '2026-10-04', zone: 'Australia/Lord_Howe' },
    { label: 'Ordinary day', date: '2026-06-15', zone: 'Europe/Paris' },
  ];

  protected readonly shiftPresets = [
    { label: 'Clocks going back', from: '2026-10-24T23:00', to: '2026-10-25T05:00' },
    { label: 'Clocks going forward', from: '2026-03-29T01:00', to: '2026-03-29T07:00' },
    { label: 'An ordinary night', from: '2026-06-14T23:00', to: '2026-06-15T05:00' },
  ];

  protected readonly tabs = [
    { id: 'interval' as const, label: 'Interval' },
    { id: 'times' as const, label: 'Times' },
    { id: 'dates' as const, label: 'Dates' },
    { id: 'theming' as const, label: 'Theming' },
  ];
  protected readonly tab = signal<'interval' | 'times' | 'dates' | 'theming'>('interval');

  protected readonly themes = [
    { id: 'system' as const, label: 'System' },
    { id: 'light' as const, label: 'Light' },
    { id: 'dark' as const, label: 'Dark' },
  ];
  /** System by default; an explicit choice is an attribute on the document. */
  protected readonly theme = signal<'system' | 'light' | 'dark'>('system');
  protected readonly contrast = signal(false);
  protected readonly accent = signal<string | null>(null);

  protected setTheme(theme: 'system' | 'light' | 'dark'): void {
    this.theme.set(theme);
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }

  protected toggleContrast(): void {
    this.contrast.update((on) => !on);
    const root = document.documentElement;
    if (this.contrast()) root.setAttribute('data-contrast', 'more');
    else root.removeAttribute('data-contrast');
  }

  /**
   * One colour for both schemes. The text on it is picked for legibility here,
   * because CSS cannot yet choose a contrasting colour everywhere by itself.
   */
  protected setAccent(color: string | null): void {
    this.accent.set(color);
    const style = document.documentElement.style;
    if (!color) {
      style.removeProperty('--tz-accent');
      style.removeProperty('--tz-accent-fg');
      return;
    }
    style.setProperty('--tz-accent', color);
    style.setProperty('--tz-accent-fg', readableOn(color));
  }

  protected readonly zone = signal('Europe/Paris');
  protected readonly step = signal(60);
  protected readonly hours = signal<'all' | 'office'>('all');
  protected readonly day = signal<PlainDate>(Temporal.PlainDate.from('2026-10-25'));
  protected readonly instant = signal<Instant | null>(null);

  protected readonly date = signal<PlainDate | null>(null);
  protected readonly popupDate = signal<PlainDate | null>(null);
  protected readonly dialogDate = signal<PlainDate | null>(null);
  protected readonly stay = signal<DateRangeValue>({ start: null, end: null });

  protected readonly shift = signal<DateTimeRangeValue>({
    start: parisAt('2026-10-24T23:00'),
    end: parisAt('2026-10-25T05:00'),
  });
  protected readonly shiftLabel = signal('Clocks going back');

  /** Lunch is booked every day: a slot that exists but is unavailable. */
  protected readonly lunchIsTaken = (slot: { time: PlainTime }) => slot.time.hour === 13;

  protected readonly noWeekends = (date: PlainDate) => date.dayOfWeek > 5;

  protected stayText(): string {
    const { start, end } = this.stay();
    if (!start) return 'nothing chosen';
    return `${start.toString()} → ${end?.toString() ?? '…'}`;
  }

  protected read(instant: Instant, zone: string): string {
    const z = instant.toZonedDateTimeISO(zone);
    return `${z.toPlainDate().toString()} ${z.toPlainTime().toString({ smallestUnit: 'minute' })} (UTC${z.offset})`;
  }

  protected useDay(preset: { date: string; zone: string }): void {
    this.day.set(Temporal.PlainDate.from(preset.date));
    this.zone.set(preset.zone);
    this.instant.set(null);
  }

  protected useShift(preset: { label: string; from: string; to: string }): void {
    this.shift.set({ start: parisAt(preset.from), end: parisAt(preset.to) });
    this.shiftLabel.set(preset.label);
  }
}
