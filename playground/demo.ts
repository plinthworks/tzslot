import { Component, computed, signal } from '@angular/core';
import { Calendar, TimeSlotPicker } from '../packages/ui/src/index.js';
import { Temporal, usingPolyfill } from '../packages/core/src/index.js';
import type { Instant, PlainDate } from '../packages/core/src/index.js';

/**
 * A page to look at the components on, and to prod at the days that break
 * every other picker.
 *
 * The three preset dates are not decoration: they are the spring gap, the
 * autumn repetition, and Lord Howe's half-hour shift. Anyone evaluating this
 * library wants to see those three, and nowhere else makes them one click away.
 */
@Component({
  selector: 'demo-root',
  standalone: true,
  imports: [Calendar, TimeSlotPicker],
  template: `
    <header>
      <h1>ngx-zoneddatepicker</h1>
      <p class="sub">
        Temporal: <b>{{ usingPolyfill ? 'polyfilled' : 'native' }}</b>
      </p>
    </header>

    <section class="presets">
      <p>Days that break other pickers:</p>
      @for (preset of presets; track preset.date) {
        <button
          type="button"
          [class.on]="date().toString() === preset.date && zone() === preset.zone"
          (click)="usePreset(preset)"
        >
          {{ preset.label }}
        </button>
      }
    </section>

    <section class="controls">
      <label>
        Time zone
        <select [value]="zone()" (change)="zone.set($any($event.target).value)">
          @for (z of zones; track z) {
            <option [value]="z">{{ z }}</option>
          }
        </select>
      </label>
      <label>
        Step
        <select [value]="step()" (change)="step.set(+$any($event.target).value)">
          @for (s of [15, 30, 60]; track s) {
            <option [value]="s">{{ s }} min</option>
          }
        </select>
      </label>
      <label class="check">
        <input type="checkbox" [checked]="skip()" (change)="skip.set($any($event.target).checked)" />
        hide impossible times
      </label>
    </section>

    <div class="panes">
      <div class="pane">
        <h2>Calendar</h2>
        <ngx-calendar [value]="date()" (valueChange)="onDate($event)" [today]="today" />
      </div>

      <div class="pane">
        <h2>Times on {{ date().toString() }}</h2>
        <ngx-time-slot-picker
          [date]="date()"
          [timeZone]="zone()"
          [stepMinutes]="step()"
          [skipNonExistent]="skip()"
          [(value)]="instant"
        />
      </div>
    </div>

    <section class="result">
      <h2>What would be stored</h2>
      @if (instant()) {
        <dl>
          <dt>Instant (UTC)</dt>
          <dd><code>{{ instant()!.toString() }}</code></dd>
          <dt>Read back in {{ zone() }}</dt>
          <dd><code>{{ inZone() }}</code></dd>
          <dt>Read back in Asia/Tokyo</dt>
          <dd><code>{{ inTokyo() }}</code></dd>
        </dl>
        <p class="note">
          One instant, three readings. That is what makes it safe to store — a wall
          time would need the zone and the offset beside it to mean anything.
        </p>
      } @else {
        <p class="note">Pick a time. Struck-through ones cannot happen; dashed ones happen twice.</p>
      }
    </section>
  `,
  styles: `
    :host {
      --dp-cal-selected-bg: #2563eb;
      --dp-cal-selected-fg: #fff;
      --dp-slot-bg-selected: #2563eb;
      --dp-slot-fg-selected: #fff;
      --dp-slot-columns: 6;
      display: block;
      max-width: 62rem;
      margin: 2rem auto;
      padding: 0 1rem;
      font: 15px/1.5 system-ui, sans-serif;
      color: #18181b;
    }
    h1 { font-size: 1.4rem; margin: 0; }
    h2 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
    .sub { margin: 0.25rem 0 1.5rem; opacity: 0.7; font-size: 0.875rem; }
    .presets, .controls { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 1rem; }
    .presets p { margin: 0 0.25rem 0 0; opacity: 0.7; font-size: 0.875rem; }
    .presets button {
      border: 1px solid #d4d4d8; background: #fff; border-radius: 0.375rem;
      padding: 0.35rem 0.7rem; font: inherit; font-size: 0.875rem; cursor: pointer;
    }
    .presets button.on { border-color: #2563eb; color: #2563eb; }
    label { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; }
    .panes { display: grid; grid-template-columns: auto 1fr; gap: 2rem; align-items: start; }
    .pane { min-width: 0; }
    .result { margin-top: 2rem; border-top: 1px solid #e4e4e7; padding-top: 1rem; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 0.35rem 1rem; margin: 0.5rem 0; font-size: 0.875rem; }
    dt { opacity: 0.6; }
    code { background: #f4f4f5; padding: 0.1rem 0.35rem; border-radius: 0.25rem; }
    .note { font-size: 0.85rem; opacity: 0.7; max-width: 44rem; }
    @media (max-width: 800px) { .panes { grid-template-columns: 1fr; } }
  `,
})
export class Demo {
  protected readonly usingPolyfill = usingPolyfill;
  protected readonly today = Temporal.Now.plainDateISO();

  protected readonly zones = [
    'Europe/Paris',
    'America/Chicago',
    'Australia/Lord_Howe',
    'Asia/Tokyo',
    'America/New_York',
    'UTC',
  ];

  protected readonly presets = [
    { label: 'Paris — hour skipped', date: '2026-03-29', zone: 'Europe/Paris' },
    { label: 'Paris — hour repeated', date: '2026-10-25', zone: 'Europe/Paris' },
    { label: 'Chicago — hour skipped', date: '2026-03-08', zone: 'America/Chicago' },
    { label: 'Lord Howe — half hour', date: '2026-10-04', zone: 'Australia/Lord_Howe' },
    { label: 'An ordinary day', date: '2026-06-15', zone: 'Europe/Paris' },
  ];

  protected readonly date = signal<PlainDate>(Temporal.PlainDate.from('2026-10-25'));
  protected readonly zone = signal('Europe/Paris');
  protected readonly step = signal(30);
  protected readonly skip = signal(false);
  protected readonly instant = signal<Instant | null>(null);

  protected readonly inZone = computed(() => this.read(this.zone()));
  protected readonly inTokyo = computed(() => this.read('Asia/Tokyo'));

  private read(zone: string): string {
    const i = this.instant();
    if (!i) return '';
    const z = i.toZonedDateTimeISO(zone);
    return `${z.toPlainDate().toString()} ${z.toPlainTime().toString({ smallestUnit: 'minute' })} (UTC${z.offset})`;
  }

  protected onDate(next: PlainDate | null): void {
    if (!next) return;
    this.date.set(next);
    this.instant.set(null); // a time on another day is not the time you picked
  }

  protected usePreset(preset: { date: string; zone: string }): void {
    this.date.set(Temporal.PlainDate.from(preset.date));
    this.zone.set(preset.zone);
    this.instant.set(null);
  }
}
