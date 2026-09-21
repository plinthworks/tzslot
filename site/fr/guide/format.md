# Format et saisie

Un champ écrit ce qu’il sait relire. C’est toute la règle : quelle que soit la
forme du texte, le saisir revient au même que le choisir.

## À quoi ressemble le texte

```html
<!-- la forme numérique de la locale : 20/09/2026 09:15 en français -->
<tz-datetime-field [(value)]="at" timeZone="Europe/Paris" />

<!-- un motif, quand la forme compte plus que le lecteur -->
<tz-datetime-field format="yyyy-MM-dd HH:mm" />

<!-- en lecture seule, et donc libre d’être écrit comme on veut -->
<tz-datetime-field [editable]="false" dateStyle="long" timeStyle="short" />
<tz-datetime-field [editable]="false" [displayWith]="mien" />
```

| | |
|---|---|
| `format` | Un motif. Utilisé pour écrire **et** pour lire. |
| `dateStyle`, `timeStyle` | Les formes d’`Intl`, quand le champ ne se saisit pas. |
| `displayWith` | Le dernier mot : une fonction qui reçoit la valeur et le fuseau. |

## Les jetons

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

Tout le reste est gardé tel quel ; `'du texte entre apostrophes'` préserve les
lettres : `d MMMM yyyy 'à' HH:mm`.

Un motif qui nomme son mois sert à l’affichage seulement. « sept. », « Sept »
et « septembre » sont un même mois en trois orthographes, et choisir entre
elles est la façon dont un champ enregistre silencieusement la mauvaise date —
`parseWith` refuse donc un tel motif plutôt que de deviner.

## L’aide à la saisie

Les séparateurs apparaissent à mesure que les chiffres arrivent, comme un
numéro de carte reçoit ses espaces :

```
2 → 2        20 → 20/       2009 → 20/09/      20092026 → 20/09/2026
```

Elle ne s’applique qu’aux motifs qui ne laissent aucun doute sur la fin de
chaque partie — `dd/MM/yyyy` oui, `d/M/yyyy` non — et jamais pendant une
suppression, parce qu’un séparateur remis là où on vient de l’effacer rend un
champ impossible à corriger. `[mask]="false"` la désactive.

Les lettres n’entrent jamais dans le texte. Une date qui ne peut pas exister,
ou hors de `min` et `max`, est refusée, et le champ revient au moment qu’il
contenait quand on le quitte.

Le motif n’est jamais utilisé comme placeholder : un champ qui explique son
propre format avant qu’on ait rien saisi n’invite pas à répondre.

## Les mêmes fonctions, séparément

```ts
import { formatWith, parseWith, patternFor, maskWith } from '@tzslot/dom';

formatWith('EEE d MMM', { date }, 'fr-FR');   // 'dim. 20 sept.'
parseWith('yyyy-MM-dd', '2026-02-31');        // null — ce jour n’existe pas
patternFor('en-US', { time: true });          // 'MM/dd/yyyy hh:mm a'
maskWith('dd/MM/yyyy', '2009');               // '20/09/'
```
