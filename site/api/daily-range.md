<!-- Written by scripts/api.mjs from packages/dom/src/daily-range.ts. Do not edit. -->

# createDailyRange · `<tz-daily-range>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `DailyRangeValue` | `EMPTY` |  |
| `timeLayout` | `TimeLayout` | `'input'` | How the two hours are chosen. 'input' by default: two lists of forty-eight buttons are a long way to say 09:00. 'list' is the right one when the times on offer are the point — opening hours, say. |
| `hour12` | `boolean \| undefined` | — | 12-hour fields with an AM/PM button; the locale decides when unset. |
| `minuteStep` | `number` | `1` | With 'select': minutes between the options. Every minute by default. |
| `timeZone` | `string` | `'UTC'` | An IANA identifier. The hours are read on the clocks of this zone. |
| `stepMinutes` | `number` | `30` |  |
| `minTime` | `PlainTime \| string \| undefined` | — | The first and last times offered in the two lists. |
| `maxTime` | `PlainTime \| string \| undefined` | — |  |
| `firstDayOfWeek` | `Weekday` | `1` |  |
| `locale` | `string \| undefined` | — |  |
| `min` | `PlainDate \| null` | `null` |  |
| `max` | `PlainDate \| null` | `null` |  |
| `isDateDisabled` | `((date: PlainDate) => boolean) \| undefined` | — |  |
| `renderCell` | `RenderCell \| undefined` | — |  |
| `today` | `PlainDate` | `Temporal.Now.plainDateISO()` |  |
| `disabled` | `boolean` | `false` |  |
| `messages` | `TzslotMessages` | `EN` |  |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: DailyRangeValue) => void) \| undefined` |  |

