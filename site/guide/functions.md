# The functions underneath

Every widget on this site is built out of `@tzslot/core`, which has no DOM in
it and no framework. The functions below are what it is made of, and they are
exported because a screen often needs the answer without the picker: a server
validating what a form sent, a summary line counting a period, a grid drawn by
something else entirely.

There is nothing privileged about the widgets. They call these.

```bash
npm i @tzslot/core
```

## One wall time, resolved

`resolveWallTime` is the function this library exists for. A date and a time
as a person reads them off a clock are not a moment until a zone says so — and
twice a year, the zone says something surprising.

```ts
import { resolveWallTime, Temporal } from '@tzslot/core';

const reading = resolveWallTime(
  Temporal.PlainDate.from('2026-10-25'),
  Temporal.PlainTime.from('02:30'),
  'Europe/Paris',
);

reading.exists;     // true
reading.ambiguous;  // true  — 02:30 happens twice that morning
reading.offsets;    // ['+02:00', '+01:00']
reading.instants;   // two Instants, an hour apart
```

Three states, and two of them are why a picker built on `Date` is wrong:

- **It exists and is unique.** `instants` holds one.
- **It is ambiguous.** The clocks went back; this wall time happens twice.
  `instants` holds both, `offsets` tells them apart. A field that returns only
  the wall time has returned a guess.
- **It does not exist.** The clocks went forward over it. `exists` is false,
  `instants` is empty. On 29 March 2026 in Paris, 02:30 never happens —
  offering it means accepting an appointment for a moment that will not occur.

Validating on a server is the same call:

```ts
import { resolveWallTime, Temporal } from '@tzslot/core';

function accept(date: string, time: string, timeZone: string) {
  const reading = resolveWallTime(
    Temporal.PlainDate.from(date),
    Temporal.PlainTime.from(time),
    timeZone,
  );
  if (!reading.exists) return { ok: false as const, why: 'that time does not happen' };
  if (reading.ambiguous) return { ok: false as const, why: 'that time happens twice — which?' };
  return { ok: true as const, at: reading.instants[0]! };
}
```

## How long a period really is

`getRangeInfo` takes two instants and a zone, and answers both lengths: the one
the clock shows and the one that elapsed.

```ts
import { getRangeInfo, isRangeProblem, formatDuration, Temporal } from '@tzslot/core';

const info = getRangeInfo(
  Temporal.Instant.from('2026-10-24T21:00Z'),  // 23:00 in Paris, at +02:00
  Temporal.Instant.from('2026-10-25T06:00Z'),  // 07:00 in Paris, at +01:00
  'Europe/Paris',
);

if (!isRangeProblem(info)) {
  info.minutes;            // 540 — what elapsed
  info.wallMinutes;        // 480 — what the clock shows
  info.crossesTransition;  // true
  info.shiftMinutes;       // 60 — the hour the clocks gave back
  info.startOffset;        // '+02:00'
  info.endOffset;          // '+01:00'
  formatDuration(info.duration, { locale: 'en-GB' }); // '9 hrs'
}
```

A night shift of 23:00 to 07:00 is eight hours on the clock and nine in fact,
once a year. Paying someone for eight is the bug this field exists to stop.

`isRangeProblem` narrows the result: an end before its start is not a length,
so there is nothing to format and the function says so rather than returning a
negative number nobody checked.

```ts
import { getRangeInfo, isRangeProblem, Temporal } from '@tzslot/core';

const backwards = getRangeInfo(
  Temporal.Instant.from('2026-10-25T06:00Z'),
  Temporal.Instant.from('2026-10-24T21:00Z'),
  'Europe/Paris',
);
if (isRangeProblem(backwards)) backwards.kind; // 'end-before-start'
```

### Writing and reading a length

`formatDuration` writes one the way a person does. Given a `locale`, in that
person's language.

```ts
import { formatDuration, parseDuration, Temporal } from '@tzslot/core';

const week = Temporal.Duration.from({ days: 7, hours: 2, minutes: 30 });
formatDuration(week);                        // '7d 2h 30m'
formatDuration(week, { locale: 'fr-FR' });   // '7 j 2 h 30 min'
formatDuration(week, { locale: 'ar-SA' });   // '٧ أيام ٢ س ٣٠ د'
formatDuration(week, { days: false });       // '170h 30m'
```

Without a locale it is the compact ASCII form, which is what a log line and a
test want. With one, `Intl` decides — including the plurals, which for Arabic
means six categories and a dual: two days is `يومان`, a single word carrying
its own count.

`parseDuration` reads one back — the short way a person types into a filter,
which is one number and one unit:

```ts
import { parseDuration } from '@tzslot/core';

parseDuration('90m');    // ninety minutes
parseDuration('90');     // the same — a bare number is minutes
parseDuration('25mn');   // and so is mn, min and m
parseDuration('3h');     // hours
parseDuration('2w');     // weeks, and `s` for semaines
parseDuration('6mo');    // months — `m` is always minutes, never months
parseDuration('1h 30m'); // null — one unit at a time
parseDuration('PT1H30M');// null — this is not an ISO 8601 parser
parseDuration('soon');   // null
```

It is deliberately small: a filter screen is used all day by people who know
what they want before the panel opens, and what may be typed has to be small
enough to remember. `Temporal.Duration.from` is the full parser, ISO 8601
included, for a value that came from somewhere other than a keyboard.

## The same hours every day

`getDailyWindows` is one working day repeated over a span — a rota, a clinic's
opening hours, a shift pattern. It counts each day in the zone, so the day the
clocks change is a different length from its neighbours and says so.

```ts
import { getDailyWindows, Temporal } from '@tzslot/core';

const rota = getDailyWindows('2026-10-22', '2026-10-27', '23:00', '07:00', 'Europe/Paris');

rota.windows.length;           // one per night
rota.minutes;                  // the total, counted in the zone
rota.unusual.length;           // 1 — the night the clocks go back
rota.unusual[0]?.minutes;      // 540, not 480
```

`unusual` is the part worth putting on screen: a rota where one night is an
hour longer is a rota somebody should be told about, and it is the only way
`windows` differs from arithmetic.

## Named ranges, without a widget

The shortcuts beside the period field are plain functions. A report with its
own buttons can use the same ones, and get the same answers.

```ts
import { presetRange, matchesPreset, Temporal } from '@tzslot/core';

const today = Temporal.PlainDate.from('2026-10-26');
const last7 = presetRange('last7Days', { today, firstDayOfWeek: 1 });

last7.start.toString(); // '2026-10-20'
last7.end.toString();   // '2026-10-26'

matchesPreset('last7Days', last7, { today, firstDayOfWeek: 1 }); // true
```

`matchesPreset` is how a screen ticks the button that describes what is
currently chosen, without storing which button was pressed.

Four of the shortcuts are shorter than a day, and those are two moments rather
than two dates — "the current quarter hour" is 11:00 to 11:15 on a clock, not a
day on a calendar. They have their own function, and a predicate that says
which is which:

```ts
import { presetMoments, isSubDayPreset, SUB_DAY_PRESETS, Temporal } from '@tzslot/core';

SUB_DAY_PRESETS; // ['thisQuarterHour', 'lastHour', 'thisHour', 'nextHour']

isSubDayPreset('thisHour');  // true
isSubDayPreset('last7Days'); // false

const hour = presetMoments('thisHour', {
  now: Temporal.Instant.from('2026-10-26T11:07:00Z'),
  timeZone: 'Europe/Paris',
});
hour.start; // 12:00 in Paris, as an Instant
hour.end;   // 13:00
```

The quarter hour is counted from the clock rather than from midnight, so at
11:07 it is 11:00–11:15. A zone offset by half an hour or a quarter —
Kathmandu, Chatham — would otherwise land on a quarter that is not one.

## Moving by a step

The arrows beside a field move a value by a step. Three functions, one per
shape of value, and all three count in the zone rather than in milliseconds.

```ts
import { shiftDate, shiftInstant, shiftDayRange, Temporal } from '@tzslot/core';

shiftDate(Temporal.PlainDate.from('2026-10-31'), { months: 1 }, 1).toString();
// '2026-11-30' — November has no 31st, and the month moved rather than 31 days

shiftInstant(
  Temporal.Instant.from('2026-10-24T21:00Z'),
  { days: 1 },
  1,
  'Europe/Paris',
).toString();
// a day later on the clock, which the night the clocks change is 25 hours

shiftDayRange(
  {
    start: Temporal.PlainDate.from('2026-10-19'),
    end: Temporal.PlainDate.from('2026-10-25'),
  },
  { days: 7 },
  -1,
);
// the week before, both ends together
```

The third argument is the direction, `1` or `-1`, rather than a negative step:
a step is a length and lengths are not negative, and `{ months: -1 }` from the
31st has no obvious answer.

`snapTime` rounds a wall time to a grid, which is what a field with
`minuteStep` does to what someone typed:

```ts
import { snapTime, Temporal } from '@tzslot/core';

snapTime(Temporal.PlainTime.from('09:07'), 15).toString(); // '09:00'
snapTime(Temporal.PlainTime.from('09:08'), 15).toString(); // '09:15'
```

And `asShiftStep` turns the widgets' shorthand into a length, for code that
takes the same option:

```ts
import { asShiftStep } from '@tzslot/core';

asShiftStep(60);          // { minutes: 60 }
asShiftStep({ days: 1 }); // { days: 1 }
```

## Values in and out

A widget hands back instants and plain dates. An application usually stores
strings, and `@tzslot/angular` can be told which shape a form control should
hold. These are the conversions, and they are exported because a server has to
agree with the browser about them.

```ts
import { toPlainDate, isDateLike } from '@tzslot/core';

toPlainDate('2026-10-26', 'Europe/Paris').toString();  // '2026-10-26'
toPlainDate(new Date('2026-10-25T23:30Z'), 'Europe/Paris').toString();
// '2026-10-26' — half past midnight in Paris, which is still the 26th there

isDateLike('2026-10-26');       // true
isDateLike(new Date());         // true
isDateLike('tomorrow');         // false
```

`DateLike` is a `PlainDate`, a `Date` or a string — the three things a caller
might reasonably have. An `Instant` is not among them on purpose: it is a
moment, not a day, and `Temporal.Instant.prototype.toZonedDateTimeISO(zone)`
is the conversion that makes the zone impossible to forget.

Which is the same reason `toPlainDate` requires the zone. A `Date` is an
instant; which day it falls on depends on where you are standing, and
2026-01-01T00:30Z is New Year's Day in Paris and New Year's Eve in New York.
Guessing here would be the class of bug this library exists to prevent.

## Building a grid yourself

A calendar is a grid of days, and the grid is arithmetic rather than markup.
These four are what the widgets draw from, and a component of your own can draw
from the same ones.

```ts
import { getMonthGrid, inMonth, getWeekdayOrder, firstDayFor } from '@tzslot/core';

const weeks = getMonthGrid(2026, 10, firstDayFor('en-GB'));
weeks.length;                       // 6, always — the grid does not change height
weeks[0]![0]!.toString();           // '2026-09-28', the Monday the month starts in
inMonth(weeks[0]![0]!, 2026, 10);   // false — it belongs to September

getWeekdayOrder(firstDayFor('en-GB')); // [1, 2, 3, 4, 5, 6, 7] — Monday first
getWeekdayOrder(firstDayFor('en-US')); // [7, 1, 2, 3, 4, 5, 6] — Sunday first
```

Six rows always, so a month that needs five does not make the panel jump when
a reader steps into one that needs six. `firstDayFor` asks `Intl` what the
locale does, which is Monday in France and Sunday in the United States; pass a
`Weekday` directly where a business disagrees with its own locale.

The year view works the same way:

```ts
import { getDecadeYears, isOutsideDecade } from '@tzslot/core';

const years = getDecadeYears(2026);
years.length;                      // 12 — a decade with a year either side
isOutsideDecade(2019, 2026);       // true
isOutsideDecade(2026, 2026);       // false
```

A decade is shown with the year before and the year after, for the same reason
a month grid shows the days around it: a reader stepping off the edge should
see where they are going.

## A non-Gregorian calendar

The grid can be built in any calendar Temporal implements, which means a
Hijri month is a Hijri month rather than a Gregorian one relabelled.

```ts
import { getMonthGrid, inMonth } from '@tzslot/core';

const ramadan = getMonthGrid(1448, 9, 7, 'islamic-umalqura');
ramadan.length;                                      // 6
inMonth(ramadan[1]![0]!, 1448, 9, 'islamic-umalqura');
```

The days come back as ISO dates, so everything else in the library keeps
working on them; the calendar decides where the month starts and how long it
is. `'islamic'` and `'islamic-rgsa'` are refused with a message naming what to
use instead, because Temporal does not implement them and the error it gives
otherwise says nothing useful.

**No widget uses this yet.** It is the arithmetic, not an interface.

## Which Temporal you got

```ts
import { usingPolyfill } from '@tzslot/core';

usingPolyfill; // true where the runtime brought none of its own
```

A diagnostic, not logic: nothing in this library behaves differently either
way, and a screen that branches on it is a screen with two code paths and one
of them untested. It is here so a bug report can say which.

[Getting started](./getting-started#paying-for-the-polyfill-only-where-it-is-needed)
covers `loadTemporal()` and the entry that leaves the polyfill out.

## Where to go next

- [What you get back](./values) — instants, whole days, and the exclusive end.
- [Choosing a period](./period) — the widget built on all of this.
- [Formatting and typing](./formatting) — patterns, masks and what `Intl` does.
