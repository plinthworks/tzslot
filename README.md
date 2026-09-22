# tzslot

Date and time pickers that know what daylight saving does.

Most pickers — flatpickr, Air Datepicker, nearly every Angular wrapper — are
built on `Date`, which has no notion of an IANA time zone. They will let
someone book 02:30 on a morning when 02:30 does not happen, or on one when it
happens twice, and store whichever reading the browser guessed. They call a
night shift from 23:00 to 05:00 six hours on the night it lasts seven.

tzslot is built on [Temporal](https://tc39.es/proposal-temporal/docs/). It
shows the hour that does not exist, offers both readings of the one that
happens twice, and says in words when an interval lasts something other than
what the clock faces suggest.

## Packages

| | |
|---|---|
| `@tzslot/core` | The arithmetic. No DOM, no framework — usable on a server too. |
| `@tzslot/dom` | Every widget, in plain DOM. Works in any framework, or none. |
| `@tzslot/angular` | Angular components over `@tzslot/dom`: signals, forms, zoneless or not. Angular 18 to 21. |
| `@tzslot/theme` | Optional. CSS (or Sass) setting the widgets' colours; light, dark, high contrast, a bridge for Tailwind v4 and one for v3. |

The widgets live in `@tzslot/dom`; a framework package only translates its own
idioms into calls on them. A behaviour fixed there is fixed everywhere.

## The widgets

| Angular | Plain DOM | What it chooses |
|---|---|---|
| `<tz-calendar>` | `createCalendar` | a day — month and year views, keyboard, Today / Clear |
| `<tz-multi-date>` | `createMultiDate` | several days, not necessarily adjacent |
| `<tz-date-field>` | `createDateField` | a day, from a field that opens a panel, anchored or centred |
| `<tz-datetime-field>` | `createDateTimeField` | a moment: the same panel with a time under the calendar — flatpickr's `enableTime`, except that it says when the time cannot happen and offers both readings when it happens twice |
| — | `createTimeInput` | an hour and a minute on their own: arrows, wheel, up/down keys, 12- or 24-hour |
| `<tz-date-range>` | `createDateRange` | two days, refusing a range across a closed one |
| `<tz-range-field>` | `createRangeField` | a period in one field: named ranges, months side by side, whole days or moments |
| `<tz-time-slots>` | `createTimeSlots` | a moment on one day: the skipped hour struck through, the repeated one offered twice |
| `<tz-datetime-range>` | `createDateTimeRange` | an interval: two date-and-time fields, and the hour it hides |
| `<tz-daily-range>` | `createDailyRange` | a range of days with the same hours on each, overnight allowed |

`renderCell` puts a price, places left or your own class on any day, and
`weekNumbers` adds a column of ISO week numbers down the left.
`timeLayout` chooses how a time is asked for: `'input'` for the compact field
with arrows, `'select'` for two menus (`minuteStep`, every minute by default),
`'list'` for the times on offer that day. The menus show the chosen day as the
zone really has it: the hour the clocks skip is not offered, and the hour they
repeat appears twice, in the words everyone uses — "02 — summer" and
"02 — winter", "02 — été" and "02 — hiver" — so there is nothing left to ask
afterwards. The zone's official name for each is on the tooltip. The compact field does ask, with the same names, and the
text itself says which of the two it holds — `25/10/2026 02:30 (winter)` —
because 02:30 looks identical either way. Typed back in, that name is read
too, so the text always means exactly one moment.

## The text in a field

A field can be typed into as well as chosen from, and what it writes is what
it reads back:

```html
<!-- the locale's own numeric form: 20/09/2026 09:15 in French -->
<tz-datetime-field [(value)]="at" timeZone="Europe/Paris" />

<!-- a pattern, when the shape matters more than the reader -->
<tz-datetime-field format="yyyy-MM-dd HH:mm" />

<!-- read-only, and then free to be written any way at all -->
<tz-datetime-field [editable]="false" dateStyle="long" timeStyle="short" />
<tz-datetime-field [editable]="false" [displayWith]="mine" />
```

Tokens: `yyyy yy MMMM MMM MM M dd d EEEE EEE HH H hh h mm a`, anything else
kept as written, `'quoted'` to keep letters. Typing gets the separators as the
figures arrive, the way a card number gets its spaces — `2009` becomes
`20/09/` — for patterns that leave no doubt about where each part ends; pass
`[mask]="false"` to turn that off. The pattern is never used as the
placeholder. Text that cannot be read is
refused rather than guessed at, and the field goes back to the last moment it
held when you leave it. A pattern that names its month is for display only:
"sept.", "Sept" and "septembre" are one month in three spellings, and picking
between them is how a field stores the wrong date quietly.

## Angular

```bash
npm install @tzslot/angular @tzslot/theme
```

```jsonc
// angular.json → build.options
"styles": ["@tzslot/theme/tzslot.css", "src/styles.css"]
```

```ts
import { Component, signal } from '@angular/core';
import { Calendar, TimeSlotPicker, provideTzslotMessages, FR } from '@tzslot/angular';
import type { Instant, PlainDate } from '@tzslot/core';

@Component({
  imports: [Calendar, TimeSlotPicker],
  template: `
    <tz-calendar [(value)]="day" [buttons]="['today', 'clear']" />
    @if (day(); as d) {
      <tz-time-slots [date]="d" timeZone="Europe/Paris" [(value)]="moment" />
    }
  `,
})
export class Booking {
  readonly day = signal<PlainDate | null>(null);
  readonly moment = signal<Instant | null>(null);
}

// French everywhere: bootstrapApplication(App, { providers: [provideTzslotMessages(FR)] })
```

Every component is a `ControlValueAccessor` — `formControlName`, `ngModel` and
`[(value)]` all work — and takes `valueAs="date"` to keep an existing
`FormControl<Date>` untouched. See `docs/migrating-from-flatpickr.md`.

## Without a framework

```bash
npm install @tzslot/dom @tzslot/theme
```

```js
import { createCalendar } from '@tzslot/dom';
import { Temporal } from '@tzslot/core';
import '@tzslot/theme';

const calendar = createCalendar(document.querySelector('#day'), {
  onChange: (day) => console.log(day?.toString()),
});
calendar.update({ min: Temporal.Now.plainDateISO() });
```

Each `create…` returns an instance with `update`, `clear` and `destroy`.
Layout CSS is injected once; pass `injectStyles: false` under a strict
Content-Security-Policy and include the exported `*_CSS` strings yourself.

## The arithmetic

```ts
import { getDaySlots, getDailyWindows } from '@tzslot/core';

getDaySlots('2026-10-25', 'Europe/Paris').filter((s) => s.time.hour === 2);
// 02:00 is ambiguous: offsets ['+02:00', '+01:00'], two instants an hour apart

getDailyWindows('2026-10-23', '2026-10-26', '22:00', '06:00', 'Europe/Paris').minutes / 60;
// 33 — four night shifts, one of them nine hours long
```

Store an instant, never a wall time: it is unambiguous everywhere and
survives a change of zone, of the rules, and being read back next year.

## Theming

Nine palette colours, each `light-dark(light, dark)`. `data-theme="dark"` on
any element themes everything inside it; `--tz-accent` on any element
recolours the selection, the range tint and the focus ring beneath it.
`@tzslot/theme/contrast.css` follows `prefers-contrast: more`, and
`@tzslot/theme/tailwind.css` maps the palette to a Tailwind v4 theme and
`tailwind3.css` to a v3 one. From
Sass, `@use '@tzslot/theme/tzslot' with ($accent: …)`. All of it in
`docs/customising.md`.

## Browsers

Temporal is used natively where it exists and polyfilled where it does not.
The polyfill is a static import, so a bundle carries it for every visitor —
about 19 kB gzipped. There is deliberately no fallback to `Date`: it would
bring back the exact bug this library exists to fix.

The theme uses `light-dark()` and `color-mix()`: Chrome 123, Safari 17.5,
Firefox 120 and later.

## Development

```bash
npm install
npm start            # playground: http://localhost:4500/playground/index.html
npm test             # 263 tests, against real time zone rules
npm run typecheck
npm run build        # every package into its own dist/, ready to publish
```

The playground has a page per way of using it: Angular, Tailwind, and plain
DOM.

## Licence

[MIT](LICENSE). Free to use, in personal and commercial projects alike, free
to copy, modify and redistribute; keep the copyright notice. It comes with no
warranty.
