# Using the components

Four ways, because not every application has reactive forms — and a component
that only works inside a `FormGroup` is one half the people who want it cannot
use.

## 1. A signal, no forms at all

```html
<tz-calendar [(value)]="day" />
```

```ts
readonly day = signal<PlainDate | null>(null);
```

`value` is a `model()`, so this is a real two-way binding: setting the signal
moves the calendar, clicking a day sets the signal.

## 2. One way in, an event out

```html
<tz-calendar [value]="day" (valueChange)="onDay($event)" />
```

For when the parent owns the state and wants to decide whether to accept a
change.

## 3. Template-driven forms

```html
<tz-calendar [(ngModel)]="day" name="day" />
```

Works because the accessor serves `ngModel` and `formControlName` alike.

## 4. Reactive forms

```html
<form [formGroup]="form">
  <tz-date-field formControlName="when" valueAs="date" valueTimeZone="Europe/Paris" />
</form>
```

`valueAs` lets an existing `FormControl<Date>` keep working — see
[migrating-from-flatpickr.md](./migrating-from-flatpickr.md).

## Driving it from outside

This is the part of flatpickr's imperative API worth keeping: not attaching to
a DOM node, just being able to say "open".

```ts
readonly field = viewChild.required(DateField);
readonly calendar = viewChild.required(Calendar);

openIt()   { this.field().open(); }
closeIt()  { this.field().close(); }
isShowing() { return this.field().isOpen(); }

// Move the grid without choosing anything — flatpickr's setViewDate.
showMarch() { this.calendar().goTo({ year: 2027, month: 3 }); }

clearIt()  { this.calendar().clear(); }
```

`clear()` exists on all five and tells any attached form control, so a reset
button does not leave a control holding a stale value.

## Everything is reactive

Every input is a signal. Changing the time zone, the step, the bounds or the
locale re-renders without anything being told to refresh:

```html
<tz-time-slots [timeZone]="zone()" [stepMinutes]="step()" [minTime]="opens()" />
```

## Creating one programmatically

Nothing special is required — these are ordinary standalone components:

```ts
const ref = createComponent(DateField, { environmentInjector });
ref.setInput('locale', 'fr-FR');
ref.instance.open();
```
