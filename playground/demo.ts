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
import type { Instant, PlainDate } from '../packages/core/src/index.js';

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
      <h1>tzslot</h1>
      <p class="sub">
        Timezone-aware time slots · Temporal is
        <b>{{ usingPolyfill ? 'polyfilled' : 'native' }}</b>
      </p>
    </header>

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

    <section class="block">
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
  `,
  styles: `
    :host {
      --tz-cal-selected-bg: #2563eb;
      --tz-cal-selected-fg: #fff;
      --tz-slot-bg-selected: #2563eb;
      --tz-slot-fg-selected: #fff;
      --tz-slot-columns: 6;
      --tz-dtr-warning-fg: #b45309;
      --tz-dtr-error-fg: #b91c1c;
      --tz-range-error-fg: #b91c1c;
      display: block;
      max-width: 68rem;
      margin: 2rem auto 4rem;
      padding: 0 1rem;
      font: 15px/1.5 system-ui, sans-serif;
      color: #18181b;
    }
    h1 { font-size: 1.5rem; margin: 0; }
    h2 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em;
         opacity: 0.55; margin: 0 0 0.75rem; }
    .sub { margin: 0.25rem 0 2rem; opacity: 0.7; font-size: 0.875rem; }
    .lede { margin: -0.5rem 0 0.75rem; font-size: 0.9rem; opacity: 0.8; }
    .block { border: 1px solid #e4e4e7; border-radius: 0.5rem; padding: 1.25rem;
             margin-bottom: 1.5rem; }
    .block--feature { border-color: #2563eb; border-width: 2px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
            gap: 1.5rem; }
    .grid .block { margin: 0; }
    .row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;
           margin-bottom: 1rem; }
    .chip { border: 1px solid #d4d4d8; background: #fff; border-radius: 999px;
            padding: 0.3rem 0.75rem; font: inherit; font-size: 0.8125rem; cursor: pointer; }
    .chip.on { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
    label { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8125rem; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 0.3rem 1rem;
         margin: 1rem 0 0; font-size: 0.8125rem; }
    dt { opacity: 0.55; }
    code { background: #f4f4f5; padding: 0.1rem 0.35rem; border-radius: 0.25rem; }
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
  protected readonly lunchIsTaken = (slot: { time: Temporal.PlainTime }) => slot.time.hour === 13;

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
