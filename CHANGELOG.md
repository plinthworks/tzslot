# Changelog

## 1.2.0

**An open panel kept the old language in its accessible name.** It is labelled
when it opens and lives on the body, so a change of words while it was open
left a `role="dialog"` announcing itself in the language before — the trigger
was repainted on every change, the panel was not. The same staleness applied
to `title` and `ariaLabel`, which have been settings all along. Found by a
review of the `messages` input below, which is what made it reachable at all.

**`<tz-time-select>` and `<tz-time-input>`.** The two time controls were the
only widgets without an Angular wrapper, so a form choosing an hour fell back
to a list built by hand — walking a day hour by hour and guessing the
transitions, which is where the two mornings a year go wrong. Both are
`ControlValueAccessor`s holding a `PlainTime`; given `date` and `timeZone` the
menus show the day as the zone really has it, and `offsetChange` says which
reading of a repeated hour was taken.


**`messages` is an input on every Angular component.** It arrived only through
injection, which Angular reads once, so a screen with a language switch saw its
month names change and the widget's own words stay put — `locale` was an input
and `messages` was not, the one asymmetry left in the wrappers. The provider is
still the right place for an application that speaks one language, and is what
the input falls back to; written on a tag it wins.

```html
<tz-range-field [messages]="words()" [locale]="lang()" />
```

Found by someone asking whether their language switch would work. It did, for
half of what is on screen.

### Four things a review found in the two new controls

- **A reading that no longer applied blanked the hour menu.** `offset` means
  something only on the morning an hour happens twice, and nothing ever dropped
  it: move the bound `date` to the next day, or let the form write an ordinary
  time, and the menu asked for an option keyed `9|+01:00` among options keyed
  `9|`. Nothing matched, so the menu showed empty while the control still held
  a value. An offset the day does not offer is now ignored, and a value written
  by the form arrives without a reading.
- **`[(offset)]` only worked by coincidence.** `offset` is a `model`, which
  already owns an output called `offsetChange`; an output of the same name was
  declared beside it, won the binding, and left the model's own emitter dead.
  Every write to `offset` other than the one that happened to emit alongside it
  went unannounced. The duplicate is gone — `(offsetChange)` binds exactly as
  the documentation shows.
- **`hour12` was on both API pages and on neither wrapper.** A twelve-hour
  field could not be asked for from a template: `Can't bind to 'hour12'`. Both
  wrappers take it now.
- **Neither control was ever marked touched by a blur.** `onTouched` fired only
  on a change, so `touched && invalid` never showed a required message to the
  reader who focused the field and walked away. Leaving either one now counts
  as having answered it.

### The two time controls, measured

- **An ambiguous hour handed in without a reading showed an empty menu.** On
  the morning the clocks go back the only entries for 02 are keyed by their two
  offsets, so a value arriving as plain `02:30` asked for a key the day does
  not have and the menu selected nothing — while the minutes beside it read
  `30`. One of the documentation's own examples was showing it. The earlier of
  the two readings stands in now.
- **The hour menu changed width with the day.** A `<select>` is as wide as its
  widest option, so the same widget measured 35.8px on an ordinary day and
  42.8px on the morning an hour repeats, where the entry reads `02*` — and the
  minute menu beside it never moved. Every menu now has a floor,
  `--tz-time-menu-width`, sized so the star fits inside it.
- **A menu and a compact field were not the same height** — 37.2px against
  38px, from two vertical paddings written a fortieth of a rem apart. They
  share one now, `--tz-time-pad-y`, which is also the single lever for making
  both taller. `--tz-time-arrow-size` sizes the arrow glyphs.

### Breaking

**`shiftDayRange` took a step it could not apply and said nothing.** Asked to
move two dates by fifteen minutes it returned the same two dates, because
`PlainDate.add` truncates rather than refusing. Its step narrowed from
`ShiftStep` — `number | DurationLike` — to a new `DayStep`: years, months,
weeks, days. A number no longer type-checks, and a duration carrying a time
part throws a `RangeError` where 1.1.0 silently returned the range unchanged.
Nothing inside the library passed one; a caller of its own that did was
getting no movement.

## 1.1.0

### Eight things a review found before this went out

Three were introduced the same day, two of them in examples shown as working.

- **A step with a date part and a time part lost the time part.** `{ days: 1,
  minutes: 30 }` moved exactly a day, ten presses running, because days move
  through `PlainDate` and `PlainDate.add` truncates without a word. Worse, the
  total crosses 24 hours on the morning the clocks go forward, so the same
  setting behaved one way on 29 March and another on every other day. Both
  parts are applied now.
- **`shift: true` on a day-only field stepped by an hour** and turned
  `22/09/2026` into `22/09/2026 01:00 – 23/09/2026 01:00`, over controls that
  cannot show or change an hour. It follows the hours on screen instead.
- **`display: contents`, added so the second field could be hidden, dissolved
  the box that stacks each label over its input.** From and To sat beside
  their fields rather than above them, in every browser. The `[hidden]` rules
  were all that was needed.
- **The panel's intent to arm the end outlived its subject.** It survived
  `clear()` and a value handed in from outside, so a click landed on the end
  of a period it was never about.
- **One click in `singleDay` reported twice**, the first with `end: null` — a
  half-open period from a field that is not open-ended. It builds both ends
  and reports once.
- **`singleDay` with `defaultTimes` was not a whole day**: office hours won
  over the day, giving nine hours from a control that says it gives one day.
- **`singleDay` turned on over a period open at the start** hid the only field
  holding the value. The day is kept either way.
- Dead code from the two removals: the `'auto'`-era `subDay` guard, and
  `RangePreset.step`, which stayed public and documented while nothing read it.

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
