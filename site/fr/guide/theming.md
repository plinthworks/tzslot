# Thème

Les composants portent des classes de structure et lisent chaque couleur dans
une propriété personnalisée. `@tzslot/theme` remplit ces propriétés ; s’en
passer laisse les composants sobres, mais fonctionnels.

Trois sections suivent, une par installation. Chacune se suffit à elle-même —
lisez la vôtre et ignorez les autres.

## Avec Tailwind v4

```css
/* app.css */
@import "tailwindcss";
@import "@tzslot/theme";
@import "@tzslot/theme/tailwind.css";

@theme {
  --color-primary-600: #e11d48;   /* l’accent, en clair */
  --color-primary-400: #fb7185;   /* l’accent, en sombre */
}
```

Le pont fait correspondre les surfaces et le texte à l’échelle zinc, l’accent
à vos `--color-primary-600` / `-400` (le bleu de Tailwind si vous n’en avez
pas), le danger et l’avertissement à red et amber, la police et le rayon à
`--font-sans` et `--radius-md`. Un autre gris se règle en redéfinissant les
cinq lignes de surface.

Importez-le dans le fichier qui importe Tailwind, pas à côté : v4 n’émet que
les variables de thème que quelque chose référence, et le pont est
précisément ce qui les référence.

### Clair et sombre

Le mode sombre par défaut de Tailwind suit le système, et les composants
aussi : rien à faire. Avec la stratégie par classe — une classe `.dark` que
votre application bascule — ajoutez une ligne :

```css
@custom-variant dark (&:where(.dark, .dark *));

:root:not(.dark) { --tz-color-scheme: light; }
```

::: warning Le `:not()` porte tout le poids
Écrite `:root { --tz-color-scheme: light }`, cette ligne casse le mode sombre
sans rien dire. `:root` et `.dark` pèsent pareil — (0,1,0) — et entre deux
règles de même poids, c’est la dernière qui gagne : la vôtre est importée
après le pont. Les composants restent alors clairs à l’intérieur d’une page
sombre : du texte foncé sur une surface claire qui n’est plus peinte.
`:root:not(.dark)` pèse (0,2,0) et dit ce qu’il veut dire quel que soit
l’ordre.
:::

## Avec Tailwind v3

v3 garde son thème en JavaScript et l’expose par `theme()`, résolu à la
compilation, là où v4 publie des variables CSS. Les deux ne peuvent pas tenir
dans un même fichier : v3 a donc son propre pont.

```css
/* app.css */
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";
@import "@tzslot/theme";
@import "@tzslot/theme/tailwind3.css";

:root:not(.dark) { --tz-color-scheme: light; }   /* darkMode: 'class' seulement */
```

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: { extend: { colors: { primary: { 600: '#e11d48', 400: '#fb7185' } } } },
};
```

Trois choses diffèrent de v4, et chacune échoue en silence si on l’oublie.

**La forme `@import` des directives Tailwind, pas `@tailwind`.** CSS exige que
les `@import` viennent en premier et se suivent, et `postcss-import` le fait
respecter. Un `@import` écrit sous une ligne `@tailwind` est refusé avec
*« @import statements must precede all other statements »*, et le pont
n’arrive jamais.

**Le fichier doit passer par Tailwind.** C’est PostCSS qui transforme
`theme(colors.zinc.900)` en `#18181b`. Chargé depuis votre HTML, ou importé
par un build qui ne fait pas tourner le plugin Tailwind dessus, il arrive au
navigateur tel quel et toutes les couleurs sont perdues.

**Votre build doit inliner les `@import`.** Vite, Next et le builder Angular
le font ; le CLI `tailwindcss` seul, non.

Ni l’un ni l’autre chez vous ? Collez le pont dans votre propre CSS — ce sont
onze déclarations, et il n’y a rien d’autre dans le fichier.

::: tip Pointer le pont v4 sur v3 ne fait absolument rien
Ni erreur, ni avertissement : `theme(…)` est absent du fichier v4 et
`var(--color-zinc-900)` ne veut rien dire pour v3, donc la page compile et
sort sans style. Si c’est ce que vous avez sous les yeux, voilà pourquoi.
:::

## Sans framework

```js
import '@tzslot/theme';                  // la palette
import '@tzslot/theme/contrast.css';     // facultatif : plus de contraste
```

Neuf couleurs, chacune écrite `light-dark(clair, sombre)`. La moitié qui
s’applique se décide à l’endroit où la couleur est utilisée, donc :

- par défaut, les composants suivent le système ;
- `data-theme="dark"` ou `"light"` sur **n’importe quel** élément décide pour
  tout ce qu’il contient — une carte sombre sur une page claire, c’est un
  attribut ;
- il n’y a pas de seconde copie des valeurs sombres à tenir à jour.

```html
<div class="card" data-theme="dark">
  <tz-calendar />
</div>
```

Le panneau d’un champ est dessiné sur le `body`, hors de la carte, et s’ouvre
quand même en sombre : il emporte le `data-theme`, le `data-contrast` et la
palette de la carte.

### Vos couleurs

Un accent, et tout ce qui en découle suit — le jour sélectionné, la teinte de
la période, l’anneau de focus, le survol de la sélection :

```css
:root { --tz-accent: #e11d48; --tz-accent-fg: #ffffff; }
.brand-card { --tz-accent: light-dark(#be123c, #fb7185); }
```

Posé sur une carte plutôt que sur la page, il ne vaut que pour cette carte.

### Depuis Sass

```scss
@use '@tzslot/theme/tzslot' with ($accent: (#be123c, #fb7185));

// ou localement, depuis vos propres variables
@use '@tzslot/theme/tzslot' as tz;
.brand-card { @include tz.palette((accent: $brand, accent-fg: #fff)); }
```

Tout finit malgré tout en propriétés `--tz-*`, donc un thème peut encore
changer pendant que la page tourne.

### Écrire le vôtre

Passez-vous du thème et remplissez les mêmes propriétés vous-même. La mise en
page de base vient avec le composant : ce sont de simples sélecteurs de classe
insérés en tête du `head`, donc une règle à vous chargée ensuite gagne sans
`!important`.

## Plus de contraste

`@tzslot/theme/contrast.css` s’applique de lui-même quand le système demande
plus de contraste, et à la demande avec `data-contrast="more"` sur n’importe
quel élément. C’est un axe distinct du clair et du sombre : quelqu’un qui a
besoin de plus de contraste garde une préférence entre les deux. Les modes à
couleurs forcées sont traités par le thème principal.

## Toutes les propriétés

Onze, quelle que soit l’installation ci-dessus. Les remplir toutes, c’est
avoir remplacé le thème.

| Propriété | Ce qu’elle peint |
| --- | --- |
| `--tz-bg` | la surface du composant |
| `--tz-bg-raised` | ce qui se pose dessus — panneaux, cellules survolées |
| `--tz-fg` | le texte |
| `--tz-fg-muted` | les jours hors du mois, les indications, les libellés secondaires |
| `--tz-border` | les bordures et les séparateurs |
| `--tz-accent` | la sélection, l’anneau de focus, la teinte de période |
| `--tz-accent-fg` | le texte posé sur l’accent |
| `--tz-danger` | une valeur refusée, une heure sautée |
| `--tz-warning` | une heure qui arrive deux fois |
| `--tz-font` | la famille de police |
| `--tz-radius` | le rayon des coins |

Et une qui n’est pas une couleur : `--tz-color-scheme` (`light`, `dark` ou
`light dark`) décide quelle moitié de chaque `light-dark()` s’applique. Elle
est héritée, c’est ainsi qu’un `data-theme` posé sur une carte atteint tout ce
qu’elle contient.
