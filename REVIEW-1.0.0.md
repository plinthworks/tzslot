# Revue critique avant la 1.0.0

Revue sceptique du code, menée le 21 septembre 2026 sur l'arbre de travail.
Chaque point a été **vérifié en exécutant le code**, pas en lisant les
commentaires. Les cinq premiers ont été rejoués une seconde fois,
indépendamment, avant d'être retenus.

État : ☐ à faire · ☑ corrigé, avec le test qui le retient

---

## Niveau 1 — correctness. Les corriger après la 1.0.0 change un comportement observable.

### ☐ 1. Les journées entières sont fausses d'un jour là où minuit est sauté
`packages/dom/src/range-field.ts:404,414` · `packages/dom/src/datetime-range.ts:218,224`

`midnight(day)` rend le *début de journée*, qui vaut **01:00** dans un fuseau
qui avance ses pendules à minuit. Le test `end.toPlainTime() === '00:00'`, qui
décide de retrancher un jour, échoue alors.

Vérifié : à `America/Santiago`, le raccourci « Aujourd'hui » du 5 septembre
2026 affiche `05/09/2026 – 06/09/2026`. La valeur est juste, l'affichage a un
jour de trop, le calendrier éclaire deux cases — et comme `step()` et
`setEdge()` passent par `days()`, la période a réellement grandi. Touche aussi
`America/Havana`.

C'est l'invariant phare de la bibliothèque qui tombe sur la forme de
changement d'heure pour laquelle elle existe.

### ☐ 2. Un pas plus court qu'un jour ne fait rien sur une période en journées entières
`packages/dom/src/range-field.ts:600` · `packages/core/src/shift.ts:50`

`showTime` vaut `false` par défaut, donc la valeur par défaut est en journées
entières, donc `step()` passe par `shiftDayRange`, qui fait
`PlainDate.add(durée)`. `PlainDate.add({hours:1})` **ne lève pas** : il ajoute
zéro jour.

Vérifié : `shift: '15mn'` dessine des flèches actives qui ne déplacent rien.
Les formes courtes documentées sont des boutons morts dans la configuration
par défaut.

### ☐ 3. Le champ période émet des plages à l'envers, sans message
`packages/dom/src/range-field.ts:654-682`

`setEdge` écrit une borne sans jamais la comparer à l'autre, et le clic dans
le calendrier court-circuite la logique d'échange de `createDateRange`.

Vérifié : valeur 10 → 20 septembre, armer « Du », cliquer le 25 → la valeur
émise est `start > end` et le champ affiche `25/09/2026 – 19/09/2026`. La
requête `>= :from AND < :to` du consommateur ne renvoie plus rien, en silence.
`messages.endBeforeStart` existe et n'est jamais utilisé ici.

### ☐ 4. `<tz-datetime-range>` viole le contrat ControlValueAccessor
`packages/angular/src/datetime-range.ts:177` → `packages/dom/src/datetime-range.ts:407-411`

`writeValue` déclenche `onChange`, parce qu'une valeur écrite sans le drapeau
optionnel `allDay` se lit comme `false` et provoque un `setAllDay(true)`.

Vérifié avec un vrai `FormControl` : `setValue(…, { emitEvent: false })` émet
quand même, le contrôle est marqué sale par une écriture programmatique, **et
les instants posés par l'application sont réécrits** (02:00 Paris devient
minuit).

Cause voisine : `s.allDay` est écrit à deux endroits et lu nulle part ; la
seule source de vérité est `value.allDay`, donc tout sérialiseur qui perd le
drapeau optionnel éteint les journées entières.

### ☐ 5. Un sélecteur de mois ou d'année ignore `min`, `max` et `isDateDisabled`
`packages/dom/src/calendar.ts:526-538` et `:448-470`

`zoomIn` appelle `choose` au lieu de `select`, et `paintCoarse` ne consulte
jamais `ruledOut`.

Vérifié : sous `minView: 'months'` et `min: juin 2026`, la case de janvier
n'est pas désactivée et son clic émet `2026-01-01`. Même trou dans
`goToday()`.

### ☐ 6. `toPlainDate` lève sur une date-heure sans décalage
`packages/core/src/interop.ts:44`

La regex envoie tout ce qui contient une heure vers `Temporal.Instant.from`,
qui exige `Z` ou un décalage.

Vérifié : `toPlainDate('2026-06-15T10:00', 'Europe/Paris')` →
`RangeError: Cannot parse`. Or c'est le chemin documenté du `writeValue` de
`<tz-calendar>`, `<tz-date-field>` et `<tz-multi-date>`, et
`'2026-06-15T10:00'` est exactement ce que rend un back-end Java ou un champ
`datetime-local`.

### ☐ 7. `createDailyRange` ne transmet ni le jour ni le fuseau à son sélecteur d'heure
`packages/dom/src/daily-range.ts:240-249` et `:206-214`

Le commentaire de `time-input.ts` affirme que `createDailyRange` résout
l'instant ; il ne passe ni `date` ni `timeZone`, donc le saut de l'heure
manquante ne se déclenche jamais.

Vérifié : à Paris le 29 mars 2026, partant de 03:00, la flèche du bas donne
**02:00** — une heure d'horloge qui n'existe pas ce matin-là, enregistrée en
silence. Les menus, eux, ignorent en plus `hour12`.

### ☐ 8. `formatDuration` rend n'importe quoi pour une durée négative
`packages/core/src/range.ts:107-114`

Vérifié : `formatDuration(Duration.from({ minutes: -90 }))` → `-1d 22h -30m`.
C'est un export public ; rien dans la bibliothèque ne lui passe de négatif
aujourd'hui, mais un consommateur qui fait `a.until(b)` dans le mauvais sens
si.

---

## Niveau 2 — accessibilité

9. Un calendrier borné peut n'avoir **aucun point d'entrée clavier** : `tabbableIso` ne filtre pas les jours bloqués, et un `<button>` désactivé n'est pas focalisable. `calendar.ts:321-328`
10. `createDateRange` n'a **aucun support clavier** : pas de `keydown`, pas de tabindex tournant, 42 arrêts de tabulation par mois (84 dans le champ période), et l'aperçu de la plage ne répond qu'à la souris.
11. Le panneau du champ période est **en pratique à la souris** : son `initialFocus` cherche un jour focalisable que `createDateRange` ne marque jamais, et retombe sur un bouton `hidden`. Le focus n'entre jamais dans le panneau. `range-field.ts:991`
12. Le piège à tabulation du panneau **ignore `<select>`** — or c'est le défaut du champ période. Six menus dans le panneau, zéro dans le piège. `panel.ts:125-128`
13. `createDateTimeField` en mode saisissable (le défaut) n'a pas de chemin clavier vers son panneau. `datetime-field.ts:667,788`
14. Entrée sur un raccourci **détruit le bouton sous le focus** : `paintPresets` fait `replaceChildren` à chaque peinture. La même précaution est prise ailleurs dans le fichier. `range-field.ts:758`
15. `createTimeSlots` annonce `role="listbox"` et n'implémente rien du modèle clavier. Idem `daily-range.ts`.
16. `role="grid"` sans `role="row"` dans les vues mois et année, et aucune flèche clavier.

## Niveau 3 — surface d'API que la 1.0.0 figerait

17. `DATEINPUT_CSS` et `readingName`/`seasonNames` ne sont **pas exportés**, alors que leurs voisins le sont. Sous CSP stricte, le panneau du champ période est sans style et sans recours.
18. `valueAs` / `valueTimeZone` manquent sur **quatre composants Angular** (`RangeField`, `DateTimeRange`, `DailyRange`, `TimeSlotPicker`) alors que le provider les documente comme valant pour *tous*. Leur `writeValue` ne convertit rien et lève sur une chaîne ISO.
19. Le panneau capture son déclencheur **par valeur** : basculer `editable` laisse le panneau accroché à un nœud détaché. `datetime-field.ts:292,646`
20. `readingStyle: 'marked'` étoile les mauvaises options quand **deux** heures se répètent (Antarctica/Troll). `time-select.ts:259-265`
21. Trois écouteurs contournent l'`AbortController` (les flèches et le bouton de pas).
22. `createDateTimeRange` fabrique un élément `tz-datetime-field` non enregistré comme conteneur.
23. `clear()` veut dire **trois choses différentes** selon le composant.
24. Divers vérifiés par lecture : `aria-label=""` quand le libellé est une icône ; `shift: []` dessine un bouton vide ; un raccourci maison nommé comme un intégré est coché par la définition intégrée ; `destroy()` laisse deux classes sur l'hôte ; `isDateLike('hello')` vaut `true` ; `matchesPreset` lève pour les raccourcis courts.

## Niveau 4 — tests qui ne testent pas ce qu'ils annoncent

1. « on peut entrer dans un calendrier que personne n'a touché » n'affirme que `tabIndex === 0`, jamais que la case est utilisable — c'est pourquoi le point 9 est vivant.
2. **Aucun fuseau de la suite n'a de transition à minuit.** Paris ×99, et tout le reste marginal. Ajouter `America/Santiago` fait tomber le point 1 immédiatement.
3. Tous les tests de pas court activent aussi `showTime` — la combinaison cassée, qui est le défaut, n'est jamais exercée.
4. `createDateRange` — 419 lignes, export public — **n'a aucun fichier de test**.
5. Le numéro de semaine avec `firstDayOfWeek: 7` est figé sur un choix défendable mais surprenant pour un lecteur américain : à documenter plutôt qu'à corriger.

## Ce qui est sain

`core/grid.ts`, `resolve()` dans `core/slots.ts`, l'arithmétique des trimestres
et des mois de `core/presets.ts`, la logique `wholeMonths` de `core/shift.ts`,
toute l'interface des heures ambiguës du champ période et du champ date-heure
(réellement testée, des deux côtés, dans les deux dispositions), le patron
`effect(() => untracked(…))` des wrappers Angular, la gestion du shadow root
par `ensureStyles`, et le test de dérive Sass↔CSS du thème.
