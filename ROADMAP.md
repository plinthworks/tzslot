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

Being extracted from the Angular package, one component at a time, so that
Angular (and later React or Vue) only translates its own idioms.

| | |
|---|---|
| `createCalendar(el, options)` | month grid, month and year views, keyboard, words, icons. `update`, `goTo`, `clear`, `setIcons`, `destroy` |
| `createDateField(el, options)` | a field whose panel opens anchored or centred, on the body, carrying the field's `data-theme` with it. Focus in and back out, Tab kept inside, `onOpen` / `onClose` |

Still Angular-only: the time slots and both ranges.

No Angular CDK any more: the date field was its only user.

### `@tzslot/angular` — five components

| | |
|---|---|
| `<tz-time-slots>` | times on one day; struck through = impossible, dashed = twice, faded = taken |
| `<tz-calendar>` | month grid, keyboard navigation, month and year views |
| `<tz-date-field>` | a field that opens a calendar, anchored or centred |
| `<tz-date-range>` | two dates, refusing to span a closed day |
| `<tz-datetime-range>` | an interval with a time at both ends, and the hour it hides |

All five are `ControlValueAccessor`s, so they go in a `FormGroup`.

### `@tzslot/theme` — optional

One stylesheet setting 76 custom properties. Light and dark, each defined for
both the system preference and an explicit `data-theme`. Skip it and the
components still work, plain.

## Not done

**Next, in this order.**

1. **`onRenderCell`** — an extension point to paint each cell: availability,
   prices, remaining places. Everyone eventually needs it and there is no
   substitute.
2. **Event outputs** — open, close, view change. Only `valueChange` exists, so a
   form cannot react to the panel opening.
3. **Today / clear buttons** — small, expected, absent.
4. **Multiple dates** — non-contiguous selection.

**Deliberately not planned.**

A full clone of flatpickr's surface. Half of its ninety options are locale
strings that `Intl` provides for free, and micro-toggles that CSS handles here.
The advantage is not matching their feature count; it is having the one thing
they do not.

**Known gaps.**

- No React or Vue wrapper. The core is framework-free and usable from either
  today; a wrapper waits until the core has been proven.
- No repository on GitHub, nothing published to npm.
- No build step. Sources are TypeScript and every `package.json` points at
  `src/index.ts`; publishing needs compiled JavaScript plus generated `.d.ts`.
- `tz-date-range` and `tz-datetime-range` do not know about each other, so
  "3rd to 7th, 09:00 to 17:00 each day" has no component.
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
