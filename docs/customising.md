# Customising

## Words

One bundle, provided once:

```ts
import { provideTzslotMessages, FR } from '@tzslot/angular';

providers: [provideTzslotMessages(FR)]
```

English and French ship. Any other language is an object of the same shape.

Month and weekday names are **not** in the bundle and never will be: `Intl`
already knows them in every language the browser supports. Pass `[locale]` and
they follow.

The one entry that is a function rather than a string is the clock-change
sentence, because languages do not agree on where the pieces go:

```
en  The clocks go back by 1h during this range, so it reads as 6h but lasts 7h.
fr  Cet intervalle dure 7h et non 6h : les pendules reculent de 1h pendant cette période.
```

English leads with the cause, French with the duration. A format string with
holes cannot express both.

Any single label can still be overridden per instance — `[placeholder]`,
`[startLabel]`, `[missingLabel]` and the rest take precedence over the bundle.

## Icons

Projected, with the built-in chevrons as fallback:

```html
<tz-calendar>
  <lucide-icon tzPrev name="chevron-left" />
  <lucide-icon tzNext name="chevron-right" />
</tz-calendar>

<tz-date-field>
  <lucide-icon tzIcon name="calendar" />
</tz-date-field>
```

Project nothing and you keep `‹ › ▾`.

## Colours, spacing, shape

76 custom properties, all set by `@tzslot/theme` and all overridable. Scope them
wherever you like — globally, on a wrapper, on one instance:

```css
.booking-calendar {
  --tz-cal-cell-size: 2.75rem;
  --tz-cal-selected-bg: #0f766e;
  --tz-range-within-bg: #ccfbf1;
}
```

## A single day versus a range

Deliberately different, because they mean different things:

| | |
|---|---|
| `--tz-cal-selected-bg` / `-fg` | one chosen day, and the ends of a range |
| `--tz-range-within-bg` | the days between the ends |

The ends are rounded on their outer corners only, so a run reads as one shape
rather than a row of separate pills.

## Font

Inherited by default, which is almost always right. Set it only to make the
components differ from their surroundings:

```css
:root { --tz-font: 500 0.9375rem/1.4 'Inter', system-ui, sans-serif; }
```

Tabular figures are worth considering for a calendar, so columns of numbers line
up:

```css
.tz-cal__day { font-variant-numeric: tabular-nums; }
```

## Light, dark, and where

The palette is nine colours, each written `light-dark(light, dark)`. The
widgets follow the system by default; `data-theme` forces a scheme for
everything inside the element that carries it — any element, not only
`<html>`:

```html
<html data-theme="dark">            <!-- the whole page -->
<div class="card" data-theme="dark"> <!-- one card on a light page -->
```

A field's panel is drawn on the body, outside the card, and still opens dark:
it takes the card's `data-theme`, `data-contrast` and palette with it.

## Your colours

One accent, and everything derived from it follows — the selected day, the
range tint, the focus ring, the hover on the selection:

```css
:root { --tz-accent: #e11d48; --tz-accent-fg: #ffffff; }
```

`--tz-accent-fg` is the text on the accent; set it when your accent is light
enough that white would not read. Different values per scheme are
`light-dark()` again:

```css
:root { --tz-accent: light-dark(#be123c, #fb7185); }
```

Set on a card instead of `:root`, it applies to that card only.

## From Sass

Optional: the CSS works in any project, Sass or not. With Sass, the palette
can be configured at compile time — a pair becomes `light-dark()`, a single
colour is used in both schemes:

```scss
@use '@tzslot/theme/tzslot' with (
  $accent: (#be123c, #fb7185),
  $accent-fg: #fff,
);
```

Or scoped to a selector from your own variables:

```scss
@use '@tzslot/theme/tzslot' as tz;

.brand-card {
  @include tz.palette((accent: $brand-primary, accent-fg: #fff));
}
```

`with ($emit: false)` loads the mixin without emitting the theme itself.
Everything still ends as `--tz-*` custom properties, so runtime changes —
`data-theme` on a card, an accent picked by the user — keep working.

## With Tailwind v4

```css
/* styles.css — the file that imports Tailwind */
@import "tailwindcss";
@import "@tzslot/theme";
@import "@tzslot/theme/tailwind.css";

@theme {
  --color-primary-400: #fb7185;
  --color-primary-600: #e11d48;
}
```

Surfaces and text take the zinc scale, the accent takes `--color-primary-600`
(light) and `-400` (dark), or Tailwind's blue without them, and the font and
radius follow `--font-sans` and `--radius-md`.

Import it in that file, after `tailwindcss`, not beside it: Tailwind v4 only
emits the theme variables something references, and the bridge is what
references them.

Dark mode by class (`.dark` on `<html>`) is covered; add
`:root { --tz-color-scheme: light; }` so that no `.dark` means light even on
a dark system. The playground's `tailwind.html` is a complete example.

## More contrast

```js
import '@tzslot/theme/contrast.css';
```

Applies by itself when the system asks for more contrast, and on request with
`data-contrast="more"` on any element. A separate axis from light and dark:
someone who needs more contrast still prefers one of the two. Forced-colour
modes (Windows high contrast) are handled by the main theme.

## A theme of your own

A block of palette variables under whatever selector you like:

```css
[data-theme='sepia'] {
  --tz-color-scheme: light;
  --tz-bg: #f4ecd8;
  --tz-fg: #3b2f1e;
  --tz-border: #c9b99a;
  --tz-accent: #8b4513;
  --tz-accent-fg: #ffffff;
}
```

## No stylesheet at all

Skip `@tzslot/theme` and write the variables yourself. The components carry
structural class names and read every colour from a property, so nothing needs
overriding — only defining. That is why they were built unstyled.
