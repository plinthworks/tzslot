<!-- Written by scripts/api.mjs from packages/dom/src/time-input.ts. Do not edit. -->

# createTimeInput · `<tz-time-input>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `PlainTime \| null` | `null` | The time shown, as a clock face rather than a moment. |
| `stepMinutes` | `number` | `5` | What the arrows, the wheel and the keyboard move the minutes by. |
| `minTime` | `PlainTime \| string \| undefined` | — | The earliest and latest time accepted, inclusive. |
| `maxTime` | `PlainTime \| string \| undefined` | — | The latest time offered. |
| `hour12` | `boolean \| undefined` | — | 12-hour with an AM/PM button. Undefined asks the locale, which is what a reader of that locale expects. |
| `locale` | `string \| undefined` | — | A BCP-47 tag for the month and weekday names, and the order of a date. The browser's own when left out. |
| `date` | `PlainDate \| string \| null` | `null` | The day this time is on, and the zone it is read in. Given both, the arrows step over an hour the clocks skip instead of landing in it — from 03:00 down is 01:00 on the morning of the change, not 02:00, which would be corrected straight back and look like a stuck arrow. |
| `timeZone` | `string \| undefined` | — | An IANA identifier — 'Europe/Paris', never an offset. Offsets change twice a year. |
| `variant` | `'boxed' \| 'bare'` | `'boxed'` | 'boxed' stands on its own, in a form. 'bare' is the row under a calendar: big figures, no frame, arrows only when the pointer or the focus is there. |
| `disabled` | `boolean` | `false` | Nothing can be chosen while this is set. |
| `messages` | `TzslotMessages` | `EN` | The words the widget says. One bundle, English and French included. |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: PlainTime \| null) => void) \| undefined` | Called when the user chooses, changes or clears the value. |

