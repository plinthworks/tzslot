# Formatting and typing

A field writes what it reads back. That is the whole rule: whatever shape the
text takes, typing it in means the same as choosing it.

Every example below is a `<tz-datetime-field>`, and every option shown works
the same way on the date field and on the period field.

## The default: the locale's own form

Nothing to set. The field writes what `Intl` writes for that locale, and
accepts the same thing typed back.

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

The same moment, three locales — the field is the locale's, not the library's:

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', locale: 'en-US', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', locale: 'de-DE', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

## `format`

A pattern, used for writing **and** for reading. What you impose is also what
the field will accept typed.

```js
createDateTimeField(element, { timeZone: 'Europe/Paris', format: 'yyyy-MM-dd HH:mm' });
```

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', format: 'yyyy-MM-dd HH:mm', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

```js
format: "d MMMM yyyy 'at' HH:mm"
```

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', format: 'd MMMM yyyy \'at\' HH:mm', editable: false, value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

::: warning A pattern that names its month cannot be typed into
"sept.", "Sept" and "septembre" are one month in three spellings, and picking
between them is how a field stores the wrong date quietly. `parseWith` refuses
such a pattern rather than guessing, so a field using one is for display:
pair it with `editable: false`, as above.
:::

### Tokens

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

Anything else is kept as written; `'quoted text'` keeps letters.

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', format: 'EEEE d MMMM yyyy', editable: false, value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

## `dateStyle` and `timeStyle`

Intl's own forms. They apply when the field is **not** typed into, because
there is no reading back a form the locale chose for itself.

```js
createDateTimeField(element, {
  timeZone: 'Europe/Paris', editable: false,
  dateStyle: 'long', timeStyle: 'short',
});
```

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', editable: false, dateStyle: 'long', timeStyle: 'short', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', editable: false, dateStyle: 'full', timeStyle: 'medium', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', editable: false, dateStyle: 'short', timeStyle: 'short', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

## `displayWith`

The last word. It gets the value and the zone, and whatever it returns is what
the field reads.

```js
createDateTimeField(element, {
  timeZone: 'Europe/Paris',
  editable: false,
  displayWith: (at, timeZone) => {
    const zoned = at.toZonedDateTimeISO(timeZone);
    return `${zoned.day}/${zoned.month} — week ${zoned.weekOfYear}`;
  },
});
```

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', editable: false, displayWith: (at, tz) => { const z = at.toZonedDateTimeISO(tz); return z.day + '/' + z.month + ' — week ' + z.weekOfYear; }, value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

## `editable`

`true` by default: the trigger is an input you can type into. `false` makes it
a button, and the value is only ever chosen from the panel.

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', editable: false, value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

## `mask`

The separators appear as the figures arrive, the way a card number gets its
spaces:

```
2 → 2        20 → 20/       2009 → 20/09/      20092026 → 20/09/2026
```

Type into this one to watch it happen:

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', format: 'dd/MM/yyyy HH:mm' }" />

And the same field with `mask: false` — every separator typed by hand:

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', format: 'dd/MM/yyyy HH:mm', mask: false }" />

It only applies to patterns that leave no doubt where each part ends —
`dd/MM/yyyy` does, `d/M/yyyy` does not — and never while deleting, because a
separator put back where one was just removed makes a field impossible to
correct.

Letters never make it into the text at all. A date that cannot exist, or one
outside `min` and `max`, is refused and the field goes back to the moment it
held when you leave it.

The pattern is never used as the placeholder: a field explaining its own format
before anything is typed is not inviting an answer. `placeholder` is for what
you want to say instead.

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', placeholder: 'When shall we meet?' }" />

## The same helpers, on their own

Everything above is these four functions, exported from `@tzslot/dom`.

```ts
import { formatWith, parseWith, patternFor, maskWith } from '@tzslot/dom';

formatWith('EEE d MMM', { date }, 'fr-FR');   // 'dim. 20 sept.'
parseWith('yyyy-MM-dd', '2026-02-31');        // null — that day does not exist
patternFor('en-US', { time: true });          // 'MM/dd/yyyy hh:mm a'
maskWith('dd/MM/yyyy', '2009');               // '20/09/'
```

`parseWith` returning `null` rather than the nearest valid day is the point:
31 February is a typo, and a field that quietly turns it into 3 March has
stored something nobody typed.
