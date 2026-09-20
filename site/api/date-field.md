<!-- Written by scripts/api.mjs from packages/dom/src/date-field.ts. Do not edit. -->

# createDateField · `<tz-date-field>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `PlainDate \| null` | `null` | The chosen day. |
| `mode` | `FieldMode` | `'popup'` | 'popup' hangs the panel under the field; 'dialog' centres it over the page. |
| `placeholder` | `string \| undefined` | — | What the field shows while it holds nothing. |
| `ariaLabel` | `string \| undefined` | — | The trigger's and the panel's accessible name. Defaults to messages.chooseDate. |
| `locale` | `string \| undefined` | — | A BCP-47 tag for the month and weekday names, and the order of a date. The browser's own when left out. |
| `firstDayOfWeek` | `Weekday` | `1` | Which day a week starts on, as ISO-8601 numbers them: 1 is Monday, 7 is Sunday. |
| `min` | `PlainDate \| null` | `null` | The earliest day that can be chosen. |
| `max` | `PlainDate \| null` | `null` | The latest day that can be chosen. |
| `isDateDisabled` | `((date: PlainDate) => boolean) \| undefined` | — | Rules out individual days inside the range: closures, weekends, days already full. |
| `disabled` | `boolean` | `false` | Nothing can be chosen while this is set. |
| `displayWith` | `((date: PlainDate) => string) \| undefined` | — | How the chosen date is written in the field. Defaults to the locale's medium form. |
| `today` | `PlainDate` | `Temporal.Now.plainDateISO()` | Which day is today. Settable so a test does not depend on the day it runs. |
| `messages` | `TzslotMessages` | `EN` | The words the widget says. One bundle, English and French included. |
| `renderCell` | `RenderCell \| undefined` | — | Passed to the calendar in the panel. |
| `buttons` | `readonly CalendarButton[]` | `[]` | Under the panel's grid: 'today', 'clear'. Choosing either closes it. |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: PlainDate \| null) => void) \| undefined` | Called when the user chooses, changes or clears the value. |
| `onOpen` | `(() => void) \| undefined` | Called when the panel opens. |
| `onClose` | `(() => void) \| undefined` | Called when the panel closes. |

