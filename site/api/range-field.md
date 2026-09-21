<!-- Written by scripts/api.mjs from packages/dom/src/range-field.ts. Do not edit. -->

# createRangeField · `<tz-range-field>`

### Options

| Option | Type | Default | |
|---|---|---|---|
| `value` | `RangeFieldValue` | `EMPTY` |  |
| `timeZone` | `string` | `Temporal.Now.timeZoneId()` | An IANA identifier. Days become moments on this zone's clocks. |
| `presets` | `readonly (PresetName \| RangePreset)[]` | `BUILT_IN` | Named ranges beside the calendar. The built-in names, or your own. |
| `title` | `string \| undefined` | — | A word or two saying what is being chosen — "Travel dates", "Effective date". Written above the panel, and read out for the field itself. A picker with no subject is a picker the reader has to infer from what is around it. |
| `timeLayout` | `'input' \| 'select'` | `'select'` | How an hour is asked for inside the two fields. `'select'` — an hour menu and a minute menu — is the default, because most of the time an hour is chosen outright and a menu is two clicks. `'input'` puts an arrow above and below the figures, which suits nudging a time already close to right. |
| `openEnded` | `boolean` | `false` | Lets a period stop at one end: "from 14 September", "until 20 September". A search means that — `WHERE at >= :start` with no upper bound — and a booking form does not, which is why it is asked for rather than assumed. The panel then offers Between / From / Until, and each chosen end can be dropped with the cross beside it. |
| `showTime` | `boolean` | `false` | Whether the period carries times as well as days. It is the screen's decision, not the reader's: a switch marked "all day" asked them to classify their own answer before giving it, and left them wondering what the hours they could see were for. On, every chosen day starts at `defaultTimes` — midnight unless said otherwise — and they change it if they want to. |
| `defaultTimes` | `{ start?: PlainTime \| string; end?: PlainTime \| string }` | `{}` | The hours a newly chosen day is given. Midnight for both ends unless the screen knows better — a working day from 09:00 to 18:00, a night shift from 22:00. An interval handed to the field keeps its own hours; this is only for days picked afterwards. |
| `stepMinutes` | `number` | `30` | Minutes the hour's arrows step by. |
| `minuteStep` | `number` | `5` | Minutes between the options of the hour menu. Five by default — sixty entries is a list nobody reads, and a menu always offers the minute it is already showing whether or not it lands on the step. |
| `confirm` | `boolean` | `false` | Nothing is reported until Apply is pressed. For searches that cost. |
| `shift` | `ShiftStep \| readonly ShiftOption[] \| false` | `false` | Arrows that step the whole selection one period at a time, without opening anything. `false` — the default — draws none: a filter that means one chosen day has nothing to step through. `'auto'` moves by what is selected, so a quarter moves by a quarter and seven days by seven days; a duration — `{ months: 3 }`, `{ days: 7 }` — imposes the step whatever is selected, for a screen whose window is fixed. A duration may be written short — `'25mn'`, `'1h'`, `'3d'`, `'2w'`, `'6mo'` — which is how a screen says its step in one word. A list of `{ step, label }` instead puts a menu between the arrows and lets the reader choose, for a page used to sweep both weeks and quarters. A period open at one end has no length, so `'auto'` moves it by a day there — the unit the calendar itself works in. |
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
| `now` | `Instant \| null` | `null` | The moment the ranges shorter than a day are counted from. The clock, unless a test or a page rendered ahead of time needs it fixed. |
| `disabled` | `boolean` | `false` | Nothing can be chosen while this is set. |
| `format` | `string \| undefined` | — | A pattern for each end — `yyyy-MM-dd`. The locale's own form otherwise. |
| `mask` | `boolean` | `true` | Separators appear as figures are typed in the panel's two fields, never while deleting. |
| `fieldIcon` | `Node \| string \| null \| undefined` | — | The mark inside each of the panel's two fields, and which end it sits at. A calendar by default; `null` for none; a node of your own for an application that already has an icon set. |
| `fieldIconSide` | `'start' \| 'end'` | `'start'` |  |
| `labels` | `{ start?: Node \| string \| null; end?: Node \| string \| null; between?: Node \| string \| null; }` | `{}` | What is written above each of the panel's two fields, and between them. Words by default — From / To in the messages — but a screen that prefers an arrow says so: `{ start: null, end: null, between: '»' }`. Anything that can be put in a document works, an SVG icon included. |
| `displayWith` | `((value: RangeFieldValue, timeZone: string) => string) \| undefined` | — | The last word on the text the field shows. |
| `messages` | `TzslotMessages` | `EN` | The words the widget says. One bundle, English and French included. |

### Callbacks

| | Type | |
|---|---|---|
| `onChange` | `((value: RangeFieldValue) => void) \| undefined` | Called when the user chooses, changes or clears the value. |
| `onOpen` | `(() => void) \| undefined` | Called when the panel opens. |
| `onClose` | `(() => void) \| undefined` | Called when the panel closes. |

