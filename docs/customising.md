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

## A third theme

Light and dark ship. Another is a block of the same variables under whatever
selector you like:

```css
[data-theme='high-contrast'] {
  --tz-bg: #000;
  --tz-fg: #fff;
  --tz-border: #fff;
  --tz-accent: #ffd400;
  --tz-accent-fg: #000;
}
```

The shipped dark values are defined twice — once under `prefers-color-scheme`
and once under `[data-theme='dark']` — so an explicit choice wins in both
directions. Do the same for yours if it should follow a system preference.

## No stylesheet at all

Skip `@tzslot/theme` and write the variables yourself. The components carry
structural class names and read every colour from a property, so nothing needs
overriding — only defining. That is why they were built unstyled.
