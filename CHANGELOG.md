# Changelog

## 1.0.0

The first stable release. Four packages, published together and versioned
together: `@tzslot/core`, `@tzslot/dom`, `@tzslot/angular`, `@tzslot/theme`.

### The point of it

Pickers built on `Date` let someone book an hour that does not happen, or one
that happens twice, and store whichever reading the browser guessed. Built on
Temporal, tzslot shows the skipped hour struck through, offers both readings of
the repeated one by their UTC offset, and reports what an interval really lasts
when the clocks move during it.

### The widgets

`createCalendar` · `createMultiDate` · `createDateField` · `createDateTimeField`
· `createDateRange` · `createTimeSlots` · `createDateTimeRange` ·
`createDailyRange` · `createTimeInput` · `createTimeColumns` — all in plain DOM,
each with an Angular component over it (`<tz-calendar>` … `<tz-daily-range>`),
every one a `ControlValueAccessor`.

- A time is asked for in the way that suits: a compact field, two columns of
  hours and minutes down to the minute, or the day's bookable slots.
- A date-and-time field can be typed into as well as chosen from, in the
  locale's own form or a pattern of your own.
- `renderCell` puts a price, places left or a class of your own on any day;
  `buttons` adds Today and Clear.
- Words come from one bundle, English and French included.

### The theme

Optional. Nine colours written `light-dark(…)`, so `data-theme` on any element
themes everything inside it and `--tz-accent` recolours what follows from it.
`contrast.css` follows `prefers-contrast: more`, `tailwind.css` maps the palette
to a Tailwind v4 theme, and the whole thing is authored in Sass.

### Requirements

Angular 18 to 21 for the wrappers; nothing but a DOM for the rest. The theme
uses `light-dark()` and `color-mix()`: Chrome 123, Safari 17.5, Firefox 120.
Temporal is used natively where it exists and polyfilled where it does not.

## 0.1.0-beta.0

First pre-release, published to try the packages in a real project.
