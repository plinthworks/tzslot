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

## The same hours every day

```js
createDailyRange(element, { timeZone: 'Europe/Paris', locale: 'en-GB', stepMinutes: 30 });
```

<Live widget="DailyRange" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', stepMinutes: 30 }" />

Pick 23 to 26 October and 22:00 to 06:00: four night shifts, 33 hours rather
than 32, and the night that differs is named.
