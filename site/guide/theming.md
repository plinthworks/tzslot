# Theming

The widgets carry structural class names and read every colour from a custom
property. `@tzslot/theme` sets those properties; skipping it leaves them plain
but working.

Three sections follow, one per setup. Each is complete on its own — read the
one you are in and ignore the rest.

## With Tailwind v4

```css
/* app.css */
@import "tailwindcss";
@import "@tzslot/theme";
@import "@tzslot/theme/tailwind.css";

@theme {
  --color-primary-600: #e11d48;   /* the accent, light */
  --color-primary-400: #fb7185;   /* the accent, dark */
}
```

The bridge maps surfaces and text to the zinc scale, the accent to your
`--color-primary-600` / `-400` (Tailwind's blue when you have none), danger
and warning to red and amber, and the font and radius to `--font-sans` and
`--radius-md`. Another grey is a matter of overriding the five surface lines.

Import it in the file that imports Tailwind, not beside it: v4 only emits the
theme variables something references, and the bridge is what references them.

### Light and dark

Tailwind's default dark mode follows the system, and so do the widgets:
nothing to do. With the class strategy — a `.dark` class your app toggles —
add one line:

```css
@custom-variant dark (&:where(.dark, .dark *));

:root:not(.dark) { --tz-color-scheme: light; }
```

::: warning The `:not()` is load-bearing
Written `:root { --tz-color-scheme: light }`, this line silently breaks dark
mode. `:root` and `.dark` weigh the same — (0,1,0) — so between two rules of
equal weight the later one wins, and yours is imported after the bridge. The
widgets then stay light inside a dark page: dark text on a light surface that
is no longer painted. `:root:not(.dark)` weighs (0,2,0) and says what it means
whatever the order.
:::

## With Tailwind v3

v3 keeps its theme in JavaScript and exposes it through `theme()`, resolved at
build time, where v4 publishes CSS variables. The two cannot share a file, so
v3 has a bridge of its own:

```css
/* app.css */
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";
@import "@tzslot/theme";
@import "@tzslot/theme/tailwind3.css";

:root:not(.dark) { --tz-color-scheme: light; }   /* darkMode: 'class' only */
```

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: { extend: { colors: { primary: { 600: '#e11d48', 400: '#fb7185' } } } },
};
```

Three things differ from v4, and each fails quietly when missed.

**The `@import` form of the Tailwind directives, not `@tailwind`.** CSS
requires `@import` to come first and be consecutive, and `postcss-import`
enforces it. An `@import` written under an `@tailwind` line is refused with
*"@import statements must precede all other statements"* and the bridge never
arrives.

**The file must go through Tailwind.** It is PostCSS that turns
`theme(colors.zinc.900)` into `#18181b`. Linked from your HTML, or imported by
a build that does not run Tailwind's plugin over it, it reaches the browser as
written and every colour is dropped.

**Your build must inline `@import`.** Vite, Next and the Angular builder do;
the `tailwindcss` CLI on its own does not.

Neither of the last two holds? Paste the bridge into your own CSS — it is
eleven declarations, and there is nothing else in the file.

::: tip Pointing the v4 bridge at v3 does nothing at all
Not an error, not a warning: `theme(…)` is absent from v4's file and
`var(--color-zinc-900)` means nothing to v3, so the page compiles and comes
out unstyled. If that is what you are looking at, this is why.
:::

## Without a framework

```js
import '@tzslot/theme';                  // the palette
import '@tzslot/theme/contrast.css';     // optional: more contrast
```

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

### Your colours

One accent, and everything derived from it follows — the selected day, the
range tint, the focus ring, the hover on the selection:

```css
:root { --tz-accent: #e11d48; --tz-accent-fg: #ffffff; }
.brand-card { --tz-accent: light-dark(#be123c, #fb7185); }
```

Set it on a card rather than the page and it applies to that card only.

### From Sass

```scss
@use '@tzslot/theme/tzslot' with ($accent: (#be123c, #fb7185));

// or scoped, from your own variables
@use '@tzslot/theme/tzslot' as tz;
.brand-card { @include tz.palette((accent: $brand, accent-fg: #fff)); }
```

Everything still ends as `--tz-*` properties, so a theme can still change
while the page is running.

### Writing your own

Skip the theme and set the same properties yourself. The base layout comes
with the widget, and it is plain class selectors inserted first in the head —
a rule of yours loaded afterwards wins without `!important`.

## More contrast

`@tzslot/theme/contrast.css` applies by itself when the system asks for more
contrast, and on request with `data-contrast="more"` on any element. It is a
separate axis from light and dark: someone who needs more contrast still has a
preference between the two. Forced-colour modes are handled by the main theme.

## Every property

Eleven, whatever the setup above. Set them all and you have replaced the
theme.

| Property | What it paints |
| --- | --- |
| `--tz-bg` | the widget's surface |
| `--tz-bg-raised` | what sits on top of it — panels, hovered cells |
| `--tz-fg` | text |
| `--tz-fg-muted` | days outside the month, hints, secondary labels |
| `--tz-border` | borders and separators |
| `--tz-accent` | the selection, the focus ring, the range tint |
| `--tz-accent-fg` | text on the accent |
| `--tz-danger` | a refused value, a skipped hour |
| `--tz-warning` | an hour that happens twice |
| `--tz-font` | the font family |
| `--tz-radius` | the corner radius |

And one that is not a colour: `--tz-color-scheme` (`light`, `dark`, or
`light dark`) decides which half of every `light-dark()` applies. It is
inherited, which is how `data-theme` on a card reaches everything inside it.
