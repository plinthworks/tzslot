# Without a framework

Every widget is a function. Call it with an element and some options, and it
returns an instance.

```js
import { createCalendar } from '@tzslot/dom';
import '@tzslot/theme';

const calendar = createCalendar(document.querySelector('#day'), {
  locale: 'en-GB',
  onChange: (day) => console.log(day?.toString()),
});
```

<Live widget="Calendar" :options="{ locale: 'en-GB' }" />

## Every widget, running

The nine factories, each on this page with nothing but `@tzslot/dom` behind
them. The line under each is its `onChange`.

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', months: 1 }" />

<Live widget="MultiDate" :options="{ timeZone: 'Europe/Paris', months: 1, maxDates: 3 }" />

<Live widget="DateField" :options="{ timeZone: 'Europe/Paris' }" />

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris' }" />

<Live widget="DateRange" :options="{ timeZone: 'Europe/Paris', months: 2 }" />

<Live widget="TimeSlots" :options="{ date: '2026-09-22', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '09:00', maxTime: '17:00' }" />

<Live widget="DateTimeRange" :options="{ timeZone: 'Europe/Paris' }" />

<Live widget="DailyRange" :options="{ timeZone: 'Europe/Paris' }" />

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, showTime: true }" />

## The instance

| | |
|---|---|
| `update(settings)` | Change any option. Never calls `onChange`: it is the outside telling the widget something, not the user doing it. |
| `clear()` | Empty the selection — and report it, because that is something the user asked for. |
| `destroy()` | Remove everything it drew and every listener it added. |
| `value` | What it holds, read at any time. |

Fields add `open()`, `close()` and `toggle()`; the calendar adds `goTo()` and
`setIcons()`.

```js
calendar.update({ min: Temporal.Now.plainDateISO() });
calendar.goTo({ year: 2027, month: 3 });
calendar.destroy();
```

## Starting from a value

Every widget takes its value among its options, so a screen can open on what
is already chosen:

```js
createDateTimeField(el, {
  timeZone: 'Europe/Paris',
  value: Temporal.Instant.from('2026-09-23T12:30:00Z'),
});
```

The shape is the one that widget reports: a `PlainDate` for a calendar or a
date field, an `Instant` where there is a time, an array of `PlainDate` for
`createMultiDate`, `{ start, end }` for a range, `{ start, end, allDay }` for
`createRangeField`.

`update({ value })` moves it afterwards and `update({ value: null })` empties
it — neither calls `onChange`, so an application that writes a value back into
the widget it came from will not loop. `goTo()` moves the month without
choosing anything.

## Styles

The layout comes with the widget: it injects one stylesheet per kind, once per
document, the first time one is drawn. Under a Content-Security-Policy that
forbids inline styles, pass `injectStyles: false` and include the exported
strings yourself.

```js
import { CALENDAR_CSS, FIELD_CSS } from '@tzslot/dom';
```

Colour is separate, and optional: see [Theming](./theming).

## Shadow DOM

A widget inside a shadow root puts its styles in that root rather than the
document, so it is styled wherever it is mounted.
