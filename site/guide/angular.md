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
| `'date'` | a `Date` — read in `valueTimeZone`, which is required to be explicit because an instant's day depends on where you stand |
| `'iso'` | a string: `2026-09-20`, or `2026-09-20T07:30:00Z` |

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
