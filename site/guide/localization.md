# Localization

Two things decide what a widget says, and they are separate on purpose.

## The locale

Month names, weekday names, the order of a date and whether the clock runs to
twelve or twenty-four all come from `Intl`, which every browser already has.
Pass a BCP-47 tag, or leave it out and the browser's own is used.

```html
<tz-calendar locale="fr-FR" />
```

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
in the bundle: that too comes from `Intl`, in the reader's language.
