# Without a framework

Every widget is a function. Call it with an element and some options, and it
returns an instance.

```js
import { createCalendar } from '@tzslot/dom';
import '@tzslot/theme';

const calendar = createCalendar(document.querySelector('#day'), {
  locale: 'en-GB',
  onChange: (day) => console.log(day?.toString()),
});
```

<Live widget="Calendar" :options="{ locale: 'en-GB' }" />

## The instance

| | |
|---|---|
| `update(settings)` | Change any option. Never calls `onChange`: it is the outside telling the widget something, not the user doing it. |
| `clear()` | Empty the selection — and report it, because that is something the user asked for. |
| `destroy()` | Remove everything it drew and every listener it added. |
| `value` | What it holds, read at any time. |

Fields add `open()`, `close()` and `toggle()`; the calendar adds `goTo()` and
`setIcons()`.

```js
calendar.update({ min: Temporal.Now.plainDateISO() });
calendar.goTo({ year: 2027, month: 3 });
calendar.destroy();
```

## Styles

The layout comes with the widget: it injects one stylesheet per kind, once per
document, the first time one is drawn. Under a Content-Security-Policy that
forbids inline styles, pass `injectStyles: false` and include the exported
strings yourself.

```js
import { CALENDAR_CSS, FIELD_CSS } from '@tzslot/dom';
```

Colour is separate, and optional: see [Theming](./theming).

## Shadow DOM

A widget inside a shadow root puts its styles in that root rather than the
document, so it is styled wherever it is mounted.
