# Langue et locale

Deux choses décident de ce qu’affiche un composant, et elles sont séparées à
dessein.

## La locale

Les noms de mois, les noms de jours, l’ordre d’une date et le choix entre
douze et vingt-quatre heures viennent tous d’`Intl`, que tout navigateur
possède déjà. Passez une étiquette BCP-47, ou laissez faire : celle du
navigateur s’applique.

```html
<tz-calendar locale="fr-FR" />
```

Aucun fichier de locale n’est livré avec tzslot. Air Datepicker en embarque
une trentaine ; ils vieillissent, et ce sont des octets que chaque visiteur
télécharge pour des langues qu’il ne lit pas.

## Les mots que tzslot ajoute

Tout le reste — *Aujourd’hui*, *Effacer*, *Du*, *Jusqu’au*, la phrase qui
explique un changement de décalage — tient dans un seul jeu. L’anglais et le
français sont fournis.

::: code-group
```ts [Angular]
import { provideTzslotMessages, FR } from '@tzslot/angular';

bootstrapApplication(App, { providers: [provideTzslotMessages(FR)] });
```
```js [Ailleurs]
import { createCalendar, FR } from '@tzslot/dom';

createCalendar(element, { locale: 'fr-FR', messages: FR });
```
:::

## Une autre langue

Copiez `EN`, changez les mots. Certains sont des fonctions, parce que les
langues ne s’accordent pas sur l’ordre des morceaux : le français met la durée
réelle avant la raison, l’allemand met le verbe à la fin, et aucune chaîne de
format n’exprime l’un ou l’autre.

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

Le nom qu’un fuseau donne à chaque lecture — « heure d’été d’Europe
centrale » — n’est pas dans le jeu de messages : il vient lui aussi d’`Intl`,
dans la langue du lecteur.
