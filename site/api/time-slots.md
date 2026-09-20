<!-- Written by scripts/api.mjs from packages/dom/src/time-slots.ts. Do not edit. -->

# createTimeSlots · `<tz-time-slots>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `date` | `PlainDate \| string \| null` | `null` | The day to list. Nothing is drawn until there is one. |
| `timeZone` | `string` | `'UTC'` | An IANA identifier — 'Europe/Paris', not an offset. Offsets change twice a year. |
| `stepMinutes` | `number` | `30` |  |
| `minTime` | `PlainTime \| string \| undefined` | — | The working day. Slots outside it are not produced at all — eighteen greyed rows before nine o'clock make the real choices harder to find. |
| `maxTime` | `PlainTime \| string \| undefined` | — |  |
| `isDisabled` | `((slot: Omit<Slot, 'disabled'>) => boolean) \| undefined` | — | Rules out slots while still showing them: booked, over capacity. |
| `skipNonExistent` | `boolean` | `false` | Leave out the times that cannot happen, rather than striking them through. |
| `disabled` | `boolean` | `false` |  |
| `value` | `Instant \| null` | `null` | The selection, as a moment — never a wall time. |
| `ariaLabel` | `string \| undefined` | — |  |
| `missingLabel` | `string \| undefined` | — |  |
| `emptyLabel` | `string \| undefined` | — |  |
| `messages` | `TzslotMessages` | `EN` |  |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: Instant \| null) => void) \| undefined` |  |

