# Exemples

Chaque composant ci-dessous tourne dans cette page. Cliquez dessus.

## Un calendrier

```js
createCalendar(element, { locale: 'fr-FR', buttons: ['today', 'clear'] });
```

<Live widget="Calendar" :options="{ locale: 'fr-FR', buttons: ['today', 'clear'] }" />

Six semaines, toujours, pour que la page ne saute pas d’un mois à l’autre. Les
flèches déplacent d’un jour, Page↑ et Page↓ d’un mois, Début et Fin d’un bout
à l’autre de la semaine, et le titre dézoome sur les mois puis les années —
quatre clics pour une date à trois cents jours.

## Numéros de semaine

```js
createCalendar(element, { locale: 'fr-FR', weekNumbers: true });
```

<Live widget="Calendar" :options="{ locale: 'fr-FR', weekNumbers: true }" />

Numéros de semaine ISO, pris sur le premier jour de chaque ligne : ils suivent
donc `firstDayOfWeek`. Tous les composants qui contiennent un calendrier
acceptent l’option, panneaux compris.

## Un champ

```js
createDateField(element, { locale: 'fr-FR', mode: 'popup' });
```

<Live widget="DateField" :options="{ locale: 'fr-FR' }" />

`mode: 'dialog'` centre le panneau sur la page au lieu de le suspendre sous le
champ.

## Une date et une heure

```js
createDateTimeField(element, {
  timeZone: 'Europe/Paris',
  locale: 'fr-FR',
  buttons: ['today', 'clear'],
});
```

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', buttons: ['today', 'clear'] }" />

Tapez dedans : les séparateurs apparaissent au fil de la saisie. Essayez
**25/10/2026 02:30** — ce cadran a lieu deux fois à Paris ce matin-là, donc il
demande lequel vous visez, puis écrit la réponse dans le texte.

## Plusieurs jours

```js
createMultiDate(element, { locale: 'fr-FR', maxDates: 5 });
```

<Live widget="MultiDate" :options="{ locale: 'fr-FR', maxDates: 5 }" />

Un clic ajoute un jour, un second le retire, et la valeur reste dans l’ordre
des dates. Une fois cinq jours choisis, les autres cessent d’accepter les
clics.

## Une plage de jours

```js
createDateRange(element, {
  locale: 'fr-FR',
  isDateDisabled: (day) => day.dayOfWeek > 5,   // week-ends fermés
});
```

<Live widget="DateRange" :options="{ locale: 'fr-FR', isDateDisabled: (d) => d.dayOfWeek > 5 }" />

La suite de jours sous le pointeur est celle qui sera choisie. Une plage qui
enjamberait un jour fermé est refusée, avec un mot qui dit pourquoi.

## Les créneaux d’une journée

```js
createTimeSlots(element, {
  date: '2026-10-25',
  timeZone: 'Europe/Paris',
  stepMinutes: 60,
  isDisabled: (slot) => slot.time.hour === 13,  // la pause déjeuner est prise
});
```

<Live widget="TimeSlots" :options="{ date: '2026-10-25', timeZone: 'Europe/Paris', stepMinutes: 60, locale: 'fr-FR', isDisabled: (slot) => slot.time.hour === 13 }" />

C’est le matin où l’on recule les pendules à Paris : **02:00 apparaît deux
fois**, distinguées par leur décalage. Une heure d’écart, et la valeur que
vous recevez est celle sur laquelle vous avez cliqué. Le 29 mars, la même
liste affiche 02:00 barré, parce que cette heure n’a pas lieu.

## Un intervalle

```js
createDateTimeRange(element, { timeZone: 'Europe/Paris', locale: 'fr-FR' });
```

<Live widget="DateTimeRange" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR' }" />

Essayez du 24/10/2026 23:00 au 25/10/2026 05:00 : six heures à l’horloge,
sept en réalité — et il le dit, plutôt que de vous laisser le remarquer.

## Une période, en un champ

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  locale: 'fr-FR',
  showTime: true,
  openEnded: true,
  months: 2,
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', months: 2, weekNumbers: true, showTime: true, openEnded: true }" />

Deux champs dans le panneau, un par borne : un clic remplit celui qui est
armé, donc corriger la fin ne jette pas le début. Les deux se saisissent au
clavier, ce dont une période finissant en février 2028 a réellement besoin.
Les raccourcis vont du plus court au plus long, et `openEnded` permet de vider
un champ — *à partir du 18* sans fin, c’est ce que veulent dire la plupart des
recherches.

Tout est détaillé dans [Choisir une période](./guide/periode) : les
raccourcis, les flèches, les mots au-dessus des champs, et les deux matins de
l’année où une heure n’est pas ce qu’elle paraît.

## Décaler une période

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  locale: 'fr-FR',
  presets: ['thisQuarter', 'lastQuarter', 'nextQuarter'],
  shift: 'auto',
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', months: 2, shift: 'auto', presets: ['thisQuarter', 'lastQuarter', 'nextQuarter', 'last7Days', 'thisMonth'] }" />

Un rapport se lit en comparant : ce trimestre et le précédent, cette semaine
et la dernière. Par le calendrier, c’est quatre clics. Les flèches en font un
seul, et elles n’apparaissent que si on les demande — un champ qui désigne un
seul jour choisi n’a rien à parcourir.

`'auto'` décale de ce qui est sélectionné, et ce n’est pas la même chose que
décaler de sa longueur en jours. Le troisième trimestre 2026 fait 92 jours ;
reculer de 92 jours depuis le 1er juillet tombe sur le 31 mars — un jour trop
tôt, et la dérive s’aggrave à chaque appui. Une période faite de mois entiers
se décale donc en mois : un trimestre reste un trimestre et un mois garde son
propre dernier jour. Tout le reste se décale de sa longueur, où rien ne peut
dériver.

### Le raccourci donne le pas

Avec `shift: 'auto'`, le raccourci qu’on vient de presser devient la règle :
demandez le quart d’heure courant et les flèches avancent de quinze minutes ;
demandez ce trimestre et elles avancent de trimestre en trimestre. Choisir des
jours à la main dans le calendrier efface la règle, et les flèches reprennent
la longueur de ce qui est sélectionné.

Deux des raccourcis sont plus courts qu’un jour, et ceux-là sont deux
*moments*, pas deux dates — 21/09/2026 11:00 à 11:15, comptés sur l’horloge du
fuseau du composant :

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  shift: 'auto',
  presets: ['thisQuarterHour', 'thisHour', 'thisQuarter', 'last7Days'],
});
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', months: 2, shift: 'auto', showTime: true, presets: ['thisQuarterHour', 'thisHour', 'thisQuarter', 'last7Days'] }" />

Un raccourci à vous peut faire les deux — rendre deux moments, et annoncer le
pas qu’il laisse derrière lui :

```js
{
  name: 'lastFiveMinutes',
  label: 'Dernières 5 minutes',
  step: { minutes: 5 },
  range: (today, { now, timeZone }) => ({ start: now.subtract({ minutes: 5 }), end: now }),
}
```

Un pas fixe est une durée, et il l’emporte sur ce qui est sélectionné — c’est
la façon de décaler une période de quelque chose de plus petit qu’elle :

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  showTime: true,
  shift: '15mn',
});
```

Du 18/09 10:00 au 21/09 05:00 passe alors à 10:15 et 05:15, les deux bornes
ensemble : l’écart entre elles ne change jamais, et trois jours de distance ne
sont pas une raison de ne pas avancer d’un quart d’heure.

Donnez une liste et c’est le lecteur qui choisit : un bouton entre les flèches
affiche le pas courant et passe au suivant à chaque appui.

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  shift: [
    { step: 'auto', label: 'la période' },
    { step: '7d',   label: '7 jours' },
    { step: '3mo',  label: 'un trimestre' },
  ],
});
```

Le libellé est à vous : seule l’application sait si ses lecteurs disent
« 15 min », « un quart d’heure » ou « quarter hour ».

Sur un moment isolé — `createDateTimeField` — le pas est toujours explicite,
parce qu’un moment n’a aucune longueur propre à suivre :

```js
createDateTimeField(element, { timeZone: 'Europe/Paris', shift: { minutes: 15 } });

// ou laissez le lecteur choisir
createDateTimeField(element, {
  timeZone: 'Europe/Paris',
  shift: [
    { step: { minutes: 15 }, label: '15 min' },
    { step: { hours: 1 }, label: '1 h' },
    { step: { days: 1 }, label: '1 jour' },
  ],
});
```

Il est compté sur les horloges du fuseau, pas en millisecondes : une heure
après le premier 02:30 du 25 octobre à Paris, c’est le *second* 02:30, et un
jour après 15:00 cet après-midi-là, c’est 15:00 le lendemain — vingt-cinq
heures plus tard.

## Une journée entière, ou un intervalle

```js
createDateTimeRange(element, { timeZone: 'Europe/Paris', locale: 'fr-FR' });
```

<Live widget="DateTimeRange" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', allDay: true }" />

Une recherche sur « du 24 au 26 » et une sur « de 23:00 à 05:00 », c’est le
même composant avec l’interrupteur dans deux positions. Les journées entières
vont de minuit à minuit, et la valeur dit ce qu’elle est :

```js
{
  start: Instant,  // le 24 à 00:00 dans le fuseau
  end:   Instant,  // le 27 à 00:00 — le minuit qui suit le dernier jour
  allDay: true,
}
```

La fin est **exclusive** à dessein, pour qu’une requête s’écrive
`start >= from AND start < to` sans que rien ne tombe dans le trou de
23:59:59. Éteignez l’interrupteur et les bornes redeviennent des moments, aux
minuits où elles étaient.

`[allDaySwitch]="false"` masque l’interrupteur, pour un écran qui ne traite
que des journées entières — ou que des intervalles.

## Les mêmes horaires chaque jour

```js
createDailyRange(element, { timeZone: 'Europe/Paris', locale: 'fr-FR', stepMinutes: 30 });
```

<Live widget="DailyRange" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', stepMinutes: 30 }" />

Prenez du 23 au 26 octobre, de 22:00 à 06:00 : quatre nuits de travail,
33 heures et non 32, et la nuit qui diffère est nommée.
