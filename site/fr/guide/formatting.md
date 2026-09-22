# Format et saisie

Un champ écrit ce qu'il sait relire. C'est toute la règle : quelle que soit la
forme que prend le texte, le taper veut dire la même chose que le choisir.

Chaque exemple ci-dessous est un `<tz-datetime-field>`, et chaque option montrée
fonctionne pareil sur le champ date et sur le champ période.

## Par défaut : la forme de la locale

Rien à régler. Le champ écrit ce qu'écrit `Intl` pour cette locale, et accepte
la même chose tapée en retour.

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

Le même moment, trois locales — le champ appartient à la locale, pas à la
librairie :

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', locale: 'en-US', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', locale: 'de-DE', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

## `format`

Un motif, utilisé pour écrire **et** pour lire. Ce que vous imposez est aussi ce
que le champ acceptera à la saisie.

```js
createDateTimeField(element, { timeZone: 'Europe/Paris', format: 'yyyy-MM-dd HH:mm' });
```

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', format: 'yyyy-MM-dd HH:mm', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

```js
format: "d MMMM yyyy 'à' HH:mm"
```

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', format: 'd MMMM yyyy \'à\' HH:mm', editable: false, value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

::: warning Un motif qui nomme son mois ne peut pas être saisi
« sept. », « Sept » et « septembre » sont un même mois en trois orthographes, et
choisir entre elles est la façon dont un champ enregistre discrètement la
mauvaise date. `parseWith` refuse un tel motif plutôt que de deviner : un champ
qui en utilise un est fait pour l'affichage, donc à associer à
`editable: false`, comme ci-dessus.
:::

### Les jetons

| | |
|---|---|
| `yyyy` `yy` | année |
| `MMMM` `MMM` `MM` `M` | mois : nom, nom court, `09`, `9` |
| `dd` `d` | jour |
| `EEEE` `EEE` | nom du jour, nom court |
| `HH` `H` | heure, sur 24 |
| `hh` `h` | heure, sur 12 |
| `mm` | minute |
| `a` | AM ou PM |

Tout le reste est gardé tel quel ; `'du texte entre quotes'` conserve ses
lettres.

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', format: 'EEEE d MMMM yyyy', editable: false, value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

## `dateStyle` et `timeStyle`

Les formes propres à Intl. Elles s'appliquent quand le champ n'est **pas**
saisissable, parce qu'on ne relit pas une forme que la locale a choisie
elle-même.

```js
createDateTimeField(element, {
  timeZone: 'Europe/Paris', editable: false,
  dateStyle: 'long', timeStyle: 'short',
});
```

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', editable: false, dateStyle: 'long', timeStyle: 'short', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', editable: false, dateStyle: 'full', timeStyle: 'medium', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', editable: false, dateStyle: 'short', timeStyle: 'short', value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

## `displayWith`

Le dernier mot. Elle reçoit la valeur et le fuseau, et ce qu'elle rend est ce
que le champ affiche.

```js
createDateTimeField(element, {
  timeZone: 'Europe/Paris',
  editable: false,
  displayWith: (at, timeZone) => {
    const zoned = at.toZonedDateTimeISO(timeZone);
    return `${zoned.day}/${zoned.month} — semaine ${zoned.weekOfYear}`;
  },
});
```

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', editable: false, displayWith: (at, tz) => { const z = at.toZonedDateTimeISO(tz); return z.day + '/' + z.month + ' — semaine ' + z.weekOfYear; }, value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

## `editable`

`true` par défaut : le déclencheur est un champ de saisie. `false` en fait un
bouton, et la valeur ne se choisit plus que dans le panneau.

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', editable: false, value: Temporal.Instant.from('2026-09-20T07:15Z') }" />

## `mask`

Les séparateurs apparaissent à mesure que les chiffres arrivent, comme un
numéro de carte prend ses espaces :

```
2 → 2        20 → 20/       2009 → 20/09/      20092026 → 20/09/2026
```

Tapez dans celui-ci pour le voir se faire :

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', format: 'dd/MM/yyyy HH:mm' }" />

Et le même champ avec `mask: false` — chaque séparateur tapé à la main :

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', format: 'dd/MM/yyyy HH:mm', mask: false }" />

Ça ne s'applique qu'aux motifs qui ne laissent aucun doute sur la fin de chaque
partie — `dd/MM/yyyy` oui, `d/M/yyyy` non — et jamais pendant une suppression,
parce qu'un séparateur remis là où on vient de l'enlever rend un champ
impossible à corriger.

Les lettres n'entrent jamais dans le texte. Une date qui ne peut pas exister, ou
qui tombe hors de `min` et `max`, est refusée, et le champ revient au moment
qu'il tenait quand vous le quittez.

Le motif n'est jamais utilisé comme texte indicatif : un champ qui explique son
propre format avant qu'on ait rien tapé n'invite pas à répondre. `placeholder`
est là pour ce que vous voulez dire à la place.

<Live widget="DateTimeField" :options="{ timeZone: 'Europe/Paris', placeholder: 'On se voit quand ?' }" />

## Les mêmes fonctions, toutes seules

Tout ce qui précède, ce sont ces quatre fonctions, exportées par `@tzslot/dom`.

```ts
import { formatWith, parseWith, patternFor, maskWith } from '@tzslot/dom';

formatWith('EEE d MMM', { date }, 'fr-FR');   // 'dim. 20 sept.'
parseWith('yyyy-MM-dd', '2026-02-31');        // null — ce jour n'existe pas
patternFor('en-US', { time: true });          // 'MM/dd/yyyy hh:mm a'
maskWith('dd/MM/yyyy', '2009');               // '20/09/'
```

Que `parseWith` rende `null` plutôt que le jour valide le plus proche, c'est
tout l'intérêt : le 31 février est une faute de frappe, et un champ qui la
transforme discrètement en 3 mars a enregistré quelque chose que personne n'a
tapé.
