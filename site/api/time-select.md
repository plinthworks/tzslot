<!-- Written by scripts/api.mjs from packages/dom/src/time-select.ts. Do not edit. -->

# createTimeSelect

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `PlainTime \| null` | `null` |  |
| `offset` | `string \| null` | `null` | Which of the two readings of a repeated hour the value stands for, as a UTC offset. Only ever set on the day the clocks go back. |
| `date` | `PlainDate \| string \| null` | `null` | The day the time is on, and the zone it is read in. Given both, the menus show that day as it really is: the hour the clocks skip is not offered, and the hour they repeat is offered twice, by its two offsets. Left out, they offer every hour of an ordinary day. |
| `timeZone` | `string \| undefined` | — |  |
| `minuteStep` | `number` | `1` | Minutes between the options. Every minute by default. |
| `hourStep` | `number` | `1` | Hours between them. |
| `minTime` | `PlainTime \| string \| undefined` | — |  |
| `maxTime` | `PlainTime \| string \| undefined` | — |  |
| `hour12` | `boolean \| undefined` | — | 12-hour menus with an AM/PM one beside them; the locale decides when unset. |
| `locale` | `string \| undefined` | — |  |
| `disabled` | `boolean` | `false` |  |
| `messages` | `TzslotMessages` | `EN` |  |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: PlainTime \| null, offset: string \| null) => void) \| undefined` | The time chosen, and which reading of it when the hour happens twice. |

