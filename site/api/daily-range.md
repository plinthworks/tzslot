<!-- Written by scripts/api.mjs from packages/dom/src/daily-range.ts. Do not edit. -->

# createDailyRange · `<tz-daily-range>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `DailyRangeValue` | `EMPTY` | Two dates and two clock times: the days, and the hours on each of them. |
| `timeLayout` | `TimeLayout` | `'input'` | How the two hours are chosen. 'input' by default: two lists of forty-eight buttons are a long way to say 09:00. 'list' is the right one when the times on offer are the point — opening hours, say. |
| `hour12` | `boolean \| undefined` | — | 12-hour fields with an AM/PM button; the locale decides when unset. |
| `minuteStep` | `number` | `1` | With 'select': minutes between the options. Every minute by default. |
| `timeZone` | `string` | `'UTC'` | An IANA identifier. The hours are read on the clocks of this zone. |
| `stepMinutes` | `number` | `30` | Minutes between the times offered. |
| `minTime` | `PlainTime \| string \| undefined` | — | The first and last times offered in the two lists. |
| `maxTime` | `PlainTime \| string \| undefined` | — | The latest time offered. |
| `firstDayOfWeek` | `Weekday` | `1` | Which day a week starts on, as ISO-8601 numbers them: 1 is Monday, 7 is Sunday. |
| `locale` | `string \| undefined` | — | A BCP-47 tag for the month and weekday names, and the order of a date. The browser's own when left out. |
| `min` | `PlainDate \| null` | `null` | The earliest day that can be chosen. |
| `max` | `PlainDate \| null` | `null` | The latest day that can be chosen. |
| `isDateDisabled` | `((date: PlainDate) => boolean) \| undefined` | — | Rules out individual days inside the range: closures, weekends, days already full. |
| `renderCell` | `RenderCell \| undefined` | — | Adds to each day: a note under the number, a class of your own, a tooltip, or a reason to rule it out. |
| `today` | `PlainDate` | `Temporal.Now.plainDateISO()` | Which day is today. Settable so a test does not depend on the day it runs. |
| `disabled` | `boolean` | `false` | Nothing can be chosen while this is set. |
| `messages` | `TzslotMessages` | `EN` | The words the widget says. One bundle, English and French included. |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: DailyRangeValue) => void) \| undefined` | Called when the user chooses, changes or clears the value. |

