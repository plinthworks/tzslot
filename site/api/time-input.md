<!-- Written by scripts/api.mjs from packages/dom/src/time-input.ts. Do not edit. -->

# createTimeInput

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `PlainTime \| null` | `null` |  |
| `stepMinutes` | `number` | `5` | What the arrows, the wheel and the keyboard move the minutes by. |
| `minTime` | `PlainTime \| string \| undefined` | — | The earliest and latest time accepted, inclusive. |
| `maxTime` | `PlainTime \| string \| undefined` | — |  |
| `hour12` | `boolean \| undefined` | — | 12-hour with an AM/PM button. Undefined asks the locale, which is what a reader of that locale expects. |
| `locale` | `string \| undefined` | — |  |
| `variant` | `'boxed' \| 'bare'` | `'boxed'` | 'boxed' stands on its own, in a form. 'bare' is the row under a calendar: big figures, no frame, arrows only when the pointer or the focus is there. |
| `disabled` | `boolean` | `false` |  |
| `messages` | `TzslotMessages` | `EN` |  |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: PlainTime \| null) => void) \| undefined` |  |

