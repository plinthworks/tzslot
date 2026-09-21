# What you get back

A picker's real output is not a string on screen — it is what lands in your
form control and, a moment later, in your database. This page is about that.

## A moment, not a wall time

Anything with a time in it hands you an **instant**: a fixed point on the
world's timeline, independent of any zone. `2026-10-25T00:30:00Z` is the same
moment everywhere, and it stays the same moment when the rules change, when
the user travels, and when you read it back next year.

What it is *not* is "02:30 on 25 October". That is a wall time, and in Paris
that morning there are two of them — the one before the clocks go back and the
one after. A picker that stores a wall time has thrown away which.

## A day is not a moment — until you say where

A calendar hands you a `PlainDate`: `2026-09-14`, a square on a grid. It has
no time and no zone, because a day genuinely has neither until someone says
where they are standing. 14 September begins at different instants in Paris
and in São Paulo.

So when a day has to become a moment — to be stored, compared, or sent — the
zone comes with it. That is what `valueTimeZone` is for, and what the
convention below settles once.

## Whole days: `allDay` and the end you don't see

A period is one of two things, and a search that mixes them up is wrong
without looking wrong:

- **Whole days.** "14 to 20 September" — from the midnight that opens the
  14th to the midnight that closes the 20th, whatever the hours are.
- **An interval.** "14 September 09:00 to 20 September 17:00" — two moments
  someone chose.

`allDay` says which one you are holding. When it is `true`, the widget has
already done the work: `start` is the midnight that opens the first day, and
`end` is **the midnight after the last one** — the 21st, not the 20th.

```ts
{ start: 2026-09-13T22:00:00Z,   // 14 Sept, 00:00 in Paris
  end:   2026-09-20T22:00:00Z,   // 21 Sept, 00:00 in Paris
  allDay: true }
```

That end is exclusive on purpose, so a query reads:

```sql
WHERE happened_at >= :start AND happened_at < :end
```

and nothing falls through the gap. Written the other way — `<= 20 Sept
23:59:59` — every screen has to remember the seconds, and something logged at
23:59:59.4 is lost. With `allDay: false` the two ends are simply the two
moments chosen, and the same query still works.

Both are shown on the same field: the switch inside the panel turns the times
on and off, and `allDay` follows it.

## The convention: leave in UTC, read in a zone

The habit worth adopting is to hold **one** shape everywhere: an instant, in
UTC, whatever the widget was. The screen still shows local time — that is what
`timeZone` is for — but what leaves the component, and what your back end
stores, never depends on who is looking.

`valueAs: 'utc'` does it, on any component:

```html
<tz-datetime-field formControlName="at" valueAs="utc" timeZone="Europe/Paris" />
<tz-date-field     formControlName="day" valueAs="utc" valueTimeZone="Europe/Paris" />
```

```ts
at  === '2026-10-25T00:30:00Z'
day === '2026-09-13T22:00:00Z'   // the midnight that opens 14 September in Paris
```

A date-only field gives an instant too — the midnight that opens the day in
that zone. That is the point of the convention: one shape, no screen deciding
for itself what a day means.

### Settle it once

Repeating `valueAs` and a zone on every tag is how one screen ends up
disagreeing with the rest. Set them for the application instead:

```ts
import { provideTzslot, FR } from '@tzslot/angular';

bootstrapApplication(App, {
  providers: [
    provideTzslot({
      valueAs: 'utc',
      timeZone: 'Europe/Paris',
      locale: 'fr-FR',
      firstDayOfWeek: 1,
      messages: FR,
    }),
  ],
});
```

Every component picks those up, `timeZone` included — so it stops being
required on the tag. Anything written on a component still wins, because the
one screen that needs something else should not have to stop using the
library.

| `valueAs` | The control holds |
|---|---|
| `'temporal'` (default) | `PlainDate` or `Instant` |
| `'utc'` | a string, always an instant: `2026-10-25T00:30:00Z` |
| `'date'` | a `Date` — read in `valueTimeZone` |
| `'iso'` | a string in the widget's own shape: `2026-09-14`, or `2026-09-14T07:00:00Z` |

Without a framework there is no `valueAs`: `onChange` hands you Temporal
values, and `instant.toString()` is the same UTC string.
