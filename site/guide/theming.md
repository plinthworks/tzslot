# Theming

The widgets carry structural class names and read every colour from a custom
property. `@tzslot/theme` sets those properties; skipping it leaves them plain
but working.

```js
import '@tzslot/theme';                  // the palette
import '@tzslot/theme/contrast.css';     // optional: more contrast
```

## Light and dark

Nine colours, each written `light-dark(light, dark)`. Which half applies is
decided where the colour is used, so:

- by default the widgets follow the system;
- `data-theme="dark"` or `"light"` on **any** element decides for everything
  inside it — a dark card on a light page is one attribute;
- there is no second copy of the dark values to keep in step.

```html
<div class="card" data-theme="dark">
  <tz-calendar />
</div>
```

A field's panel is drawn on the body, outside the card, and still opens dark:
it takes the card's `data-theme`, `data-contrast` and palette with it.

## Your colours

One accent, and everything derived from it follows — the selected day, the
range tint, the focus ring, the hover on the selection:

```css
:root { --tz-accent: #e11d48; --tz-accent-fg: #ffffff; }
.brand-card { --tz-accent: light-dark(#be123c, #fb7185); }
```

Set it on a card rather than the page and it applies to that card only.

## More contrast

`@tzslot/theme/contrast.css` applies by itself when the system asks for more
contrast, and on request with `data-contrast="more"` on any element. It is a
separate axis from light and dark: someone who needs more contrast still has a
preference between the two. Forced-colour modes are handled by the main theme.

## Tailwind v4

```css
@import "tailwindcss";
@import "@tzslot/theme";
@import "@tzslot/theme/tailwind.css";

@theme { --color-primary-600: #e11d48; --color-primary-400: #fb7185; }
```

Import the bridge in the file that imports Tailwind, not beside it: v4 only
emits the theme variables something references, and the bridge is what
references them.

## Sass

```scss
@use '@tzslot/theme/tzslot' with ($accent: (#be123c, #fb7185));

// or scoped, from your own variables
@use '@tzslot/theme/tzslot' as tz;
.brand-card { @include tz.palette((accent: $brand, accent-fg: #fff)); }
```

Everything still ends as `--tz-*` properties, so a theme can still change
while the page is running.

## Writing your own

Skip the theme and set the same properties yourself. The base layout comes
with the widget, and it is plain class selectors inserted first in the head —
a rule of yours loaded afterwards wins without `!important`.
