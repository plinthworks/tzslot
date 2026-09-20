<!-- Written by scripts/api.mjs from packages/dom/src/date-field.ts. Do not edit. -->

# createDateField · `<tz-date-field>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `PlainDate \| null` | `null` |  |
| `mode` | `FieldMode` | `'popup'` |  |
| `placeholder` | `string \| undefined` | — |  |
| `ariaLabel` | `string \| undefined` | — | The trigger's and the panel's accessible name. Defaults to messages.chooseDate. |
| `locale` | `string \| undefined` | — |  |
| `firstDayOfWeek` | `Weekday` | `1` |  |
| `min` | `PlainDate \| null` | `null` |  |
| `max` | `PlainDate \| null` | `null` |  |
| `isDateDisabled` | `((date: PlainDate) => boolean) \| undefined` | — |  |
| `disabled` | `boolean` | `false` |  |
| `displayWith` | `((date: PlainDate) => string) \| undefined` | — | How the chosen date is written in the field. Defaults to the locale's medium form. |
| `today` | `PlainDate` | `Temporal.Now.plainDateISO()` |  |
| `messages` | `TzslotMessages` | `EN` |  |
| `renderCell` | `RenderCell \| undefined` | — | Passed to the calendar in the panel. |
| `buttons` | `readonly CalendarButton[]` | `[]` | Under the panel's grid: 'today', 'clear'. Choosing either closes it. |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: PlainDate \| null) => void) \| undefined` |  |
| `onOpen` | `(() => void) \| undefined` |  |
| `onClose` | `(() => void) \| undefined` |  |

