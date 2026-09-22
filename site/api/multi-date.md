<!-- Written by scripts/api.mjs from packages/dom/src/multi-date.ts. Do not edit. -->

# createMultiDate · `<tz-multi-date>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `readonly PlainDate[]` | `[]` | The chosen days, always in date order. |
| `view` | `CalendarView` | `'days'` | Which level the grid is choosing between. |
| `minView` | `CalendarView` | `'days'` | How far down the view may go. 'months' turns this into a month picker, 'years' into a year picker, with no further code. |
| `firstDayOfWeek` | `Weekday \| undefined` | — | Where the week starts, 1 for Monday through 7 for Sunday. Left out, the locale decides — Monday in France, Sunday in the United States. Set it only where a business disagrees with its own locale. |
| `locale` | `string \| undefined` | — | A BCP-47 tag for the month and weekday names. Defaults to the browser's. |
| `min` | `PlainDate \| null` | `null` | The earliest day that can be chosen. |
| `max` | `PlainDate \| null` | `null` | The latest day that can be chosen. |
| `disabled` | `boolean` | `false` | Nothing can be chosen while this is set. |
| `isDateDisabled` | `((date: PlainDate) => boolean) \| undefined` | — | Rules out individual days inside the range: closures, weekends, days that are already full. Bounds cut the ends off; this takes holes out of the middle, which bounds cannot express. |
| `today` | `PlainDate` | `Temporal.Now.plainDateISO()` | Today, settable so a test does not depend on the day it runs. |
| `messages` | `TzslotMessages` | `EN` | The words the widget says. One bundle, English and French included. |
| `renderCell` | `RenderCell \| undefined` | — | Adds to each day: a price, places left, a class of your own, or a reason to rule it out. See RenderCell. |
| `buttons` | `readonly CalendarButton[]` | `[]` | Buttons under the grid, in the order given. None by default. |
| `weekNumbers` | `boolean` | `false` | A column of ISO week numbers down the left. Ordinary in Europe, where a fortnight is often "weeks 38 and 39" rather than a pair of dates. |
| `maxDates` | `number \| undefined` | — | Once this many days are chosen, the others stop taking clicks until one is removed. |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: PlainDate \| null) => void) \| undefined` | A day was chosen, or the selection cleared — by the user or by `clear()`. |
| `onViewChange` | `((view: CalendarView) => void) \| undefined` | Called when the grid moves between days, months and years. |

