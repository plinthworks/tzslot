# Angular

Des composants standalone posés sur `@tzslot/dom`, pour Angular 18 à 22.
Signaux, formulaires, zoneless ou non, aucun design system et aucun CDK.

## Mise en place

```jsonc
// angular.json → architect.build.options
"styles": ["@tzslot/theme/tzslot.css", "src/styles.css"]
```

Angular exige un chemin qui finit par `.css` ; `"@tzslot/theme"` seul est
refusé.

```ts
import { Component, signal } from '@angular/core';
import { Calendar, TimeSlotPicker } from '@tzslot/angular';
import type { Instant, PlainDate } from '@tzslot/core';

@Component({
  selector: 'app-booking',
  imports: [Calendar, TimeSlotPicker],
  template: `
    <tz-calendar [(value)]="day" [buttons]="['today', 'clear']" />
    @if (day(); as chosen) {
      <tz-time-slots [date]="chosen" timeZone="Europe/Paris" [(value)]="moment" />
    }
  `,
})
export class Booking {
  readonly day = signal<PlainDate | null>(null);
  readonly moment = signal<Instant | null>(null);
}
```

Avec des NgModules, mettez les mêmes composants dans les `imports` du module :
ils sont standalone.

## Les composants

| | Choisit |
|---|---|
| `<tz-calendar>` | un jour |
| `<tz-multi-date>` | plusieurs jours, pas forcément consécutifs |
| `<tz-date-field>` | un jour, depuis un champ qui ouvre un panneau |
| `<tz-datetime-field>` | un moment : un calendrier et une heure dans un panneau |
| `<tz-date-range>` | deux jours |
| `<tz-time-slots>` | un moment parmi les créneaux du jour |
| `<tz-datetime-range>` | un intervalle : deux champs date-et-heure |
| `<tz-daily-range>` | une plage de jours avec les mêmes horaires chaque jour |
| `<tz-range-field>` | une période, en un champ — [sa propre page](./period) |

## Partir d’une valeur

Un écran qui modifie quelque chose a sa valeur avant que le composant
n’existe. Liez-la : elle est à l’écran au premier rendu, sans clic ni tick.

```ts
readonly day = signal(Temporal.PlainDate.from('2026-09-23'));
readonly at  = signal(Temporal.Instant.from('2026-09-23T12:30:00Z'));
```

```html
<tz-calendar [(value)]="day" />
<tz-datetime-field [(value)]="at" timeZone="Europe/Paris" />
```

Idem pour un `FormControl` construit avec une valeur — y compris un `Date`,
sous `valueAs="date"`. Le composant l’affiche et laisse le contrôle
`pristine` : afficher une valeur n’est pas l’utilisateur qui en saisit une.

```ts
form = new FormGroup({
  day: new FormControl<Date | null>(new Date('2026-09-23T10:00:00Z')),
});
```

Écrire dans le signal ou appeler `setValue` plus tard déplace le composant
aussi, et `null` le vide. Pour ne déplacer que le mois affiché, sans rien
choisir, demandez-le au composant :

```html
<tz-calendar #cal [(value)]="day" />
<button (click)="cal.goTo({ year: 2027, month: 3 })">Mars 2027</button>
```

## Formulaires

Tous sont des `ControlValueAccessor` : `formControlName`, `ngModel` et
`[(value)]` fonctionnent.

```html
<form [formGroup]="form">
  <tz-datetime-field formControlName="at" timeZone="Europe/Paris" />
</form>
```

Le contrôle contient des valeurs Temporal par défaut. `valueAs` change cela
sans toucher à rien d’autre — c’est l’essentiel d’une migration depuis
flatpickr sur la plupart des écrans :

```html
<tz-date-field formControlName="day" valueAs="date" valueTimeZone="Europe/Paris" />
<tz-datetime-field formControlName="at" valueAs="iso" timeZone="Europe/Paris" />
```

| `valueAs` | Le contrôle contient |
|---|---|
| `'temporal'` (défaut) | un `PlainDate` ou un `Instant` |
| `'utc'` | une chaîne, toujours un instant : `2026-09-20T07:30:00Z` — un champ de date seule rend le minuit qui ouvre le jour |
| `'date'` | un `Date` — lu dans `valueTimeZone`, obligatoire et explicite, parce que le jour d’un instant dépend d’où l’on se tient |
| `'iso'` | une chaîne : `2026-09-20`, ou `2026-09-20T07:30:00Z` |

## Régler les conventions une fois

Un fuseau, une locale, la forme dans laquelle les valeurs sortent : ce sont
des décisions qui concernent l’application, pas le champ. `provideTzslot` les
pose pour tous les composants, et ce qui est écrit sur une balise l’emporte
toujours.

```ts
import { provideTzslot, FR } from '@tzslot/angular';

bootstrapApplication(App, {
  providers: [
    provideTzslot({ valueAs: 'utc', timeZone: 'Europe/Paris', locale: 'fr-FR', messages: FR }),
  ],
});
```

Le `timeZone` donné ici est celui que lisent tous les composants : il cesse
donc d’être obligatoire sur la balise. [Ce qu’on récupère](./values) explique
les formes, et pourquoi les journées entières finissent au minuit *suivant*.

## Les mots

Les messages viennent d’un seul endroit, anglais et français fournis :

```ts
import { provideTzslotMessages, FR } from '@tzslot/angular';

providers: [provideTzslotMessages(FR)];
```

## Zoneless

Rien dans ces composants n’a besoin de `zone.js` : ils lisent des signaux et
écrivent dans le DOM. Ils fonctionnent aussi bien avec la détection de
changement classique.
