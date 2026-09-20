<!-- Written by scripts/api.mjs from packages/dom/src/datetime-field.ts. Do not edit. -->

# createDateTimeField · `<tz-datetime-field>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `Instant \| null` | `null` | A moment, because a date and a wall time alone are not one. |
| `timeZone` | `string` | `Temporal.Now.timeZoneId()` | An IANA identifier. The date and the time are read on this zone's clocks. |
| `mode` | `FieldMode` | `'popup'` |  |
| `placeholder` | `string \| undefined` | — |  |
| `ariaLabel` | `string \| undefined` | — |  |
| `locale` | `string \| undefined` | — |  |
| `firstDayOfWeek` | `1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7` | `1` |  |
| `min` | `PlainDate \| null` | `null` |  |
| `max` | `PlainDate \| null` | `null` |  |
| `isDateDisabled` | `((date: PlainDate) => boolean) \| undefined` | — |  |
| `timeLayout` | `TimeLayout` | `'input'` | How the time is chosen: a compact field, two menus, or the day's times. |
| `stepMinutes` | `number` | `30` |  |
| `minuteStep` | `number` | `1` | With 'select': minutes between the options. Every minute by default. |
| `minTime` | `PlainTime \| string \| undefined` | — |  |
| `maxTime` | `PlainTime \| string \| undefined` | — |  |
| `isSlotDisabled` | `((slot: Omit<Slot, 'disabled'>) => boolean) \| undefined` | — | Only with timeLayout 'list': rules out slots while still showing them. |
| `hour12` | `boolean \| undefined` | — |  |
| `defaultTime` | `PlainTime \| string` | `'00:00'` | The time a day starts out with, so that choosing a date is already a moment. Midnight by default, moved up to minTime when there is one. |
| `disabled` | `boolean` | `false` |  |
| `editable` | `boolean` | `true` | The text can be typed as well as chosen. What is typed is read with the same pattern the field writes, so the two always agree; anything that is not a date goes back to the last one when the field is left. |
| `mask` | `boolean` | `true` | The separators appear as the figures are typed, the way a card number gets its spaces. Only for patterns that leave no doubt — `dd/MM/yyyy` does, `d/M/yyyy` does not. |
| `format` | `string \| undefined` | — | A pattern — `yyyy-MM-dd HH:mm` — when the shape matters more than the reader. Unset, the field follows the locale: its numeric order when it can be typed into, dateStyle and timeStyle when it cannot. |
| `dateStyle` | `'full' \| 'long' \| 'medium' \| 'short'` | `'medium'` |  |
| `timeStyle` | `'full' \| 'long' \| 'medium' \| 'short'` | `'short'` |  |
| `displayWith` | `((value: Instant, timeZone: string) => string) \| undefined` | — | The last word on the text. Given both, this one wins. |
| `today` | `PlainDate` | `Temporal.Now.plainDateISO()` |  |
| `renderCell` | `RenderCell \| undefined` | — |  |
| `buttons` | `readonly CalendarButton[]` | `[]` |  |
| `messages` | `TzslotMessages` | `EN` |  |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: Instant \| null) => void) \| undefined` |  |
| `onOpen` | `(() => void) \| undefined` |  |
| `onClose` | `(() => void) \| undefined` |  |

