# Choosing a time

Three ways, and `timeLayout` picks between them inside a field. On their own
they are `createTimeInput`, `createTimeSelect` and `createTimeSlots`. They
exist because asking for "any time" and asking for "one of these times" are
different questions.

Every option of the three has a working example below it.

## A compact field — `createTimeInput`

In Angular it is `<tz-time-input>`, a `ControlValueAccessor` like the rest —
so it goes straight into a reactive form:

```html
<tz-time-input formControlName="startTime" [stepMinutes]="15" [date]="day()" [timeZone]="zone" />
```

The control holds a `PlainTime`: a clock face, with no day and no zone. The
day and the zone are what turn it into a moment — press the arrows on the
morning an hour is skipped and watch it stepped over:

<Live widget="TimeInput" :options="{ locale: 'en-GB', stepMinutes: 15, date: '2026-03-29', timeZone: 'Europe/Paris', value: Temporal.PlainTime.from('03:00') }" />


`timeLayout: 'input'`. Arrows, the wheel, the up and down keys, and typing.
Twelve-hour where the locale writes times that way.

<Live widget="TimeInput" :options="{ locale: 'en-GB' }" />

Each field wraps inside itself: stepping the minutes past the hour would move
an appointment by an hour nobody asked for.

### `stepMinutes`

What one press of an arrow moves. `5` by default.

```js
createTimeInput(element, { stepMinutes: 15 });
```

<Live widget="TimeInput" :options="{ locale: 'en-GB', stepMinutes: 15 }" />

### `value`

The time it opens on, as a `PlainTime` — a clock face, with no day and no zone
attached. The day and the zone are what turn it into a moment, and they are
[`date`](#date-and-timezone) and [`timeZone`](#date-and-timezone) below.

```js
createTimeInput(element, { value: Temporal.PlainTime.from('09:30') });
```

<Live widget="TimeInput" :options="{ locale: 'en-GB', value: Temporal.PlainTime.from('09:30') }" />

### `minTime` and `maxTime`

The window the arrows and the typing stay inside. Both take a `PlainTime` or
the string for one.

```js
createTimeInput(element, { minTime: '08:00', maxTime: '19:30' });
```

<Live widget="TimeInput" :options="{ locale: 'en-GB', minTime: '08:00', maxTime: '19:30' }" />

### `variant`

`'boxed'` by default — a bordered field. `'bare'` drops the box and stacks the
arrows above and below the figures, which is how the fields draw it inside a
panel.

<Live widget="TimeInput" :options="{ locale: 'en-GB', variant: 'bare' }" />

### `locale`

Decides twelve or twenty-four hour, because that is what the locale writes.
Nothing else about this control changes.

```js
createTimeInput(element, { locale: 'en-US' });
```

<Live widget="TimeInput" :options="{ locale: 'en-US', value: Temporal.PlainTime.from('14:30') }" />

### `date` and `timeZone`

Given both, the control knows which day it is standing on, and the two
mornings a year stop being ordinary. Without them it is a clock face and
nothing more.

```js
createTimeInput(element, { date: '2026-10-25', timeZone: 'Europe/Paris' });
```

<Live widget="TimeInput" :options="{ locale: 'en-GB', date: '2026-10-25', timeZone: 'Europe/Paris', value: Temporal.PlainTime.from('02:30') }" />

Step down from 03:00 on 29 March and the arrow lands on 01:59: the hour
between does not exist in Paris that morning.

<Live widget="TimeInput" :options="{ locale: 'en-GB', date: '2026-03-29', timeZone: 'Europe/Paris', value: Temporal.PlainTime.from('03:00') }" />

### `disabled`

```js
createTimeInput(element, { disabled: true });
```

<Live widget="TimeInput" :options="{ locale: 'en-GB', value: Temporal.PlainTime.from('09:30'), disabled: true }" />

## Two menus — `createTimeSelect`

In Angular it is `<tz-time-select>`, with one output the DOM version returns
as a second argument:

```html
<tz-time-select
  formControlName="startTime"
  [date]="day()"
  [timeZone]="zone"
  [minuteStep]="15"
  (offsetChange)="form.get('startOffset')?.setValue($event)" />
```

`offsetChange` says **which reading** of a repeated hour was taken — `+02:00`
or `+01:00`. On an ordinary hour it means nothing; on 25 October it is the
difference between two moments an hour apart, so a form that stores instants
has to carry it.

Choose `02` twice below — the two entries are the same clock face and two
different moments, and the line underneath is what `offsetChange` hands your
form:

<Live
  widget="TimeSelect"
  :options="{ locale: 'en-GB', minuteStep: 15, date: '2026-10-25', timeZone: 'Europe/Paris', readingStyle: 'marked' }"
  :show="(time, offset) => time ? `value ${time}` + (offset ? `  ·  offsetChange → ${offset}` : '  ·  offsetChange → null') : 'nothing chosen'"
/>


`timeLayout: 'select'`. An hour menu and a minute menu. They are real
`<select>` elements, so the keyboard works, nothing can clip them, and a phone
opens its own picker.

<Live widget="TimeSelect" :options="{ locale: 'en-GB' }" />

### `minuteStep` and `hourStep`

What each menu offers. One minute by default, which is a long menu — half
hours are what most screens want. The value already held is always in the
list, whatever the step, or a time handed in would vanish from the control
meant to show it.

```js
createTimeSelect(element, { minuteStep: 30 });
```

<Live widget="TimeSelect" :options="{ locale: 'en-GB', minuteStep: 30 }" />

```js
createTimeSelect(element, { hourStep: 2, minuteStep: 15 });
```

<Live widget="TimeSelect" :options="{ locale: 'en-GB', hourStep: 2, minuteStep: 15 }" />

### `date` and `timeZone`

Given a day and a zone — which the fields pass — the menus show that day as it
really is. Below is 25 October 2026 in Paris: **02 appears twice**, and
choosing one answers the question outright.

```js
createTimeSelect(element, { date: '2026-10-25', timeZone: 'Europe/Paris' });
```

<Live widget="TimeSelect" :options="{ locale: 'en-GB', minuteStep: 30, date: '2026-10-25', timeZone: 'Europe/Paris' }" />

On 29 March the hour is missing altogether — there is no 02 in the menu:

<Live widget="TimeSelect" :options="{ locale: 'en-GB', minuteStep: 30, date: '2026-03-29', timeZone: 'Europe/Paris' }" />

### `readingStyle`

How the repeated hour is shown. `'named'` — the default — writes the hour once
and names the reading in force under the control. `'marked'` puts both in the
menu, `02` and `02*`.

<Live widget="TimeSelect" :options="{ locale: 'en-GB', minuteStep: 30, date: '2026-10-25', timeZone: 'Europe/Paris', readingStyle: 'marked', value: Temporal.PlainTime.from('02:30') }" />

### `offset`

Which reading of an ambiguous time is held, as `+02:00` or `+01:00`. It is the
second argument `onChange` hands back, and the way to hand one in. On an
unambiguous time it means nothing and is ignored.

```js
createTimeSelect(element, {
  date: '2026-10-25', timeZone: 'Europe/Paris',
  value: Temporal.PlainTime.from('02:30'), offset: '+01:00',   // winter
});
```

<Live widget="TimeSelect" :options="{ locale: 'en-GB', minuteStep: 30, date: '2026-10-25', timeZone: 'Europe/Paris', value: Temporal.PlainTime.from('02:30'), offset: '+01:00' }" />

### `minTime` and `maxTime`

```js
createTimeSelect(element, { minTime: '09:00', maxTime: '17:00' });
```

<Live widget="TimeSelect" :options="{ locale: 'en-GB', minuteStep: 30, minTime: '09:00', maxTime: '17:00' }" />

## The day's times — `createTimeSlots`

`timeLayout: 'list'`. Every bookable time that day, which is what a booking
screen wants. The value is an `Instant`: a slot is a moment, not a clock face.

<Live widget="TimeSlots" :options="{ date: '2026-09-22', timeZone: 'Europe/Paris' }" />

### `stepMinutes`

How far apart the slots are. Thirty minutes by default.

```js
createTimeSlots(element, { date: '2026-09-22', timeZone: 'Europe/Paris', stepMinutes: 60 });
```

<Live widget="TimeSlots" :options="{ date: '2026-09-22', timeZone: 'Europe/Paris', stepMinutes: 60 }" />

### `minTime` and `maxTime`

The opening hours. Without them the list runs the whole day.

```js
createTimeSlots(element, {
  date: '2026-09-22', timeZone: 'Europe/Paris',
  stepMinutes: 30, minTime: '09:00', maxTime: '12:00',
});
```

<Live widget="TimeSlots" :options="{ date: '2026-09-22', timeZone: 'Europe/Paris', stepMinutes: 30, minTime: '09:00', maxTime: '12:00' }" />

### `isDisabled`

What is already taken. Called for every slot, so keep it a lookup.

A slot carries `time` (the clock face), `exists`, `ambiguous`, `offsets` and
`instants` — the moments that wall time maps to, which is what a booking
system stores.

```js
createTimeSlots(element, {
  date: '2026-09-22', timeZone: 'Europe/Paris',
  isDisabled: (slot) => slot.instants.some((at) => booked.has(at.toString())),
});
```

<Live widget="TimeSlots" :options="{ date: '2026-09-22', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '09:00', maxTime: '17:00', isDisabled: (slot) => [11, 14].includes(slot.time.hour) }" />

### The two mornings, in a list

On the morning the clocks go back the hour is offered **twice**, with the
offsets underneath, because both are real slots someone could book:

<Live widget="TimeSlots" :options="{ date: '2026-10-25', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '00:00', maxTime: '05:00' }" />

On the morning one is skipped it is struck through and cannot be chosen:

<Live widget="TimeSlots" :options="{ date: '2026-03-29', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '00:00', maxTime: '05:00' }" />

### `skipNonExistent`

Leaves the impossible hour out of the list instead of striking it through. The
default shows it, because a reader who expected 02:30 and cannot find it will
look for the bug in your booking system.

<Live widget="TimeSlots" :options="{ date: '2026-03-29', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '00:00', maxTime: '05:00', skipNonExistent: true }" />

### `emptyLabel`, `missingLabel` and `ariaLabel`

What the list says when nothing fits between `minTime` and `maxTime`, what it
writes under a struck-through hour, and what a screen reader calls the list
itself.

`emptyLabel` is what the list says when the day offers nothing at all — no
date given, or a window that holds no slot:

```js
createTimeSlots(element, {
  date: '2026-12-25', timeZone: 'Europe/Paris',
  minTime: '19:00', maxTime: '18:00',       // a window holding nothing
  emptyLabel: 'Closed on Christmas Day',
  ariaLabel: 'Available appointments',
});
```

<Live widget="TimeSlots" :options="{ date: '2026-12-25', timeZone: 'Europe/Paris', minTime: '19:00', maxTime: '18:00', emptyLabel: 'Closed on Christmas Day', ariaLabel: 'Available appointments' }" />

It needs a day: with no `date` at all the list draws nothing rather than
saying a day offers nothing, which would be a different claim.

`missingLabel` replaces the word written inside a struck-through hour —
*skipped* by default, and it has to stay short, because it sits in a button
the width of a time:

<Live widget="TimeSlots" :options="{ date: '2026-03-29', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '00:00', maxTime: '05:00', missingLabel: 'n/a' }" />

## The hour that happens twice

Whichever way the time is asked for, the value is an `Instant` — a moment, not
a clock face. When the clock face is ambiguous:

- the **menus** offer both readings, named *summer* and *winter*;
- the **compact field** asks, once, with the same two words, and the field's
  own text then says which it holds: `25/10/2026 02:30 (winter)`;
- the **list** shows both, with their offsets underneath.

## The hour that does not exist

Typing it moves to the first moment that does exist and says so. The arrows
step over it — 03:00 down is 01:00 on that morning. The menus and the list do
not offer it at all, unless `skipNonExistent` is off, where the list shows it
struck through.
