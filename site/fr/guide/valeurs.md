# Ce qu’on récupère

Ce que rend vraiment un sélecteur, ce n’est pas le texte affiché — c’est ce
qui atterrit dans votre contrôle de formulaire, puis dans votre base. C’est le
sujet de cette page.

## Un instant, pas une heure d’horloge

Tout ce qui porte une heure vous rend un **instant** : un point fixe sur la
ligne du temps, indépendant de tout fuseau. `2026-10-25T00:30:00Z` désigne le
même moment partout, et il reste le même quand les règles changent, quand
l’utilisateur voyage, et quand vous le relisez l’année suivante.

Ce qu’il n’est *pas*, c’est « 02:30 le 25 octobre ». Ça, c’est une heure
d’horloge, et à Paris ce matin-là il y en a deux — celle d’avant le
changement, celle d’après. Un sélecteur qui enregistre une heure d’horloge a
jeté l’information qui disait laquelle.

## Un jour n’est pas un instant — tant qu’on ne dit pas où

Un calendrier vous rend un `PlainDate` : `2026-09-14`, une case dans une
grille. Ni heure, ni fuseau — parce qu’un jour n’en a effectivement aucun tant
que personne n’a dit d’où il regarde. Le 14 septembre commence à des instants
différents à Paris et à São Paulo.

Quand un jour doit devenir un moment — pour être enregistré, comparé, envoyé —
le fuseau l’accompagne. C’est à cela que sert `valueTimeZone`, et c’est ce que
la convention plus bas tranche une fois pour toutes.

## Journées entières : `allDay` et la fin qu’on ne voit pas

Une période est l’une de deux choses, et une recherche qui les confond est
fausse sans en avoir l’air :

- **Des journées entières.** « du 14 au 20 septembre » — du minuit qui ouvre
  le 14 au minuit qui ferme le 20, quelles que soient les heures.
- **Un intervalle.** « 14 septembre 09:00 au 20 septembre 17:00 » — deux
  moments que quelqu’un a choisis.

`allDay` dit lequel vous tenez. Quand il vaut `true`, le composant a déjà fait
le travail : `start` est le minuit qui ouvre le premier jour, et `end` est **le
minuit qui suit le dernier** — le 21, pas le 20.

```ts
{ start: 2026-09-13T22:00:00Z,   // 14 sept., 00:00 à Paris
  end:   2026-09-20T22:00:00Z,   // 21 sept., 00:00 à Paris
  allDay: true }
```

Cette fin est exclusive à dessein, pour qu’une requête s’écrive :

```sql
WHERE happened_at >= :start AND happened_at < :end
```

sans que rien ne tombe dans le trou. Écrite autrement — `<= 20 sept.
23:59:59` — chaque écran doit penser aux secondes, et un événement enregistré
à 23:59:59,4 est perdu. Avec `allDay: false`, les deux bornes sont simplement
les deux moments choisis, et la même requête fonctionne toujours.

## Une seule borne

Une recherche a souvent une borne et pas l’autre : tout depuis une date, tout
jusqu’à une date. En SQL c’est un `>=` sans `<`, et le sélecteur doit pouvoir
le dire — sinon l’écran se fabrique un second contrôle, ou une case « pas de
fin », pour contourner le composant.

`openEnded: true` l’active, sur `createRangeField` et `createDateTimeRange`.
Il se demande plutôt qu’il ne se suppose, parce qu’un formulaire de
réservation ne doit pas accepter un séjour qui ne finit jamais.

```js
createRangeField(element, { timeZone: 'Europe/Paris', openEnded: true });
```

Chacun des deux champs du panneau porte alors une croix, et un champ vidé est
ce qui dit que la période est ouverte de ce côté :

| | La valeur | La requête |
|---|---|---|
| les deux remplis | `{ start, end }` | `at >= :start AND at < :end` |
| « Au » vidé | `{ start, end: null }` | `at >= :start` |
| « Du » vidé | `{ start: null, end }` | `at < :end` |

`end` reste exclusive, donc **jusqu’au 20 septembre** est le minuit qui ouvre
le 21 et le 20 est inclus en entier — la même règle que partout ailleurs,
c’est tout l’intérêt de la garder.

Les flèches fonctionnent aussi sur une telle période, et ça compte : « à
partir du 18 » devient « à partir du 17 » d’un clic, sans rouvrir le
calendrier. Il n’y a pas de longueur à suivre, donc `shift: 'auto'` la décale
d’un jour — l’unité dans laquelle le calendrier travaille — et un pas imposé
l’emporte, jusqu’au quart d’heure.

Les deux bornes nulles signifient que rien n’a encore été choisi. C’est le
seul cas qu’un écran doit encore distinguer, et c’est le cas évident.

```ts
const { start, end } = value;
if (!start && !end) return tout;
if (!end) return lignes.filter((r) => r.at >= start);
if (!start) return lignes.filter((r) => r.at < end);
return lignes.filter((r) => r.at >= start && r.at < end);
```

Sans `openEnded`, une seule borne choisie reste ce qu’elle a toujours été : une
sélection à moitié faite. Le champ le dit — `14/09/2026 – …` — plutôt que de
se faire passer pour une réponse.

## La convention : sortir en UTC, lire dans un fuseau

L’habitude qui vaut la peine d’être prise, c’est de ne tenir **qu’une** forme
partout : un instant, en UTC, quel que soit le composant. L’écran continue
d’afficher l’heure locale — c’est à cela que sert `timeZone` — mais ce qui
sort du composant, et ce que votre back-end enregistre, ne dépend jamais de
qui regarde.

`valueAs: 'utc'` le fait, sur n’importe quel composant :

```html
<tz-datetime-field formControlName="at" valueAs="utc" timeZone="Europe/Paris" />
<tz-date-field     formControlName="day" valueAs="utc" valueTimeZone="Europe/Paris" />
```

```ts
at  === '2026-10-25T00:30:00Z'
day === '2026-09-13T22:00:00Z'   // le minuit qui ouvre le 14 septembre à Paris
```

Un champ de date seule rend lui aussi un instant — le minuit qui ouvre ce jour
dans ce fuseau. C’est tout l’intérêt de la convention : une seule forme,
aucun écran qui décide dans son coin de ce qu’est un jour.

### Le régler une fois

Répéter `valueAs` et un fuseau sur chaque balise, c’est la garantie qu’un
écran finira par ne plus dire la même chose que les autres. Réglez-les pour
l’application :

```ts
import { provideTzslot, FR } from '@tzslot/angular';

bootstrapApplication(App, {
  providers: [
    provideTzslot({
      valueAs: 'utc',
      timeZone: 'Europe/Paris',
      locale: 'fr-FR',
      firstDayOfWeek: 1,
      messages: FR,
    }),
  ],
});
```

Chaque composant les reprend, `timeZone` compris — il cesse donc d’être
obligatoire sur la balise. Ce qui est écrit sur un composant l’emporte
toujours : l’écran qui a besoin d’autre chose ne doit pas avoir à renoncer à
la bibliothèque.

| `valueAs` | Le contrôle contient |
|---|---|
| `'temporal'` (défaut) | un `PlainDate` ou un `Instant` |
| `'utc'` | une chaîne, toujours un instant : `2026-10-25T00:30:00Z` |
| `'date'` | un `Date` — lu dans `valueTimeZone` |
| `'iso'` | une chaîne dans la forme du composant : `2026-09-14`, ou `2026-09-14T07:00:00Z` |

Sans framework, il n’y a pas de `valueAs` : `onChange` vous rend des valeurs
Temporal, et `instant.toString()` donne la même chaîne UTC.
