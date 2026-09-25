# Choisir une période

`createRangeField` — `<tz-range-field>` en Angular — c'est un seul champ pour
toute une période : un déclencheur qui affiche `18/09/2026 – 24/09/2026`, et un
panneau contenant tout ce qu'il faut pour la changer.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, showTime: true, openEnded: true, shift: 60, weekNumbers: true }" />

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
  },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, value: { start: Temporal.Instant.from('2026-09-21T07:00Z'), end: Temporal.Instant.from('2026-09-25T16:00Z') } }" />

Il n'y a rien d'autre à passer. Une période, ce sont deux moments : savoir si
ce sont des journées entières se lit sur eux — les deux tombant sur le premier
instant d'un jour — plutôt que de se déclarer. Une valeur qui porte des heures
le dit en les portant.

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
**Ce champ n'a pas d'interrupteur *Toute la journée*** : deux minuits le
disent déjà, il ne reste rien à déclarer au lecteur.
[`createDateTimeRange`](../examples#une-journee-entiere-ou-un-intervalle) est
le seul composant qui garde cet interrupteur, et il porte la réponse dans
`allDay` à côté des deux bornes — à prendre quand un back-end veut qu'on lui
dise le drapeau plutôt que de le lire sur la valeur.

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
l'autre forme :

```js
presets: [
  'today',
  {
    name: 'lastFiveMinutes',
    label: '5 dernières minutes',
    range: (today, { now, timeZone }) => ({ start: now.subtract({ minutes: 5 }), end: now }),
  },
]
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, shift: 5, presets: ['today', { name: 'lastFiveMinutes', label: '5 dernières minutes', range: (today, ctx) => ({ start: ctx.now.subtract({ minutes: 5 }), end: ctx.now }) }] }" />

### `showPresets`

Si la colonne est dessinée, sans toucher à la liste. `presets: []` la vide, et
il faut alors se souvenir ailleurs de ce qu'elle contenait pour la remettre.

```js
createRangeField(element, { timeZone: 'Europe/Paris', showPresets: false });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, presets: ['today', 'last7Days', 'thisMonth'], showPresets: false, title: 'La liste est toujours là' }" />

## Les flèches

### `shift`

Les flèches à côté du champ, et de combien une pression déplace la période.
C'est une façon rapide de choisir : un pas, et vous êtes ailleurs.

**Désactivées par défaut**, parce qu'un champ qui désigne une période choisie
n'a rien à parcourir. Sans elles, les dates se choisissent dans le calendrier
ou au clavier — le champ ne perd rien d'autre.

```js
createRangeField(element, { timeZone: 'Europe/Paris' });        // pas de flèches
createRangeField(element, { timeZone: 'Europe/Paris', shift: false });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, title: 'Sans flèches' }" />

`true` les dessine et suit ce qui est choisi : **une heure** quand les heures
sont à l'écran, **un jour** sinon — un champ en journées déplacé d'une heure
transformerait `22/09/2026` en `22/09/2026 01:00 – 23/09/2026 01:00`, sur des
contrôles incapables d'afficher ou de changer une heure.

```js
createRangeField(element, { timeZone: 'Europe/Paris', shift: true });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, shift: true, showTime: true, title: 'Une heure par pression' }" />

#### Un nombre, ce sont des minutes

`15` est un quart d'heure, `60` une heure, `1440` une journée. Les secondes ne
sont pas proposées : une flèche qui déplace un rendez-vous d'une seconde,
personne ne la presse.

```js
shift: 15        // un quart d'heure
shift: 60        // une heure
shift: 1440      // une journée
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, shift: 15, showTime: true, title: 'Un quart d\'heure par pression' }" />

Ce qu'un nombre ne sait pas dire se dit en entier, dans la forme que le métier
demande :

```js
shift: { days: 1, minutes: 30 }
shift: { months: 1, hours: 1, minutes: 45 }
shift: '45mn'                       // la forme courte, toujours acceptée
```

| | |
|---|---|
| `25mn` `25min` `25m` | vingt-cinq minutes |
| `1h` | une heure |
| `3d` `3j` | trois jours |
| `2w` `2s` | deux semaines |
| `6mo` | six mois |

`m`, ce sont des minutes et jamais des mois : `mo` dit les mois, et un écran
qui lirait `6m` comme six mois se tromperait d'un facteur quarante-et-quelques
milliers.

::: tip Les mois se déplacent en mois
Une période de mois entiers déplacée de mois entiers voit sa fin recalculée :
ajoutés aux deux bornes, trois mois depuis le 1er juillet – 30 septembre
donnent le 1er octobre – 30 décembre, et le quatrième trimestre finit le 31.
Les mois n'ont pas tous la même longueur, donc le dernier jour se redemande au
lieu de se transporter.
:::

#### Une liste, et le lecteur choisit

Un petit bouton entre les flèches affiche le pas, et chaque pression passe au
suivant. Les libellés sont les vôtres — un pas n'a pas de nom que la librairie
pourrait inventer.

```js
shift: [
  { step: 15,   label: '15 min' },
  { step: 60,   label: '1 h' },
  { step: 1440, label: '1 jour' },
]
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, showTime: true, shift: [{ step: 15, label: '15 min' }, { step: 60, label: '1 h' }, { step: 1440, label: '1 jour' }], title: 'Choisir le pas' }" />

Une liste d'un seul élément affiche le pas sans le céder : le bouton le lit et
ne prend pas de pression.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, showTime: true, shift: [{ step: 15, label: '15 min' }], title: 'Pas affiché, non modifiable' }" />

#### La même liste, dans le panneau

Ouvrez le champ ci-dessous. La liste est une colonne à côté du calendrier, là
où étaient les raccourcis — un écran qu'on lit en comparant demande *de combien
se déplacer* bien plus souvent qu'un intervalle nommé. Les chevrons encadrent
les deux champs, puisque c'est sur eux qu'ils agissent.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  months: 1,
  showTime: true,
  showPresets: false,
  shift: [
    { step: 15,    label: '15 min' },
    { step: 60,    label: '1 heure' },
    { step: 1440,  label: '1 jour' },
    { step: 10080, label: '1 semaine' },
  ],
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 1, showTime: true, showPresets: false, shift: [{ step: 15, label: '15 min' }, { step: 60, label: '1 heure' }, { step: 1440, label: '1 jour' }, { step: 10080, label: '1 semaine' }], title: 'De combien un clic déplace' }"
  :controls="[{ label: 'Ouvrir le panneau', run: (w) => w.open() }]" />

Il s'ouvre sur le quart d'heure, parce que c'est ce que la forme de ce champ
peut porter. Le champ suivant tient une journée, et trois choses changent d'un
coup : le second champ disparaît, le pas passe à **1 jour**, et les deux pas
plus courts sont refusés — une heure dans une journée transforme `22/09/2026`
en `22/09/2026 01:00 – 23/09/2026 01:00`, sur des contrôles que le même
réglage vient de retirer de l'écran. Ils sont montrés et refusés plutôt que
cachés : une liste qui perd des entrées quand on coche une case se lit comme
un défaut.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 1, singleDay: true, showPresets: false, shift: [{ step: 15, label: '15 min' }, { step: 60, label: '1 heure' }, { step: 1440, label: '1 jour' }, { step: 10080, label: '1 semaine' }], title: 'Une journée' }"
  :controls="[{ label: 'Ouvrir le panneau', run: (w) => w.open() }]" />

Et avec `showStep: false` la colonne s'en va, et le panneau revient à la
largeur du seul calendrier.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 1, showTime: true, showPresets: false, showStep: false, shift: [{ step: 60, label: '1 heure' }], title: 'Les flèches seules' }"
  :controls="[{ label: 'Ouvrir le panneau', run: (w) => w.open() }]" />

::: warning Les raccourcis ne changent pas le pas
Un raccourci calcule une valeur ; un pas en déplace une. Les deux se
touchaient — le raccourci pressé décidait de ce qu'une flèche déplaçait — et
c'était un mécanisme de trop : les flèches changeaient de sens sous la main du
lecteur selon ce qu'il avait pressé un instant plus tôt.
:::

### `showStep`

Si le pas est proposé du tout — le bouton à côté du champ, et la colonne dans
le panneau. `true` par défaut, donc les deux apparaissent dès que `shift` est
une liste. `false` les cache : le pas appartient au développeur, et le lecteur
ne fait que se déplacer.

Ranger la colonne ramène le panneau à la largeur du seul calendrier.

Que les deux champs partagent une ligne n'est déclaré nulle part — c'est la
largeur qui le dit. Un mois laisse 412 px là où deux champs en demandent 512,
donc ils passent à la ligne et s'empilent ; deux mois en laissent 723 et ils
tiennent côte à côte, ce qui divise la hauteur de l'en-tête par deux.

```js
createRangeField(element, { timeZone: 'Europe/Paris', shift: [ … ], showStep: false });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, shift: [{ step: 60, label: '1 h' }, { step: 1440, label: '1 jour' }], showStep: false, title: 'Des flèches, sans le pas' }" />

### `singleDay`

Un seul champ au lieu de deux, et un clic vaut toute la journée — son premier
instant jusqu'à celui du lendemain. La valeur reste une période dans les deux
cas, donc un écran peut l'activer et le désactiver sans que ce à quoi il est
lié change jamais de forme.

```js
createRangeField(element, { timeZone: 'Europe/Paris', singleDay: true });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 1, singleDay: true, presets: ['yesterday', 'today', 'tomorrow'], title: 'Un seul jour' }" />

Les raccourcis qui demandent plus d'un jour sortent de la colonne tant que
c'est actif, et reviennent ensuite — `presets` lui-même n'est pas touché.

La bascule garde le jour de début. Au retour à deux champs, c'est la **fin**
qui est armée, pas le début : le lecteur a déjà son jour et bascule justement
pour ajouter une fin, donc son clic suivant doit allonger et non recommencer.

```html
<!-- la case est la vôtre ; le champ change de forme dessous -->
<tz-range-field [(value)]="periode" [singleDay]="unSeulJour()" />
```

## Le calendrier à l'intérieur

### Les mois et les années

Le mois au-dessus de la grille est un bouton. Pressez-le pour les douze mois
de l'année, pressez encore pour une décennie — puis une année, puis un mois,
et on redescend. Les flèches déplacent d'un écran de ce qui est montré : un
mois parmi les jours, une année parmi les mois, une décennie parmi les années.

C'est **un seul sélecteur pour tout le calendrier**, quoi qu'il affiche. Avec
deux mois côte à côte, le choix pose le premier et le second suit : c'est une
seule suite de mois, pas deux calendriers qui pourraient diverger.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, title: 'Pressez le mois' }"
  :controls="[{ label: 'Ouvrir le panneau', run: (w) => w.open() }]" />

::: tip Rien à activer
Le calendrier simple l'a depuis le début. Celui du champ de période portait un
simple libellé, donc la seule sortie de septembre était les flèches, un mois à
la fois — quinze pressions pour atteindre mars de l'an dernier.
:::

### `clearable`

Si le panneau offre un bouton **Effacer**. `true`, parce qu'un champ qu'on ne
peut pas vider est un filtre que personne ne peut retirer. Il vide toute la
période — c'est ce que veut dire recommencer. La croix dans chaque date est
autre chose : elle appartient à `openEnded`, où une borne peut légitimement
n'être rien.

```js
createRangeField(element, { timeZone: 'Europe/Paris', clearable: false });
```

### `blockAcrossDisabled`

Si une période peut enjamber un jour que `isDateDisabled` refuse. `true` : un
écran qui grise les week-ends puis accepte un séjour au travers les a grisés
pour rien. Le refus est dit dans le panneau, et `rangeSpansBlockedMessage` y
met vos mots.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  isDateDisabled: (date) => date.dayOfWeek > 5,
  rangeSpansBlockedMessage: 'Fermé le week-end.',
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 1, isDateDisabled: (d) => d.dayOfWeek > 5, title: 'Jours ouvrés' }"
  :controls="[{ label: 'Ouvrir le panneau', run: (w) => w.open() }]" />

Sous le calendrier, le panneau écrit la longueur de la période et le fuseau
dans lequel il la lit :

```
5d · Europe/Paris
7d 1h · Europe/Paris      ← sept jours à cheval sur le changement d'octobre
```

Cette seconde ligne est toute la raison d'être de la bibliothèque : sept jours
qui traversent le changement d'heure à Paris font 169 heures, pas 168. C'était
écrit dans le guide et jamais montré au lecteur. `periodSummary`, dans le
catalogue de messages, réécrit cette ligne.

::: tip C'est annoncé, pas seulement dessiné
Choisir un début, choisir une fin, un raccourci qui part, une durée ramenée par
`maxSpan` — tout passe par une région vivante polie dans le panneau, pour qu'un
lecteur d'écran entende ce que le composant vient de faire. Chaque cellule
porte sa date entière et sa place dans la période ; la grille dit quel jour est
aujourd'hui.
:::

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
  value: { start: Temporal.Instant.from('2026-09-21T07:00Z'), end: null },
  openEnded: true,
  disabled: { start: true },
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', openEnded: true, showTime: true, disabled: { start: true }, value: { start: Temporal.Instant.from('2026-09-21T07:00Z'), end: null }, title: 'Arrivée arrêtée' }" />

### `mode`

`'popup'` par défaut — un panneau accroché au champ. `'dialog'` le centre sur un
fond assombri, ce que veut un petit écran.

```js
createRangeField(element, { timeZone: 'Europe/Paris', mode: 'dialog' });
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', mode: 'dialog', title: 'En boîte de dialogue' }" />

### `placeholder`

Ce qu'affiche le champ fermé quand rien n'est choisi. Sans lui, il **nomme ce
qu'il attend** :

```
une journée   →  Date
une période   →  Date de début – Date de fin
```

Le séparateur est celui qu'emploie un champ rempli : les deux états sont la
même phrase, avec et sans les chiffres — `Date de début – Date de fin`, puis
`23/09/2026 – 24/09/2026`. Regardez les deux ci-dessous sans y toucher : le
premier demande une date, le second deux. Ils affichaient tous les deux
« Choisir une période » — une seule phrase sur deux questions différentes.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', singleDay: true, title: 'Une journée' }" />

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', title: 'Une période' }" />

Les mots sont dans le catalogue de messages : ils suivent la langue de la page
comme le reste. Posez `placeholder` vous-même et il gagne — l'écran connaît ses
propres mots.

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

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', showTime: true, months: 1, today: Temporal.PlainDate.from('2026-10-25'), value: { start: Temporal.Instant.from('2026-10-24T22:00Z'), end: Temporal.Instant.from('2026-10-25T00:30Z') }, title: 'Le matin où les pendules reculent' }" />

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
