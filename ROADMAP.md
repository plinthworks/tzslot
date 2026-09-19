# Where tzslot is

Updated 18 September 2026. 15 commits, 137 tests, 1 992 lines of source and
1 866 of tests.

## Done

### `@tzslot/core` — no DOM, no framework

| | |
|---|---|
| `getDaySlots` | every selectable time on a day in a zone, flagging the hour that does not exist and the one that happens twice |
| `getRangeInfo` | what an interval really lasts, against what the clock faces suggest |
| `formatDuration` | `7h 30m` |
| `getMonthGrid` | six weeks, always |
| `getDecadeYears` | twelve years for a decade view |
| `getWeekdayOrder` | weekday order for a chosen first day |

Measured: 0.40 ms for a day of half-hour slots, 650 bytes a slot, nothing
retained across five thousand discarded calls.

### `@tzslot/dom` — the widgets, no framework

Everything a user sees and touches: markup, keyboard, focus, panels, words.
Usable from a `<script>` tag; each returns an instance with `update`,
`clear` and `destroy`, and reports through `onChange`.

| | |
|---|---|
| `createCalendar` | month grid, month and year views, keyboard, `goTo`, `setIcons`; `renderCell` for a note, a class or a veto per day; optional Today / Clear buttons |
| `createDateField` | a field whose panel opens anchored or centred, on the body, carrying the field's `data-theme`; `open` / `close`, `onOpen` / `onClose` |
| `createTimeSlots` | times on one day; `getSlotChoices` gives the rows without drawing them |
| `createDateRange` | two dates, previewing the span under the pointer, refusing a closed day; `renderCell` too |
| `createDateTimeRange` | an interval with a time at both ends, and the hour it hides |
| `createMultiDate` | several days, not necessarily adjacent: the calendar's grid with a click that toggles, always in date order, `maxDates` |
| `createDailyRange` | a range of days with the same hours on each, overnight allowed; the real total and the days that differ, with the reason. `getDailyWindows` in the core does the arithmetic |

Layout CSS is injected once, first in the head, as plain class selectors: a
page's element resets cannot reach it, and any class rule loaded after it
wins. `injectStyles: false` plus the exported `*_CSS` strings for a strict
Content-Security-Policy.

### `@tzslot/angular` — five wrappers

| | |
|---|---|
| `<tz-time-slots>` | times on one day; struck through = impossible, dashed = twice, faded = taken |
| `<tz-calendar>` | month grid, keyboard navigation, month and year views |
| `<tz-date-field>` | a field that opens a calendar, anchored or centred |
| `<tz-date-range>` | two dates, refusing to span a closed day |
| `<tz-datetime-range>` | an interval with a time at both ends, and the hour it hides |

Each maps inputs and models to `update()` and callbacks to outputs. All five
are `ControlValueAccessor`s, so they go in a `FormGroup`. No Angular CDK.

### `@tzslot/theme` — optional

One stylesheet setting 76 custom properties. Light and dark, each defined for
both the system preference and an explicit `data-theme`. Skip it and the
components still work, plain.

## Not done

**Next, in this order.**

1. **Publishing** — the build is done: `npm run build` puts each package in its
   own `dist/`, and a real Angular 21 app compiles against the packed
   tarballs. Left: the licence, the polyfill question below, a first version
   number, and the `tzslot` organisation on npmjs.com. Then, per package:
   `npm publish packages/<name>/dist --access public`.
2. **The polyfill** — a static import, so every bundle carries its 19 kB
   gzipped, even where Temporal is native. Keep it, make it the user's to
   load, or load it on demand.

**Deliberately not planned.**

A full clone of flatpickr's surface. Half of its ninety options are locale
strings that `Intl` provides for free, and micro-toggles that CSS handles here.
The advantage is not matching their feature count; it is having the one thing
they do not.

**Known gaps.**

- No React or Vue wrapper. The core is framework-free and usable from either
  today; a wrapper waits until the core has been proven.
- Nothing published to npm yet. The repository is github.com/plinthworks/tzslot.
- Tests run in jsdom. They cover behaviour and the DOM, never layout — a
  screenshot found five components whose layout CSS had never applied while all
  122 tests were green.

## How to look at it

```bash
npm start     # http://localhost:4500/playground/index.html
npm test      # 137 tests
```

Three tabs. **Interval** opens on the night the clocks go back: 23:00 to 05:00,
reported as seven hours with the sentence explaining why. **Times** has the
presets that break other pickers, including Lord Howe's half-hour shift.
**Dates** has the calendar, both field modes, and the range that refuses to step
over a weekend — and it is where the month and year views are: click the title.
