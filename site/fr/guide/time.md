# Choisir une heure

Trois façons, et `timeLayout` choisit entre elles à l'intérieur d'un champ.
Isolées, ce sont `createTimeInput`, `createTimeSelect` et `createTimeSlots`.
Elles existent parce que demander « une heure quelconque » et demander « une de
ces heures-là » sont deux questions différentes.

Chaque option des trois a un exemple qui tourne dessous.

## Un champ compact — `createTimeInput`

En Angular : `<tz-time-input>`, un `ControlValueAccessor` comme les autres.


`timeLayout: 'input'`. Les flèches, la molette, les touches haut et bas, et la
saisie. Sur douze heures là où la locale écrit les heures comme ça.

<Live widget="TimeInput" :options="{}" />

Chaque champ boucle sur lui-même : faire passer les minutes au-delà de l'heure
déplacerait un rendez-vous d'une heure que personne n'a demandée.

### `stepMinutes`

Ce que déplace une pression sur une flèche. `5` par défaut.

```js
createTimeInput(element, { stepMinutes: 15 });
```

<Live widget="TimeInput" :options="{ stepMinutes: 15 }" />

### `value`

L'heure sur laquelle il s'ouvre, en `PlainTime` — un cadran, sans jour ni
fuseau attachés. Le jour et le fuseau sont ce qui en fait un moment, et ce sont
[`date`](#date-et-timezone) et [`timeZone`](#date-et-timezone) plus bas.

```js
createTimeInput(element, { value: Temporal.PlainTime.from('09:30') });
```

<Live widget="TimeInput" :options="{ value: Temporal.PlainTime.from('09:30') }" />

### `minTime` et `maxTime`

La fenêtre dans laquelle restent les flèches et la saisie. Les deux acceptent un
`PlainTime` ou la chaîne correspondante.

```js
createTimeInput(element, { minTime: '08:00', maxTime: '19:30' });
```

<Live widget="TimeInput" :options="{ minTime: '08:00', maxTime: '19:30' }" />

### `variant`

`'boxed'` par défaut — un champ encadré. `'bare'` enlève le cadre et empile les
flèches au-dessus et au-dessous des chiffres, ce que font les champs à
l'intérieur d'un panneau.

<Live widget="TimeInput" :options="{ variant: 'bare' }" />

### `locale`

Décide douze ou vingt-quatre heures, parce que c'est ce que la locale écrit.
Rien d'autre ne change dans ce contrôle.

```js
createTimeInput(element, { locale: 'en-US' });
```

<Live widget="TimeInput" :options="{ locale: 'en-US', value: Temporal.PlainTime.from('14:30') }" />

### `date` et `timeZone`

Avec les deux, le contrôle sait sur quel jour il se tient, et les deux matins de
l'année cessent d'être ordinaires. Sans eux, c'est un cadran, rien de plus.

```js
createTimeInput(element, { date: '2026-10-25', timeZone: 'Europe/Paris' });
```

<Live widget="TimeInput" :options="{ date: '2026-10-25', timeZone: 'Europe/Paris', value: Temporal.PlainTime.from('02:30') }" />

Descendez depuis 03:00 le 29 mars et la flèche se pose sur 01:59 : l'heure
intermédiaire n'existe pas à Paris ce matin-là.

<Live widget="TimeInput" :options="{ date: '2026-03-29', timeZone: 'Europe/Paris', value: Temporal.PlainTime.from('03:00') }" />

### `disabled`

```js
createTimeInput(element, { disabled: true });
```

<Live widget="TimeInput" :options="{ value: Temporal.PlainTime.from('09:30'), disabled: true }" />

## Deux menus — `createTimeSelect`

En Angular : `<tz-time-select>`, avec `offsetChange` pour la lecture retenue.


`timeLayout: 'select'`. Un menu d'heures et un menu de minutes. Ce sont de vrais
éléments `<select>` : le clavier fonctionne, rien ne peut les rogner, et un
téléphone ouvre son propre sélecteur.

<Live widget="TimeSelect" :options="{}" />

### `minuteStep` et `hourStep`

Ce que propose chaque menu. Une minute par défaut, ce qui fait un long menu —
les demi-heures sont ce que veulent la plupart des écrans. La valeur déjà
retenue est toujours dans la liste, quel que soit le pas, sinon une heure
fournie disparaîtrait du contrôle censé l'afficher.

```js
createTimeSelect(element, { minuteStep: 30 });
```

<Live widget="TimeSelect" :options="{ minuteStep: 30 }" />

```js
createTimeSelect(element, { hourStep: 2, minuteStep: 15 });
```

<Live widget="TimeSelect" :options="{ hourStep: 2, minuteStep: 15 }" />

### `date` et `timeZone`

Avec un jour et un fuseau — que les champs transmettent — les menus montrent ce
jour tel qu'il est vraiment. Ci-dessous, le 25 octobre 2026 à Paris : **02
apparaît deux fois**, et en choisir une répond à la question d'emblée.

```js
createTimeSelect(element, { date: '2026-10-25', timeZone: 'Europe/Paris' });
```

<Live widget="TimeSelect" :options="{ minuteStep: 30, date: '2026-10-25', timeZone: 'Europe/Paris' }" />

Le 29 mars, l'heure manque tout simplement — il n'y a pas de 02 dans le menu :

<Live widget="TimeSelect" :options="{ minuteStep: 30, date: '2026-03-29', timeZone: 'Europe/Paris' }" />

### `readingStyle`

Comment l'heure répétée est montrée. `'named'` — la valeur par défaut — écrit
l'heure une fois et nomme la lecture en vigueur sous le contrôle. `'marked'`
met les deux dans le menu, `02` et `02*`.

<Live widget="TimeSelect" :options="{ minuteStep: 30, date: '2026-10-25', timeZone: 'Europe/Paris', readingStyle: 'marked', value: Temporal.PlainTime.from('02:30') }" />

### `offset`

Quelle lecture d'une heure ambiguë est retenue, sous la forme `+02:00` ou
`+01:00`. C'est le second argument que rend `onChange`, et la façon d'en fournir
une. Sur une heure non ambiguë, il ne veut rien dire et il est ignoré.

```js
createTimeSelect(element, {
  date: '2026-10-25', timeZone: 'Europe/Paris',
  value: Temporal.PlainTime.from('02:30'), offset: '+01:00',   // hiver
});
```

<Live widget="TimeSelect" :options="{ minuteStep: 30, date: '2026-10-25', timeZone: 'Europe/Paris', value: Temporal.PlainTime.from('02:30'), offset: '+01:00' }" />

### `minTime` et `maxTime`

```js
createTimeSelect(element, { minTime: '09:00', maxTime: '17:00' });
```

<Live widget="TimeSelect" :options="{ minuteStep: 30, minTime: '09:00', maxTime: '17:00' }" />

## Les créneaux du jour — `createTimeSlots`

`timeLayout: 'list'`. Toutes les heures réservables du jour, ce que veut un
écran de réservation. La valeur est un `Instant` : un créneau est un moment, pas
un cadran.

<Live widget="TimeSlots" :options="{ date: '2026-09-22', timeZone: 'Europe/Paris' }" />

### `stepMinutes`

L'écart entre les créneaux. Trente minutes par défaut.

```js
createTimeSlots(element, { date: '2026-09-22', timeZone: 'Europe/Paris', stepMinutes: 60 });
```

<Live widget="TimeSlots" :options="{ date: '2026-09-22', timeZone: 'Europe/Paris', stepMinutes: 60 }" />

### `minTime` et `maxTime`

Les heures d'ouverture. Sans elles, la liste couvre toute la journée.

```js
createTimeSlots(element, {
  date: '2026-09-22', timeZone: 'Europe/Paris',
  stepMinutes: 30, minTime: '09:00', maxTime: '12:00',
});
```

<Live widget="TimeSlots" :options="{ date: '2026-09-22', timeZone: 'Europe/Paris', stepMinutes: 30, minTime: '09:00', maxTime: '12:00' }" />

### `isDisabled`

Ce qui est déjà pris. Appelée pour chaque créneau : gardez-la du côté de la
consultation.

Un créneau porte `time` (le cadran), `exists`, `ambiguous`, `offsets` et
`instants` — les moments auxquels ce cadran correspond, et c'est cela qu'un
système de réservation stocke.

```js
createTimeSlots(element, {
  date: '2026-09-22', timeZone: 'Europe/Paris',
  isDisabled: (slot) => slot.instants.some((at) => pris.has(at.toString())),
});
```

<Live widget="TimeSlots" :options="{ date: '2026-09-22', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '09:00', maxTime: '17:00', isDisabled: (slot) => [11, 14].includes(slot.time.hour) }" />

### Les deux matins, dans une liste

Le matin où les pendules reculent, l'heure est proposée **deux fois**, avec les
décalages en dessous, parce que ce sont deux vrais créneaux que quelqu'un
pourrait réserver :

<Live widget="TimeSlots" :options="{ date: '2026-10-25', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '00:00', maxTime: '05:00' }" />

Le matin où l'une est sautée, elle est barrée et ne peut pas être choisie :

<Live widget="TimeSlots" :options="{ date: '2026-03-29', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '00:00', maxTime: '05:00' }" />

### `skipNonExistent`

Retire l'heure impossible de la liste au lieu de la barrer. Le défaut l'affiche,
parce qu'un lecteur qui attendait 02:30 et ne la trouve pas ira chercher le bug
dans votre système de réservation.

<Live widget="TimeSlots" :options="{ date: '2026-03-29', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '00:00', maxTime: '05:00', skipNonExistent: true }" />

### `emptyLabel`, `missingLabel` et `ariaLabel`

Ce que dit la liste quand la journée n'offre rien du tout, ce qu'elle écrit sous
une heure barrée, et comment un lecteur d'écran nomme la liste elle-même.

```js
createTimeSlots(element, {
  date: '2026-12-25', timeZone: 'Europe/Paris',
  minTime: '19:00', maxTime: '18:00',       // une fenêtre qui ne contient rien
  emptyLabel: 'Fermé le 25 décembre',
  ariaLabel: 'Rendez-vous disponibles',
});
```

<Live widget="TimeSlots" :options="{ date: '2026-12-25', timeZone: 'Europe/Paris', minTime: '19:00', maxTime: '18:00', emptyLabel: 'Fermé le 25 décembre', ariaLabel: 'Rendez-vous disponibles' }" />

Il lui faut un jour : sans `date` du tout, la liste ne dessine rien plutôt que
d'affirmer qu'une journée n'offre rien, ce qui serait une autre affirmation.

`missingLabel` remplace le mot écrit dans une heure barrée — *sautée* par
défaut — et il doit rester court, parce qu'il tient dans un bouton de la
largeur d'une heure :

<Live widget="TimeSlots" :options="{ date: '2026-03-29', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '00:00', maxTime: '05:00', missingLabel: 'n/d' }" />

## L'heure qui arrive deux fois

Quelle que soit la façon dont l'heure est demandée, la valeur est un `Instant` —
un moment, pas un cadran. Quand le cadran est ambigu :

- les **menus** proposent les deux lectures, nommées *été* et *hiver* ;
- le **champ compact** pose la question une fois, avec les deux mêmes mots, et
  le texte du champ dit ensuite laquelle il retient : `25/10/2026 02:30 (hiver)` ;
- la **liste** montre les deux, avec leurs décalages en dessous.

## L'heure qui n'existe pas

La taper amène au premier moment qui existe et le dit. Les flèches l'enjambent —
03:00 vers le bas, c'est 01:00 ce matin-là. Les menus et la liste ne la
proposent pas du tout, sauf si `skipNonExistent` est désactivé, où la liste la
montre barrée.
