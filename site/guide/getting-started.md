# Getting started

tzslot is four packages, published together and versioned together.

| | |
|---|---|
| `@tzslot/core` | The arithmetic. No DOM, no framework — usable on a server too. |
| `@tzslot/dom` | Every widget, in plain DOM. Any framework, or none. |
| `@tzslot/angular` | Angular 18 to 21 components over `@tzslot/dom`. |
| `@tzslot/theme` | Optional. The colours, in CSS or Sass. |

## Install

::: code-group
```bash [Angular]
npm install @tzslot/angular @tzslot/theme
```
```bash [Anything else]
npm install @tzslot/dom @tzslot/theme
```
```bash [The arithmetic alone]
npm install @tzslot/core
```
:::

`@tzslot/core` and `@tzslot/dom` come along with the others; you never install
them by hand unless they are all you want.

## The problem it solves

Pickers built on `Date` have no notion of an IANA time zone. They will let
someone book 02:30 on a morning when 02:30 does not happen, or on one when it
happens twice, and store whichever reading the browser guessed.

```ts
import { getDaySlots } from '@tzslot/core';

getDaySlots('2026-03-29', 'Europe/Paris').find((slot) => slot.time.hour === 2);
// { exists: false, … }   ← the clocks go forward; 02:30 never happens

getDaySlots('2026-10-25', 'Europe/Paris').find((slot) => slot.time.hour === 2);
// { ambiguous: true, offsets: ['+02:00', '+01:00'], instants: [ … , … ] }
```

Store an instant, never a wall time: an instant is unambiguous everywhere and
survives a change of zone, a change of the rules, and being read back next
year.

## Requirements

- **Angular 18 to 21** for `@tzslot/angular`; nothing but a DOM for the rest.
- **Chrome 123, Safari 17.5, Firefox 120** or later for the theme, which uses
  `light-dark()` and `color-mix()`.
- **Temporal** is used natively where it exists and polyfilled where it does
  not. The polyfill is a static import: a bundle carries it for every visitor,
  about 19 kB gzipped.

## Where to go next

- [Angular](./angular) — the components, forms included.
- [Without a framework](./vanilla) — `create…`, `update`, `destroy`.
- [Choosing a period](./period) — the richest of the widgets, in detail.
- [What you get back](./values) — instants, whole days, and the exclusive end.
- [Examples](../examples) — every widget, running on the page.
