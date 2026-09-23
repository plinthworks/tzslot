# Thème

Les composants portent des classes de structure et lisent chaque couleur dans
une propriété personnalisée. `@tzslot/theme` remplit ces propriétés ; s’en
passer laisse les composants sobres, mais fonctionnels.

Trois sections suivent, une par installation. Chacune se suffit à elle-même —
lisez la vôtre et ignorez les autres.

## Un thème, en entier

Chaque exemple ci-dessous, c'est le CSS juste au-dessus, en train de tourner.
Copiez le bloc, changez les sept couleurs, et vous avez le vôtre.

### Bleu nuit

Celui que veulent la plupart des tableaux de bord : une surface bleu profond,
un bleu plus clair posé dessus, et un seul accent qui porte la sélection,
l'anneau de focus et la teinte de la période.

```css
.minuit {
  --tz-bg:         #0b1026;
  --tz-bg-raised:  #161f43;
  --tz-fg:         #e6ecff;
  --tz-fg-muted:   #8b98c9;
  --tz-border:     #2b3768;
  --tz-accent:     #6ea8fe;
  --tz-accent-fg:  #0b1026;
  --tz-color-scheme: dark;
}
```

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', months: 1 }" :theme="{ '--tz-bg': '#0b1026', '--tz-bg-raised': '#161f43', '--tz-fg': '#e6ecff', '--tz-fg-muted': '#8b98c9', '--tz-border': '#2b3768', '--tz-accent': '#6ea8fe', '--tz-accent-fg': '#0b1026', '--tz-color-scheme': 'dark', 'background': '#0b1026', 'padding': '1rem', 'borderRadius': '12px' }" />

`--tz-color-scheme: dark` est la ligne qu'on oublie. Sans elle, les composants
lisent encore la moitié *claire* de chaque `light-dark()` que le thème n'a pas
redéfinie, et une bordure pâle égarée surgit au milieu d'un panneau sombre.

### Bleu nuit, avec sa propre police

`--tz-font` accepte n'importe quelle pile de polices. Rien d'autre ne change —
les composants héritent leur taille de la page, et c'est seulement la famille
qui se décide ici.

```css
.minuit-serif {
  /* les sept couleurs ci-dessus, plus : */
  --tz-font:   Georgia, 'Times New Roman', serif;
  --tz-radius: 2px;
}
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, showTime: true, title: 'Bleu nuit, en Georgia' }" :theme="{ '--tz-bg': '#0b1026', '--tz-bg-raised': '#161f43', '--tz-fg': '#e6ecff', '--tz-fg-muted': '#8b98c9', '--tz-border': '#2b3768', '--tz-accent': '#6ea8fe', '--tz-accent-fg': '#0b1026', '--tz-color-scheme': 'dark', '--tz-font': 'Georgia, \'Times New Roman\', serif', '--tz-radius': '2px', 'background': '#0b1026', 'padding': '1rem', 'borderRadius': '12px' }" />

Ouvrez le panneau : il est dessiné sur le `body`, hors de cette boîte, et il
sort bleu nuit quand même. Un panneau emporte la palette de l'élément depuis
lequel il a été ouvert — sans quoi chaque champ posé sur une carte thémée
ouvrirait un rectangle blanc par-dessus.

### Terminal

Une pile monospace et des coins carrés, pour une console ou un visualiseur de
journaux.

```css
.terminal {
  --tz-bg:        #0c0c0c;
  --tz-bg-raised: #1c1c1c;
  --tz-fg:        #d7ffd7;
  --tz-fg-muted:  #5f875f;
  --tz-border:    #2f4f2f;
  --tz-accent:    #5fff5f;
  --tz-accent-fg: #0c0c0c;
  --tz-font:      ui-monospace, SFMono-Regular, Menlo, monospace;
  --tz-radius:    0;
  --tz-color-scheme: dark;
}
```

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', months: 1, weekNumbers: true }" :theme="{ '--tz-bg': '#0c0c0c', '--tz-bg-raised': '#1c1c1c', '--tz-fg': '#d7ffd7', '--tz-fg-muted': '#5f875f', '--tz-border': '#2f4f2f', '--tz-accent': '#5fff5f', '--tz-accent-fg': '#0c0c0c', '--tz-font': 'ui-monospace, SFMono-Regular, Menlo, monospace', '--tz-radius': '0', '--tz-color-scheme': 'dark', 'background': '#0c0c0c', 'padding': '1rem' }" />

### Papier

Chaud, clair, arrondi — un formulaire de réservation plutôt qu'un tableau de
bord.

```css
.papier {
  --tz-bg:        #fbf7f0;
  --tz-bg-raised: #f2e9db;
  --tz-fg:        #3b2f2a;
  --tz-fg-muted:  #9c8875;
  --tz-border:    #e0d2bd;
  --tz-accent:    #b4531f;
  --tz-accent-fg: #fbf7f0;
  --tz-radius:    14px;
  --tz-color-scheme: light;
}
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, title: 'Votre séjour' }" :theme="{ '--tz-bg': '#fbf7f0', '--tz-bg-raised': '#f2e9db', '--tz-fg': '#3b2f2a', '--tz-fg-muted': '#9c8875', '--tz-border': '#e0d2bd', '--tz-accent': '#b4531f', '--tz-accent-fg': '#fbf7f0', '--tz-radius': '14px', '--tz-color-scheme': 'light', 'background': '#fbf7f0', 'padding': '1rem', 'borderRadius': '14px' }" />

### Une ligne : l'accent seul

Le plus petit thème qui vaille la peine d'être écrit. Tout ce qui découle de
l'accent suit — le jour choisi, la teinte de la période, l'anneau de focus, le
survol de la sélection — et le reste de la palette reste tel que le thème l'a
livré.

```css
.marque { --tz-accent: #b4531f; --tz-accent-fg: #ffffff; }
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, title: 'L\'accent seul' }" :theme="{ '--tz-accent': '#b4531f', '--tz-accent-fg': '#ffffff' }" />

Écrit `light-dark(#8a3f18, #ff9a63)`, il donne un accent différent à chaque
schéma en une seule déclaration, sans media query et sans seconde copie à tenir
à jour :

```css
.marque { --tz-accent: light-dark(#8a3f18, #ff9a63); }
```

### Deux sur une même page

Un thème, c'est un jeu de propriétés personnalisées, et les propriétés
personnalisées s'héritent. Posez-les sur une carte plutôt que sur `:root` et
elles s'arrêtent à son bord — deux composants de la même page peuvent donc ne
se ressembler en rien.

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', months: 1 }" :theme="{ '--tz-accent': '#6ea8fe', '--tz-bg': '#0b1026', '--tz-bg-raised': '#161f43', '--tz-fg': '#e6ecff', '--tz-fg-muted': '#8b98c9', '--tz-border': '#2b3768', '--tz-accent-fg': '#0b1026', '--tz-color-scheme': 'dark', 'background': '#0b1026', 'padding': '1rem', 'borderRadius': '12px' }" />

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', months: 1 }" :theme="{ '--tz-bg': '#fbf7f0', '--tz-bg-raised': '#f2e9db', '--tz-fg': '#3b2f2a', '--tz-fg-muted': '#9c8875', '--tz-border': '#e0d2bd', '--tz-accent': '#b4531f', '--tz-accent-fg': '#fbf7f0', '--tz-radius': '14px', '--tz-color-scheme': 'light', 'background': '#fbf7f0', 'padding': '1rem', 'borderRadius': '14px' }" />

### `data-theme`, sans nommer une seule couleur

Un attribut bascule une sous-arborescence entre les deux moitiés de chaque
`light-dark()` que le thème contient déjà. Rien à définir, et ça marche sur
n'importe quel élément.

```html
<div class="carte" data-theme="dark">
  <tz-calendar />
</div>
```

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', months: 1 }" scheme="dark" :theme="{ 'padding': '1rem', 'borderRadius': '12px', 'background': 'var(--tz-bg)' }" />

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', months: 1 }" scheme="light" :theme="{ 'padding': '1rem', 'borderRadius': '12px', 'background': 'var(--tz-bg)' }" />

### `--tz-radius` tout seul

Du carré à la pastille, sur chaque coin que dessinent les composants.

<Live widget="DateField" :options="{ timeZone: 'Europe/Paris' }" :theme="{ '--tz-radius': '0' }" />

<Live widget="DateField" :options="{ timeZone: 'Europe/Paris' }" :theme="{ '--tz-radius': '999px' }" />

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

::: warning Dans un fichier `.scss`, écrivez le nom de fichier complet
Sass résout `@import` lui-même et ne laisse passer qu’une URL qui finit par
`.css` : `@import "@tzslot/theme";` arrête donc la compilation sur *Can’t find
stylesheet to import*. Écrivez `@import "@tzslot/theme/tzslot.css";` à la
place — et sachez qu’alors `@tailwind base;` convient là où la règle ci-dessous
réclame `@import "tailwindcss/base"`, parce que Sass remonte tout seul un
`@import` CSS ordinaire en tête de fichier. Les deux vérifiés avec Dart Sass
1.105 et Tailwind 3.4.19.
:::

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

## Les mesures des deux contrôles d'heure

Les onze ci-dessus peignent. Quatre autres donnent leurs mesures aux menus
d'heures et au champ compact — ce sont celles dont un formulaire a besoin
quand un `<tz-time-select>` doit s'aligner avec un `<tz-time-input>`, ou avec
un champ à vous.

| Propriété | Défaut | Ce qu'elle fait |
| --- | --- | --- |
| `--tz-time-pad-y` | `0.375rem` | l'espace au-dessus et en dessous des chiffres, dans les **deux** contrôles — le levier unique de leur hauteur |
| `--tz-time-menu-width` | `3.25rem` | le plancher de largeur de chaque menu |
| `--tz-time-arrow-size` | `0.6rem` | la taille des flèches du champ compact |
| `--tz-time-width` | `2.5rem` | la largeur d'une boîte de chiffres du champ compact |

```css
/* Des contrôles plus hauts, avec des flèches à l'avenant. */
.mon-formulaire {
  --tz-time-pad-y: 0.7rem;
  --tz-time-arrow-size: 0.85rem;
}
```

Mesuré dans Chrome : les menus et le champ passent ensemble de 38 px à 48,4 px
de haut, et la cible de chaque flèche de 17,5 px à 22,7 px. Les flèches se
partagent la hauteur du champ, donc augmenter `--tz-time-pad-y` seul les rend
déjà plus faciles à viser ; `--tz-time-arrow-size` ne règle que la taille du
signe dessiné dedans.

`--tz-time-menu-width` existe parce qu'un `<select>` est aussi large que sa
plus longue option. Sans plancher, le menu des heures était plus large que
celui des minutes le matin où une heure arrive deux fois — l'entrée s'écrit
`02*` — et la ligne bougeait sous le lecteur au fil des jours. Le plancher est
taillé pour que l'étoile tienne dedans, ce qui garde les deux menus à une
seule largeur tous les jours de l'année. Un menu à qui on demande de nommer
ses lectures en toutes lettres — `readingStyle: 'named'`, qui écrit
`02 — été` — est plus large que le plancher, exprès.

## La hauteur d'un champ

`--tz-field-padding` est le levier, et il déplace ensemble le déclencheur, les
deux champs de date du panneau et les flèches à côté — les flèches sont
étirées par la ligne, donc elles suivent sans qu'on leur dise.

```css
.mon-formulaire { --tz-field-padding: 0.85rem 0.75rem; }
```

Mesuré dans Chrome : le champ passe de 42 px à 53,2 px de haut, et les boutons
flèches avec lui. Pour les deux contrôles d'heure, le levier est
`--tz-time-pad-y`, plus haut ; ils sont séparés parce qu'un menu et un champ
de saisie veulent des marges horizontales différentes à hauteur égale.

## Vos propres icônes sur les flèches

Les flèches sont écrites `‹` et `›`, en texte. Il n'y a pas de réglage pour
elles, et remplacer ce texte depuis JavaScript ne tient pas — le panneau
reconstruit sa ligne à chaque ouverture. La CSS, elle, tient : on fait taire
le signe avec `font-size: 0` et on dessine l'icône dans `::before` sous forme
de masque, ce qui lui garde la couleur que le thème emploie déjà.

```css
:root {
  /* Lucide chevron-left et chevron-right, en ligne. Un fichier marche aussi :
     url('assets/icons/chevron-left.svg'). */
  --chevron-left:  url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>');
  --chevron-right: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>');
}

/* .tz-field__shift est la paire à côté du champ,
   .tz-rangefield__shift-arrow celle dans le panneau. */
.tz-field__shift,
.tz-rangefield__shift-arrow { font-size: 0; line-height: 0; }

.tz-field__shift::before,
.tz-rangefield__shift-arrow::before {
  content: "";
  display: block;
  width: 1.1rem;
  height: 1.1rem;
  background-color: currentColor;   /* l'icône prend la couleur du thème */
  -webkit-mask: var(--icon) center / contain no-repeat;
  mask: var(--icon) center / contain no-repeat;
}

.tz-field__shift--prev::before,
.tz-rangefield__shift-arrow:first-child::before { --icon: var(--chevron-left); }
.tz-field__shift--next::before,
.tz-rangefield__shift-arrow:last-child::before  { --icon: var(--chevron-right); }
```

Pourquoi un masque plutôt qu'une `<img>` : un masque est peint en
`currentColor`, donc un seul fichier sert le thème clair et le sombre, et
l'état désactivé garde son `opacity: 0.4` sans second fichier. Piloté dans
Chrome ensuite : l'icône mesure 17,6 px, et un clic dessus déplace toujours la
période — le bouton est intact, seul son visage a changé.
