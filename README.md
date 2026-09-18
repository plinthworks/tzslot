# ngx-zoneddatepicker

An Angular date and time picker that knows what daylight saving does.

Most pickers — flatpickr, Air Datepicker, and nearly every Angular wrapper —
are built on the `Date` object, which has no concept of an IANA time zone. They
will happily let someone book 02:30 on a morning when 02:30 does not happen,
or on one when it happens twice, and then store whichever of the two the
browser guessed.

flatpickr has 1.6 million downloads a week and its last release was in April
2022.

## Status

`@ngx-zoneddatepicker/core` — the date and time logic, no DOM, no framework.
23 tests against real IANA rules.

The Angular components come next, and the design after that: the logic is worth
nothing if it is wrong, and pretty is worth nothing if the logic is wrong.

## The part that matters

```ts
import { getDaySlots } from '@ngx-zoneddatepicker/core';

const slots = getDaySlots('2026-10-25', 'Europe/Paris', { stepMinutes: 30 });

slots.find(s => s.time.hour === 2 && s.time.minute === 30);
// {
//   exists: true,
//   ambiguous: true,                       ← 02:30 happens twice that morning
//   offsets: ['+02:00', '+01:00'],         ← how a user tells them apart
//   instants: [Instant, Instant],          ← an hour apart; store one of these
// }
```

And on the spring morning:

```ts
getDaySlots('2026-03-29', 'Europe/Paris').find(s => s.time.hour === 2);
// { exists: false, ambiguous: false, offsets: [], instants: [] }
```

Store an instant, never a wall time. An instant is unambiguous everywhere, and
survives a change of zone, a change of the rules, and being read back next year.

## Development

```bash
npm install
npm test            # 23 tests, real time zone rules
npm run typecheck
```

Temporal is used natively where the browser has it, and polyfilled where it does
not — 19 kB gzipped that a modern browser never downloads. There is deliberately
no fallback to `Date`: it would reintroduce exactly the bug this library exists
to fix, on the platforms least able to reveal it.

MIT.

## Components

`@ngx-zoneddatepicker/ui` — Angular standalone components over the core. CDK
only; no Material, no design system. Structural class names and CSS custom
properties, so restyling does not mean fighting specificity.

```html
<ngx-time-slot-picker
  [date]="'2026-10-25'"
  [timeZone]="'Europe/Paris'"
  [stepMinutes]="30"
  [(value)]="chosen" />
```

On the morning the clocks go back, 02:00 renders as **two** buttons, labelled
`+02:00` and `+01:00`. They are an hour apart and the user picks one. On the
morning they go forward, 02:00 renders struck through and disabled, with a
tooltip saying why.

`value` is a `Temporal.Instant` — a moment, not a clock face.

```html
<ngx-calendar [(value)]="day" [firstDayOfWeek]="1" [min]="from" [max]="until" />
```

Six weeks always, so the calendar does not change height between months.
Arrow keys move a day, PageUp/PageDown a month, Home/End across the week, and
one cell at a time is tabbable — the roving pattern the ARIA grid guidance
describes.

Month and weekday names come from `Intl`, which the browser already has. Air
Datepicker ships thirty locale files to do the same job; those go stale, and
they are bytes every visitor downloads for languages they do not read.

## A note on installing

`npm install --legacy-peer-deps`.

npm 10.9.3 fails with `Cannot read properties of null (reading 'edgesOut')` on
vitest 4's dependency graph, and vitest 4 is what Angular 21 supports. The flag
is a workaround for that npm bug, not a sign of a broken tree — `npm ls` is
clean afterwards.
