<!-- Written by scripts/api.mjs from packages/dom/src/time-slots.ts. Do not edit. -->

# createTimeSlots · `<tz-time-slots>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `date` | `PlainDate \| string \| null` | `null` | The day to list. Nothing is drawn until there is one. |
| `timeZone` | `string` | `'UTC'` | An IANA identifier — 'Europe/Paris', not an offset. Offsets change twice a year. |
| `stepMinutes` | `number` | `30` | Minutes between the times offered. |
| `minTime` | `PlainTime \| string \| undefined` | — | The working day. Slots outside it are not produced at all — eighteen greyed rows before nine o'clock make the real choices harder to find. |
| `maxTime` | `PlainTime \| string \| undefined` | — | The latest time offered. |
| `isDisabled` | `((slot: Omit<Slot, 'disabled'>) => boolean) \| undefined` | — | Rules out slots while still showing them: booked, over capacity. |
| `skipNonExistent` | `boolean` | `false` | Leave out the times that cannot happen, rather than striking them through. |
| `disabled` | `boolean` | `false` | Nothing can be chosen while this is set. |
| `value` | `Instant \| null` | `null` | The selection, as a moment — never a wall time. |
| `ariaLabel` | `string \| undefined` | — | The accessible name, for a screen reader. |
| `missingLabel` | `string \| undefined` | — | The word under a time the clocks skip. Short: it sits inside a button. |
| `emptyLabel` | `string \| undefined` | — | What is said when the day offers nothing at all. |
| `messages` | `TzslotMessages` | `EN` | The words the widget says. One bundle, English and French included. |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: Instant \| null) => void) \| undefined` | Called when the user chooses, changes or clears the value. |

