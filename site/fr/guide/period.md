# Choisir une période

`createRangeField` — `<tz-range-field>` en Angular — c’est un champ pour toute
une période : un déclencheur qui affiche `18/09/2026 – 24/09/2026`, et un
panneau qui contient tout ce qu’il faut pour la changer.

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR', months: 2, showTime: true, openEnded: true, shift: 'auto', weekNumbers: true }" />

## Dire de quoi il s’agit

```js
createRangeField(element, { timeZone: 'Europe/Paris', title: 'Dates de voyage' });
```

Le titre est écrit en haut du panneau et lu pour le champ lui-même. Un
sélecteur sans sujet, c’est un sélecteur dont le lecteur doit deviner l’objet
d’après ce qui se trouve autour ; et deux sélecteurs sur un même écran ne se
distinguent alors que par leur position.

## Le panneau, de haut en bas

**Deux champs, Du et Au.** Un clic dans le calendrier remplit celui qui est
armé — celui qui porte l’anneau — et rien d’autre. C’est là toute la
différence avec un calendrier de plage ordinaire : corriger la fin ne jette
pas le début en exigeant de tout reprendre.

Laissé tranquille, l’enchaînement habituel subsiste. Un clic remplit le début
et arme la fin, donc une période neuve se choisit toujours en deux clics. Ce
n’est que lorsque vous placez vous-même le curseur dans un champ que le
calendrier cesse d’avancer : vous avez armé celui-là, c’est donc celui-là
qu’un clic modifie.

**Les deux champs se saisissent au clavier.** Une période qui finit en février
2028, c’est une ligne de texte, pas dix-huit appuis sur une flèche — et le
calendrier suit ce qui est tapé : entrez `03/02/2028` et la grille y est déjà
pour le clic suivant. Les séparateurs apparaissent à mesure que les chiffres
arrivent (`mask`, actif par défaut) et le motif n’est jamais montré en
placeholder : un champ qui explique son propre format avant qu’on ait rien
saisi est un champ qui pose une question au lieu d’inviter à répondre.

**L’heure vit dans le champ**, à droite du jour. Elle apparaît quand
`showTime` est actif, et `timeLayout` dit comment on la demande.
`'select'` — un menu d’heures et un de minutes — est le défaut, parce que la
plupart du temps on choisit une heure d’emblée et qu’un menu, c’est deux
clics. `'input'` met une flèche au-dessus et une en dessous des chiffres, ce
qui convient pour ajuster une heure déjà presque juste.

**Un calendrier dans chaque champ**, parce qu’un champ de date sans icône se
lit comme une zone de texte qui voudrait une date. Voir [Les icônes](#les-icones)
plus bas.

**Les raccourcis, du plus court au plus long.** Classés par la longueur de ce
qu’ils désignent, jusqu’à *Ce trimestre*, pour qu’un lecteur qui parcourt la
colonne puisse s’arrêter dès qu’elle dépasse ce qu’il cherchait.

**Les flèches** décalent toute la période sans rien ouvrir. Voir plus bas.

## Journées entières, ou intervalle

`showTime` tranche, et le lecteur n’a jamais à le faire. Un interrupteur
« Toute la journée » lui demandait de classer sa propre réponse avant de la
donner, et le laissait se demander à quoi servaient les heures qu’il voyait.

Avec `showTime: false`, une période est faite de journées entières : du minuit
qui ouvre la première **au minuit qui suit la dernière**, la fin exclusive
expliquée dans [Ce qu’on récupère](./values#journees-entieres-allday-et-la-fin-qu-on-ne-voit-pas).

Avec `showTime: true`, chaque jour choisi porte une heure — minuit, sauf si
l’écran en décide autrement :

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  showTime: true,
  defaultTimes: { start: '09:00', end: '18:00' },
});
```

Une valeur donnée au composant garde ses propres heures — `defaultTimes` ne
vaut que pour les jours choisis ensuite — donc **un écran peut s’ouvrir sur
une période que le développeur a calculée lui-même**. Et un raccourci nommé en
journées continue de désigner ces journées entières : *Ce trimestre* finit au
minuit qui suit le 30 septembre, pas au 30 septembre 00:00, ce qui en
supprimerait discrètement le dernier jour.

## Une borne, ou aucune

`openEnded: true` laisse une période s’arrêter d’un seul côté — le `>=` sans
`<` que sont la plupart des recherches. Chaque champ porte alors une croix :
vider *Du* veut dire *jusqu’au*, vider *Au* veut dire *à partir du*, et le
champ se relit `À partir du 18/09/2026`. Rien de plus à apprendre, rien de
plus à l’écran.

Éteint par défaut, parce qu’un formulaire de réservation ne doit pas accepter
un séjour qui ne finit jamais.

## Les raccourcis

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  presets: ['thisQuarterHour', 'thisHour', 'today', 'last7Days', 'thisQuarter'],
});
```

| | |
|---|---|
| plus courts qu’un jour | `thisQuarterHour` · `lastHour` · `thisHour` · `nextHour` |
| jours | `yesterday` · `today` · `tomorrow` · `last7Days` · `last14Days` · `last30Days` · `next7Days` · `next30Days` |
| unités du calendrier | `thisWeek` · `lastWeek` · `thisMonth` · `lastMonth` · `thisQuarter` · `lastQuarter` · `nextQuarter` · `thisYear` |

Les quatre plus courts sont deux **moments**, pas deux dates — le quart
d’heure en cours, c’est 11:00 à 11:15 un jour précis — et ils sont arrondis
sur l’horloge du fuseau, pas sur l’epoch : un fuseau décalé d’un quart d’heure
serait sinon arrondi sur l’horloge de quelqu’un d’autre.

Tous sont comptés dans le fuseau, et c’est le point que les autres sélecteurs
manquent : demandez les 7 derniers jours le 27 octobre à Paris et la réponse
fait 169 heures, pas 168, parce que l’un de ces jours en comptait vingt-cinq.

`presets: []` supprime la colonne. Les vôtres s’écrivent
`{ name, label, range }` et peuvent rendre l’une ou l’autre forme :

```js
{
  name: 'lastFiveMinutes',
  label: 'Dernières 5 minutes',
  step: { minutes: 5 },
  range: (today, { now, timeZone }) => ({ start: now.subtract({ minutes: 5 }), end: now }),
}
```

## Les flèches

```js
createRangeField(element, { timeZone: 'Europe/Paris', shift: 'auto' });
```

Éteintes par défaut, parce qu’un champ qui désigne un seul jour choisi n’a
rien à parcourir. Avec `'auto'`, un appui déplace de ce que le lecteur vient
de demander : le raccourci qu’il a pressé, ou — s’il a choisi les jours à la
main — la longueur de ce qui est sélectionné. Une durée impose le pas quelle
que soit la sélection : c’est ainsi qu’on décale une période de trois jours
d’un quart d’heure à la fois. Elle peut s’écrire court :

```js
shift: { minutes: 15 }
shift: '15mn'   // la même chose, et la façon dont un écran le dit en un mot
```

| | |
|---|---|
| `25mn` `25min` `25m` | vingt-cinq minutes |
| `1h` | une heure |
| `3d` `3j` | trois jours |
| `2w` `2s` | deux semaines |
| `6mo` | six mois |

`m` vaut minutes et jamais mois : `mo` dit les mois, et un écran qui lirait
`6m` comme six mois se tromperait d’un facteur quarante mille.

Une liste fait apparaître un petit bouton entre les flèches et laisse le
lecteur choisir :

```js
shift: [
  { step: 'auto', label: 'la période' },
  { step: '15mn', label: '15 min' },
  { step: '1d',   label: '1 jour' },
]
```

Deux détails qui ne sont pas des approximations. `'auto'` ne décale pas un
trimestre de sa longueur en jours : 92 jours avant le 1er juillet, c’est le
31 mars, un jour trop tôt, et la dérive s’aggrave à chaque appui — une période
faite de mois entiers se décale donc en mois. Et une période ouverte d’un côté
n’a aucune longueur : `'auto'` la décale alors d’un jour, l’unité dans
laquelle le calendrier travaille.

## Les icônes

Chaque champ porte un calendrier, avant le texte par défaut :

```js
createRangeField(element, {
  timeZone: 'Europe/Paris',
  fieldIcon: monCalendrier,   // un nœud à vous, ou null pour aucun
  fieldIconSide: 'end',       // à l’autre bout du champ
});
```

Les dessins sont ceux de la bibliothèque — une boîte de 24 sur 24, un trait de
deux unités, des extrémités arrondies, les règles que suivent les familles
Lucide et Feather — pour qu’ils cohabitent avec ces icônes sans avoir l’air
empruntés. Ils ne leur sont pas pris : une bibliothèque qui embarque un jeu
d’icônes l’impose à tous ses consommateurs, et une bibliothèque qui en exige
un oblige chacun à l’installer avant qu’un champ ne s’affiche.

Ils sont tracés en `currentColor` à `1em`, donc ils prennent le poids du texte
voisin et suivent le thème sombre sans qu’on le leur dise, et ils ne prennent
jamais un clic : une main qui vise le champ et touche le calendrier atterrit
dans le champ. `icon('calendar')`, depuis `@tzslot/dom`, vous rend le même
nœud si vous le voulez ailleurs ; `'clock'`, `'chevronLeft'`, `'chevronRight'`
et `'x'` existent aussi.

## Les mots au-dessus des champs

`labels` décide de ce qui est écrit au-dessus de chaque champ et entre les
deux : les mots des messages par défaut, une icône, ou rien.

```js
labels: { start: null, end: null, between: '»' }
```

Un nœud est pris tel quel, pour qu’une application y mette sa propre marque.
Le mot reste lu par un lecteur d’écran, quel que soit le dessin.

## Les deux matins de l’année

Le matin où l’on recule les pendules, une heure a lieu deux fois, et un champ
qui affiche `02:30` pourrait désigner l’une ou l’autre. Les deux sont nommées
plutôt que numérotées : « heure d’été » est quelque chose qu’une personne peut
répondre, `+02:00` est quelque chose qu’elle doit calculer.

Les menus proposent l’heure deux fois et étoilent la seconde — `02` et `02*` —
avec une ligne sous le champ qui nomme la lecture **en vigueur** : *été*, ou
*\* hiver* quand c’est l’étoilée qui répond, moment précis où la marque a
besoin d’être expliquée. Nommer les deux dans la liste élargirait le menu à la
longueur du mot le plus long de la langue, tous les jours ordinaires de
l’année autant que celui-là. Les chiffres, eux, ne peuvent rien dire : ils
reçoivent donc une paire de boutons sous le champ. Dans les deux cas, le champ
fermé dit laquelle a été retenue :

```
25/10/2026 00:00 – 25/10/2026 02:30 (hiver)
```

Le matin où une heure est sautée, elle est simplement inatteignable : les
flèches l’enjambent, et une heure tapée dans le trou se pose sur le premier
moment qui existe.

## Rien tant qu’on n’a pas validé

`confirm: true` retient tout jusqu’à ce que **Valider** soit pressé, pour une
recherche qui coûte quelque chose. **Annuler** laisse la valeur où elle était.
