# Formatting and typing

A field writes what it reads back. That is the whole rule: whatever shape the
text takes, typing it in means the same as choosing it.

## What the text looks like

```html
<!-- the locale's own numeric form: 20/09/2026 09:15 in French -->
<tz-datetime-field [(value)]="at" timeZone="Europe/Paris" />

<!-- a pattern, when the shape matters more than the reader -->
<tz-datetime-field format="yyyy-MM-dd HH:mm" />

<!-- read-only, and then free to be written any way at all -->
<tz-datetime-field [editable]="false" dateStyle="long" timeStyle="short" />
<tz-datetime-field [editable]="false" [displayWith]="mine" />
```

| | |
|---|---|
| `format` | A pattern. Used for writing **and** reading. |
| `dateStyle`, `timeStyle` | Intl's own forms, when the field is not typed into. |
| `displayWith` | The last word: a function that gets the value and the zone. |

## Tokens

| | |
|---|---|
| `yyyy` `yy` | year |
| `MMMM` `MMM` `MM` `M` | month: name, short name, `09`, `9` |
| `dd` `d` | day |
| `EEEE` `EEE` | weekday name, short name |
| `HH` `H` | hour, 24-hour |
| `hh` `h` | hour, 12-hour |
| `mm` | minute |
| `a` | AM or PM |

Anything else is kept as written; `'quoted text'` keeps letters:
`d MMMM yyyy 'at' HH:mm`.

A pattern that names its month is for display only. "sept.", "Sept" and
"septembre" are one month in three spellings, and picking between them is how
a field stores the wrong date quietly — so `parseWith` refuses such a pattern
rather than guessing.

## Typing help

The separators appear as the figures arrive, the way a card number gets its
spaces:

```
2 → 2        20 → 20/       2009 → 20/09/      20092026 → 20/09/2026
```

It only applies to patterns that leave no doubt where each part ends —
`dd/MM/yyyy` does, `d/M/yyyy` does not — and never while deleting, because a
separator put back where one was just removed makes a field impossible to
correct. `[mask]="false"` turns it off.

Letters never make it into the text at all. A date that cannot exist, or one
outside `min` and `max`, is refused and the field goes back to the moment it
held when you leave it.

The pattern is never used as the placeholder: a field explaining its own
format before anything is typed is not inviting an answer.

## The same helpers, on their own

```ts
import { formatWith, parseWith, patternFor, maskWith } from '@tzslot/dom';

formatWith('EEE d MMM', { date }, 'fr-FR');   // 'dim. 20 sept.'
parseWith('yyyy-MM-dd', '2026-02-31');        // null — that day does not exist
patternFor('en-US', { time: true });          // 'MM/dd/yyyy hh:mm a'
maskWith('dd/MM/yyyy', '2009');               // '20/09/'
```
