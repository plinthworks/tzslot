# Changelog

## 1.1.0

### Two panels came out wrong, and both shipped in 1.0.0

**The hour menu of `<tz-datetime-field>` was blank on every ordinary day.**
With `timeLayout: 'select'`, a field reading `22/09/2026 10:15` opened a panel
whose hour menu showed nothing — the minutes were right, the hour was empty,
and picking one moved a time the reader had not asked to move. Its options are
keyed by hour *and* reading: `10|` where a clock face happens once, `2|+02:00`
and `2|+01:00` the morning one happens twice. The field named a reading
unconditionally, so on an ordinary day it asked for `10|+02:00` and matched
nothing. `createRangeField` carries exactly this guard, with a comment
predicting the blank; this one never got it.

**`createDateField` drew an unstyled calendar on a page of its own.** Its
panel is on the body and the calendar inside is told not to inject its layout,
which the field was then meant to declare there — and did not. Anywhere a
second widget happened to inject the same sheet it looked right, which is how
it passed every documentation page and every test.

Both were found in screenshots, within two hours of 1.0.0, by someone
migrating a real screen. Seven tests hold them, four watched failing first.

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
· `createDateRange` · `createRangeField` · `createTimeSlots` ·
`createDateTimeRange` · `createDailyRange` · `createTimeInput` ·
`createTimeSelect` — all in plain DOM, each with an Angular component over it
(`<tz-calendar>` … `<tz-range-field>`), every one a `ControlValueAccessor`.

- A time is asked for in the way that suits: a compact field with arrows, two
  menus down to the minute, or the day's bookable slots — in the date-and-time
  field, in the interval, and in the daily range alike.
- A date-and-time field can be typed into as well as chosen from, in the
  locale's own form or a pattern of your own.
- `renderCell` puts a price, places left or a class of your own on any day;
  `buttons` adds Today and Clear.
- A period fits in one field: named ranges — the quarters included — beside
  two months shown side by side, whole days or times, and Apply/Cancel when a
  search costs something.
- Arrows step a whole period or a single moment without opening anything, off
  unless asked for. `'auto'` follows what is selected, so a quarter moves by a
  quarter rather than by ninety-two days, which would drift.
- `provideTzslot` settles the zone, the locale, the words and the shape values
  leave in for a whole application; `valueAs: 'utc'` hands out an instant
  whatever the widget, a date-only field included.
- Words come from one bundle, English and French included.
- **A period is two moments and nothing else.** `createRangeField` hands back
  `{ start, end }`: whether it is whole days is read off the pair — both ends
  landing on a day's first instant — never declared. The `allDay` flag it used
  to carry was set by whoever built the value and forgotten by everyone handed
  one, so a screen that computed 09:00 to 18:00 and left it out had its hours
  hidden without a word. A day chosen as the end still means all of it: the
  midnight that opens the day after, which is the exclusive end everything is
  built on. `showTime` decides only whether the hours are on screen to be
  read and changed. `createDateTimeRange`, which still offers an *All day*
  switch, keeps its own flag.
- **The week starts where the locale says it does** — Monday in France, Sunday
  in the United States and Japan, Saturday in much of the Arab world — asked of
  `Intl` rather than kept in a table here. The week-long shortcuts follow the
  same answer, so the grid and *This week* cannot disagree. `firstDayOfWeek`
  overrides it for a business that disagrees with its own locale, and a browser
  too old to answer gets Monday, as ISO-8601 says.

### The theme

Optional. Nine colours written `light-dark(…)`, so `data-theme` on any element
themes everything inside it and `--tz-accent` recolours what follows from it.
`contrast.css` follows `prefers-contrast: more`, and the whole thing is authored
in Sass. Two bridges map the palette to a Tailwind theme: `tailwind.css` reads
v4's CSS theme variables, `tailwind3.css` resolves v3's through `theme()`. They
cannot be one file — v4 publishes its theme as CSS, v3 keeps it in JavaScript —
and pointing v4's at v3 compiles without a word and paints nothing, which is
what the v3 bridge exists to avoid.

With the class dark-mode strategy the line to add is
`:root:not(.dark) { --tz-color-scheme: light; }`. The `:not()` is required:
`:root` and `.dark` weigh the same, so a bare `:root` written after the bridge
wins on source order and holds the widgets in light on a dark page.

### Requirements

Angular 18 to 22 for the wrappers; nothing but a DOM for the rest. Angular 22
was checked the only way that counts: a throwaway application on 22.1.7 with
TypeScript 6.0.3, `strictTemplates` on, six widgets bound in a template —
`ngc` clean — and the published bundle run through Angular 22's own linker,
which resolved all 27 partial declarations. Nothing in the wrappers is
deprecated there; the peer range simply had not been widened, and npm refuses
an install over a peer range, it does not warn. The theme
uses `light-dark()` and `color-mix()`: Chrome 123, Safari 17.5, Firefox 120.
Temporal is used natively where it exists and polyfilled where it does not.

## 0.1.0-beta.0

First pre-release, published to try the packages in a real project.
