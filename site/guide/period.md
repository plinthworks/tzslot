# Choosing a period

`createRangeField` — `<tz-range-field>` in Angular — is one field for a whole
period: a trigger that reads `18/09/2026 – 24/09/2026`, and a panel holding
everything needed to change it.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', months: 2, showTime: true, openEnded: true, shift: 'auto', weekNumbers: true }" />

Everything below is one option, with a working example under it. Each is
independent: what you see running is the code above it, nothing else.

## What it is for

### `title`

Written above the panel, and read out as the field's own label. A picker with
no subject is one the reader infers from whatever happens to sit beside it,
and two on the same screen are then told apart by position alone.

```js
createRangeField(element, { timeZone: 'Europe/Paris', title: 'Travel dates' });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', title: 'Travel dates' }" />

### `timeZone`

The only one with no default. Every date in the field means a moment in this
zone, and a period counted in it: ask for seven days across the October change
in Paris and the answer is 169 hours, not 168.

```js
createRangeField(element, { timeZone: 'Pacific/Auckland' });
```

<Live widget="RangeField" :options="{ timeZone: 'Pacific/Auckland', title: 'Auckland' }" />

### `locale`

What `Intl` writes: month names, the order of the figures, the first day of
the week unless you override it. It does not translate the widget's own words
— those are [`messages`](#messages).

```js
createRangeField(element, { timeZone: 'Europe/Paris', locale: 'ja-JP' });
```

<Live widget="RangeField" :options="{ timeZone: 'Asia/Tokyo', locale: 'ja-JP' }" />

### `value`

A period the field opens on, worked out by the application rather than picked.
Both ends are instants.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  showTime: true,
  value: {
    start: Temporal.Instant.from('2026-09-21T07:00Z'),
    end: Temporal.Instant.from('2026-09-25T16:00Z'),
    allDay: false,
  },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, value: { start: Temporal.Instant.from('2026-09-21T07:00Z'), end: Temporal.Instant.from('2026-09-25T16:00Z'), allDay: false } }" />

::: warning `allDay: false` is not optional here
Leave it out and the two ends are read as whole days: the hours stay in the
value but the field writes `21/09/2026 – 25/09/2026`, and the end counts as
the midnight **after** the last day. That is what `allDay` decides — see
[Whole days](./values#whole-days-allday-and-the-end-you-don-t-see). A value
with hours in it says so.
:::

## Days, or times

### `showTime`

`false` — the default — makes a period whole days: the midnight that opens the
first to **the midnight after the last**, the exclusive end explained in
[What you get back](./values#whole-days-allday-and-the-end-you-don-t-see).

```js
createRangeField(element, { timeZone: 'Europe/Paris', showTime: false });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: false, title: 'Whole days' }" />

`true` gives every chosen day an hour, midnight unless the screen says
otherwise. There is no *All day* switch: it asked the reader to classify their
own answer before giving it.

```js
createRangeField(element, { timeZone: 'Europe/Paris', showTime: true });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, title: 'With times' }" />

### `defaultTimes`

The hours a *newly chosen* day gets. A value handed in keeps its own, so a
screen can open on a period it computed and still offer office hours for
anything picked afterwards.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  showTime: true,
  defaultTimes: { start: '09:00', end: '18:00' },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, defaultTimes: { start: '09:00', end: '18:00' }, title: 'Office hours' }" />

### `timeLayout`

Two ways of asking for an hour. `'select'` is the default: an hour menu and a
minute menu, because most of the time an hour is chosen outright and a menu is
two clicks.

```js
createRangeField(element, { timeZone: 'Europe/Paris', showTime: true, timeLayout: 'select' });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, timeLayout: 'select', title: 'select' }" />

`'input'` puts an arrow above and below the figures. It suits nudging a time
already close to right, not choosing one from nothing.

```js
createRangeField(element, { timeZone: 'Europe/Paris', showTime: true, timeLayout: 'input' });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, timeLayout: 'input', title: 'input' }" />

### `minuteStep`

What the minute **menu** offers. `5` by default; the minute already held is
always in the list, whatever the step, or a value handed in would disappear
from the control meant to show it.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris', showTime: true, timeLayout: 'select', minuteStep: 30,
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, timeLayout: 'select', minuteStep: 30, title: 'Half hours only' }" />

### `stepMinutes`

What one press of the time **arrows** moves. Separate from `minuteStep`, which
is the menu: the two controls answer different questions.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris', showTime: true, timeLayout: 'input', stepMinutes: 15,
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, timeLayout: 'input', stepMinutes: 15, title: 'Quarter hours' }" />

### `snapMinutes`

Rounds whatever arrives — typed, chosen, or handed in — onto a grid. A
half-hour booking system has nothing to do with `10:07`.

```js
createRangeField(element, { timeZone: 'Europe/Paris', showTime: true, snapMinutes: 30 });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, snapMinutes: 30, title: 'Snapped to :00 and :30' }" />

## How long it may be

### `openEnded`

Lets a period stop at one end — the `>=` with no `<` that most searches are.
Each field carries a cross: emptying *From* says *until*, emptying *To* says
*from*. Off by default, because a booking form must not take a stay that never
ends.

```js
createRangeField(element, { timeZone: 'Europe/Paris', openEnded: true });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', openEnded: true, title: 'Open at one end' }" />

### `maxSpan`

The longest the period may be. Move one end past it and the **other** end
follows rather than the click being refused — a refusal leaves the reader
guessing which end was wrong.

```js
createRangeField(element, { timeZone: 'Europe/Paris', maxSpan: { days: 14 } });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', maxSpan: { days: 14 }, title: 'Two weeks at most' }" />

### `minSpan`

The same, the other way: a stay of at least two nights.

```js
createRangeField(element, { timeZone: 'Europe/Paris', minSpan: { days: 2 } });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', minSpan: { days: 2 }, title: 'Two nights minimum' }" />

Both take the short forms below as well: `maxSpan: '3d'`.

## The shortcuts

### `presets`

Named ranges down the side of the panel, shortest first, so a reader scanning
the column can stop as soon as it overshoots.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  presets: ['thisQuarterHour', 'thisHour', 'today', 'last7Days', 'thisQuarter'],
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, presets: ['thisQuarterHour', 'thisHour', 'today', 'last7Days', 'thisQuarter'] }" />

| | |
|---|---|
| shorter than a day | `thisQuarterHour` · `lastHour` · `thisHour` · `nextHour` |
| days | `yesterday` · `today` · `tomorrow` · `last7Days` · `last14Days` · `last30Days` · `next7Days` · `next30Days` |
| calendar units | `thisWeek` · `lastWeek` · `thisMonth` · `lastMonth` · `thisQuarter` · `lastQuarter` · `nextQuarter` · `thisYear` |

The four shortest are two **moments**, not two dates — the quarter hour that is
running is 11:00 to 11:15 on one particular day — and they are rounded on the
zone's clock rather than on the epoch, or a zone offset by a quarter of an hour
would be rounded to somebody else's.

`presets: []` removes the column entirely:

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', presets: [], title: 'No shortcuts' }" />

Your own are `{ name, label, range }`, and may return either shape. A `step`
of its own says what the arrows move by once it has been pressed:

```js
presets: [
  'today',
  {
    name: 'lastFiveMinutes',
    label: 'Last 5 minutes',
    step: { minutes: 5 },
    range: (today, { now, timeZone }) => ({ start: now.subtract({ minutes: 5 }), end: now }),
  },
]
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, shift: 'auto', presets: ['today', { name: 'lastFiveMinutes', label: 'Last 5 minutes', step: { minutes: 5 }, range: (today, ctx) => ({ start: ctx.now.subtract({ minutes: 5 }), end: ctx.now }) }] }" />

## The arrows

### `shift`

Off by default, because a field meaning one chosen day has nothing to step
through. `'auto'` moves by what the reader just asked for: the shortcut they
pressed, or the length of what is selected.

```js
createRangeField(element, { timeZone: 'Europe/Paris', shift: 'auto' });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', shift: 'auto', presets: ['today', 'thisWeek', 'thisMonth', 'thisQuarter'], title: 'auto' }" />

A duration imposes the step instead, whatever is selected — the way to move a
three-day period a quarter of an hour at a time:

```js
shift: { minutes: 15 }
shift: '15mn'   // the same, and how a screen says it in one word
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, shift: '15mn', title: 'A quarter hour a press' }" />

| | |
|---|---|
| `25mn` `25min` `25m` | twenty-five minutes |
| `1h` | an hour |
| `3d` `3j` | three days |
| `2w` `2s` | two weeks |
| `6mo` | six months |

`m` is minutes and never months: `mo` says months, and a screen that read `6m`
as six months would be wrong by a factor of forty-odd thousand.

A list puts a small button between the arrows and lets the reader choose. The
labels are yours — a step has no name the library could invent.

```js
shift: [
  { step: 'auto', label: 'the period' },
  { step: { minutes: 15 }, label: '15 min' },
  { step: { days: 1 }, label: '1 day' },
]
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, shift: [{ step: 'auto', label: 'the period' }, { step: { minutes: 15 }, label: '15 min' }, { step: { days: 1 }, label: '1 day' }], title: 'Pick the step' }" />

Two details that are not guesswork. `'auto'` does not move a quarter by its
length in days: 92 days back from 1 July is 31 March, one day early and
drifting further on every press, so a span made of whole months moves by
months. And a period open at one end has no length at all, so `'auto'` moves
it by a day — the unit the calendar works in.

## The calendar inside

### `months`

How many months stand side by side. Two suits a period that usually crosses
one boundary; one suits a narrow screen.

```js
createRangeField(element, { timeZone: 'Europe/Paris', months: 2 });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, title: 'Two months' }" />

### `weekNumbers`

A column of ISO week numbers down the left, for the people who plan in them.

```js
createRangeField(element, { timeZone: 'Europe/Paris', weekNumbers: true });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', weekNumbers: true, title: 'ISO weeks' }" />

### `firstDayOfWeek`

`1` is Monday through `7` Sunday. Left out, the locale decides — which is
right far more often than a hard-coded Monday.

```js
createRangeField(element, { timeZone: 'America/New_York', locale: 'en-US', firstDayOfWeek: 7 });
```

<Live widget="RangeField" :options="{ timeZone: 'America/New_York', locale: 'en-US', firstDayOfWeek: 7, title: 'Weeks start Sunday' }" />

### `min` and `max`

The window of days that can be chosen at all. Outside it the days are there,
greyed, rather than absent: a calendar that simply stops gives the reader no
way to tell a limit from a bug.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  min: Temporal.PlainDate.from('2026-09-01'),
  max: Temporal.PlainDate.from('2026-12-31'),
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', min: Temporal.PlainDate.from('2026-09-01'), max: Temporal.PlainDate.from('2026-12-31'), title: 'This quarter only' }" />

### `isDateDisabled`

Anything the two bounds cannot express. Called for every day drawn, so keep it
a lookup rather than a request.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  // Weekends are not working days.
  isDateDisabled: (date) => date.dayOfWeek > 5,
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', isDateDisabled: (date) => date.dayOfWeek > 5, title: 'Working days' }" />

### `renderCell`

A short line under a day — a price, places left, *full* — plus your own
classes, a tooltip, and the power to rule the day out. It runs for every cell
on every repaint.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  renderCell: ({ date, outside }) => {
    if (outside) return;
    const price = 80 + (date.day % 7) * 15;
    return date.dayOfWeek > 5
      ? { note: 'full', disabled: true, title: 'No rooms left' }
      : { note: `€${price}`, className: price > 140 ? 'peak' : undefined };
  },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 1, renderCell: (cell) => cell.outside ? undefined : (cell.date.dayOfWeek > 5 ? { note: 'full', disabled: true, title: 'No rooms left' } : { note: '€' + (80 + (cell.date.day % 7) * 15) }), title: 'Prices' }" />

The note is text, never HTML: a price coming from a booking system is data,
and a grid that renders data as markup is one injection away from being
someone else's page.

## The field itself

### `disabled`

`true` freezes the whole field. An object freezes **one end** — a stay whose
arrival is settled and whose departure is still open:

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  value: { start: Temporal.Instant.from('2026-09-21T07:00Z'), end: null, allDay: false },
  openEnded: true,
  disabled: { start: true },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', openEnded: true, showTime: true, disabled: { start: true }, value: { start: Temporal.Instant.from('2026-09-21T07:00Z'), end: null, allDay: false }, title: 'Arrival settled' }" />

### `mode`

`'popup'` by default — a panel hanging from the field. `'dialog'` centres it
over a backdrop, which is what a small screen wants.

```js
createRangeField(element, { timeZone: 'Europe/Paris', mode: 'dialog' });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', mode: 'dialog', title: 'As a dialog' }" />

### `placeholder`

What the closed field reads when nothing is chosen.

```js
createRangeField(element, { timeZone: 'Europe/Paris', placeholder: 'Any dates' });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', placeholder: 'Any dates' }" />

### `ariaLabel`

For a field with no `title` and no visible label of its own — a filter in a
toolbar, say. It is read out and never drawn.

```js
createRangeField(element, { timeZone: 'Europe/Paris', ariaLabel: 'Filter by date' });
```

### `format`

Imposes a pattern on both the writing and the typing, over whatever the locale
would do.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris', showTime: true, format: 'yyyy-MM-dd HH:mm',
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, format: 'yyyy-MM-dd HH:mm', title: 'ISO-ish' }" />

### `mask`

On by default: separators appear as the figures are typed, and never while
deleting — a mask that fights the backspace key is worse than none.

```js
createRangeField(element, { timeZone: 'Europe/Paris', mask: false });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', mask: false, title: 'Type it all yourself' }" />

### `displayWith`

The last word on what the closed field reads. Everything else — locale,
`format` — is a way of not having to write this.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  displayWith: (value, timeZone) =>
    !value.start || !value.end
      ? 'Choose your nights'
      : `${value.start.toZonedDateTimeISO(timeZone).day} → ${value.end.toZonedDateTimeISO(timeZone).day} of the month`,
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', displayWith: (value, tz) => (!value.start || !value.end) ? 'Choose your nights' : (value.start.toZonedDateTimeISO(tz).day + ' → ' + value.end.toZonedDateTimeISO(tz).day + ' of the month') }" />

### `fieldIcon` and `fieldIconSide`

Each field carries a calendar, before the text by default. Pass a node of your
own, or `null` for none.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  fieldIcon: icon('clock'),   // or a node of your own, or null
  fieldIconSide: 'end',
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, fieldIcon: icon('clock'), fieldIconSide: 'end', title: 'A clock, at the far end' }" />

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', fieldIcon: null, title: 'No icon' }" />

The drawings are the library's own — a 24 by 24 box, a two-unit stroke, round
caps, the rules the Lucide and Feather families follow — so they sit beside
those icons without looking borrowed. They are not taken from either: a
library that pulls in an icon set makes every consumer carry it, and one that
asks for it makes every consumer install it before a field will render.

They are drawn in `currentColor` at `1em`, so they take the weight of the text
beside them and follow it into a dark theme without being told, and they never
take a click. `icon('calendar')` from `@tzslot/dom` gives you the same node
elsewhere; `'clock'`, `'chevronLeft'`, `'chevronRight'` and `'x'` are there
too.

### `labels`

What is written above each field and between them: the words from the messages
by default, a node of your own, or nothing.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  labels: { start: null, end: null, between: '»' },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', labels: { start: null, end: null, between: '»' }, title: 'An arrow instead of words' }" />

```js
labels: { start: 'Arrival', end: 'Departure', between: '→' }
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', labels: { start: 'Arrival', end: 'Departure', between: '→' }, title: 'Your own words' }" />

The word is still read out to a screen reader whatever is drawn.

### `messages`

Every word the library says itself, in one object. `EN` and `FR` ship with it;
override the few you want rather than writing the bundle out.

```js
import { EN } from '@tzslot/dom';

createRangeField(element, {
  timeZone: 'Europe/Paris',
  confirm: true,
  messages: { ...EN, apply: 'Search', cancel: 'Never mind' },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', confirm: true, messages: { ...EN, apply: 'Search', cancel: 'Never mind' }, title: 'Your own wording' }" />

### `today` and `now`

The day the grid rings, and the moment the sub-day shortcuts count from. Both
exist so a test does not drift with the clock — and so a screen showing
somebody else's day can say so.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  today: Temporal.PlainDate.from('2026-12-24'),
  now: Temporal.Instant.from('2026-12-24T11:07:00Z'),
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, presets: ['thisQuarterHour', 'thisHour', 'today'], today: Temporal.PlainDate.from('2026-12-24'), now: Temporal.Instant.from('2026-12-24T11:07:00Z'), title: 'Christmas Eve, 12:07 in Paris' }" />

### `confirm`

Holds everything until **Apply** is pressed, for a search that costs something
to run. **Cancel** leaves the value where it was.

```js
createRangeField(element, { timeZone: 'Europe/Paris', confirm: true });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', confirm: true, title: 'Nothing until Apply' }" />

### `onChange`, `onOpen`, `onClose`

`onChange` hands you the value each time it settles — with `confirm: true`,
that means on **Apply**, not on every click inside the panel. The line under
every example on this page is an `onChange`.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  onChange: (value) => console.log(value.start, value.end),
  onOpen: () => console.log('panel open'),
  onClose: () => console.log('panel closed'),
});
```

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
typed: type `03/02/2028` and the grid is already there for the next click. The
pattern is never shown as a placeholder — a field explaining its own format
before anything is typed is a field asking a question instead of inviting an
answer.

## The two mornings a year

On the morning the clocks go back, an hour happens twice, and a field reading
`02:30` could be either of them. Both are named rather than numbered, because
"summer time" is something a person can answer and `+02:00` is something they
have to work out.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  showTime: true,
  today: Temporal.PlainDate.from('2026-10-25'),
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, months: 1, today: Temporal.PlainDate.from('2026-10-25'), value: { start: Temporal.Instant.from('2026-10-24T22:00Z'), end: Temporal.Instant.from('2026-10-25T00:30Z'), allDay: false }, title: 'The morning the clocks go back' }" />

The menus offer the hour twice and star the second — `02` and `02*` — with a
line under the field naming the reading in force: *summer*, or *\* winter*
when the starred one is the answer, which is the moment the mark needs
explaining. Naming both inside the list would widen the menu to the longest
word in the language, on every ordinary day of the year as much as on this
one. Either way the closed field says which was chosen:

```
25/10/2026 00:00 – 25/10/2026 02:30 (winter)
```

On the morning an hour is skipped, it cannot be landed on at all: the arrows
step over it and a time typed into the gap settles on the first moment that
exists.
