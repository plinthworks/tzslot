# Changelog

## 1.1.0

### The arrows, simplified

`shift` had four shapes and a rule nobody could hold in their head. It has two
ideas now: whether there are arrows, and how far one press moves.

**A plain number is minutes** — `15` is a quarter of an hour, `60` an hour,
`1440` a day. Seconds are not offered: an arrow that moves a booking by a
second is an arrow nobody presses. Anything a number cannot say is said in
full: `{ days: 1, minutes: 30 }`, `{ months: 1, hours: 1, minutes: 45 }`, or
the short form `'45mn'`. `true` asks for arrows without naming a step and
follows what is being chosen — an hour for a period, a day for one date.

**`'auto'` is gone**, and with it the coupling between shortcuts and steps. A
shortcut computes a value; a step moves one. They used to touch — the shortcut
just pressed decided what an arrow moved by — and that was one mechanism too
many: the arrows changed meaning under the reader's hand depending on what
they had pressed a moment earlier. `presetStep()` goes too.

**A step shorter than a day no longer disables the arrows.** They used to be
drawn, enabled, and do nothing at all, because `PlainDate.add({ minutes: 15 })`
adds nothing and does not throw; then they were disabled instead. Both answers
were wrong. The two ends move as moments, and the field writes the hours the
period gained.

### Three options a screen can turn on and off while it runs

- **`singleDay`** — one field instead of two, and a click means that whole
  day. The value is a period either way, so a screen can switch without what
  it is bound to ever changing shape. Crossing over keeps the start day, and
  coming back arms the *end*: the reader has their day already and is
  switching precisely to add an end.
- **`showPresets`** — whether the column of shortcuts is drawn, without
  touching the list. `presets: []` empties it, and then something else has to
  remember what was in it.
- **`showStep`** — whether the step sits between the arrows, to be read and
  pressed. A list of one shows it without handing it over.

### Two panels came out wrong in 1.0.0

**The hour menu of `<tz-datetime-field>` was blank on every ordinary day.**
Its options are keyed by hour *and* reading — `10|` where a clock face happens
once, `2|+02:00` and `2|+01:00` the morning one happens twice — and the field
named a reading unconditionally, so it asked for `10|+02:00` and matched
nothing.

**`createDateField` drew an unstyled calendar on a page of its own.** Its
panel is on the body and the calendar inside is told not to inject its layout,
which the field was then meant to declare there — and did not. Anywhere a
second widget happened to inject the same sheet it looked right, which is how
it passed every documentation page and every test.

**A field with arrows wrapped as soon as it held a date.** The row wrapped so
a narrow column would not push the forward arrow off the edge; an inline-flex
box is sized on its items' basis rather than their content, so the box came
out at that basis and the arrow dropped to a line of its own — at every width.
It shrinks instead.

Also: the week starts where the locale says it does, and every widget is now
checked alone on an empty page, which is how two of these hid.

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
