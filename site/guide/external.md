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
| the interval | `value.allDay`, and `update({ allDay })` to set it |

`update()` never calls `onChange`: it is the outside telling the widget
something, not the user doing it. `clear()` does, because that is a choice.

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
