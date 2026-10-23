# Getting started

> Cette documentation existe [en français](/fr/guide/getting-started).

tzslot is four packages, published together and versioned together.

| | |
|---|---|
| `@tzslot/core` | The arithmetic. No DOM, no framework — usable on a server too. |
| `@tzslot/dom` | Every widget, in plain DOM. Any framework, or none. |
| `@tzslot/angular` | Angular 18 to 22 components over `@tzslot/dom`. |
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

That is not a footnote you have to take on trust. Here is 29 March 2026 in
Paris — 02:00 is struck through, because it does not happen:

<Live widget="TimeSlots" :options="{ date: '2026-03-29', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '00:00', maxTime: '05:00' }" />

And 25 October, where it happens twice — two real slots, an hour apart, told
apart by their offsets:

<Live widget="TimeSlots" :options="{ date: '2026-10-25', timeZone: 'Europe/Paris', stepMinutes: 60, minTime: '00:00', maxTime: '05:00' }" />

Choose one and read the line underneath: what comes back is a moment, and the
two readings are not the same moment.

## Requirements

- **Angular 18 to 22** for `@tzslot/angular`; nothing but a DOM for the rest.
- **Chrome 123, Safari 17.5, Firefox 120** or later for the theme, which uses
  `light-dark()` and `color-mix()`.
- **Temporal** is used natively where it exists and polyfilled where it does
  not. By default the polyfill is a static import: a bundle carries it for
  every visitor, 24.5 kB gzipped of `@tzslot/core`'s 25.1. The section below
  is how to stop paying that where it is not needed.

## Paying for the polyfill only where it is needed

Temporal is native in Chrome 144 and Edge 144 since January 2026, and in
Firefox 139 since May 2025. No stable Safari has it — Technology Preview 249,
in August 2026, is the first — so Safari and every iOS browser still need the
polyfill. Roughly three visitors in four do not.

`@tzslot/core/lazy` is the same library with the polyfill left out of the
bundle. One await at startup, and nothing else in your code changes:

```ts
import { loadTemporal } from '@tzslot/core/lazy';

// Before the first date is read. Resolves in a microtask where Temporal is
// native, and fetches the polyfill as a separate chunk where it is not.
await loadTemporal();
```

Measured on the built package, not estimated:

| | first load |
|---|---|
| `@tzslot/core` | 25.1 kB gzipped, polyfill included |
| `@tzslot/core/lazy` | 0.8 kB gzipped |

The two entries export exactly the same things, so an import is the only line
that differs. Calling `loadTemporal()` twice, or from two widgets racing at
startup, fetches one copy: the same promise comes back.

Three things worth knowing before you choose it.

**The widgets have their own.** `@tzslot/dom/lazy` is the same twelve widgets
with the polyfill left out, for an editor or a panel that only loads on
demand:

```ts
import { loadTemporal, createRangeField } from '@tzslot/dom/lazy';

await loadTemporal();
createRangeField(host, { timeZone: 'Europe/Paris' });
```

Measured on the installed packages, an editor importing two widgets:

| | first load |
|---|---|
| `@tzslot/dom` | 64.4 kB gzipped |
| `@tzslot/dom/lazy` | 39.9 kB gzipped |

24.6 kB, 38% of that bundle, not fetched where Temporal is native. Asked for by
a consumer whose on-demand Pro editor was paying it for every visitor.

`@tzslot/react` and `@tzslot/angular` have no lazy entry: Angular's would have
to hold the first render rather than let an application await once at startup,
which is a different problem and not one solved by another entry point.

**Reading Temporal before the await throws**, with a message saying so rather
than `Cannot read properties of undefined`. That is the trade: the default
entry has no such state, which is why it stays the default.

**Safari pays a round trip**, not more bytes. The polyfill arrives in its own
chunk after the first paint instead of blocking it — better, as long as
`loadTemporal()` is called at startup and not at the first date.

## Where to go next

- [Angular](./angular) — the components, forms included.
- [Without a framework](./vanilla) — `create…`, `update`, `destroy`.
- [Choosing a period](./period) — the richest of the widgets, in detail.
- [What you get back](./values) — instants, whole days, and the exclusive end.
- [Examples](../examples) — every widget, running on the page.
