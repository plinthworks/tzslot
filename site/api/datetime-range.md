<!-- Written by scripts/api.mjs from packages/dom/src/datetime-range.ts. Do not edit. -->

# createDateTimeRange · `<tz-datetime-range>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `DateTimeRangeValue` | `EMPTY` |  |
| `timeZone` | `string` | `'UTC'` | An IANA identifier. Both ends are read on this zone's clocks. |
| `timeLayout` | `TimeLayout` | `'input'` | How each end asks for its time: a compact field, two menus, or the day's times. |
| `stepMinutes` | `number` | `30` |  |
| `minuteStep` | `number` | `1` | With 'select': minutes between the options. Every minute by default. |
| `minTime` | `PlainTime \| string \| undefined` | — |  |
| `maxTime` | `PlainTime \| string \| undefined` | — |  |
| `isSlotDisabled` | `((slot: Omit<Slot, 'disabled'>) => boolean) \| undefined` | — | Only with timeLayout 'list': rules out slots while still showing them. |
| `hour12` | `boolean \| undefined` | — |  |
| `defaultTime` | `PlainTime \| string` | `'00:00'` | The time a newly chosen day starts at. Midnight by default. |
| `editable` | `boolean` | `true` | Each end can be typed into as well as chosen from. |
| `mask` | `boolean` | `true` | Separators appear as the figures are typed. |
| `format` | `string \| undefined` | — | A pattern for both ends — `yyyy-MM-dd HH:mm`. |
| `min` | `PlainDate \| null` | `null` |  |
| `max` | `PlainDate \| null` | `null` |  |
| `isDateDisabled` | `((date: PlainDate) => boolean) \| undefined` | — |  |
| `renderCell` | `RenderCell \| undefined` | — |  |
| `buttons` | `readonly CalendarButton[]` | `[]` |  |
| `locale` | `string \| undefined` | — |  |
| `disabled` | `boolean` | `false` |  |
| `startLabel` | `string \| undefined` | — |  |
| `endLabel` | `string \| undefined` | — |  |
| `endBeforeStartMessage` | `string \| undefined` | — |  |
| `messages` | `TzslotMessages` | `EN` |  |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: DateTimeRangeValue) => void) \| undefined` |  |

