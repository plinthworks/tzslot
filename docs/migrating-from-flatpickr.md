# Migrating from flatpickr

Honestly: this is not a drop-in replacement, and anyone who tells you otherwise
has not done it. flatpickr is imperative and attaches to an `<input>`; these are
Angular components. Every screen has to be touched.

What can be avoided is touching the **data**. That is what `valueAs` is for.

## The one setting that matters

flatpickr hands back `Date`. So does every date library written before Temporal,
and so, therefore, do your form controls.

```ts
readonly form = new FormGroup({
  when: new FormControl<Date | null>(null),   // unchanged
});
```

```html
<tz-date-field formControlName="when" valueAs="date" valueTimeZone="Europe/Paris" />
```

The control keeps holding `Date`. Nothing downstream — your services, your
payloads, your validators — needs to know anything changed.

`valueTimeZone` is required rather than guessed when `valueAs` is `'date'`,
because a `Date` is an instant and which day it falls on depends on where you
are standing. 2026-01-01T00:30Z is New Year's Day in Paris and New Year's Eve in
New York. Defaulting that silently is the class of bug this library exists to
prevent.

`valueAs="iso"` gives `'2026-06-15'` strings instead, if that is what your API
speaks.

## Option by option

| flatpickr | here |
|---|---|
| `minDate` / `maxDate` | `[min]` / `[max]` |
| `disable` | `[isDateDisabled]` |
| `inline: true` | `<tz-calendar>` instead of `<tz-date-field>` |
| `mode: "range"` | `<tz-date-range>` |
| `enableTime` | `<tz-datetime-range>`, or `<tz-time-slots>` for one day |
| `defaultDate` | the control's initial value |
| `locale` | `[locale]` — a BCP-47 tag, not a bundled locale file |
| `onChange` | `(valueChange)`, or the control's `valueChanges` |
| `position` | `mode="popup"` / `mode="dialog"` |
| `hourIncrement` / `minuteIncrement` | `[stepMinutes]` |
| `minTime` / `maxTime` | `[minTime]` / `[maxTime]` |
| `monthSelectorType` | the title is always a button: days → months → years |

## What has no equivalent yet

- `mode: "multiple"` — non-contiguous dates
- `weekNumbers`
- `showMonths` — several months side by side
- `onDayCreate` — painting individual cells
- `dateFormat` with flatpickr's token language. Use `[displayWith]` for a custom
  string, or `[locale]` and let `Intl` decide.
- `allowInput` — typing a date. Deliberate: parsing what someone types is a
  separate problem, and 03/04 is two different days depending on the reader.

## What you gain, which is the reason to do this at all

flatpickr is built on `Date` and has no concept of an IANA zone. It will let
someone book 02:30 on a morning when 02:30 does not happen, and on one when it
happens twice — and store whichever of the two the browser guessed. Its last
release was April 2022.

Here, the first is struck through and unselectable, the second appears twice
with its two offsets, and an interval that crosses a change reports what it
really lasts.
