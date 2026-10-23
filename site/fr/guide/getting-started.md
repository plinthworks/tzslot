# Démarrer

tzslot, ce sont quatre paquets, publiés ensemble et versionnés ensemble.

| | |
|---|---|
| `@tzslot/core` | Le calcul. Aucun DOM, aucun framework — utilisable sur un serveur aussi. |
| `@tzslot/dom` | Tous les composants, en DOM simple. N’importe quel framework, ou aucun. |
| `@tzslot/angular` | Les composants Angular 18 à 22, posés sur `@tzslot/dom`. |
| `@tzslot/theme` | Facultatif. Les couleurs, en CSS ou en Sass. |

## Installer

::: code-group
```bash [Angular]
npm install @tzslot/angular @tzslot/theme
```
```bash [Autre chose]
npm install @tzslot/dom @tzslot/theme
```
```bash [Le calcul seul]
npm install @tzslot/core
```
:::

`@tzslot/core` et `@tzslot/dom` arrivent avec les autres ; on ne les installe à
la main que si ce sont les seuls dont on a besoin.

## Le problème qu’il résout

Les sélecteurs bâtis sur `Date` ignorent les fuseaux IANA. Ils laisseront
quelqu’un réserver 02:30 un matin où 02:30 n’a pas lieu, ou un matin où cette
heure a lieu deux fois — et ils enregistreront la lecture que le navigateur
aura devinée.

```ts
import { getDaySlots } from '@tzslot/core';

getDaySlots('2026-03-29', 'Europe/Paris').find((slot) => slot.time.hour === 2);
// { exists: false, … }   ← on avance les pendules ; 02:30 n’a jamais lieu

getDaySlots('2026-10-25', 'Europe/Paris').find((slot) => slot.time.hour === 2);
// { ambiguous: true, offsets: ['+02:00', '+01:00'], instants: [ … , … ] }
```

Enregistrez un instant, jamais une heure d’horloge : un instant ne prête à
aucune interprétation, où qu’on se trouve, et il survit à un changement de
fuseau, à un changement de règles, et à une relecture l’année suivante.

Ce n’est pas une note de bas de page à croire sur parole. Voici le 29 mars
2026 à Paris — 02:00 est barrée, parce qu’elle n’arrive pas :

<Live widget="TimeSlots" :options="{ date: '2026-03-29', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '00:00', maxTime: '05:00' }" />

Et le 25 octobre, où elle arrive deux fois — deux vrais créneaux, à une heure
d’écart, distingués par leurs décalages :

<Live widget="TimeSlots" :options="{ date: '2026-10-25', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '00:00', maxTime: '05:00' }" />

Choisissez-en un et lisez la ligne en dessous : ce qui revient est un moment,
et les deux lectures ne sont pas le même moment.

## Ce qu’il faut

- **Angular 18 à 22** pour `@tzslot/angular` ; rien d’autre qu’un DOM pour le
  reste.
- **Chrome 123, Safari 17.5, Firefox 120** ou plus récent pour le thème, qui
  utilise `light-dark()` et `color-mix()`.
- **Temporal** est utilisé nativement là où il existe, et remplacé par un
  polyfill là où il n’existe pas. Par défaut ce polyfill est un import
  statique : un bundle l’emporte pour tous les visiteurs, 24,5 ko compressés
  sur les 25,1 de `@tzslot/core`. La section ci-dessous explique comment ne
  plus les payer là où ils ne servent à rien.

## Ne payer le polyfill que là où il sert

Temporal est natif dans Chrome 144 et Edge 144 depuis janvier 2026, et dans
Firefox 139 depuis mai 2025. Aucun Safari stable ne l’a — Technology Preview
249, en août 2026, est le premier — donc Safari et tous les navigateurs iOS
en ont encore besoin. Environ trois visiteurs sur quatre, non.

`@tzslot/core/lazy` est la même bibliothèque, sans le polyfill dans le bundle.
Un await au démarrage, et rien d’autre ne change dans votre code :

```ts
import { loadTemporal } from '@tzslot/core/lazy';

// Avant la première lecture de date. Résolu en une micro-tâche là où Temporal
// est natif, et va chercher le polyfill dans un chunk à part là où il manque.
await loadTemporal();
```

Mesuré sur le paquet construit, pas estimé :

| | premier chargement |
|---|---|
| `@tzslot/core` | 25,1 ko compressés, polyfill compris |
| `@tzslot/core/lazy` | 0,8 ko compressés |

Les deux entrées exportent exactement les mêmes choses : l’import est la seule
ligne qui diffère. Appeler `loadTemporal()` deux fois, ou depuis deux
composants qui démarrent en même temps, ne télécharge qu’une copie — c’est la
même promesse qui revient.

Trois choses à savoir avant de choisir.

**Les composants ont la leur.** `@tzslot/dom/lazy`, ce sont les mêmes douze
composants sans le polyfill, pour un éditeur ou un panneau qui ne se charge
qu’à la demande :

```ts
import { loadTemporal, createRangeField } from '@tzslot/dom/lazy';

await loadTemporal();
createRangeField(host, { timeZone: 'Europe/Paris' });
```

Mesuré sur les paquets installés, pour un éditeur qui importe deux composants :

| | premier chargement |
|---|---|
| `@tzslot/dom` | 64,4 ko compressés |
| `@tzslot/dom/lazy` | 39,9 ko compressés |

24,6 ko, soit 38 % de ce bundle, non téléchargés là où Temporal est natif.
Demandé par un consommateur dont l’éditeur Pro, chargé à la demande, les payait
pour chaque visiteur.

`@tzslot/react` et `@tzslot/angular` n’ont pas d’entrée paresseuse : celle
d’Angular devrait retenir le premier rendu au lieu de laisser une application
attendre une fois au démarrage, ce qui est un autre problème et qu’un point
d’entrée de plus ne résout pas.

**Lire Temporal avant l’await lève une erreur**, avec un message qui le dit,
plutôt qu’un `Cannot read properties of undefined`. C’est le marché : l’entrée
par défaut n’a pas cet état, et c’est pourquoi elle reste celle par défaut.

**Safari paie un aller-retour**, pas des octets de plus. Le polyfill arrive
dans son propre chunk après le premier affichage au lieu de le bloquer — ce
qui est mieux, à condition d’appeler `loadTemporal()` au démarrage et pas à la
première date.

## Où aller ensuite

- [Angular](./angular) — les composants, formulaires compris.
- [Sans framework](./vanilla) — `create…`, `update`, `destroy`.
- [Choisir une période](./period) — le composant le plus riche, en détail.
- [Ce qu’on récupère](./values) — instants, journées entières, et la fin exclusive.
- [Exemples](../examples) — tous les composants, en fonctionnement dans la page.
