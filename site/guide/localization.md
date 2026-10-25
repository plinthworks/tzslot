# Localization

Two things decide what a widget says, and they are separate on purpose.

## The locale

Month names, weekday names, the order of a date and whether the clock runs to
twelve or twenty-four all come from `Intl`, which every browser already has.
Pass a BCP-47 tag, or leave it out and the browser's own is used.

```html
<tz-calendar locale="fr-FR" />
```

The same calendar, four locales. Nothing else is set: the month names, the
weekday order and the first day of the week all follow.

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', months: 1 }" />

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', months: 1 }" />

<Live widget="Calendar" :options="{ timeZone: 'America/New_York', locale: 'en-US', months: 1 }" />

<Live widget="Calendar" :options="{ timeZone: 'Asia/Tokyo', locale: 'ja-JP', months: 1 }" />

Where the week starts comes from the locale too — Monday in France and the
United Kingdom, **Sunday** in the United States and Japan, Saturday in much of
the Arab world. Nothing above asked for it; look at the `en-US` calendar and
the `ja-JP` one.

It is `Intl` that is asked, not a table kept here: a table of two hundred
locales is a table that goes out of date. Where the browser is too old to
answer — older Safari, older Firefox — the week starts on Monday, as
ISO-8601 says.

`firstDayOfWeek` overrides it, for the business that disagrees with its own
locale:

```js
createCalendar(element, { locale: 'en-US', firstDayOfWeek: 1 });
```

<Live widget="Calendar" :options="{ timeZone: 'America/New_York', locale: 'en-US', firstDayOfWeek: 1, months: 1 }" />

The shortcuts follow the same answer. *This week* in `fr-FR` starts on the
Monday; in `en-US` it starts on the Sunday before it — a calendar and a
shortcut that disagreed about where a week begins would be worse than either
choice.

And a time field follows the locale into twelve hours, or not:

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', locale: 'en-US', value: Temporal.Instant.from('2026-09-20T12:15Z') }" />

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', value: Temporal.Instant.from('2026-09-20T12:15Z') }" />

No locale files ship with tzslot. Air Datepicker carries thirty of them; they
go stale, and they are bytes every visitor downloads for languages they do not
read.

## The words tzslot adds

Everything else — *Today*, *Clear*, *From*, *Until*, the sentence explaining a
change of offset — is one bundle. English and French are included.

::: code-group
<!-- not-compiled: what to add to an application's own bootstrap -->
```ts [Angular]
import { provideTzslotMessages, FR } from '@tzslot/angular';

bootstrapApplication(App, { providers: [provideTzslotMessages(FR)] });
```
```js [Anywhere else]
import { createCalendar, FR } from '@tzslot/dom';

createCalendar(element, { locale: 'fr-FR', messages: FR });
```
:::

An application speaks one language, so saying it once is the usual way. A
screen that switches language **while it runs** passes the bundle on the tag
instead — an injected value is read once and never changes again, so the month
names would follow the switch and the buttons would not:

```html
<tz-range-field [messages]="words()" [locale]="lang()" />
```

What a tag says wins; what the application provided is the fallback. Press the
buttons under this one — the month names and the widget's own words change
together, and the field keeps what was chosen:

<Live
  widget="RangeField"
  :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', messages: EN, months: 1, presets: ['today', 'thisWeek'] }"
  :controls="[
    { label: 'English', run: (f) => f.update({ locale: 'en-GB', messages: EN }) },
    { label: 'Français', run: (f) => f.update({ locale: 'fr-FR', messages: FR }) },
  ]"
/>

Switching only the locale is what an injected bundle leaves you with: the
months move and the words do not.

<Live
  widget="RangeField"
  :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', messages: EN, months: 1, presets: ['today', 'thisWeek'] }"
  :controls="[
    { label: 'en-GB only', run: (f) => f.update({ locale: 'en-GB' }) },
    { label: 'fr-FR only', run: (f) => f.update({ locale: 'fr-FR' }) },
  ]"
/>

The locale and the bundle are separate, and mixing them deliberately shows why
they have to be. A French locale with the English bundle — French months,
English buttons:

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', messages: EN, buttons: ['today', 'clear'], months: 1 }" />

Both French:

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', messages: FR, buttons: ['today', 'clear'], months: 1 }" />

Overriding a few words rather than the whole bundle:

```js
createCalendar(element, {
  locale: 'en-GB',
  messages: { ...EN, today: 'Jump to today', clear: 'Start over' },
  buttons: ['today', 'clear'],
});
```

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', messages: { ...EN, today: 'Jump to today', clear: 'Start over' }, buttons: ['today', 'clear'], months: 1 }" />

## Another language

Copy `EN`, change the words. Some of them are functions, because languages do
not agree on where the pieces go — French puts the real duration before the
reason, German puts the verb at the end, and a format string cannot express
either.

```ts
import { EN, type TzslotMessages } from '@tzslot/dom';

export const ES: TzslotMessages = {
  ...EN,
  today: 'Hoy',
  clear: 'Borrar',
  summerTime: 'verano',
  winterTime: 'invierno',
  clockChange: ({ direction, by, apparent, real }) =>
    `Dura ${real} en vez de ${apparent}: los relojes se ${
      direction === 'back' ? 'atrasan' : 'adelantan'
    } ${by}.`,
};
```

The name a zone gives each reading — "heure d'été d'Europe centrale" — is not
in the bundle: that too comes from `Intl`, in the reader's language. The two
words *summer* and *winter* are in the bundle, because they are the library's
own shorthand and no API hands them out.

Here is where all of it meets: a French locale, the French bundle, and the
morning the clocks go back in Paris.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', messages: FR, showTime: true, timeLayout: 'select', minuteStep: 30, months: 1, today: Temporal.PlainDate.from('2026-10-25'), value: { start: Temporal.Instant.from('2026-10-24T22:00Z'), end: Temporal.Instant.from('2026-10-25T00:30Z') } }" />

## Arabic, and reading right to left

`AR` ships alongside `EN` and `FR`.

```ts
import { AR } from '@tzslot/dom';

createRangeField(element, { locale: 'ar-EG', messages: AR, timeZone: 'Africa/Cairo' });
```

Two settings, not one. `messages` chooses the words; `locale` chooses
everything `Intl` decides — and for Arabic those come apart in a way they
never do for French:

| locale | figures | week starts |
|---|---|---|
| `ar` | `20` | Saturday |
| `ar-EG` | `٢٠` | Saturday |
| `ar-SA` | `٢٠` | Sunday |
| `ar-MA` | `20` | Monday |

So the catalogue holds no figures at all. A screen in Rabat and one in Cairo
want the same words and different numerals, and picking one for them would be
the library deciding something that is not its business.

### Counting, which Arabic does in six ways

English has a singular and a plural. Arabic has six categories, and the
library's countable sentences are functions precisely so a catalogue can use
them:

<!-- not-compiled: a property fragment, written inside a catalogue -->
```ts
const days = new Intl.PluralRules('ar');
dailySummary: ({ days: n, total }) =>
  `${n} ${{ zero: 'أيام', one: 'يوم', two: 'يومان', few: 'أيام', many: 'يوماً', other: 'يوم' }[days.select(n)]} · ${total}`,
```

`يومان` is the dual — a form for exactly two, which English has no use for and
a format string with a hole in it cannot reach.

### Typing a date

Arabic-Indic and Persian figures are read as the numbers they are, so `٢٠` and
`۲۰` and `20` all mean twenty. That works in every locale, not only Arabic:
nothing is lost by accepting them in a French field.

<Live
  widget="DateField"
  :options="{ locale: 'ar-EG', messages: AR, today: Temporal.PlainDate.from('2026-09-20') }"
  dir="rtl"
/>

### The direction

The widgets follow the direction in force where they stand — `dir="rtl"` on
any ancestor, or on the page. Nothing to configure.

The panel is the part worth knowing about. It is drawn on `document.body`, so
it inherits nothing from your container: it reads the direction off the field
it belongs to and carries it over, the same way it carries the palette. An
application that reverses one container rather than the whole page still gets
a panel that matches.

<Live
  widget="RangeField"
  :options="{ timeZone: 'Africa/Cairo', locale: 'ar-EG', messages: AR, showTime: true, timeLayout: 'select', minuteStep: 30, months: 1, today: Temporal.PlainDate.from('2026-09-20') }"
  dir="rtl"
/>

Inside the grid, an arrow key means a day rather than a side: the key pointing
at tomorrow moves to tomorrow, which in Arabic is the one on the left. Up and
down are untouched, because a week sits below the one before it in every
writing direction.

### A calendar that is not Gregorian

`getMonthGrid` builds a month in whatever calendar it is given, and `inMonth`
reads a day in that calendar:

```ts
import { getMonthGrid, inMonth } from '@tzslot/core';

// Rabi al-Thani 1448 — thirty days, 12 September to 11 October 2026.
const grid = getMonthGrid(1448, 4, 7, 'islamic-umalqura');
const own = grid.flat().filter((day) => inMonth(day, 1448, 4, 'islamic-umalqura'));
```

What comes back is ISO, whatever was asked for. A calendar is a way of reading
dates, not of storing them — the same rule this library applies to time zones,
where a moment is kept in UTC and read on somebody's clocks. For the Hijri day
number of a cell, ask the date: `day.withCalendar('islamic-umalqura').day`.

**The widgets do not use this yet.** Each keeps its own year and month and
steps it by one, which is not stepping a month in a calendar whose years hold
a varying number of them. The grid is ready; the five widgets that would drive
it are not.
