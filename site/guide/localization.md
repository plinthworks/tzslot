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
```ts [Angular]
import { provideTzslotMessages, FR } from '@tzslot/angular';

bootstrapApplication(App, { providers: [provideTzslotMessages(FR)] });
```
```js [Anywhere else]
import { createCalendar, FR } from '@tzslot/dom';

createCalendar(element, { locale: 'fr-FR', messages: FR });
```
:::

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

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', messages: FR, showTime: true, timeLayout: 'select', minuteStep: 30, months: 1, today: Temporal.PlainDate.from('2026-10-25'), value: { start: Temporal.Instant.from('2026-10-24T22:00Z'), end: Temporal.Instant.from('2026-10-25T00:30Z'), allDay: false } }" />
