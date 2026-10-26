# Les fonctions en dessous

Tous les composants de ce site sont bâtis sur `@tzslot/core`, qui ne contient
ni DOM ni framework. Les fonctions ci-dessous sont ce dont il est fait, et
elles sont exportées parce qu’un écran a souvent besoin de la réponse sans le
sélecteur : un serveur qui valide ce qu’un formulaire a envoyé, une ligne de
résumé qui compte une période, une grille dessinée par tout autre chose.

Les composants n’ont aucun privilège. Ils appellent celles-ci.

```bash
npm i @tzslot/core
```

## Une heure murale, résolue

`resolveWallTime` est la fonction pour laquelle cette bibliothèque existe. Une
date et une heure telles qu’une personne les lit sur une horloge ne sont pas un
moment avant qu’un fuseau le dise — et deux fois par an, le fuseau dit quelque
chose de surprenant.

```ts
import { resolveWallTime, Temporal } from '@tzslot/core';

const reading = resolveWallTime(
  Temporal.PlainDate.from('2026-10-25'),
  Temporal.PlainTime.from('02:30'),
  'Europe/Paris',
);

reading.exists;     // true
reading.ambiguous;  // true  — 02:30 arrive deux fois ce matin-là
reading.offsets;    // ['+02:00', '+01:00']
reading.instants;   // deux Instants, à une heure d’écart
```

Trois états, dont deux expliquent pourquoi un sélecteur bâti sur `Date` est
faux :

- **Elle existe et elle est unique.** `instants` en contient un.
- **Elle est ambiguë.** Les pendules ont reculé ; cette heure murale arrive
  deux fois. `instants` contient les deux, `offsets` les distingue. Un champ
  qui ne rend que l’heure murale a rendu une supposition.
- **Elle n’existe pas.** Les pendules ont avancé par-dessus. `exists` est
  faux, `instants` est vide. Le 29 mars 2026 à Paris, 02:30 n’arrive jamais —
  la proposer, c’est accepter un rendez-vous pour un moment qui n’aura pas
  lieu.

Valider côté serveur, c’est le même appel :

```ts
import { resolveWallTime, Temporal } from '@tzslot/core';

function accept(date: string, time: string, timeZone: string) {
  const reading = resolveWallTime(
    Temporal.PlainDate.from(date),
    Temporal.PlainTime.from(time),
    timeZone,
  );
  if (!reading.exists) return { ok: false as const, why: 'cette heure n’arrive pas' };
  if (reading.ambiguous) return { ok: false as const, why: 'cette heure arrive deux fois — laquelle ?' };
  return { ok: true as const, at: reading.instants[0]! };
}
```

## La durée réelle d’une période

`getRangeInfo` prend deux instants et un fuseau, et répond les deux durées :
celle que montre l’horloge et celle qui s’est écoulée.

```ts
import { getRangeInfo, isRangeProblem, formatDuration, Temporal } from '@tzslot/core';

const info = getRangeInfo(
  Temporal.Instant.from('2026-10-24T21:00Z'),  // 23:00 à Paris, à +02:00
  Temporal.Instant.from('2026-10-25T06:00Z'),  // 07:00 à Paris, à +01:00
  'Europe/Paris',
);

if (!isRangeProblem(info)) {
  info.minutes;            // 540 — ce qui s’est écoulé
  info.wallMinutes;        // 480 — ce que montre l’horloge
  info.crossesTransition;  // true
  info.shiftMinutes;       // 60 — l’heure que les pendules ont rendue
  info.startOffset;        // '+02:00'
  info.endOffset;          // '+01:00'
  formatDuration(info.duration, { locale: 'en-GB' }); // '9 hrs'
}
```

Un poste de nuit de 23:00 à 07:00 fait huit heures à l’horloge et neuf en
réalité, une fois par an. Payer huit heures est le bug que ce champ existe pour
empêcher.

`isRangeProblem` affine le résultat : une fin avant son début n’est pas une
durée, il n’y a donc rien à formater et la fonction le dit plutôt que de rendre
un nombre négatif que personne ne vérifie.

```ts
import { getRangeInfo, isRangeProblem, Temporal } from '@tzslot/core';

const backwards = getRangeInfo(
  Temporal.Instant.from('2026-10-25T06:00Z'),
  Temporal.Instant.from('2026-10-24T21:00Z'),
  'Europe/Paris',
);
if (isRangeProblem(backwards)) backwards.kind; // 'end-before-start'
```

### Écrire et relire une durée

`formatDuration` en écrit une comme une personne le fait. Avec une `locale`,
dans la langue de cette personne.

```ts
import { formatDuration, parseDuration, Temporal } from '@tzslot/core';

const week = Temporal.Duration.from({ days: 7, hours: 2, minutes: 30 });
formatDuration(week);                        // '7d 2h 30m'
formatDuration(week, { locale: 'fr-FR' });   // '7 j 2 h 30 min'
formatDuration(week, { locale: 'ar-SA' });   // '٧ أيام ٢ س ٣٠ د'
formatDuration(week, { days: false });       // '170h 30m'
```

Sans locale, c’est la forme ASCII compacte, celle que veulent une ligne de
journal et un test. Avec une locale, `Intl` décide — y compris les pluriels, ce
qui pour l’arabe veut dire six catégories et un duel : deux jours s’écrit
`يومان`, un seul mot qui porte son propre compte.

`parseDuration` en relit une — la façon courte dont une personne la tape dans
un filtre, c’est-à-dire un nombre et une unité :

```ts
import { parseDuration } from '@tzslot/core';

parseDuration('90m');    // quatre-vingt-dix minutes
parseDuration('90');     // pareil — un nombre nu, ce sont des minutes
parseDuration('25mn');   // comme mn, min et m
parseDuration('3h');     // des heures
parseDuration('2w');     // des semaines, et `s` pour semaines
parseDuration('6mo');    // des mois — `m` est toujours minutes, jamais mois
parseDuration('1h 30m'); // null — une unité à la fois
parseDuration('PT1H30M');// null — ce n’est pas un analyseur ISO 8601
parseDuration('soon');   // null
```

Elle est volontairement petite : un écran de filtre est utilisé toute la
journée par des gens qui savent ce qu’ils veulent avant que le panneau
s’ouvre, et ce qui peut être tapé doit être assez petit pour être retenu.
`Temporal.Duration.from` est l’analyseur complet, ISO 8601 compris, pour une
valeur qui vient d’ailleurs que d’un clavier.

## Les mêmes horaires chaque jour

`getDailyWindows`, c’est une journée de travail répétée sur une plage — un
planning, les horaires d’ouverture d’un cabinet, un roulement. Elle compte
chaque jour dans le fuseau, donc le jour du changement d’heure a une durée
différente de ses voisins et le dit.

```ts
import { getDailyWindows, Temporal } from '@tzslot/core';

const rota = getDailyWindows('2026-10-22', '2026-10-27', '23:00', '07:00', 'Europe/Paris');

rota.windows.length;           // une par nuit
rota.minutes;                  // le total, compté dans le fuseau
rota.unusual.length;           // 1 — la nuit où les pendules reculent
rota.unusual[0]?.minutes;      // 540, et non 480
```

`unusual` est la partie qui mérite d’être affichée : un planning dont une nuit
dure une heure de plus est un planning dont quelqu’un doit être averti, et
c’est la seule chose qui distingue `windows` d’un calcul.

## Des plages nommées, sans composant

Les raccourcis à côté du champ de période sont de simples fonctions. Un
rapport avec ses propres boutons peut utiliser les mêmes, et obtenir les mêmes
réponses.

```ts
import { presetRange, matchesPreset, Temporal } from '@tzslot/core';

const today = Temporal.PlainDate.from('2026-10-26');
const last7 = presetRange('last7Days', { today, firstDayOfWeek: 1 });

last7.start.toString(); // '2026-10-20'
last7.end.toString();   // '2026-10-26'

matchesPreset('last7Days', last7, { today, firstDayOfWeek: 1 }); // true
```

`matchesPreset` est la façon dont un écran coche le bouton qui décrit ce qui
est choisi, sans mémoriser quel bouton a été pressé.

Quatre des raccourcis sont plus courts qu’une journée, et ceux-là sont deux
moments plutôt que deux dates — « le quart d’heure courant » va de 11:00 à
11:15 sur une horloge, ce n’est pas un jour sur un calendrier. Ils ont leur
propre fonction, et un prédicat qui dit lequel est lequel :

```ts
import { presetMoments, isSubDayPreset, SUB_DAY_PRESETS, Temporal } from '@tzslot/core';

SUB_DAY_PRESETS; // ['thisQuarterHour', 'lastHour', 'thisHour', 'nextHour']

isSubDayPreset('thisHour');  // true
isSubDayPreset('last7Days'); // false

const hour = presetMoments('thisHour', {
  now: Temporal.Instant.from('2026-10-26T11:07:00Z'),
  timeZone: 'Europe/Paris',
});
hour.start; // 12:00 à Paris, en Instant
hour.end;   // 13:00
```

Le quart d’heure est compté depuis l’horloge et non depuis minuit : à 11:07,
c’est 11:00–11:15. Un fuseau décalé d’une demi-heure ou d’un quart — Katmandou,
Chatham — tomberait sinon sur un quart qui n’en est pas un.

## Se déplacer d’un pas

Les flèches à côté d’un champ déplacent une valeur d’un pas. Trois fonctions,
une par forme de valeur, et toutes les trois comptent dans le fuseau et non en
millisecondes.

```ts
import { shiftDate, shiftInstant, shiftDayRange, Temporal } from '@tzslot/core';

shiftDate(Temporal.PlainDate.from('2026-10-31'), { months: 1 }, 1).toString();
// '2026-11-30' — novembre n’a pas de 31, et c’est le mois qui a bougé, pas 31 jours

shiftInstant(
  Temporal.Instant.from('2026-10-24T21:00Z'),
  { days: 1 },
  1,
  'Europe/Paris',
).toString();
// un jour plus tard à l’horloge, ce qui la nuit du changement fait 25 heures

shiftDayRange(
  {
    start: Temporal.PlainDate.from('2026-10-19'),
    end: Temporal.PlainDate.from('2026-10-25'),
  },
  { days: 7 },
  -1,
);
// la semaine d’avant, les deux bornes ensemble
```

Le troisième argument est la direction, `1` ou `-1`, plutôt qu’un pas négatif :
un pas est une durée et une durée n’est pas négative, et `{ months: -1 }`
depuis le 31 n’a pas de réponse évidente.

`snapTime` arrondit une heure murale sur une grille, ce que fait un champ avec
`minuteStep` à ce que quelqu’un a tapé :

```ts
import { snapTime, Temporal } from '@tzslot/core';

snapTime(Temporal.PlainTime.from('09:07'), 15).toString(); // '09:00'
snapTime(Temporal.PlainTime.from('09:08'), 15).toString(); // '09:15'
```

Et `asShiftStep` transforme le raccourci d’écriture des composants en durée,
pour du code qui accepte le même réglage :

```ts
import { asShiftStep } from '@tzslot/core';

asShiftStep(60);          // { minutes: 60 }
asShiftStep({ days: 1 }); // { days: 1 }
```

## Les valeurs qui entrent et qui sortent

Un composant rend des instants et des dates simples. Une application stocke
plutôt des chaînes, et on peut dire à `@tzslot/angular` quelle forme un
contrôle de formulaire doit contenir. Voici les conversions, et elles sont
exportées parce qu’un serveur doit être d’accord avec le navigateur à leur
sujet.

```ts
import { toPlainDate, isDateLike } from '@tzslot/core';

toPlainDate('2026-10-26', 'Europe/Paris').toString();  // '2026-10-26'
toPlainDate(new Date('2026-10-25T23:30Z'), 'Europe/Paris').toString();
// '2026-10-26' — minuit et demi à Paris, où l’on est encore le 26

isDateLike('2026-10-26');       // true
isDateLike(new Date());         // true
isDateLike('tomorrow');         // false
```

`DateLike`, c’est un `PlainDate`, un `Date` ou une chaîne — les trois choses
qu’un appelant peut raisonnablement avoir. Un `Instant` n’en fait pas partie,
et c’est volontaire : c’est un moment, pas un jour, et
`Temporal.Instant.prototype.toZonedDateTimeISO(zone)` est la conversion qui
rend le fuseau impossible à oublier.

C’est la même raison qui fait que `toPlainDate` exige le fuseau. Un `Date` est
un instant ; le jour sur lequel il tombe dépend de l’endroit où l’on se tient,
et 2026-01-01T00:30Z est le jour de l’An à Paris et la Saint-Sylvestre à New
York. Deviner ici serait la classe de bug que cette bibliothèque existe pour
empêcher.

## Construire une grille soi-même

Un calendrier est une grille de jours, et la grille est du calcul, pas du
balisage. Ces quatre-là sont ce dont les composants se servent, et un composant
à vous peut se servir des mêmes.

```ts
import { getMonthGrid, inMonth, getWeekdayOrder, firstDayFor } from '@tzslot/core';

const weeks = getMonthGrid(2026, 10, firstDayFor('en-GB'));
weeks.length;                       // 6, toujours — la grille ne change pas de hauteur
weeks[0]![0]!.toString();           // '2026-09-28', le lundi dans lequel le mois commence
inMonth(weeks[0]![0]!, 2026, 10);   // false — il appartient à septembre

getWeekdayOrder(firstDayFor('en-GB')); // [1, 2, 3, 4, 5, 6, 7] — lundi d’abord
getWeekdayOrder(firstDayFor('en-US')); // [7, 1, 2, 3, 4, 5, 6] — dimanche d’abord
```

Six lignes toujours, pour qu’un mois qui en demande cinq ne fasse pas sauter le
panneau quand un lecteur passe à un mois qui en demande six. `firstDayFor`
demande à `Intl` ce que fait la locale — lundi en France, dimanche aux
États-Unis ; passez un `Weekday` directement là où une activité est en
désaccord avec sa propre locale.

La vue par année fonctionne de la même façon :

```ts
import { getDecadeYears, isOutsideDecade } from '@tzslot/core';

const years = getDecadeYears(2026);
years.length;                      // 12 — une décennie avec une année de chaque côté
isOutsideDecade(2019, 2026);       // true
isOutsideDecade(2026, 2026);       // false
```

Une décennie est montrée avec l’année d’avant et celle d’après, pour la même
raison qu’une grille de mois montre les jours autour : un lecteur qui sort du
bord doit voir où il va.

## Un calendrier non grégorien

La grille peut être construite dans n’importe quel calendrier que Temporal
implémente, ce qui veut dire qu’un mois hégirien est un mois hégirien et non un
mois grégorien réétiqueté.

```ts
import { getMonthGrid, inMonth } from '@tzslot/core';

const ramadan = getMonthGrid(1448, 9, 7, 'islamic-umalqura');
ramadan.length;                                      // 6
inMonth(ramadan[1]![0]!, 1448, 9, 'islamic-umalqura');
```

Les jours reviennent en dates ISO, donc tout le reste de la bibliothèque
continue de fonctionner dessus ; le calendrier décide où le mois commence et
combien il dure. `'islamic'` et `'islamic-rgsa'` sont refusés avec un message
qui nomme quoi utiliser à la place, parce que Temporal ne les implémente pas et
que l’erreur qu’il donne sinon n’apprend rien.

**Aucun composant ne s’en sert encore.** C’est le calcul, pas une interface.

## Quel Temporal vous avez

```ts
import { usingPolyfill } from '@tzslot/core';

usingPolyfill; // true là où le runtime n’en a apporté aucun
```

Un diagnostic, pas de la logique : rien dans cette bibliothèque ne se comporte
différemment dans un cas ou dans l’autre, et un écran qui s’y embranche est un
écran à deux chemins de code dont un n’est pas testé. C’est ici pour qu’un
rapport de bug puisse dire lequel.

[Démarrer](./getting-started#ne-payer-le-polyfill-que-la-ou-il-sert) explique
`loadTemporal()` et l’entrée qui laisse le polyfill dehors.

## Où aller ensuite

- [Ce qu’on récupère](./values) — instants, journées entières, et la fin exclusive.
- [Choisir une période](./period) — le composant bâti sur tout ceci.
- [Format et saisie](./formatting) — motifs, masques, et ce que fait `Intl`.
