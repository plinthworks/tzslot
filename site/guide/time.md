# Choosing a time

Three ways, and `timeLayout` picks between them. They exist because asking for
"any time" and asking for "one of these times" are different questions.

## A compact field

`timeLayout="input"` — the default. Arrows, the wheel, the up and down keys,
and typing. Twelve-hour where the locale writes times that way.

<Live widget="TimeInput" :options="{ locale: 'en-GB', stepMinutes: 15, value: null }" />

Each field wraps inside itself: stepping the minutes past the hour would move
an appointment by an hour nobody asked for.

## Two menus

`timeLayout="select"` — an hour menu and a minute menu, down to the minute
(`minuteStep`, one minute by default). They are real `<select>` elements, so
the keyboard works, nothing can clip them, and a phone opens its own picker.

<Live widget="TimeSelect" :options="{ locale: 'en-GB', minuteStep: 15, date: '2026-10-25', timeZone: 'Europe/Paris' }" />

Given a day and a zone — which the fields pass — the menus show that day as it
really is. The example above is 25 October 2026 in Paris: **02 appears twice**,
summer and winter, and choosing one answers the question outright. On 29 March
it is missing altogether.

## The day's times

`timeLayout="list"` — every bookable time that day, which is what a booking
screen wants. The hour that cannot happen is struck through, the hour that
happens twice is offered twice, and `isDisabled` greys out what is already
taken.

<Live widget="TimeSlots" :options="{ date: '2026-10-25', timeZone: 'Europe/Paris', stepMinutes: 60, locale: 'en-GB' }" />

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
not offer it at all.
