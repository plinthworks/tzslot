# Démarrer

tzslot, ce sont quatre paquets, publiés ensemble et versionnés ensemble.

| | |
|---|---|
| `@tzslot/core` | Le calcul. Aucun DOM, aucun framework — utilisable sur un serveur aussi. |
| `@tzslot/dom` | Tous les composants, en DOM simple. N’importe quel framework, ou aucun. |
| `@tzslot/angular` | Les composants Angular 18 à 21, posés sur `@tzslot/dom`. |
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

## Ce qu’il faut

- **Angular 18 à 21** pour `@tzslot/angular` ; rien d’autre qu’un DOM pour le
  reste.
- **Chrome 123, Safari 17.5, Firefox 120** ou plus récent pour le thème, qui
  utilise `light-dark()` et `color-mix()`.
- **Temporal** est utilisé nativement là où il existe, et remplacé par un
  polyfill là où il n’existe pas. Ce polyfill est un import statique : un
  bundle l’emporte pour tous les visiteurs, environ 19 ko compressés.

## Où aller ensuite

- [Angular](./angular) — les composants, formulaires compris.
- [Sans framework](./vanilla) — `create…`, `update`, `destroy`.
- [Choisir une période](./period) — le composant le plus riche, en détail.
- [Ce qu’on récupère](./values) — instants, journées entières, et la fin exclusive.
- [Exemples](../examples) — tous les composants, en fonctionnement dans la page.
