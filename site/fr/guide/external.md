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
| `createDateTimeRange` | `value.allDay`, et `update({ allDay })` pour le poser |

`update()` n’appelle jamais `onChange` : c’est l’extérieur qui informe le
composant, pas l’utilisateur qui agit. `clear()` l’appelle, parce que c’est un
choix.

### `update(settings)` — n’importe quoi, pendant que ça tourne

Chaque option est un réglage, et chaque réglage peut changer après la création
du composant. Rien n’est reconstruit et rien n’est perdu : la valeur choisie par
le lecteur survit à un changement de locale, de disposition, de fuseau.

```js
field.update({ locale: 'ja-JP' });
field.update({ timeLayout: 'select' });
field.update({ timeZone: 'Asia/Tokyo' });   // le même instant, lu ailleurs
```

<Live
  widget="DateTimeField"
  :options="{ timeZone: 'Europe/Paris', value: Temporal.Instant.from('2026-09-20T07:15Z') }"
  :controls="[
    { label: 'fr-FR', run: (f) => f.update({ locale: 'fr-FR' }) },
    { label: 'en-US', run: (f) => f.update({ locale: 'en-US' }) },
    { label: 'ja-JP', run: (f) => f.update({ locale: 'ja-JP' }) },
    { label: 'Tokyo', run: (f) => f.update({ timeZone: 'Asia/Tokyo' }) },
    { label: 'Paris', run: (f) => f.update({ timeZone: 'Europe/Paris' }) },
  ]"
/>

Les deux derniers boutons résument toute la librairie en un geste : la valeur
sous le champ ne change pas, et le texte change. Un moment lu depuis ailleurs
est un autre cadran, pas un autre moment.

### `value` et `update({ value })`

Lire, c’est une propriété ; écrire, c’est un réglage comme un autre. Écrire ne
déclenche pas `onChange` : la ligne sous celui-ci ne bouge donc que si on presse
**Effacer** — ça, c’est un choix, et un choix est rapporté.

<Live
  widget="DateTimeField"
  :options="{ timeZone: 'Europe/Paris' }"
  :controls="[
    { label: 'Maintenant', run: (f) => f.update({ value: Temporal.Now.instant() }) },
    { label: 'Dans une heure', run: (f) => f.update({ value: Temporal.Now.instant().add({ hours: 1 }) }) },
    { label: 'Effacer', run: (f) => f.clear() },
    { label: 'L’afficher', run: (f) => console.log(f.value) },
  ]"
/>

### `goTo({ year, month })` — sur un calendrier

Déplacer ce qui est montré, sans toucher à ce qui est choisi. Une étape
d’assistant qui dit « choisissez un jour en décembre » ouvre décembre.

```js
calendar.goTo({ year: 2026, month: 12 });
```

<Live
  widget="Calendar"
  :options="{ timeZone: 'Europe/Paris', months: 1 }"
  :controls="[
    { label: 'Décembre', run: (c) => c.goTo({ year: 2026, month: 12 }) },
    { label: 'Mars 2027', run: (c) => c.goTo({ year: 2027, month: 3 }) },
    { label: 'Revenir', run: (c) => c.goTo({ year: 2026, month: 9 }) },
  ]"
/>

### `setIcon` et `setIcons`

La marque du champ, et les deux flèches du calendrier, remplacées pendant que
ça tourne.

```js
field.setIcon(icon('clock'));
calendar.setIcons({ prev: icon('chevronLeft'), next: icon('chevronRight') });
```

<Live
  widget="DateField"
  :options="{ timeZone: 'Europe/Paris' }"
  :controls="[
    { label: 'Une horloge', run: (f) => f.setIcon(icon('clock')) },
    { label: 'Un calendrier', run: (f) => f.setIcon(icon('calendar')) },
    { label: 'Un mot', run: (f) => f.setIcon('quand ?') },
  ]"
/>

### `open`, `close`, `toggle`, `isOpen`

<Live
  widget="RangeField"
  :options="{ timeZone: 'Europe/Paris', months: 2 }"
  :controls="[
    { label: 'Basculer', run: (f) => f.toggle() },
    { label: 'Ouvrir', run: (f) => f.open() },
    { label: 'Fermer', run: (f) => f.close() },
    { label: 'Ouvert ?', run: (f) => alert(f.isOpen ? 'ouvert' : 'fermé') },
  ]"
/>

### `destroy()`

Retire le composant de la page et décroche chaque écouteur qu’il avait posé.
Une application monopage qui l’oublie fuit un écouteur par écran.

<Live
  widget="Calendar"
  :options="{ timeZone: 'Europe/Paris', months: 1 }"
  :controls="[{ label: 'Le détruire', run: (c) => c.destroy() }]"
/>

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
