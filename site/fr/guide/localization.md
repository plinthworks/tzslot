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

Le même calendrier, quatre locales. Rien d’autre n’est réglé : les noms de
mois et l’ordre des jours suivent.

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', locale: 'en-GB', months: 1 }" />

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', months: 1 }" />

<Live widget="Calendar" :options="{ timeZone: 'America/New_York', locale: 'en-US', months: 1 }" />

<Live widget="Calendar" :options="{ timeZone: 'Asia/Tokyo', locale: 'ja-JP', months: 1 }" />

Le début de la semaine vient aussi de la locale — lundi en France et au
Royaume-Uni, **dimanche** aux États-Unis et au Japon, samedi dans une grande
partie du monde arabe. Rien ci-dessus ne l’a demandé ; regardez le calendrier
`en-US` et celui en `ja-JP`.

C’est `Intl` qu’on interroge, pas une table tenue ici : une table de deux
cents locales est une table qui se périme. Là où le navigateur est trop ancien
pour répondre — vieux Safari, vieux Firefox — la semaine commence le lundi,
comme le dit ISO-8601.

`firstDayOfWeek` passe outre, pour l’entreprise qui n’est pas d’accord avec sa
propre locale :

```js
createCalendar(element, { locale: 'en-US', firstDayOfWeek: 1 });
```

<Live widget="Calendar" :options="{ timeZone: 'America/New_York', locale: 'en-US', firstDayOfWeek: 1, months: 1 }" />

Les raccourcis suivent la même réponse. *Cette semaine* en `fr-FR` commence le
lundi ; en `en-US`, le dimanche d’avant — un calendrier et un raccourci qui ne
seraient pas d’accord sur le début d’une semaine seraient pires que l’un ou
l’autre choix.

Et un champ horaire suit la locale vers douze heures, ou non :

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', locale: 'en-US', value: Temporal.Instant.from('2026-09-20T12:15Z') }" />

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', value: Temporal.Instant.from('2026-09-20T12:15Z') }" />

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

Une application parle une langue, donc le dire une fois est la façon
habituelle. Un écran qui change de langue **pendant qu'il tourne** passe le jeu
sur la balise : une valeur injectée est lue une seule fois et ne change plus,
donc les noms de mois suivraient la bascule et les boutons non.

```html
<tz-range-field [messages]="mots()" [locale]="langue()" />
```

Ce qu'écrit la balise l'emporte ; ce que fournit l'application est le repli.

La locale et le jeu de messages sont distincts, et les mélanger exprès montre
pourquoi ils doivent l’être. Une locale française avec le jeu anglais — mois
français, boutons anglais :

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', messages: EN, buttons: ['today', 'clear'], months: 1 }" />

Les deux en français :

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', messages: FR, buttons: ['today', 'clear'], months: 1 }" />

Redéfinir quelques mots plutôt que tout le jeu :

```js
createCalendar(element, {
  locale: 'fr-FR',
  messages: { ...FR, today: 'Aller à aujourd’hui', clear: 'Tout effacer' },
  buttons: ['today', 'clear'],
});
```

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', messages: { ...FR, today: 'Aller à aujourd’hui', clear: 'Tout effacer' }, buttons: ['today', 'clear'], months: 1 }" />

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
dans la langue du lecteur. Les deux mots *été* et *hiver*, eux, sont dans le
jeu de messages : c’est le raccourci propre à la librairie, et aucune API ne
les fournit.

Voici où tout cela se rejoint : une locale française, le jeu français, et le
matin où les pendules reculent à Paris.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', messages: FR, showTime: true, timeLayout: 'select', minuteStep: 30, months: 1, today: Temporal.PlainDate.from('2026-10-25'), value: { start: Temporal.Instant.from('2026-10-24T22:00Z'), end: Temporal.Instant.from('2026-10-25T00:30Z') } }" />
