# React

Douze composants au-dessus de `@tzslot/dom`, pour React 18 et 19. Des hooks,
pas de contexte, pas de système de design, et rien à envelopper autour de
votre arbre.

## Mise en place

```bash
npm i @tzslot/react @tzslot/theme
```

```ts
// là où votre application importe ses feuilles de style
import '@tzslot/theme/tzslot.css';
```

```tsx
import { useState } from 'react';
import { Calendar, TimeSlots } from '@tzslot/react';
import type { Instant, PlainDate } from '@tzslot/core';

export function Reservation() {
  const [jour, setJour] = useState<PlainDate | null>(null);
  const [moment, setMoment] = useState<Instant | null>(null);

  return (
    <>
      <Calendar value={jour} onChange={setJour} buttons={['today', 'clear']} />
      {jour && (
        <TimeSlots date={jour} timeZone="Europe/Paris" value={moment} onChange={setMoment} />
      )}
    </>
  );
}
```

## Les composants

| | Choisit |
|---|---|
| `<Calendar>` | un jour |
| `<MultiDate>` | plusieurs jours, pas forcément voisins |
| `<DateRange>` | deux jours sur une grille |
| `<DateField>` | un jour, dans un champ qui ouvre un calendrier |
| `<DateTimeField>` | un moment : un jour et une heure sur un fuseau |
| `<RangeField>` | une période, dans un champ qui ouvre un calendrier |
| `<DateTimeRange>` | deux moments, avec leur propre interrupteur « toute la journée » |
| `<DailyRange>` | les mêmes horaires sur chaque jour d'une plage |
| `<TimeSlots>` | les heures de la journée en liste |
| `<DateInput>` | un jour tapé dans une boîte, sans panneau |
| `<TimeInput>` | une heure tapée dans une boîte compacte |
| `<TimeSelect>` | une heure dans deux menus, heure et minute |

Chaque prop est le réglage que documente le paquet dom, sous le même nom.
`showTime`, `months`, `timeLayout`, `minuteStep`, `presets` — ce que le
[guide de la période](./period) dit de l'un d'eux vaut ici. Il n'y a pas de
second vocabulaire, parce qu'un second vocabulaire est un second endroit où
les deux peuvent diverger.

## Contrôlé, ou non

Passez `value` et le composant est contrôlé, au sens de React :

```tsx
const [periode, setPeriode] = useState<RangeFieldValue>({ start: null, end: null });

<RangeField timeZone="Europe/Paris" value={periode} onChange={setPeriode} />
```

Omettez-le et le champ garde la sienne, en rapportant par `onChange` au fur et
à mesure :

<!-- not-compiled: continue la page, avec les valeurs du lecteur -->
```tsx
<RangeField timeZone="Europe/Paris" onChange={(periode) => rechercher(periode)} />
```

Il n'y a pas de `defaultValue` et rien à activer. Une prop qui n'a pas été
donnée n'est pas transmise, donc le défaut du widget tient — c'est exactement
ce que veut dire « non contrôlé ».

## Le piloter depuis vos propres boutons

Le composant transmet une référence vers le widget lui-même, avec les méthodes
que documente le paquet dom :

```tsx
import { useRef } from 'react';
import { RangeField } from '@tzslot/react';
import type { RangeFieldInstance } from '@tzslot/dom';

export function Filtres() {
  const champ = useRef<RangeFieldInstance>(null);
  return (
    <>
      <RangeField ref={champ} timeZone="Europe/Paris" />
      <button onClick={() => champ.current?.open()}>Choisir les dates</button>
      <button onClick={() => champ.current?.clear()}>Réinitialiser</button>
    </>
  );
}
```

## Ce à quoi vous n'avez pas à penser

**Une fonction neuve à chaque rendu.** `onChange={(v) => setValue(v)}` crée une
nouvelle fonction à chaque fois, ce qui est le cas de toute application React.
Elle n'atteint pas le widget comme un réglage modifié, donc un panneau que
quelqu'un a ouvert n'est pas reconstruit sous ses doigts.

**Le mode strict.** React monte, démonte et remonte chaque composant en
développement, pour trouver les effets qui fuient. Le widget est détruit et
reconstruit proprement : vous obtenez un champ, pas deux.

**La valeur qui revient.** Le widget rapporte un changement, votre état se met
à jour, la nouvelle valeur redescend. Cela se stabilise au lieu de boucler.

**Le rendu serveur.** Les composants rendent un élément vide côté serveur et
construisent le widget après le montage : rien ne touche à `document` pendant
le rendu.

## Une bibliothèque de formulaires

Il n'y a pas d'adaptateur, et il n'en faut pas : un composant qui prend `value`
et `onChange` est ce que toute bibliothèque de formulaires attend.

<!-- not-compiled: react-hook-form, dont cette bibliothèque ne dépend pas -->
```tsx
<Controller
  name="periode"
  control={control}
  render={({ field }) => (
    <RangeField timeZone="Europe/Paris" value={field.value} onChange={field.onChange} />
  )}
/>
```

La validation appartient au formulaire, pas au champ. La valeur, ce sont deux
instants — ce qui rend une période acceptable est une question sur votre écran,
et le [guide de la période](./period) couvre les limites que le widget sait
faire respecter lui-même.

## Les mots

Le catalogue est une prop, comme le reste :

```tsx
import { FR } from '@tzslot/dom';

<RangeField timeZone="Europe/Paris" locale="fr-FR" messages={FR} />
```

`locale` et `messages` sont deux réglages à dessein : l'un décide ce
qu'`Intl` écrit — les noms de mois, l'ordre d'une date, les chiffres — et
l'autre décide les mots que la bibliothèque prononce elle-même. Pour l'arabe,
les deux se séparent comme ils ne le font jamais pour le français, ce
qu'explique le [guide de localisation](./localization).
