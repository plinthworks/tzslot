<!-- Written by scripts/api.mjs from packages/dom/src/range-field.ts. Do not edit. -->

# createRangeField · `<tz-range-field>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `RangeFieldValue` | `EMPTY` |  |
| `timeZone` | `string` | `Temporal.Now.timeZoneId()` | An IANA identifier. Days become moments on this zone's clocks. |
| `presets` | `readonly (PresetName \| RangePreset)[]` | `BUILT_IN` | Named ranges beside the calendar. The ten built-in names, or your own. |
| `openEnded` | `boolean` | `false` | Lets a period stop at one end: "from 14 September", "until 20 September". A search means that — `WHERE at >= :start` with no upper bound — and a booking form does not, which is why it is asked for rather than assumed. The panel then offers Between / From / Until, and each chosen end can be dropped with the cross beside it. |
| `showTime` | `boolean` | `false` | Times as well as days, with a switch back to whole days. |
| `stepMinutes` | `number` | `30` | Minutes the time fields step by. |
| `confirm` | `boolean` | `false` | Nothing is reported until Apply is pressed. For searches that cost. |
| `shift` | `ShiftStep \| false` | `false` | Arrows that step the whole selection one period at a time, without opening anything. `false` — the default — draws none: a filter that means one chosen day has nothing to step through. `'auto'` moves by what is selected, so a quarter moves by a quarter and seven days by seven days; a duration — `{ months: 3 }`, `{ days: 7 }` — imposes the step whatever is selected, for a screen whose window is fixed. |
| `months` | `number` | `2` | How many months the panel shows side by side. |
| `weekNumbers` | `boolean` | `false` |  |
| `firstDayOfWeek` | `1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7` | `1` | Which day a week starts on, as ISO-8601 numbers them: 1 is Monday, 7 is Sunday. |
| `mode` | `FieldMode` | `'popup'` | 'popup' hangs the panel under the field; 'dialog' centres it over the page. |
| `placeholder` | `string \| undefined` | — | What the field shows while it holds nothing. |
| `ariaLabel` | `string \| undefined` | — | The accessible name, for a screen reader. |
| `locale` | `string \| undefined` | — | A BCP-47 tag for the month and weekday names, and the order of a date. The browser's own when left out. |
| `min` | `PlainDate \| null` | `null` | The earliest day that can be chosen. |
| `max` | `PlainDate \| null` | `null` | The latest day that can be chosen. |
| `isDateDisabled` | `((date: PlainDate) => boolean) \| undefined` | — | Rules out individual days inside the range: closures, weekends, days already full. |
| `renderCell` | `RenderCell \| undefined` | — | Adds to each day: a note under the number, a class of your own, a tooltip, or a reason to rule it out. |
| `today` | `PlainDate` | `Temporal.Now.plainDateISO()` | Which day is today. Settable so a test does not depend on the day it runs. |
| `disabled` | `boolean` | `false` | Nothing can be chosen while this is set. |
| `format` | `string \| undefined` | — | A pattern for each end — `yyyy-MM-dd`. The locale's own form otherwise. |
| `displayWith` | `((value: RangeFieldValue, timeZone: string) => string) \| undefined` | — | The last word on the text the field shows. |
| `messages` | `TzslotMessages` | `EN` | The words the widget says. One bundle, English and French included. |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: RangeFieldValue) => void) \| undefined` | Called when the user chooses, changes or clears the value. |
| `onOpen` | `(() => void) \| undefined` | Called when the panel opens. |
| `onClose` | `(() => void) \| undefined` | Called when the panel closes. |

