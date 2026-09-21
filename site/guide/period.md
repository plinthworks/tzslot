# Choosing a period

`createRangeField` — `<tz-range-field>` in Angular — is one field for a whole
period: a trigger that reads `18/09/2026 – 24/09/2026`, and a panel holding
everything needed to change it.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', months: 2, showTime: true, openEnded: true, lengthBox: true, shift: 'auto', weekNumbers: true }" />

## Saying what it is for

```js
createRangeField(element, { timeZone: 'Europe/Paris', title: 'Travel dates' });
```

The title is written above the panel and read out for the field itself. A
picker with no subject is one the reader has to infer from whatever happens to
sit beside it, and two pickers on the same screen are then told apart by
position alone.

## The panel, top to bottom

**Two fields, From and To.** A click in the calendar fills the one that is
armed — the one with the ring — and nothing else. That is the difference
between this and a plain range calendar: correcting the end does not throw
away the start and make you pick both again.

Left alone the familiar flow survives. A click on the first field fills the
start and arms the end, so a fresh period is still two clicks. It is only when
you put the cursor in a field yourself that the calendar stops moving on: you
armed that one, so that one is what a click changes.

**Both fields are typed into.** A period ending in February 2028 is a line of
text, not eighteen presses of an arrow, and the calendar follows what is
typed: type `03/02/2028` and the grid is already there for the next click.
Separators appear as the figures are typed (`mask`, on by default) and the
pattern is never shown as a placeholder — a field explaining its own format
before anything is typed is a field asking a question instead of inviting an
answer.

**The hour lives inside the field,** to the right of the day. It appears when
`showTime` is on and the whole-day switch is off, and `timeLayout` says how it
is asked for. `'select'` — an hour menu and a minute menu — is the default,
because most of the time an hour is chosen outright and a menu is two clicks.
`'input'` puts an arrow above and below the figures, which suits nudging a
time already close to right.

**The shortcuts, shortest first.** Ordered by the length of what they mean,
ending at *This quarter*, so a reader scanning the column can stop as soon as
it overshoots.

**The arrows** step the whole period without opening anything. More on those
below.

## Whole days, or an interval

`showTime` decides, and the reader never has to. A switch marked *All day*
asked them to classify their own answer before giving it, and left them
wondering what the hours they could see were for.

With `showTime: false` a period is whole days: the midnight that opens the
first to **the midnight after the last**, the exclusive end explained in
[What you get back](./values#whole-days-allday-and-the-end-you-don-t-see).

With `showTime: true` every chosen day carries an hour, midnight unless the
screen says otherwise:

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  showTime: true,
  defaultTimes: { start: '09:00', end: '18:00' },
});
```

A value handed to the field keeps its own hours — `defaultTimes` is only for
days picked afterwards — so a screen can open on a period it worked out
itself. And a shortcut named in days still means those days entirely: *This
quarter* ends at the midnight after 30 September, not at 30 September 00:00,
which would quietly drop the last day of it.

## One end, or none

`openEnded: true` lets a period stop at one end — the `>=` with no `<` that
most searches are. Each field then carries a cross: emptying *From* says
*until*, emptying *To* says *from*, and the field reads back as
`From 18/09/2026`. Nothing extra to learn, and nothing extra on screen.

It is off by default, because a booking form must not accept a stay that never
ends.

## The shortcuts

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  presets: ['thisQuarterHour', 'thisHour', 'today', 'last7Days', 'thisQuarter'],
});
```

| | |
|---|---|
| shorter than a day | `thisQuarterHour` · `lastHour` · `thisHour` · `nextHour` |
| days | `yesterday` · `today` · `tomorrow` · `last7Days` · `last14Days` · `last30Days` · `next7Days` · `next30Days` |
| calendar units | `thisWeek` · `lastWeek` · `thisMonth` · `lastMonth` · `thisQuarter` · `lastQuarter` · `nextQuarter` · `thisYear` |

The four shortest are two **moments**, not two dates — the quarter hour that is
running is 11:00 to 11:15 on one particular day — and they are rounded on the
zone's clock rather than on the epoch, or a zone offset by a quarter of an hour
would be rounded to somebody else's.

All of them are counted in the zone, which is the part other pickers get wrong:
ask for the last 7 days on 27 October in Paris and the answer is 169 hours, not
168, because one of those days had twenty-five.

`presets: []` removes the column. Your own are `{ name, label, range }`, and
may return either shape:

```js
{
  name: 'lastFiveMinutes',
  label: 'Last 5 minutes',
  step: { minutes: 5 },
  range: (today, { now, timeZone }) => ({ start: now.subtract({ minutes: 5 }), end: now }),
}
```

### A length, typed

`lengthBox: true` puts a box above them. No column holds every length someone
might want, and the people who read a filter screen all day know what they
want before it opens.

| | |
|---|---|
| `25mn` `25min` `25m` `25` | twenty-five minutes |
| `1h` | an hour |
| `3d` `3j` | three days |
| `2w` `2s` | two weeks |
| `6mo` | six months |

`m` is minutes and never months: `mo` says months, and a screen that read `6m`
as six months would be wrong by a factor of forty-odd thousand.

A length **never rewrites an end that is already there**. Someone with both
dates chosen who asks for fifteen minutes means the arrows — not "throw away
my end and make this fifteen minutes long".

| `lengthMeans` | with an end missing | with both dates chosen |
|---|---|---|
| `'period'` (default) | fills it from the start, or from now backwards | nothing but the step |
| `'step'` | nothing but the step | nothing but the step |

Either way the arrows end up moving by it, and emptying an end never forgets
the step — so a period can be opened at one end and go on being stepped by
what was typed.

## The arrows

```js
createRangeField(element, { timeZone: 'Europe/Paris', shift: 'auto' });
```

Off by default, because a field that means one chosen day has nothing to step
through. Given `'auto'`, one press moves by what the reader just asked for:
the shortcut they pressed, or — if they picked the days by hand — the length
of what is selected. A duration imposes the step instead, whatever is
selected, which is the way to move a three-day period a quarter of an hour at
a time:

```js
shift: { minutes: 15 }
```

A list puts a small button between the arrows and lets the reader choose:

```js
shift: [
  { step: 'auto', label: 'the period' },
  { step: { minutes: 15 }, label: '15 min' },
  { step: { days: 1 }, label: '1 day' },
]
```

Two details that are not guesswork. `'auto'` does not move a quarter by its
length in days: 92 days back from 1 July is 31 March, one day early and
drifting further on every press, so a span made of whole months moves by
months. And a period open at one end has no length at all, so `'auto'` moves
it by a day — the unit the calendar works in.

## The words above the fields

`labels` decides what is written above each field and between them: the words
from the messages by default, an icon, or nothing.

```js
labels: { start: null, end: null, between: '»' }
```

A node is taken as it is, so an application can put its own mark there. The
word is still read out to a screen reader whatever is drawn.

## The two mornings a year

On the morning the clocks go back, an hour happens twice, and a field reading
`02:30` could be either of them. Both are named rather than numbered, because
"heure d'été" is something a person can answer and `+02:00` is something they
have to work out.

The menus offer the hour twice and star the second — `02` and `02*` — with a
line under the field saying what the star means, lit when that reading is the
one in force. Naming both inside the list would widen the menu to the longest
word in the language, on every ordinary day of the year as much as on this
one. The figures cannot say it at all, so there a pair of buttons appears
instead. Either way the closed field says which was chosen:

```
25/10/2026 00:00 – 25/10/2026 02:30 (winter)
```

On the morning an hour is skipped, it cannot be landed on at all: the arrows
step over it and a time typed into the gap settles on the first moment that
exists.

## Nothing until Apply

`confirm: true` holds everything until **Apply** is pressed, for a search that
costs something to run. **Cancel** leaves the value where it was.
