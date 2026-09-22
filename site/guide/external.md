# Driving it from outside

Every widget is an object with methods. Nothing has to live inside it: a
button elsewhere on the page, a wizard step, a keyboard shortcut can all drive
it. This is flatpickr's "external elements", without the markup conventions.

## Without a framework

```js
const field = createDateTimeField(document.querySelector('#at'), {
  timeZone: 'Europe/Paris',
  locale: 'en-GB',
});

document.querySelector('#open').onclick = () => field.open();
document.querySelector('#clear').onclick = () => field.clear();
document.querySelector('#tomorrow').onclick = () =>
  field.update({ value: Temporal.Now.instant().add({ hours: 24 }) });
```

The buttons under this field are wired exactly like that:

<Live
  widget="DateTimeField"
  :options="{ timeZone: 'Europe/Paris', locale: 'en-GB' }"
  :controls="[
    { label: 'Open', run: (f) => f.open() },
    { label: 'Close', run: (f) => f.close() },
    { label: 'Clear', run: (f) => f.clear() },
  ]"
/>

## What each widget offers

| | |
|---|---|
| all of them | `value`, `update(settings)`, `clear()`, `destroy()` |
| the fields | `open()`, `close()`, `toggle()`, `isOpen`, `setIcon(node)` |
| the calendar and the range | `goTo({ year, month })`, `setIcons({ prev, next })` |
| `createDateTimeRange` | `value.allDay`, and `update({ allDay })` to set it |

`update()` never calls `onChange`: it is the outside telling the widget
something, not the user doing it. `clear()` does, because that is a choice.

### `update(settings)` — anything, while it runs

Every option is a setting, and every setting can be changed after the widget
exists. There is no rebuild and nothing is lost: the value the reader chose
survives a change of locale, of layout, of zone.

```js
field.update({ locale: 'ja-JP' });
field.update({ timeLayout: 'select' });
field.update({ timeZone: 'Asia/Tokyo' });   // the same instant, read elsewhere
```

<Live
  widget="DateTimeField"
  :options="{ timeZone: 'Europe/Paris', value: Temporal.Instant.from('2026-09-20T07:15Z') }"
  :controls="[
    { label: 'en-GB', run: (f) => f.update({ locale: 'en-GB' }) },
    { label: 'en-US', run: (f) => f.update({ locale: 'en-US' }) },
    { label: 'ja-JP', run: (f) => f.update({ locale: 'ja-JP' }) },
    { label: 'Tokyo', run: (f) => f.update({ timeZone: 'Asia/Tokyo' }) },
    { label: 'Paris', run: (f) => f.update({ timeZone: 'Europe/Paris' }) },
  ]"
/>

The last two buttons are the whole point of the library in one gesture: the
value under the field never changes, and the text does. A moment read from
somewhere else is a different clock face, not a different moment.

### `value` and `update({ value })`

Reading is a property; writing is a setting like any other. Writing does not
fire `onChange`, so the line under this one only moves when **Clear** is
pressed — that is a choice, and a choice is reported.

<Live
  widget="DateTimeField"
  :options="{ timeZone: 'Europe/Paris' }"
  :controls="[
    { label: 'Now', run: (f) => f.update({ value: Temporal.Now.instant() }) },
    { label: 'In an hour', run: (f) => f.update({ value: Temporal.Now.instant().add({ hours: 1 }) }) },
    { label: 'Clear', run: (f) => f.clear() },
    { label: 'Log it', run: (f) => console.log(f.value) },
  ]"
/>

### `goTo({ year, month })` — on a calendar

Moving what is shown, without touching what is chosen. A wizard step that says
"pick a day in December" opens December.

```js
calendar.goTo({ year: 2026, month: 12 });
```

<Live
  widget="Calendar"
  :options="{ timeZone: 'Europe/Paris', months: 1 }"
  :controls="[
    { label: 'December', run: (c) => c.goTo({ year: 2026, month: 12 }) },
    { label: 'March 2027', run: (c) => c.goTo({ year: 2027, month: 3 }) },
    { label: 'Back to now', run: (c) => c.goTo({ year: 2026, month: 9 }) },
  ]"
/>

### `setIcon` and `setIcons`

The field's own mark, and the calendar's two arrows, replaced while it runs.

```js
field.setIcon(icon('clock'));
calendar.setIcons({ prev: icon('chevronLeft'), next: icon('chevronRight') });
```

<Live
  widget="DateField"
  :options="{ timeZone: 'Europe/Paris' }"
  :controls="[
    { label: 'A clock', run: (f) => f.setIcon(icon('clock')) },
    { label: 'A calendar', run: (f) => f.setIcon(icon('calendar')) },
    { label: 'A word', run: (f) => f.setIcon('when?') },
  ]"
/>

### `open`, `close`, `toggle`, `isOpen`

<Live
  widget="RangeField"
  :options="{ timeZone: 'Europe/Paris', months: 2 }"
  :controls="[
    { label: 'Toggle', run: (f) => f.toggle() },
    { label: 'Open', run: (f) => f.open() },
    { label: 'Close', run: (f) => f.close() },
    { label: 'Is it open?', run: (f) => alert(f.isOpen ? 'open' : 'closed') },
  ]"
/>

### `destroy()`

Takes the widget off the page and unhooks every listener it added. A
single-page application that forgets it leaks a listener per screen.

<Live
  widget="Calendar"
  :options="{ timeZone: 'Europe/Paris', months: 1 }"
  :controls="[{ label: 'Destroy it', run: (c) => c.destroy() }]"
/>

## In Angular

The same methods, reached with `viewChild`:

```ts
@Component({
  imports: [DateTimeField],
  template: `
    <tz-datetime-field #at [(value)]="moment" timeZone="Europe/Paris" />
    <button type="button" (click)="at.open()">Open</button>
    <button type="button" (click)="at.clear()">Clear</button>
    <button type="button" (click)="jumpToToday()">Today</button>
  `,
})
export class Booking {
  readonly moment = signal<Instant | null>(null);
  private readonly field = viewChild.required(DateTimeField);

  jumpToToday() {
    this.field().open();
    this.moment.set(Temporal.Now.instant());
  }
}
```

A template reference — `#at` — is enough for buttons in the same template;
`viewChild` is for the class. Both give the component, whose methods are the
widget's.

## Reacting to it

```html
<tz-datetime-field (valueChange)="save($event)" (opened)="mark()" (closed)="blur()" />
```

Without a framework the same three are `onChange`, `onOpen` and `onClose`.
