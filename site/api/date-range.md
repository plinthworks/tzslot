<!-- Written by scripts/api.mjs from packages/dom/src/date-range.ts. Do not edit. -->

# createDateRange · `<tz-date-range>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `DateRangeValue` | `EMPTY` | The two ends. Either may be unset while a range is being chosen. |
| `firstDayOfWeek` | `Weekday` | `1` | Which day a week starts on, as ISO-8601 numbers them: 1 is Monday, 7 is Sunday. |
| `locale` | `string \| undefined` | — | A BCP-47 tag for the month and weekday names, and the order of a date. The browser's own when left out. |
| `min` | `PlainDate \| null` | `null` | The earliest day that can be chosen. |
| `max` | `PlainDate \| null` | `null` | The latest day that can be chosen. |
| `disabled` | `boolean` | `false` | Nothing can be chosen while this is set. |
| `isDateDisabled` | `((date: PlainDate) => boolean) \| undefined` | — | Rules out individual days inside the range: closures, weekends, days already full. |
| `today` | `PlainDate` | `Temporal.Now.plainDateISO()` | Which day is today. Settable so a test does not depend on the day it runs. |
| `blockAcrossDisabled` | `boolean` | `true` | Refuse a range that steps over a day ruled out by isDateDisabled. On by default, because the usual reason a day is unavailable is that the thing being booked is not available then — and a booking that spans a closure cannot be honoured. Turn it off for ranges that merely bracket a period, like a report's dates. |
| `rangeSpansBlockedMessage` | `string \| undefined` | — | Overrides messages.rangeCrossesUnavailable for this one instance. |
| `messages` | `TzslotMessages` | `EN` | The words the widget says. One bundle, English and French included. |
| `renderCell` | `RenderCell \| undefined` | — | Adds to each day: a price per night, places left, a class of your own. |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: DateRangeValue) => void) \| undefined` | Called when the user chooses, changes or clears the value. |

