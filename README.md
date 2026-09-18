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
