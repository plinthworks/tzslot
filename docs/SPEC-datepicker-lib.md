# Spec — Lib Angular Date/Time Picker DST-safe (modèle open-core)

## Contexte et objectif

Construire une librairie de sélection de date/heure pour Angular, gérant correctement les
changements d'heure (DST) — problème non résolu par flatpickr, Air Datepicker et la plupart
des libs JS actuelles (elles reposent sur `Date` natif, sans notion de fuseau IANA).

Modèle économique (structure packages/licence, PAS le code) inspiré de **FullCalendar**
(packages séparés, licence par string) et **AG Grid** (modules enregistrables, tier
community/enterprise). Pas de vrai DRM : l'enforcement de licence est déclaratif (watermark +
warning console), jamais cryptographique — inutile de sur-ingénierer cette partie.

Base technique du calendrier (le code à forker/réutiliser) : **Air Datepicker**, voir section
"Base de code à forker" ci-dessous. AG Grid et FullCalendar ne sont PAS des sources de code
ici — uniquement des références de modèle économique.

**Aucune dépendance à Angular Material.** Le design est 100% custom.

## Stack technique imposée

- **Moteur de date/heure : Temporal API**
  - Natif sur Chrome 144+ / Firefox 139+ / Edge 144+ (ES2026, Stage 4 depuis mars 2026).
  - Polyfill `temporal-polyfill` (par l'équipe FullCalendar, plus léger que `@js-temporal/polyfill`)
    chargé en lazy-import, uniquement si `typeof Temporal === 'undefined'`.
  - Toute la logique de disambiguation DST utilise `Temporal.ZonedDateTime.from(..., { disambiguation })`
    avec les modes `reject` (détecter les heures inexistantes) et comparaison `earlier`/`later`
    (détecter les heures ambiguës).
- **UI : Angular CDK uniquement** (`@angular/cdk/overlay`, `@angular/cdk/a11y`) — pas de
  `@angular/material`. Positionnement d'overlay et accessibilité (focus trap, navigation
  clavier) via le CDK ; tout le reste (markup, CSS) est spécifique au projet.
- **TypeScript strict**, composants Angular standalone, signals pour l'état réactif.
- **Sérialisation** : toujours stocker un instant UTC (`Temporal.Instant` / ISO string), jamais
  une heure locale brute, pour éviter les bugs de ré-interprétation au chargement.

## Base de code à forker

**Air Datepicker** (github.com/t1m0n/air-datepicker) est la base retenue pour la partie
calendrier :
- Codebase TypeScript moderne, activement maintenue, lisible à adapter.
- Contient déjà une logique de grille mensuelle solide (calcul des semaines, jours du mois
  précédent/suivant, navigation) — générique, sans bug DST (le DST n'affecte que le temps,
  pas le choix du jour).
- N'a **aucune gestion DST/timezone native** (vérifié : pas d'option `timeZone`, repose sur
  `Date` natif) — c'est exactement la brique que ce projet ajoute par-dessus.

Ce qu'on garde de leur code : le calcul de grille de dates (mois/semaines/navigation).
Ce qu'on jette : tout leur rendu DOM/CSS, leur time picker (numérique, non DST-aware), leur
gestion interne des dates via `Date` natif — à remplacer entièrement par `Temporal`.

flatpickr reste une alternative de secours si la structure d'Air Datepicker s'avère trop
couplée à leur rendu pour être extraite proprement — code plus ancien mais grille tout aussi
simple à isoler.

## Architecture des packages (monorepo)

```
packages/
  core/                 → @tonscope/datepicker-core
    - Zéro DOM, zéro dépendance UI.
    - getDaySlots(date, tz, stepMinutes): Slot[]
        Slot = { time: Temporal.PlainTime, exists: boolean, ambiguous: boolean, offset?: string }
    - getMonthGrid(year, month, firstDayOfWeek): DayCell[][]  (grille calendrier, générique,
      pas de logique DST ici — portée depuis la logique de calcul de grille d'Air Datepicker,
      voir section "Base de code à forker")
    - parseZoned(input, tz): Temporal.ZonedDateTime | ParseError
    - Licence : MIT.

  ui-cdk/               → @tonscope/datepicker-ui
    - Composants Angular standalone (calendrier, time-slot-picker) consommant @core.
    - Utilise @angular/cdk/overlay + @angular/cdk/a11y uniquement.
    - Aucun styling imposé : classes CSS neutres (BEM ou équivalent), thème via CSS custom
      properties (variables --dp-*), consommateur libre de tout resurfacer.
    - Licence : MIT (tier gratuit / "Community").

  pro/                  → @tonscope/datepicker-pro
    - Package npm séparé, licence commerciale (pas MIT).
    - Features "payantes" (voir section Features ci-dessous).
    - Vérification de licence : fonction `setLicenseKey(key: string)` exposée au niveau du
      package pro. Si clé absente/invalide → watermark visuel discret + `console.warn`,
      mais la feature reste fonctionnelle (comme FullCalendar/AG Grid — pas de blocage dur).
    - Accepte aussi des clés littérales spéciales pour cas d'usage gratuits légitimes,
      ex. `'AGPL-My-Project-Is-Open-Source'`, à définir selon ta politique de licence.
```

## Features — Community (gratuit, MIT) vs Pro (payant)

### Community
- Sélection date simple + range basique
- Time picker DST-safe (détection trou/ambiguïté) — c'est la killer-feature de base, gratuite,
  car c'est ce qui différencie la lib de flatpickr/Air Datepicker dès le tier gratuit
- Grille calendrier mois/année, navigation clavier
- Un seul fuseau à la fois (celui du navigateur ou fourni en config statique)
- Format/parsing i18n basique

### Pro
- **Vue multi-fuseaux comparés** : afficher plusieurs colonnes de fuseaux horaires côte à côte
  pour un même créneau (équivalent "resource view" de FullCalendar Premium)
- **Créneaux récurrents avec exceptions DST** : règles de récurrence (RRULE-like) qui restent
  cohérentes à travers les changements d'heure (ex. "tous les lundis 9h" ne doit jamais glisser)
- **Contraintes horaires métier** : plages d'ouverture/fermeture, blackout dates, avec
  validation DST-aware
- **Vue "resource scheduler"** : plusieurs ressources/salles en colonnes (comme AG Grid
  Enterprise / FullCalendar Scheduler)
- **Export/import** (iCal, etc.) avec préservation du fuseau d'origine

## Non-objectifs (pour éviter le sur-engineering)

- Pas de clone complet des fonctionnalités de flatpickr dès la V1 (pas de multi-date, pas de
  range mode custom, pas de plugins tiers) — seulement date simple + time picker DST-safe.
- Pas de DRM technique sur le tier Pro — la licence est un contrat, pas une protection
  cryptographique côté client (impossible de toute façon en JS).
- Pas de support Safari natif pour Temporal en V1 — polyfill uniquement, pas de fallback
  vers `Date` natif pour les fuseaux (ça réintroduirait exactement le bug qu'on corrige).
- Pas de wrapper React/Vue en V1 — Angular uniquement, jusqu'à validation du core.

## Plan de développement suggéré (phases)

1. **`core`** : implémenter `getDaySlots`, tests unitaires sur cas DST connus (Europe/Paris,
   America/Chicago, Australia/Lord_Howe pour le cas ±30min). Valider avant tout le reste.
2. **`ui-cdk`** : composant time-slot-picker minimal (liste de créneaux), branché sur `core`,
   sans souci de design — juste la logique.
3. **`ui-cdk`** : composant calendrier (grille mois), navigation, sélection de date.
4. **Design final** : CSS/thème une fois la logique validée, pas avant.
5. **`pro`** : une seule feature Pro d'abord (ex. multi-fuseaux), pour valider le mécanisme de
   licence de bout en bout, avant d'ajouter les autres.

## Critères de validation (tests obligatoires sur `core`)

- Heure inexistante détectée et rejetée sur au moins 3 fuseaux différents (printemps, saut +1h).
- Heure ambiguë détectée avec les deux occurrences distinguables (automne, recul -1h).
- Cas Lord Howe Island (Australia/Lord_Howe, décalage de 30 min, pas 1h) pour vérifier qu'on
  ne suppose jamais un offset fixe.
- Round-trip sérialisation : stocker en UTC, recharger, ré-afficher dans le fuseau d'origine
  sans perte ni décalage.
