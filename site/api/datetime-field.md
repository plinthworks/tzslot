<!-- Written by scripts/api.mjs from packages/dom/src/datetime-field.ts. Do not edit. -->

# createDateTimeField · `<tz-datetime-field>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `Instant \| null` | `null` | A moment, because a date and a wall time alone are not one. |
| `timeZone` | `string` | `Temporal.Now.timeZoneId()` | An IANA identifier. The date and the time are read on this zone's clocks. |
| `mode` | `FieldMode` | `'popup'` | 'popup' hangs the panel under the field; 'dialog' centres it over the page. |
| `placeholder` | `string \| undefined` | — | What the field shows while it holds nothing. |
| `ariaLabel` | `string \| undefined` | — | The accessible name, for a screen reader. |
| `locale` | `string \| undefined` | — | A BCP-47 tag for the month and weekday names, and the order of a date. The browser's own when left out. |
| `firstDayOfWeek` | `1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| undefined` | — | Where the week starts, 1 for Monday through 7 for Sunday. Left out, the locale decides — Monday in France, Sunday in the United States. Set it only where a business disagrees with its own locale. |
| `min` | `PlainDate \| null` | `null` | The earliest day that can be chosen. |
| `max` | `PlainDate \| null` | `null` | The latest day that can be chosen. |
| `isDateDisabled` | `((date: PlainDate) => boolean) \| undefined` | — | Rules out individual days inside the range: closures, weekends, days already full. |
| `showTime` | `boolean` | `true` | Whether a time is asked for at all. False leaves a field that chooses a day and holds the moment it starts — what a whole-day range needs, with everything else about the field unchanged. |
| `snapMinutes` | `number \| null` | `null` | Move a typed time to the nearest mark of this grid — 15 for quarter-hour appointments, ties upward. Off by default: a screen that accepts any minute must not have them quietly moved. |
| `shift` | `boolean \| DurationLike \| readonly ShiftOption[]` | `false` | How far one press of an arrow moves the moment, and whether there are arrows at all. `false` — the default — draws none. `true` draws them and moves by a day, which is what one date is chosen in. A duration imposes the step, in whatever shape the business needs; a list offers several and lets the reader pick between them, `showStep` deciding whether that picker shows. Counted on the zone's clocks, so an hour is an hour of real time on the two mornings that are not twenty-four hours long. |
| `showStep` | `boolean` | `true` | Whether the step sits between the arrows, where the reader can read it and press it. It appears when `shift` is a list; a list of one shows the step without handing it over. `false` hides it even then. |
| `timeLayout` | `TimeLayout` | `'input'` | How the time is chosen: a compact field, two menus, or the day's times. |
| `stepMinutes` | `number` | `30` | Minutes between the times offered. |
| `minuteStep` | `number` | `1` | With 'select': minutes between the options. Every minute by default. |
| `minTime` | `PlainTime \| string \| undefined` | — | The earliest time offered. |
| `maxTime` | `PlainTime \| string \| undefined` | — | The latest time offered. |
| `isSlotDisabled` | `((slot: Omit<Slot, 'disabled'>) => boolean) \| undefined` | — | Only with timeLayout 'list': rules out slots while still showing them. |
| `hour12` | `boolean \| undefined` | — | Twelve-hour with an AM/PM control. The locale decides when left out. |
| `defaultTime` | `PlainTime \| string` | `'00:00'` | The time a day starts out with, so that choosing a date is already a moment. Midnight by default, moved up to minTime when there is one. |
| `disabled` | `boolean` | `false` | Nothing can be chosen while this is set. |
| `editable` | `boolean` | `true` | The text can be typed as well as chosen. What is typed is read with the same pattern the field writes, so the two always agree; anything that is not a date goes back to the last one when the field is left. |
| `mask` | `boolean` | `true` | The separators appear as the figures are typed, the way a card number gets its spaces. Only for patterns that leave no doubt — `dd/MM/yyyy` does, `d/M/yyyy` does not. |
| `format` | `string \| undefined` | — | A pattern — `yyyy-MM-dd HH:mm` — when the shape matters more than the reader. Unset, the field follows the locale: its numeric order when it can be typed into, dateStyle and timeStyle when it cannot. |
| `dateStyle` | `'full' \| 'long' \| 'medium' \| 'short'` | `'medium'` | Intl's own form for the date, when the field is not typed into. |
| `timeStyle` | `'full' \| 'long' \| 'medium' \| 'short'` | `'short'` | Intl's own form for the time, when the field is not typed into. |
| `displayWith` | `((value: Instant, timeZone: string) => string) \| undefined` | — | The last word on the text. Given both, this one wins. |
| `today` | `PlainDate` | `Temporal.Now.plainDateISO()` | Which day is today. Settable so a test does not depend on the day it runs. |
| `renderCell` | `RenderCell \| undefined` | — | Adds to each day: a note under the number, a class of your own, a tooltip, or a reason to rule it out. |
| `buttons` | `readonly CalendarButton[]` | `[]` | Buttons under the grid: 'today', 'clear'. None by default. |
| `weekNumbers` | `boolean` | `false` | A column of ISO week numbers down the left of the panel's calendar. |
| `messages` | `TzslotMessages` | `EN` | The words the widget says. One bundle, English and French included. |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: Instant \| null) => void) \| undefined` | Called when the user chooses, changes or clears the value. |
| `onOpen` | `(() => void) \| undefined` | Called when the panel opens. |
| `onClose` | `(() => void) \| undefined` | Called when the panel closes. |

