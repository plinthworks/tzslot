# Choisir une période

`createRangeField` — `<tz-range-field>` en Angular — c'est un seul champ pour
toute une période : un déclencheur qui affiche `18/09/2026 – 24/09/2026`, et un
panneau contenant tout ce qu'il faut pour la changer.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, showTime: true, openEnded: true, shift: 'auto', weekNumbers: true }" />

Tout ce qui suit est une option, avec un exemple qui tourne dessous. Chacun est
indépendant : ce que vous voyez fonctionner, c'est le code juste au-dessus, rien
d'autre.

## À quoi sert le champ

### `title`

Écrit au-dessus du panneau, et annoncé comme le libellé du champ lui-même. Un
sélecteur sans sujet est un sélecteur dont le lecteur doit deviner l'objet
d'après ce qui se trouve à côté, et deux sélecteurs sur le même écran ne se
distinguent alors que par leur position.

```js
createRangeField(element, { timeZone: 'Europe/Paris', title: 'Dates de voyage' });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', title: 'Dates de voyage' }" />

### `timeZone`

La seule sans valeur par défaut. Chaque date du champ désigne un moment dans ce
fuseau, et une période comptée dedans : demandez sept jours à cheval sur le
changement d'octobre à Paris et la réponse fait 169 heures, pas 168.

```js
createRangeField(element, { timeZone: 'Pacific/Auckland' });
```

<Live widget="RangeField" :options="{ timeZone: 'Pacific/Auckland', title: 'Auckland' }" />

### `locale`

Ce qu'écrit `Intl` : les noms de mois, l'ordre des chiffres, le premier jour de
la semaine sauf si vous en décidez autrement. Elle ne traduit pas les mots du
composant — ceux-là viennent de [`messages`](#messages).

```js
createRangeField(element, { timeZone: 'Europe/Paris', locale: 'ja-JP' });
```

<Live widget="RangeField" :options="{ timeZone: 'Asia/Tokyo', locale: 'ja-JP' }" />

### `value`

Une période sur laquelle le champ s'ouvre, calculée par l'application plutôt que
choisie. Les deux bornes sont des instants.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  showTime: true,
  value: {
    start: Temporal.Instant.from('2026-09-21T07:00Z'),
    end: Temporal.Instant.from('2026-09-25T16:00Z'),
    allDay: false,
  },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, value: { start: Temporal.Instant.from('2026-09-21T07:00Z'), end: Temporal.Instant.from('2026-09-25T16:00Z'), allDay: false } }" />

::: warning `allDay: false` n'est pas facultatif ici
Sans lui, les deux bornes sont lues comme des journées entières : les heures
restent dans la valeur mais le champ écrit `21/09/2026 – 25/09/2026`, et la fin
compte comme le minuit **après** le dernier jour. C'est ce que `allDay`
tranche — voir [Journées entières](./values#journées-entières-allday-et-la-fin-qu-on-ne-voit-pas).
Une valeur porteuse d'heures le dit.
:::

## Jours, ou horaires

### `showTime`

`false` — la valeur par défaut — fait de la période des journées entières : du
minuit qui ouvre la première **au minuit qui suit la dernière**, cette fin
exclusive expliquée dans [Ce que vous récupérez](./values).

```js
createRangeField(element, { timeZone: 'Europe/Paris', showTime: false });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: false, title: 'Journées entières' }" />

`true` donne une heure à chaque jour choisi, minuit sauf indication de l'écran.
Il n'y a pas d'interrupteur *Toute la journée* : il demandait au lecteur de
classer sa propre réponse avant de la donner.

```js
createRangeField(element, { timeZone: 'Europe/Paris', showTime: true });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, title: 'Avec les heures' }" />

### `defaultTimes`

Les heures que reçoit un jour *nouvellement choisi*. Une valeur fournie garde
les siennes, donc un écran peut s'ouvrir sur une période qu'il a calculée et
proposer quand même les horaires de bureau pour ce qui sera choisi ensuite.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  showTime: true,
  defaultTimes: { start: '09:00', end: '18:00' },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, defaultTimes: { start: '09:00', end: '18:00' }, title: 'Horaires de bureau' }" />

### `timeLayout`

Deux façons de demander une heure. `'select'` est la valeur par défaut : un menu
d'heures et un menu de minutes, parce que la plupart du temps une heure se
choisit d'emblée et qu'un menu, c'est deux clics.

```js
createRangeField(element, { timeZone: 'Europe/Paris', showTime: true, timeLayout: 'select' });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, timeLayout: 'select', title: 'select' }" />

`'input'` place une flèche au-dessus et une au-dessous des chiffres. Ça convient
pour ajuster une heure déjà presque juste, pas pour en choisir une à partir de
rien.

```js
createRangeField(element, { timeZone: 'Europe/Paris', showTime: true, timeLayout: 'input' });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, timeLayout: 'input', title: 'input' }" />

### `minuteStep`

Ce que propose le **menu** des minutes. `5` par défaut ; la minute déjà retenue
est toujours dans la liste, quel que soit le pas — sinon une valeur fournie
disparaîtrait du contrôle censé l'afficher.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris', showTime: true, timeLayout: 'select', minuteStep: 30,
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, timeLayout: 'select', minuteStep: 30, title: 'Demi-heures seulement' }" />

### `stepMinutes`

Ce que déplace une pression sur les **flèches** de l'heure. Distinct de
`minuteStep`, qui est le menu : les deux contrôles répondent à des questions
différentes.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris', showTime: true, timeLayout: 'input', stepMinutes: 15,
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, timeLayout: 'input', stepMinutes: 15, title: 'Quarts d\'heure' }" />

### `snapMinutes`

Arrondit tout ce qui arrive — saisi, choisi ou fourni — sur une grille. Un
système de réservation par demi-heures n'a rien à faire de `10:07`.

```js
createRangeField(element, { timeZone: 'Europe/Paris', showTime: true, snapMinutes: 30 });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, snapMinutes: 30, title: 'Calé sur :00 et :30' }" />

## Quelle longueur elle peut faire

### `openEnded`

Permet à une période de s'arrêter d'un seul côté — le `>=` sans `<` que sont la
plupart des recherches. Chaque champ porte alors une croix : vider *Du* veut
dire *jusqu'au*, vider *Au* veut dire *à partir du*. Désactivé par défaut, parce
qu'un formulaire de réservation ne doit pas accepter un séjour sans fin.

```js
createRangeField(element, { timeZone: 'Europe/Paris', openEnded: true });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', openEnded: true, title: 'Ouverte d\'un côté' }" />

### `maxSpan`

La durée maximale de la période. Déplacez une borne au-delà et c'est **l'autre**
qui suit, plutôt que le clic d'être refusé — un refus laisse le lecteur deviner
laquelle des deux posait problème.

```js
createRangeField(element, { timeZone: 'Europe/Paris', maxSpan: { days: 14 } });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', maxSpan: { days: 14 }, title: 'Deux semaines au plus' }" />

### `minSpan`

La même chose dans l'autre sens : un séjour d'au moins deux nuits.

```js
createRangeField(element, { timeZone: 'Europe/Paris', minSpan: { days: 2 } });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', minSpan: { days: 2 }, title: 'Deux nuits minimum' }" />

Les deux acceptent aussi les formes courtes ci-dessous : `maxSpan: '3d'`.

## Les raccourcis

### `presets`

Des périodes nommées sur le côté du panneau, de la plus courte à la plus longue,
pour qu'un lecteur qui parcourt la colonne puisse s'arrêter dès qu'elle dépasse.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  presets: ['thisQuarterHour', 'thisHour', 'today', 'last7Days', 'thisQuarter'],
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, presets: ['thisQuarterHour', 'thisHour', 'today', 'last7Days', 'thisQuarter'] }" />

| | |
|---|---|
| plus court qu'un jour | `thisQuarterHour` · `lastHour` · `thisHour` · `nextHour` |
| jours | `yesterday` · `today` · `tomorrow` · `last7Days` · `last14Days` · `last30Days` · `next7Days` · `next30Days` |
| unités du calendrier | `thisWeek` · `lastWeek` · `thisMonth` · `lastMonth` · `thisQuarter` · `lastQuarter` · `nextQuarter` · `thisYear` |

Les quatre plus courts rendent deux **moments**, pas deux dates — le quart
d'heure en cours va de 11:00 à 11:15 un jour précis — et ils sont arrondis sur
l'horloge du fuseau plutôt que sur l'epoch, sans quoi un fuseau décalé d'un
quart d'heure serait arrondi sur celle de quelqu'un d'autre.

`presets: []` supprime la colonne :

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', presets: [], title: 'Sans raccourcis' }" />

Les vôtres s'écrivent `{ name, label, range }`, et peuvent rendre l'une ou
l'autre forme. Un `step` propre indique ce que les flèches déplacent une fois le
raccourci pressé :

```js
presets: [
  'today',
  {
    name: 'lastFiveMinutes',
    label: '5 dernières minutes',
    step: { minutes: 5 },
    range: (today, { now, timeZone }) => ({ start: now.subtract({ minutes: 5 }), end: now }),
  },
]
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, shift: 'auto', presets: ['today', { name: 'lastFiveMinutes', label: '5 dernières minutes', step: { minutes: 5 }, range: (today, ctx) => ({ start: ctx.now.subtract({ minutes: 5 }), end: ctx.now }) }] }" />

## Les flèches

### `shift`

Désactivées par défaut, parce qu'un champ qui désigne un jour choisi n'a rien à
parcourir. `'auto'` déplace de ce que le lecteur vient de demander : le raccourci
qu'il a pressé, ou la longueur de ce qui est sélectionné.

```js
createRangeField(element, { timeZone: 'Europe/Paris', shift: 'auto' });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', shift: 'auto', presets: ['today', 'thisWeek', 'thisMonth', 'thisQuarter'], title: 'auto' }" />

Une durée impose le pas à la place, quelle que soit la sélection — c'est ainsi
qu'on déplace une période de trois jours par quarts d'heure :

```js
shift: { minutes: 15 }
shift: '15mn'   // la même chose, et la façon dont un écran le dit en un mot
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, shift: '15mn', title: 'Un quart d\'heure par pression' }" />

| | |
|---|---|
| `25mn` `25min` `25m` | vingt-cinq minutes |
| `1h` | une heure |
| `3d` `3j` | trois jours |
| `2w` `2s` | deux semaines |
| `6mo` | six mois |

`m`, ce sont des minutes et jamais des mois : `mo` dit les mois, et un écran qui
lirait `6m` comme six mois se tromperait d'un facteur quarante-et-quelques
milliers.

Une liste place un petit bouton entre les flèches et laisse le lecteur choisir.
Les libellés sont les vôtres — un pas n'a pas de nom que la librairie pourrait
inventer.

```js
shift: [
  { step: 'auto', label: 'la période' },
  { step: { minutes: 15 }, label: '15 min' },
  { step: { days: 1 }, label: '1 jour' },
]
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, shift: [{ step: 'auto', label: 'la période' }, { step: { minutes: 15 }, label: '15 min' }, { step: { days: 1 }, label: '1 jour' }], title: 'Choisir le pas' }" />

Deux détails qui ne sont pas du hasard. `'auto'` ne déplace pas un trimestre de
sa longueur en jours : 92 jours avant le 1er juillet, c'est le 31 mars, un jour
trop tôt et qui dérive à chaque pression — donc une période faite de mois
entiers se déplace par mois. Et une période ouverte d'un côté n'a aucune
longueur, donc `'auto'` la déplace d'un jour, l'unité dans laquelle travaille le
calendrier.

## Le calendrier à l'intérieur

### `months`

Combien de mois côte à côte. Deux conviennent à une période qui franchit
d'ordinaire une limite de mois ; un seul convient à un écran étroit.

```js
createRangeField(element, { timeZone: 'Europe/Paris', months: 2 });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, title: 'Deux mois' }" />

### `weekNumbers`

Une colonne de numéros de semaine ISO sur la gauche, pour ceux qui planifient
comme ça.

```js
createRangeField(element, { timeZone: 'Europe/Paris', weekNumbers: true });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', weekNumbers: true, title: 'Semaines ISO' }" />

### `firstDayOfWeek`

`1` pour lundi jusqu'à `7` pour dimanche. Omis, c'est la locale qui décide —
dimanche aux États-Unis, lundi en France — et les raccourcis d'une semaine
aussi, pour que la grille et *Cette semaine* ne soient jamais en désaccord.

```js
createRangeField(element, { timeZone: 'America/New_York', locale: 'en-US' });
```

<Live widget="RangeField" :options="{ timeZone: 'America/New_York', locale: 'en-US', presets: ['thisWeek', 'lastWeek'], title: 'en-US : la semaine commence dimanche toute seule' }" />

Ne le réglez que là où une entreprise n'est pas d'accord avec sa propre
locale :

<Live widget="RangeField" :options="{ timeZone: 'America/New_York', locale: 'en-US', firstDayOfWeek: 1, presets: ['thisWeek', 'lastWeek'], title: 'en-US, forcé au lundi' }" />

### `min` et `max`

La fenêtre de jours qu'on peut choisir. En dehors, les jours sont là, grisés,
plutôt qu'absents : un calendrier qui s'arrête net ne donne au lecteur aucun
moyen de distinguer une limite d'un bug.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  min: Temporal.PlainDate.from('2026-09-01'),
  max: Temporal.PlainDate.from('2026-12-31'),
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', min: Temporal.PlainDate.from('2026-09-01'), max: Temporal.PlainDate.from('2026-12-31'), title: 'Ce trimestre uniquement' }" />

### `isDateDisabled`

Tout ce que les deux bornes ne savent pas exprimer. Appelée pour chaque jour
dessiné : gardez-la du côté de la consultation, pas de la requête.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  // Le week-end n'est pas ouvré.
  isDateDisabled: (date) => date.dayOfWeek > 5,
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', isDateDisabled: (date) => date.dayOfWeek > 5, title: 'Jours ouvrés' }" />

### `renderCell`

Une courte ligne sous un jour — un prix, des places restantes, *complet* — plus
vos propres classes, une infobulle, et le pouvoir d'exclure le jour. Elle tourne
pour chaque case à chaque repeinte.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  renderCell: ({ date, outside }) => {
    if (outside) return;
    const prix = 80 + (date.day % 7) * 15;
    return date.dayOfWeek > 5
      ? { note: 'complet', disabled: true, title: 'Plus de chambres' }
      : { note: `${prix} €`, className: prix > 140 ? 'peak' : undefined };
  },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 1, renderCell: (cell) => cell.outside ? undefined : (cell.date.dayOfWeek > 5 ? { note: 'complet', disabled: true, title: 'Plus de chambres' } : { note: (80 + (cell.date.day % 7) * 15) + ' €' }), title: 'Les prix' }" />

La note est du texte, jamais du HTML : un prix venu d'un système de réservation
est une donnée, et une grille qui rend une donnée comme du balisage est à une
injection de devenir la page de quelqu'un d'autre.

## Le champ lui-même

### `disabled`

`true` gèle tout le champ. Un objet gèle **une seule borne** — un séjour dont
l'arrivée est arrêtée et dont le départ reste ouvert :

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  showTime: true,
  value: { start: Temporal.Instant.from('2026-09-21T07:00Z'), end: null, allDay: false },
  openEnded: true,
  disabled: { start: true },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', openEnded: true, showTime: true, disabled: { start: true }, value: { start: Temporal.Instant.from('2026-09-21T07:00Z'), end: null, allDay: false }, title: 'Arrivée arrêtée' }" />

### `mode`

`'popup'` par défaut — un panneau accroché au champ. `'dialog'` le centre sur un
fond assombri, ce que veut un petit écran.

```js
createRangeField(element, { timeZone: 'Europe/Paris', mode: 'dialog' });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', mode: 'dialog', title: 'En boîte de dialogue' }" />

### `placeholder`

Ce qu'affiche le champ fermé quand rien n'est choisi.

```js
createRangeField(element, { timeZone: 'Europe/Paris', placeholder: 'Toutes les dates' });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', placeholder: 'Toutes les dates' }" />

### `ariaLabel`

Pour un champ sans `title` et sans libellé visible à lui — un filtre dans une
barre d'outils, par exemple. Il est annoncé et jamais dessiné.

```js
createRangeField(element, { timeZone: 'Europe/Paris', ariaLabel: 'Filtrer par date' });
```

### `format`

Impose un motif à l'écriture comme à la saisie, par-dessus ce que ferait la
locale.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris', showTime: true, format: 'yyyy-MM-dd HH:mm',
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, format: 'yyyy-MM-dd HH:mm', title: 'Façon ISO' }" />

### `mask`

Actif par défaut : les séparateurs apparaissent à mesure que les chiffres sont
tapés, et jamais pendant une suppression — un masque qui se bat contre la touche
retour est pire que pas de masque du tout.

```js
createRangeField(element, { timeZone: 'Europe/Paris', mask: false });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', mask: false, title: 'Tout taper soi-même' }" />

### `displayWith`

Le dernier mot sur ce qu'affiche le champ fermé. Tout le reste — la locale,
`format` — n'est qu'un moyen de ne pas avoir à écrire ceci.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  displayWith: (value, timeZone) =>
    !value.start || !value.end
      ? 'Choisissez vos nuits'
      : `du ${value.start.toZonedDateTimeISO(timeZone).day} au ${value.end.toZonedDateTimeISO(timeZone).day} du mois`,
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', displayWith: (value, tz) => (!value.start || !value.end) ? 'Choisissez vos nuits' : ('du ' + value.start.toZonedDateTimeISO(tz).day + ' au ' + value.end.toZonedDateTimeISO(tz).day + ' du mois') }" />

### `fieldIcon` et `fieldIconSide`

Chaque champ porte un calendrier, avant le texte par défaut. Passez un nœud à
vous, ou `null` pour aucun.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  fieldIcon: icon('clock'),   // ou un nœud à vous, ou null
  fieldIconSide: 'end',
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, fieldIcon: icon('clock'), fieldIconSide: 'end', title: 'Une horloge, tout au bout' }" />

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', fieldIcon: null, title: 'Sans icône' }" />

Les dessins sont ceux de la librairie — une boîte de 24 sur 24, un trait de deux
unités, des bouts arrondis, les règles que suivent les familles Lucide et
Feather — pour qu'ils tiennent à côté de ces icônes sans avoir l'air empruntés.
Ils ne viennent d'aucune des deux : une librairie qui embarque un jeu d'icônes
le fait porter à tous ses utilisateurs, et une qui l'exige oblige chacun à
l'installer avant qu'un champ ne s'affiche.

Ils sont dessinés en `currentColor` à `1em`, donc ils prennent la graisse du
texte à côté d'eux et le suivent dans un thème sombre sans qu'on le leur dise,
et ils n'interceptent jamais un clic. `icon('calendar')`, depuis `@tzslot/dom`,
vous donne le même nœud ailleurs ; `'clock'`, `'chevronLeft'`, `'chevronRight'`
et `'x'` existent aussi.

### `labels`

Ce qui est écrit au-dessus de chaque champ et entre les deux : les mots des
messages par défaut, un nœud à vous, ou rien.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  labels: { start: null, end: null, between: '»' },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', labels: { start: null, end: null, between: '»' }, title: 'Une flèche au lieu des mots' }" />

```js
labels: { start: 'Arrivée', end: 'Départ', between: '→' }
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', labels: { start: 'Arrivée', end: 'Départ', between: '→' }, title: 'Vos propres mots' }" />

Le mot reste annoncé au lecteur d'écran quel que soit ce qui est dessiné.

### `messages`

Tous les mots que dit la librairie, dans un seul objet. `EN` et `FR` sont
livrés ; redéfinissez les quelques-uns qui vous intéressent plutôt que de
réécrire le lot.

```js
import { FR } from '@tzslot/dom';

createRangeField(element, {
  timeZone: 'Europe/Paris',
  confirm: true,
  messages: { ...FR, apply: 'Rechercher', cancel: 'Laisser tomber' },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', confirm: true, messages: { ...FR, apply: 'Rechercher', cancel: 'Laisser tomber' }, title: 'Vos propres formulations' }" />

### `today` et `now`

Le jour que la grille entoure, et le moment à partir duquel comptent les
raccourcis plus courts qu'un jour. Les deux existent pour qu'un test ne dérive
pas avec l'horloge — et pour qu'un écran affichant la journée de quelqu'un
d'autre puisse le dire.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  today: Temporal.PlainDate.from('2026-12-24'),
  now: Temporal.Instant.from('2026-12-24T11:07:00Z'),
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, presets: ['thisQuarterHour', 'thisHour', 'today'], today: Temporal.PlainDate.from('2026-12-24'), now: Temporal.Instant.from('2026-12-24T11:07:00Z'), title: 'Le 24 décembre, 12:07 à Paris' }" />

### `confirm`

Retient tout jusqu'à ce que **Appliquer** soit pressé, pour une recherche qui
coûte quelque chose. **Annuler** laisse la valeur où elle était.

```js
createRangeField(element, { timeZone: 'Europe/Paris', confirm: true });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', confirm: true, title: 'Rien avant Appliquer' }" />

### `onChange`, `onOpen`, `onClose`

`onChange` vous remet la valeur chaque fois qu'elle se fixe — avec
`confirm: true`, cela veut dire au moment d'**Appliquer**, pas à chaque clic
dans le panneau. La ligne sous chaque exemple de cette page est un `onChange`.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  onChange: (value) => console.log(value.start, value.end),
  onOpen: () => console.log('panneau ouvert'),
  onClose: () => console.log('panneau fermé'),
});
```

## Le panneau, de haut en bas

**Deux champs, Du et Au.** Un clic dans le calendrier remplit celui qui est
armé — celui qui porte l'anneau — et rien d'autre. C'est la différence avec un
simple calendrier de plage : corriger la fin ne jette pas le début et n'oblige
pas à tout reprendre.

Laissé tranquille, le geste habituel survit. Un clic sur le premier champ
remplit le début et arme la fin, donc une période neuve se fait toujours en deux
clics. Ce n'est que lorsque vous placez vous-même le curseur dans un champ que
le calendrier cesse d'avancer : vous avez armé celui-là, donc c'est celui-là
qu'un clic change.

**Les deux champs se saisissent au clavier.** Une période qui finit en février
2028, c'est une ligne de texte, pas dix-huit pressions de flèche, et le
calendrier suit ce qui est tapé : tapez `03/02/2028` et la grille y est déjà
pour le clic suivant. Le motif n'est jamais montré en texte indicatif — un champ
qui explique son propre format avant qu'on ait rien tapé est un champ qui pose
une question au lieu d'inviter une réponse.

## Les deux matins de l'année

Le matin où les pendules reculent, une heure arrive deux fois, et un champ qui
affiche `02:30` pourrait désigner l'une ou l'autre. Les deux sont nommées plutôt
que numérotées, parce que « heure d'été » est quelque chose qu'une personne sait
répondre, là où `+02:00` est quelque chose qu'elle doit calculer.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  showTime: true,
  today: Temporal.PlainDate.from('2026-10-25'),
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, months: 1, today: Temporal.PlainDate.from('2026-10-25'), value: { start: Temporal.Instant.from('2026-10-24T22:00Z'), end: Temporal.Instant.from('2026-10-25T00:30Z'), allDay: false }, title: 'Le matin où les pendules reculent' }" />

Les menus proposent l'heure deux fois et étoilent la seconde — `02` et `02*` —
avec une ligne sous le champ qui nomme la lecture en vigueur : *été*, ou
*\* hiver* quand c'est l'étoilée qui est la réponse, le moment précis où la
marque a besoin d'être expliquée. Nommer les deux dans la liste élargirait le
menu au mot le plus long de la langue, tous les jours ordinaires de l'année
autant que celui-ci. Dans les deux cas, le champ fermé dit laquelle a été
choisie :

```
25/10/2026 00:00 – 25/10/2026 02:30 (hiver)
```

Le matin où une heure est sautée, elle ne peut pas être atteinte du tout : les
flèches l'enjambent, et une heure tapée dans le trou se pose sur le premier
moment qui existe.
