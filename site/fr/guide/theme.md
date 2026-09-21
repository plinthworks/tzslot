# Thème

Les composants portent des classes de structure et lisent chaque couleur dans
une propriété personnalisée. `@tzslot/theme` remplit ces propriétés ; s’en
passer laisse les composants sobres, mais fonctionnels.

```js
import '@tzslot/theme';                  // la palette
import '@tzslot/theme/contrast.css';     // facultatif : plus de contraste
```

## Clair et sombre

Neuf couleurs, chacune écrite `light-dark(clair, sombre)`. La moitié qui
s’applique se décide à l’endroit où la couleur est utilisée, donc :

- par défaut, les composants suivent le système ;
- `data-theme="dark"` ou `"light"` sur **n’importe quel** élément décide pour
  tout ce qu’il contient — une carte sombre sur une page claire, c’est un
  attribut ;
- il n’existe pas de seconde copie des valeurs sombres à maintenir.

```html
<div class="card" data-theme="dark">
  <tz-calendar />
</div>
```

Le panneau d’un champ est dessiné sur le `body`, hors de la carte, et s’ouvre
quand même en sombre : il emporte avec lui le `data-theme`, le `data-contrast`
et la palette de la carte.

## Vos couleurs

Un accent, et tout ce qui en découle suit — le jour sélectionné, la teinte de
la plage, l’anneau de focus, le survol de la sélection :

```css
:root { --tz-accent: #e11d48; --tz-accent-fg: #ffffff; }
.brand-card { --tz-accent: light-dark(#be123c, #fb7185); }
```

Posez-le sur une carte plutôt que sur la page, et il ne vaut que pour elle.

## Plus de contraste

`@tzslot/theme/contrast.css` s’applique de lui-même quand le système demande
plus de contraste, et sur demande avec `data-contrast="more"` sur n’importe
quel élément. C’est un axe distinct du clair et du sombre : quelqu’un qui a
besoin de contraste garde une préférence entre les deux. Les modes à couleurs
forcées sont pris en charge par le thème principal.

## Tailwind v4

```css
@import "tailwindcss";
@import "@tzslot/theme";
@import "@tzslot/theme/tailwind.css";

@theme { --color-primary-600: #e11d48; --color-primary-400: #fb7185; }
```

Importez le pont dans le fichier qui importe Tailwind, pas à côté : la v4
n’émet que les variables de thème auxquelles quelque chose fait référence, et
c’est le pont qui y fait référence.

## Sass

```scss
@use '@tzslot/theme/tzslot' with ($accent: (#be123c, #fb7185));

// ou localement, depuis vos propres variables
@use '@tzslot/theme/tzslot' as tz;
.brand-card { @include tz.palette((accent: $brand, accent-fg: #fff)); }
```

Tout finit quand même en propriétés `--tz-*`, donc un thème peut encore
changer pendant que la page tourne.

## Écrire le vôtre

Ignorez le thème et posez les mêmes propriétés vous-même. La mise en page de
base vient avec le composant : ce sont de simples sélecteurs de classe
insérés en tête du `head`, donc une règle à vous chargée ensuite l’emporte
sans `!important`.
