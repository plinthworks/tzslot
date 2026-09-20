<!-- Written by scripts/api.mjs from packages/dom/src/multi-date.ts. Do not edit. -->

# createMultiDate · `<tz-multi-date>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `readonly PlainDate[]` | `[]` | The chosen days, always in date order. |
| `view` | `CalendarView` | `'days'` | Which level the grid is choosing between. |
| `minView` | `CalendarView` | `'days'` | How far down the view may go. 'months' turns this into a month picker, 'years' into a year picker, with no further code. |
| `firstDayOfWeek` | `Weekday` | `1` | Monday by default, as ISO-8601 numbers the week. |
| `locale` | `string \| undefined` | — | A BCP-47 tag for the month and weekday names. Defaults to the browser's. |
| `min` | `PlainDate \| null` | `null` |  |
| `max` | `PlainDate \| null` | `null` |  |
| `disabled` | `boolean` | `false` |  |
| `isDateDisabled` | `((date: PlainDate) => boolean) \| undefined` | — | Rules out individual days inside the range: closures, weekends, days that are already full. Bounds cut the ends off; this takes holes out of the middle, which bounds cannot express. |
| `today` | `PlainDate` | `Temporal.Now.plainDateISO()` | Today, settable so a test does not depend on the day it runs. |
| `messages` | `TzslotMessages` | `EN` |  |
| `renderCell` | `RenderCell \| undefined` | — | Adds to each day: a price, places left, a class of your own, or a reason to rule it out. See RenderCell. |
| `buttons` | `readonly CalendarButton[]` | `[]` | Buttons under the grid, in the order given. None by default. |
| `maxDates` | `number \| undefined` | — | Once this many days are chosen, the others stop taking clicks until one is removed. |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: PlainDate \| null) => void) \| undefined` | A day was chosen, or the selection cleared — by the user or by `clear()`. |
| `onViewChange` | `((view: CalendarView) => void) \| undefined` |  |

