# Theming

The widgets carry structural class names and read every colour from a custom
property. `@tzslot/theme` sets those properties; skipping it leaves them plain
but working.

Three sections follow, one per setup. Each is complete on its own — read the
one you are in and ignore the rest.

## A theme, whole

Every example below is the CSS above it, running. Copy the block, change the
seven colours, and you have your own.

### Midnight blue

The one most dashboards want: a deep blue surface, a warmer blue raised above
it, and a single accent that carries the selection, the focus ring and the
range tint.

```css
.midnight {
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

`--tz-color-scheme: dark` is the line people forget. Without it the widgets
still read the *light* half of every `light-dark()` the theme did not
override, and one stray pale border turns up in the middle of a dark panel.

### Midnight blue, with a font of its own

`--tz-font` takes any font stack. Nothing else changes — the widgets inherit
their size from the page and only the family is being decided here.

```css
.midnight-serif {
  /* the seven colours above, plus: */
  --tz-font:   Georgia, 'Times New Roman', serif;
  --tz-radius: 2px;
}
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, showTime: true, title: 'Midnight, in Georgia' }" :theme="{ '--tz-bg': '#0b1026', '--tz-bg-raised': '#161f43', '--tz-fg': '#e6ecff', '--tz-fg-muted': '#8b98c9', '--tz-border': '#2b3768', '--tz-accent': '#6ea8fe', '--tz-accent-fg': '#0b1026', '--tz-color-scheme': 'dark', '--tz-font': 'Georgia, \'Times New Roman\', serif', '--tz-radius': '2px', 'background': '#0b1026', 'padding': '1rem', 'borderRadius': '12px' }" />

Open the panel: it is drawn on the `body`, outside this box, and comes out
midnight blue anyway. A panel carries the palette of the element it was opened
from, or every field on a themed card would open a white rectangle over it.

### Terminal

A monospaced stack and square corners, for a console or a log viewer.

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

### Paper

Warm, light, rounded — a booking form rather than a dashboard.

```css
.paper {
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

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, title: 'Your stay' }" :theme="{ '--tz-bg': '#fbf7f0', '--tz-bg-raised': '#f2e9db', '--tz-fg': '#3b2f2a', '--tz-fg-muted': '#9c8875', '--tz-border': '#e0d2bd', '--tz-accent': '#b4531f', '--tz-accent-fg': '#fbf7f0', '--tz-radius': '14px', '--tz-color-scheme': 'light', 'background': '#fbf7f0', 'padding': '1rem', 'borderRadius': '14px' }" />

### One line: the accent alone

The smallest theme worth writing. Everything derived from the accent follows —
the chosen day, the range tint, the focus ring, the hover on the selection —
and the rest of the palette stays as the theme shipped it.

```css
.brand { --tz-accent: #b4531f; --tz-accent-fg: #ffffff; }
```

<Live widget="RangeField" :options="{ timeZone: 'Europe/Paris', months: 2, title: 'Accent only' }" :theme="{ '--tz-accent': '#b4531f', '--tz-accent-fg': '#ffffff' }" />

Written `light-dark(#8a3f18, #ff9a63)` it gives a different accent to each
scheme in one declaration, with no media query and no second copy to keep in
step:

```css
.brand { --tz-accent: light-dark(#8a3f18, #ff9a63); }
```

### Two on one page

A theme is a set of custom properties, and custom properties inherit. Put them
on a card rather than on `:root` and they stop at its edge — so two widgets on
the same page can look nothing like each other.

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', months: 1 }" :theme="{ '--tz-accent': '#6ea8fe', '--tz-bg': '#0b1026', '--tz-bg-raised': '#161f43', '--tz-fg': '#e6ecff', '--tz-fg-muted': '#8b98c9', '--tz-border': '#2b3768', '--tz-accent-fg': '#0b1026', '--tz-color-scheme': 'dark', 'background': '#0b1026', 'padding': '1rem', 'borderRadius': '12px' }" />

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', months: 1 }" :theme="{ '--tz-bg': '#fbf7f0', '--tz-bg-raised': '#f2e9db', '--tz-fg': '#3b2f2a', '--tz-fg-muted': '#9c8875', '--tz-border': '#e0d2bd', '--tz-accent': '#b4531f', '--tz-accent-fg': '#fbf7f0', '--tz-radius': '14px', '--tz-color-scheme': 'light', 'background': '#fbf7f0', 'padding': '1rem', 'borderRadius': '14px' }" />

### `data-theme`, without naming a colour

One attribute flips a subtree between the two halves of every `light-dark()`
the theme already holds. Nothing to define, and it works on any element.

```html
<div class="card" data-theme="dark">
  <tz-calendar />
</div>
```

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', months: 1 }" scheme="dark" :theme="{ 'padding': '1rem', 'borderRadius': '12px', 'background': 'var(--tz-bg)' }" />

<Live widget="Calendar" :options="{ timeZone: 'Europe/Paris', months: 1 }" scheme="light" :theme="{ 'padding': '1rem', 'borderRadius': '12px', 'background': 'var(--tz-bg)' }" />

### `--tz-radius` alone

From square to a pill, on every corner the widgets draw.

<Live widget="DateField" :options="{ timeZone: 'Europe/Paris' }" :theme="{ '--tz-radius': '0' }" />

<Live widget="DateField" :options="{ timeZone: 'Europe/Paris' }" :theme="{ '--tz-radius': '999px' }" />

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

::: warning In a `.scss` file, write the full filename
Sass resolves `@import` itself and only passes through a URL that ends in
`.css`, so `@import "@tzslot/theme";` stops the build with *Can't find
stylesheet to import*. Write `@import "@tzslot/theme/tzslot.css";` instead —
and note that `@tailwind base;` is then fine where the rule below asks for
`@import "tailwindcss/base"`, because Sass hoists a plain CSS `@import` to the
top of the file for you. Both verified with Dart Sass 1.105 and Tailwind 3.4.19.
:::

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

## Sizing the two time controls

The eleven above paint. Four more give the hour menus and the compact field
their measurements, and they are the ones a form needs when a `<tz-time-select>`
has to stand level with a `<tz-time-input>`, or with a field of your own.

| Property | Default | What it does |
| --- | --- | --- |
| `--tz-time-pad-y` | `0.375rem` | the padding above and below the figures, in **both** controls — the one lever for their height |
| `--tz-time-menu-width` | `3.25rem` | the floor under every menu's width |
| `--tz-time-arrow-size` | `0.6rem` | the size of the arrow glyphs in the compact field |
| `--tz-time-width` | `2.5rem` | the width of one box of figures in the compact field |

```css
/* Taller controls, with arrows to match. */
.my-form {
  --tz-time-pad-y: 0.7rem;
  --tz-time-arrow-size: 0.85rem;
}
```

Measured in Chrome: the menus and the field go from 38px tall to 48.4px
together, and each arrow's target from 17.5px to 22.7px. The arrows share the
field's height between them, so raising `--tz-time-pad-y` alone already makes
them easier to hit; `--tz-time-arrow-size` only sets how big the glyph inside
is drawn.

`--tz-time-menu-width` exists because a `<select>` is as wide as its widest
option. Without a floor the hour menu was wider than the minute menu on the
morning an hour happens twice — the entry reads `02*` — and the row moved
under the reader as the day changed. The floor is sized so that star fits
inside it, which holds both menus at one width on every day of the year. A
menu asked to name its readings in full — `readingStyle: 'named'`, which
writes `02 — summer` — is wider than the floor on purpose.

## The height of a field

`--tz-field-padding` is the lever, and it moves the trigger, the two date
inputs inside a range panel and the arrows beside them together — the arrows
are stretched by the row, so they follow without being told.

```css
.my-form { --tz-field-padding: 0.85rem 0.75rem; }
```

Measured in Chrome: the field goes from 42px tall to 53.2px, and the arrow
buttons with it. For the two time controls the lever is `--tz-time-pad-y`,
above; they are separate because a menu and a text field want different
horizontal padding for the same height.

## Your own icons on the shift arrows

The arrows are written `‹` and `›` as text. There is no setting for them, and
replacing the text from JavaScript does not hold — the panel builds its row
again each time it opens. CSS does hold, so that is the way in: silence the
glyph with `font-size: 0` and draw the icon in `::before` as a mask, which
keeps it the colour the theme is already using.

```css
:root {
  /* Lucide chevron-left and chevron-right, inline. A file works too:
     url('assets/icons/chevron-left.svg'). */
  --chevron-left:  url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>');
  --chevron-right: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>');
}

/* .tz-field__shift is the pair beside the field, .tz-rangefield__shift-arrow
   the pair inside the panel. */
.tz-field__shift,
.tz-rangefield__shift-arrow { font-size: 0; line-height: 0; }

.tz-field__shift::before,
.tz-rangefield__shift-arrow::before {
  content: "";
  display: block;
  width: 1.1rem;
  height: 1.1rem;
  background-color: currentColor;   /* the icon takes the theme's colour */
  -webkit-mask: var(--icon) center / contain no-repeat;
  mask: var(--icon) center / contain no-repeat;
}

.tz-field__shift--prev::before,
.tz-rangefield__shift-arrow:first-child::before { --icon: var(--chevron-left); }
.tz-field__shift--next::before,
.tz-rangefield__shift-arrow:last-child::before  { --icon: var(--chevron-right); }
```

Why a mask rather than an `<img>`: a mask is painted in `currentColor`, so one
file serves the light theme and the dark one, and the disabled state keeps its
`opacity: 0.4` without a second asset. Driven in Chrome afterwards: the icon
measured 17.6px, and a click on it still moved the period — the button is
untouched, only its face changed.
