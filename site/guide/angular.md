# Angular

Standalone components over `@tzslot/dom`, for Angular 18 to 21. Signals,
forms, zoneless or not, no design system and no CDK.

## Setting up

```jsonc
// angular.json → architect.build.options
"styles": ["@tzslot/theme/tzslot.css", "src/styles.css"]
```

Angular wants a path that ends in `.css`, so `"@tzslot/theme"` on its own is
refused.

```ts
import { Component, signal } from '@angular/core';
import { Calendar, TimeSlotPicker } from '@tzslot/angular';
import type { Instant, PlainDate } from '@tzslot/core';

@Component({
  selector: 'app-booking',
  imports: [Calendar, TimeSlotPicker],
  template: `
    <tz-calendar [(value)]="day" [buttons]="['today', 'clear']" />
    @if (day(); as chosen) {
      <tz-time-slots [date]="chosen" timeZone="Europe/Paris" [(value)]="moment" />
    }
  `,
})
export class Booking {
  readonly day = signal<PlainDate | null>(null);
  readonly moment = signal<Instant | null>(null);
}
```

With NgModules, put the same components in the module's `imports`: they are
standalone.

## The components

| | Chooses |
|---|---|
| `<tz-calendar>` | a day |
| `<tz-multi-date>` | several days, not necessarily adjacent |
| `<tz-date-field>` | a day, from a field that opens a panel |
| `<tz-datetime-field>` | a moment: a calendar and a time in one panel |
| `<tz-date-range>` | two days |
| `<tz-time-slots>` | a moment among the day's bookable times |
| `<tz-datetime-range>` | an interval: two date-and-time fields |
| `<tz-daily-range>` | a range of days with the same hours on each |
| `<tz-range-field>` | a period — presets, two months, whole days or times, in one field |

## Starting from a value

A screen that edits something already has its value before the component
exists. Bind it and it is on screen at the first render — no click, no tick:

```ts
readonly day = signal(Temporal.PlainDate.from('2026-09-23'));
readonly at = signal(Temporal.Instant.from('2026-09-23T12:30:00Z'));
```

```html
<tz-calendar [(value)]="day" />
<tz-datetime-field [(value)]="at" timeZone="Europe/Paris" />
```

The same holds for a form control built with a value — including a `Date`,
under `valueAs="date"`. The component shows it and leaves the control
pristine: displaying a value is not the user editing one.

```ts
form = new FormGroup({
  day: new FormControl<Date | null>(new Date('2026-09-23T10:00:00Z')),
});
```

Writing to the signal or calling `setValue` later moves the widget too, and
`null` empties it. To move only the month on screen, without choosing a day,
ask the component itself:

```html
<tz-calendar #cal [(value)]="day" />
<button (click)="cal.goTo({ year: 2027, month: 3 })">March 2027</button>
```

## Forms

Every one of them is a `ControlValueAccessor`, so `formControlName`, `ngModel`
and `[(value)]` all work.

```html
<form [formGroup]="form">
  <tz-datetime-field formControlName="at" timeZone="Europe/Paris" />
</form>
```

The control holds Temporal values by default. `valueAs` changes that without
touching anything else, which is the whole of a flatpickr migration on most
screens:

```html
<tz-date-field formControlName="day" valueAs="date" valueTimeZone="Europe/Paris" />
<tz-datetime-field formControlName="at" valueAs="iso" timeZone="Europe/Paris" />
```

| `valueAs` | The control holds |
|---|---|
| `'temporal'` (default) | `PlainDate` or `Instant` |
| `'utc'` | a string, always an instant: `2026-09-20T07:30:00Z` — a date-only field gives the midnight that opens the day |
| `'date'` | a `Date` — read in `valueTimeZone`, which is required to be explicit because an instant's day depends on where you stand |
| `'iso'` | a string: `2026-09-20`, or `2026-09-20T07:30:00Z` |

## Settling the conventions once

A zone, a locale, the shape values leave in: decisions about the application,
not about the field. `provideTzslot` sets them for every component, and
anything written on a tag still wins.

```ts
import { provideTzslot, FR } from '@tzslot/angular';

bootstrapApplication(App, {
  providers: [
    provideTzslot({ valueAs: 'utc', timeZone: 'Europe/Paris', locale: 'fr-FR', messages: FR }),
  ],
});
```

`timeZone` given here is the zone every component reads in, so it stops being
required on the tag. [What you get back](./values) explains the shapes, and
why whole days end at the midnight *after* the last one.

## Words

One bundle, provided once for the whole application:

```ts
import { provideTzslotMessages, FR } from '@tzslot/angular';

bootstrapApplication(App, { providers: [provideTzslotMessages(FR)] });
```

See [Localization](./localization).

## Zoneless

The components hold no state of their own: they map inputs to the widget and
its callbacks back to outputs, each call made `untracked`. They work with
zone.js and without it.
