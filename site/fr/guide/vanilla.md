# Sans framework

Chaque composant est une fonction. Appelez-la avec un élément et des options,
elle rend une instance.

```js
import { createCalendar } from '@tzslot/dom';
import '@tzslot/theme';

const calendar = createCalendar(document.querySelector('#day'), {
  locale: 'fr-FR',
  onChange: (day) => console.log(day?.toString()),
});
```

<Live widget="Calendar" :options="{ locale: 'fr-FR' }" />

## L’instance

| | |
|---|---|
| `update(settings)` | Change n’importe quelle option. N’appelle jamais `onChange` : c’est l’extérieur qui informe le composant, pas l’utilisateur qui agit. |
| `clear()` | Vide la sélection — et le signale, parce que là, c’est bien l’utilisateur qui l’a demandé. |
| `destroy()` | Retire tout ce qu’il a dessiné et tous les écouteurs qu’il a posés. |
| `value` | Ce qu’il contient, lisible à tout moment. |

Les champs ajoutent `open()`, `close()` et `toggle()` ; le calendrier ajoute
`goTo()` et `setIcons()`.

```js
calendar.update({ min: Temporal.Now.plainDateISO() });
calendar.goTo({ year: 2027, month: 3 });
calendar.destroy();
```

## Partir d’une valeur

Chaque composant accepte sa valeur parmi ses options, pour qu’un écran
s’ouvre sur ce qui est déjà choisi :

```js
createDateTimeField(el, {
  timeZone: 'Europe/Paris',
  value: Temporal.Instant.from('2026-09-23T12:30:00Z'),
});
```

La forme est celle que ce composant rend : un `PlainDate` pour un calendrier
ou un champ de date, un `Instant` dès qu’il y a une heure, un tableau de
`PlainDate` pour `createMultiDate`, `{ start, end }` pour une plage,
`{ start, end, allDay }` pour `createRangeField`.

`update({ value })` la déplace ensuite et `update({ value: null })` la vide —
ni l’un ni l’autre n’appelle `onChange`, donc une application qui renvoie une
valeur au composant d’où elle vient ne boucle pas. `goTo()` déplace le mois
sans rien choisir.

## Styles

La mise en page vient avec le composant : il injecte une feuille par famille,
une fois par document, au premier dessin. Sous une Content-Security-Policy qui
interdit les styles en ligne, passez `injectStyles: false` et incluez
vous-même les chaînes exportées.

```js
import { CALENDAR_CSS, FIELD_CSS } from '@tzslot/dom';
```

La couleur est à part, et facultative : voir [Thème](./theming).

## Shadow DOM

Un composant placé dans un shadow root y met ses styles plutôt que dans le
document : il reste habillé là où on le monte.
