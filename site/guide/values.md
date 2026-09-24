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

Choose a time below and read the line under it: what comes back is an instant,
in UTC, whatever the field shows.

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

Set it to 25 October and pick 02:30 — the two readings are two different
instants, an hour apart, and the value says which you took:

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', timeLayout: 'select', minuteStep: 30, today: Temporal.PlainDate.from('2026-10-25'), value: Temporal.Instant.from('2026-10-24T22:00Z') }" />

## A day is not a moment — until you say where

A calendar hands you a `PlainDate`: `2026-09-14`, a square on a grid. It has
no time and no zone, because a day genuinely has neither until someone says
where they are standing. 14 September begins at different instants in Paris
and in São Paulo.

So when a day has to become a moment — to be stored, compared, or sent — the
zone comes with it. That is what `valueTimeZone` is for, and what the
convention below settles once.

A calendar, and the plain date it hands back:

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', months: 1 }" />

## Whole days, and the end you don't see

A period is one of two things, and a search that mixes them up is wrong
without looking wrong:

- **Whole days.** "14 to 20 September" — from the midnight that opens the
  14th to the midnight that closes the 20th, whatever the hours are.
- **An interval.** "14 September 09:00 to 20 September 17:00" — two moments
  someone chose.

**Nothing says which.** A period is two moments, and that is the whole value:

```ts
{ start: 2026-09-13T22:00:00Z,   // 14 Sept, 00:00 in Paris
  end:   2026-09-20T22:00:00Z }  // 21 Sept, 00:00 in Paris
```

Whole days are the pair whose two ends land on a day's first instant. It is
read off the value, never declared — a flag saying so was set by whoever built
the value and forgotten by everyone handed one, and a screen that computed
09:00 to 18:00 and left it out had its hours hidden without a word.

A day chosen as the end means **all of it**: the midnight that opens the day
after — the 21st, not the 20th. That end is exclusive on purpose, so a query
reads:

```sql
WHERE happened_at >= :start AND happened_at < :end
```

and nothing falls through the gap. Written the other way — `<= 20 Sept
23:59:59` — every screen has to remember the seconds, and something logged at
23:59:59.4 is lost. When the two ends are moments someone chose, the same
query still works unchanged.

`showTime` decides whether the hours are on screen at all. **`createRangeField`
has no *All day* switch**, because it asked the reader to classify their own
answer before giving it — two midnights say it already. The one widget that
still offers the switch is
[`createDateTimeRange`](../examples#a-whole-day-or-an-interval): it reports
`allDay` beside `start` and `end`, for a back end that wants the flag told to
it rather than read.

Whole days. Watch the line under it: `end` is the midnight **after** the last
day you chose.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: false, months: 2, presets: ['thisWeek'] }" />

The same field with hours on screen. What the field writes follows the value,
not the setting: a period landing on two midnights is written as days, because
days are what was chosen. Give either end an hour and it says the moments.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, months: 2, defaultTimes: { start: '09:00', end: '18:00' } }" />

Try it on the one below, which has hours on screen and no default times.
**Click the 23rd, then the 24th**, and read the line underneath: the field says
`23/09/2026 – 24/09/2026` and the value ends at `2026-09-24T22:00:00Z` — which
is the 25th at midnight in Paris, so the 24th is whole.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, months: 1, title: 'Click two days' }"
  :show="(v) => v && v.start ? `${v.start.toString()}  →  ${v.end ? v.end.toString() : '…'}` : 'nothing chosen'" />

The field said `25/09/2026 00:00` there until 1.4.0 — the exclusive end shown
as a date nobody had clicked. The value has not changed; only what is read off
it has.

## One end only

A search often has one bound and not the other: everything since a date,
everything up to one. In SQL that is a `>=` with no `<`, and the picker has to
be able to say it — otherwise the screen grows a second control, or a checkbox
called "no end", to work around the field.

`openEnded: true` turns it on, on `createRangeField` and `createDateTimeRange`.
It is asked for rather than assumed, because a booking form must not accept a
stay that never ends.

```js
createRangeField(element, { timeZone: 'Europe/Paris', openEnded: true });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', openEnded: true, months: 2, title: 'Empty one end and read the value' }" />

Each of the panel's two fields carries a cross that empties it, and an emptied
field is what says the period is open on that side:

| | The value | The query |
|---|---|---|
| both filled | `{ start, end }` | `at >= :start AND at < :end` |
| *To* emptied | `{ start, end: null }` | `at >= :start` |
| *From* emptied | `{ start: null, end }` | `at < :end` |

`end` stays exclusive, so **Until 20 September** is the midnight that opens the
21st and the whole of the 20th is included — the same rule as everywhere else,
which is the point of keeping it.

The arrows work on it too, and that matters: "from the 18th" becomes "from the
17th" with one press, without reopening the calendar. Whatever step the screen
set applies, down to a quarter of an hour.

Both ends null means nothing has been chosen yet. That is the one case a
screen still has to tell apart, and it is the obvious one.

```ts
const { start, end } = value;
if (!start && !end) return everything;
if (!end) return rows.filter((r) => r.at >= start);
if (!start) return rows.filter((r) => r.at < end);
return rows.filter((r) => r.at >= start && r.at < end);
```

Without `openEnded`, a single chosen end is still what it always was: a
selection half made. The field says so — `14/09/2026 – …` — rather than
pretending to be an answer.

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
values, and `instant.toString()` is the same UTC string. The four shapes,
written out from the same choice — pick a day and watch all four change:

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', months: 1 }" :show="(d) => d ? ['temporal → ' + d.toString(), 'utc      → ' + d.toZonedDateTime('Europe/Paris').toInstant().toString(), 'date     → ' + new Date(d.toZonedDateTime('Europe/Paris').toInstant().epochMilliseconds).toISOString(), 'iso      → ' + d.toString()].join('   ·   ') : 'nothing chosen'" />
