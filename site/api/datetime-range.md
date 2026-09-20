<!-- Written by scripts/api.mjs from packages/dom/src/datetime-range.ts. Do not edit. -->

# createDateTimeRange · `<tz-datetime-range>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `DateTimeRangeValue` | `EMPTY` | The two moments. Either may be unset while the interval is being built. |
| `timeZone` | `string` | `'UTC'` | An IANA identifier. Both ends are read on this zone's clocks. |
| `timeLayout` | `TimeLayout` | `'input'` | How each end asks for its time: a compact field, two menus, or the day's times. |
| `stepMinutes` | `number` | `30` | Minutes between the times offered. |
| `minuteStep` | `number` | `1` | With 'select': minutes between the options. Every minute by default. |
| `minTime` | `PlainTime \| string \| undefined` | — | The earliest time offered. |
| `maxTime` | `PlainTime \| string \| undefined` | — | The latest time offered. |
| `isSlotDisabled` | `((slot: Omit<Slot, 'disabled'>) => boolean) \| undefined` | — | Only with timeLayout 'list': rules out slots while still showing them. |
| `hour12` | `boolean \| undefined` | — | Twelve-hour with an AM/PM control. The locale decides when left out. |
| `defaultTime` | `PlainTime \| string` | `'00:00'` | The time a newly chosen day starts at. Midnight by default. |
| `editable` | `boolean` | `true` | Each end can be typed into as well as chosen from. |
| `mask` | `boolean` | `true` | Separators appear as the figures are typed. |
| `format` | `string \| undefined` | — | A pattern for both ends — `yyyy-MM-dd HH:mm`. |
| `min` | `PlainDate \| null` | `null` | The earliest day that can be chosen. |
| `max` | `PlainDate \| null` | `null` | The latest day that can be chosen. |
| `isDateDisabled` | `((date: PlainDate) => boolean) \| undefined` | — | Rules out individual days inside the range: closures, weekends, days already full. |
| `renderCell` | `RenderCell \| undefined` | — | Adds to each day: a note under the number, a class of your own, a tooltip, or a reason to rule it out. |
| `buttons` | `readonly CalendarButton[]` | `[]` | Buttons under the grid: 'today', 'clear'. None by default. |
| `locale` | `string \| undefined` | — | A BCP-47 tag for the month and weekday names, and the order of a date. The browser's own when left out. |
| `disabled` | `boolean` | `false` | Nothing can be chosen while this is set. |
| `startLabel` | `string \| undefined` | — | The heading over the first end. |
| `endLabel` | `string \| undefined` | — | The heading over the second end. |
| `endBeforeStartMessage` | `string \| undefined` | — | Said when the second moment comes before the first. |
| `messages` | `TzslotMessages` | `EN` | The words the widget says. One bundle, English and French included. |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: DateTimeRangeValue) => void) \| undefined` | Called when the user chooses, changes or clears the value. |

