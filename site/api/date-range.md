<!-- Written by scripts/api.mjs from packages/dom/src/date-range.ts. Do not edit. -->

# createDateRange · `<tz-date-range>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `DateRangeValue` | `EMPTY` |  |
| `firstDayOfWeek` | `Weekday` | `1` |  |
| `locale` | `string \| undefined` | — |  |
| `min` | `PlainDate \| null` | `null` |  |
| `max` | `PlainDate \| null` | `null` |  |
| `disabled` | `boolean` | `false` |  |
| `isDateDisabled` | `((date: PlainDate) => boolean) \| undefined` | — |  |
| `today` | `PlainDate` | `Temporal.Now.plainDateISO()` |  |
| `blockAcrossDisabled` | `boolean` | `true` | Refuse a range that steps over a day ruled out by isDateDisabled. On by default, because the usual reason a day is unavailable is that the thing being booked is not available then — and a booking that spans a closure cannot be honoured. Turn it off for ranges that merely bracket a period, like a report's dates. |
| `rangeSpansBlockedMessage` | `string \| undefined` | — | Overrides messages.rangeCrossesUnavailable for this one instance. |
| `messages` | `TzslotMessages` | `EN` |  |
| `renderCell` | `RenderCell \| undefined` | — | Adds to each day: a price per night, places left, a class of your own. |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: DateRangeValue) => void) \| undefined` |  |

