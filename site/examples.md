# Examples

Every widget below is running on this page. Click them.

## A calendar

```js
createCalendar(element, { locale: 'en-GB', buttons: ['today', 'clear'] });
```

<Live widget="Calendar" :options="{ locale: 'en-GB', buttons: ['today', 'clear'] }" />

Six weeks always, so the page does not jump between months. Arrow keys move a
day, PageUp and PageDown a month, Home and End across the week, and the title
zooms out to months and then years — four clicks to a date three hundred away.

## Week numbers

```js
createCalendar(element, { locale: 'en-GB', weekNumbers: true });
```

<Live widget="Calendar" :options="{ locale: 'en-GB', weekNumbers: true }" />

ISO week numbers, taken from the first day of each row, so they follow
`firstDayOfWeek`. Every widget with a calendar takes the option, panels
included.

## A field

```js
createDateField(element, { locale: 'en-GB', mode: 'popup' });
```

<Live widget="DateField" :options="{ locale: 'en-GB' }" />

`mode: 'dialog'` centres the panel over the page instead of hanging it under
the field.

## A date and a time

```js
createDateTimeField(element, {
  timeZone: 'Europe/Paris',
  locale: 'en-GB',
  buttons: ['today', 'clear'],
});
```

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', buttons: ['today', 'clear'] }" />

Type in it: the separators appear as you go. Try **25/10/2026 02:30** — that
clock face happens twice in Paris that morning, so it asks which one you mean
and then writes the answer into the text.

## Several days

```js
createMultiDate(element, { locale: 'en-GB', maxDates: 5 });
```

<Live widget="MultiDate" :options="{ locale: 'en-GB', maxDates: 5 }" />

A click adds a day, a second click takes it away, and the value stays in date
order. Once five are chosen the others stop taking clicks.

## A range of days

```js
createDateRange(element, {
  locale: 'en-GB',
  isDateDisabled: (day) => day.dayOfWeek > 5,   // weekends are closed
});
```

<Live widget="DateRange" :options="{ locale: 'en-GB', isDateDisabled: (d) => d.dayOfWeek > 5 }" />

The run under the pointer is the run that will be chosen. A range that would
step over a closed day is refused, with a word saying why.

## The times on one day

```js
createTimeSlots(element, {
  date: '2026-10-25',
  timeZone: 'Europe/Paris',
  stepMinutes: 60,
  isDisabled: (slot) => slot.time.hour === 13,  // lunch is taken
});
```

<Live widget="TimeSlots" :options="{ date: '2026-10-25', timeZone: 'Europe/Paris', stepMinutes: 60, locale: 'en-GB', isDisabled: (slot) => slot.time.hour === 13 }" />

This is the morning the clocks go back in Paris: **02:00 appears twice**, told
apart by its offset. An hour apart, and the value you get is the one you
clicked. On 29 March the same list shows 02:00 struck through, because it does
not happen.

## An interval

```js
createDateTimeRange(element, { timeZone: 'Europe/Paris', locale: 'en-GB' });
```

<Live widget="DateTimeRange" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB' }" />

Try 24/10/2026 23:00 to 25/10/2026 05:00: six hours on the clock, seven in
fact, and it says so rather than leaving you to notice.

## A period, in one field

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  locale: 'en-GB',
  showTime: true,
  openEnded: true,
  months: 2,
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', months: 2, weekNumbers: true, showTime: true, openEnded: true }" />

Two fields in the panel, one per end: a click fills the armed one, so
correcting the end does not throw the start away. Both are typed into, which
is what a period ending in February 2028 really needs. The shortcuts run
shortest to longest, and `openEnded` lets a field be emptied — *from the 18th*
with no end is what most searches mean.

The whole of it is in [Choosing a period](./guide/period): the shortcuts, the
arrows, the words above the fields, and the two mornings a year when an hour
is not what it looks like.

## Stepping a period

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  locale: 'en-GB',
  presets: ['thisQuarter', 'lastQuarter', 'nextQuarter'],
  shift: { months: 3 },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', months: 2, shift: { months: 3 }, presets: ['thisQuarter', 'lastQuarter', 'nextQuarter', 'last7Days', 'thisMonth'] }" />

A report is read by comparing: this quarter against the one before, this week
against the last. Through a calendar that is four clicks. The arrows make it
one, and they appear only where you ask for them — a field that means one
chosen day has nothing to step through.

A step in months moves by months, which is not the same as moving by a length
in days. The third quarter of 2026 is 92 days long; stepping back 92 days from
1 July lands on 31 March — one day early, and drifting further on every press.
Said in months it cannot drift, and the end is recomputed so a quarter still
finishes on its own last day.

### Shortcuts shorter than a day

Two of the shortcuts are shorter than a day, and those are two *moments*, not
two dates — 21/09/2026 11:00 to 11:15, counted from the clock in the widget's
zone. A shortcut computes a value; the step of the arrows is the screen's, and
pressing one never changes the other.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  shift: { months: 3 },
  presets: ['thisQuarterHour', 'thisHour', 'thisQuarter', 'last7Days'],
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', months: 2, shift: 15, showTime: true, presets: ['thisQuarterHour', 'thisHour', 'thisQuarter', 'last7Days'] }" />

A shortcut of your own returns two moments in the same way:

```js
{
  name: 'lastFiveMinutes',
  label: 'Last 5 minutes',
  step: { minutes: 5 },
  range: (today, { now, timeZone }) => ({ start: now.subtract({ minutes: 5 }), end: now }),
}
```

A fixed step is a duration, and it wins over whatever is selected — which is
the way to step a period by something smaller than itself:

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  showTime: true,
  shift: { minutes: 15 },
});
```

18/09 10:00 to 21/09 05:00 then moves to 10:15 and 05:15, both ends together:
the distance between them never changes, and three days apart is no reason not
to move by a quarter of an hour.

Give a list instead and the reader chooses: a button between the arrows shows the current
step and advances to the next each press.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  shift: [
    { step: { days: 7 }, label: '7 days' },
    { step: { months: 3 }, label: 'a quarter' },
  ],
});
```

The label is yours to write: only the application knows whether its readers
say "15 min", "quarter hour" or "un quart d'heure".

On a single moment — `createDateTimeField` — the step is always explicit,
because one moment has no length of its own to follow:

```js
createDateTimeField(element, { timeZone: 'Europe/Paris', shift: { minutes: 15 } });

// or let the reader pick
createDateTimeField(element, {
  timeZone: 'Europe/Paris',
  shift: [
    { step: { minutes: 15 }, label: '15 min' },
    { step: { hours: 1 }, label: '1 h' },
    { step: { days: 1 }, label: '1 day' },
  ],
});
```

It is counted on the zone's clocks, not in milliseconds: an hour after the
first 02:30 on 25 October in Paris is the *second* 02:30, and a day after
15:00 that afternoon is 15:00 the next day — twenty-five hours later.

## A whole day, or an interval

```js
createDateTimeRange(element, { timeZone: 'Europe/Paris', locale: 'en-GB' });
```

<Live widget="DateTimeRange" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', allDay: true }" />

A search over "the 24th to the 26th" and one over "23:00 to 05:00" are the
same widget with the switch in two positions. Whole days run midnight to
midnight, and the value says which it is:

```js
{
  start: Instant,  // the 24th at 00:00 in the zone
  end:   Instant,  // the 27th at 00:00 — the midnight after the last day
  allDay: true,
}
```

The end is **exclusive** on purpose, so a query reads `start >= from AND
start < to` and nothing falls through a gap at 23:59:59. Turn the switch off
and the ends become moments again, at the midnights they were.

`[allDaySwitch]="false"` hides the switch, for a screen that only ever deals
in whole days — or only in intervals.

**This is the only widget with that switch.** The field in
[Choosing a period](./guide/period) has none: it reads whole days off the two
moments, `end` being
[the midnight after the last day](./guide/values#whole-days-and-the-end-you-don-t-see).
Take this one when the flag itself has to travel to a back end; take that one
when the two moments are allowed to say it on their own.

## The same hours every day

```js
createDailyRange(element, { timeZone: 'Europe/Paris', locale: 'en-GB', stepMinutes: 30 });
```

<Live widget="DailyRange" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', stepMinutes: 30 }" />

Pick 23 to 26 October and 22:00 to 06:00: four night shifts, 33 hours rather
than 32, and the night that differs is named.
