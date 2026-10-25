# React

Twelve components over `@tzslot/dom`, for React 18 and 19. Hooks, no context,
no design system, and nothing to wrap your tree in.

## Setting up

```bash
npm i @tzslot/react @tzslot/theme
```

```ts
// wherever your application imports its stylesheets
import '@tzslot/theme/tzslot.css';
```

```tsx
import { useState } from 'react';
import { Calendar, TimeSlots } from '@tzslot/react';
import type { Instant, PlainDate } from '@tzslot/core';

export function Booking() {
  const [day, setDay] = useState<PlainDate | null>(null);
  const [moment, setMoment] = useState<Instant | null>(null);

  return (
    <>
      <Calendar value={day} onChange={setDay} buttons={['today', 'clear']} />
      {day && (
        <TimeSlots date={day} timeZone="Europe/Paris" value={moment} onChange={setMoment} />
      )}
    </>
  );
}
```

## The components

| | Chooses |
|---|---|
| `<Calendar>` | a day |
| `<MultiDate>` | several days, not necessarily adjacent |
| `<DateRange>` | two days on a grid |
| `<DateField>` | a day, in a field that opens a calendar |
| `<DateTimeField>` | a moment: a day and a time on a zone |
| `<RangeField>` | a period, in a field that opens a calendar |
| `<DateTimeRange>` | two moments, with an all-day switch of their own |
| `<DailyRange>` | the same hours on every day of a span |
| `<TimeSlots>` | the day's times as a list |
| `<DateInput>` | a day typed into a box, with no panel |
| `<TimeInput>` | a time typed into a compact box |
| `<TimeSelect>` | a time in two menus, hour and minute |

Every prop is the setting the dom package documents, under the same name.
`showTime`, `months`, `timeLayout`, `minuteStep`, `presets` — what the
[period guide](./period) says about one of them is true here. There is no
second vocabulary, because a second vocabulary is a second place for the two
to drift apart.

## Controlled, or not

Pass `value` and the component is controlled, as React means it:

```tsx
const [period, setPeriod] = useState<RangeFieldValue>({ start: null, end: null });

<RangeField timeZone="Europe/Paris" value={period} onChange={setPeriod} />
```

Leave it out and the field keeps its own, reporting through `onChange` as it
goes:

<!-- not-compiled: continues the page, with the reader's own values -->
```tsx
<RangeField timeZone="Europe/Paris" onChange={(period) => search(period)} />
```

There is no `defaultValue` and nothing to turn on. A prop that was not given
is not passed down, so the widget's own default stands — which is what
uncontrolled means.

## Driving it from your own buttons

The component forwards a ref to the widget itself, with the methods the dom
package documents:

```tsx
import { useRef } from 'react';
import { RangeField } from '@tzslot/react';
import type { RangeFieldInstance } from '@tzslot/dom';

export function Filters() {
  const field = useRef<RangeFieldInstance>(null);
  return (
    <>
      <RangeField ref={field} timeZone="Europe/Paris" />
      <button onClick={() => field.current?.open()}>Pick dates</button>
      <button onClick={() => field.current?.clear()}>Reset</button>
    </>
  );
}
```

## What you do not have to think about

**A new callback every render.** `onChange={(v) => setValue(v)}` is a new
function each time, which is every React codebase. It does not reach the
widget as a changed setting, so a panel someone has open is not rebuilt under
them.

**StrictMode.** React mounts, unmounts and remounts every component in
development, to find effects that leak. The widget is destroyed and rebuilt
cleanly, and you get one field rather than two.

**The value coming back round.** The widget reports a change, your state
updates, the new value is pushed back down. That settles rather than loops.

**Server rendering.** The components render an empty element on the server and
build the widget after mount, so nothing touches `document` during the render.

## A form library

There is no adapter, and none is needed: a component that takes `value` and
`onChange` is what every form library expects.

<!-- not-compiled: react-hook-form, which this library does not depend on -->
```tsx
<Controller
  name="period"
  control={control}
  render={({ field }) => (
    <RangeField timeZone="Europe/Paris" value={field.value} onChange={field.onChange} />
  )}
/>
```

Validation belongs to the form, not to the field. The value is two instants —
what makes a period acceptable is a question about your screen, and the
[period guide](./period#how-long-it-may-be) covers the limits the widget can
enforce itself.

## Words

The catalogue is a prop, like everything else:

```tsx
import { FR } from '@tzslot/dom';

<RangeField timeZone="Europe/Paris" locale="fr-FR" messages={FR} />
```

`locale` and `messages` are two settings on purpose: one decides what `Intl`
writes — the month names, the order of a date, the figures — and the other
decides the words the library says itself. For Arabic they come apart in ways
they never do for French, which the
[localization guide](./localization#arabic-and-reading-right-to-left)
explains.
