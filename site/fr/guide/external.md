# Piloter depuis l’extérieur

Chaque composant est un objet avec des méthodes. Rien n’a besoin de vivre à
l’intérieur : un bouton ailleurs dans la page, une étape d’assistant, un
raccourci clavier peuvent tous le piloter. C’est ce que flatpickr appelle les
« éléments externes », sans les conventions de balisage.

## Sans framework

```js
const field = createDateTimeField(document.querySelector('#at'), {
  timeZone: 'Europe/Paris',
  locale: 'fr-FR',
});

document.querySelector('#open').onclick = () => field.open();
document.querySelector('#clear').onclick = () => field.clear();
document.querySelector('#tomorrow').onclick = () =>
  field.update({ value: Temporal.Now.instant().add({ hours: 24 }) });
```

Les boutons sous ce champ sont câblés exactement ainsi :

<Live
  widget="DateTimeField"
  :options="{ timeZone: 'Europe/Paris', locale: 'fr-FR' }"
  :controls="[
    { label: 'Ouvrir', run: (f) => f.open() },
    { label: 'Fermer', run: (f) => f.close() },
    { label: 'Effacer', run: (f) => f.clear() },
  ]"
/>

## Ce que chaque composant offre

| | |
|---|---|
| tous | `value`, `update(settings)`, `clear()`, `destroy()` |
| les champs | `open()`, `close()`, `toggle()`, `isOpen`, `setIcon(node)` |
| le calendrier et la plage | `goTo({ year, month })`, `setIcons({ prev, next })` |
| l’intervalle | `value.allDay`, et `update({ allDay })` pour le poser |

`update()` n’appelle jamais `onChange` : c’est l’extérieur qui informe le
composant, pas l’utilisateur qui agit. `clear()` l’appelle, parce que c’est un
choix.

## En Angular

Les mêmes méthodes, atteintes par `viewChild` :

```ts
@Component({
  imports: [DateTimeField],
  template: `
    <tz-datetime-field #at [(value)]="moment" timeZone="Europe/Paris" />
    <button type="button" (click)="at.open()">Ouvrir</button>
    <button type="button" (click)="at.clear()">Effacer</button>
    <button type="button" (click)="jumpToToday()">Aujourd’hui</button>
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

Une référence de template — `#at` — suffit pour des boutons du même template ;
`viewChild` sert à la classe. Les deux donnent le composant, dont les méthodes
sont celles du widget.

## Y réagir

```html
<tz-datetime-field (valueChange)="save($event)" (opened)="mark()" (closed)="blur()" />
```

Sans framework, les trois mêmes s’appellent `onChange`, `onOpen` et
`onClose`.
