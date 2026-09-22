# Choisir une heure

Trois façons, et `timeLayout` choisit entre elles. Elles existent parce que
demander « une heure quelconque » et demander « une de ces heures » sont deux
questions différentes.

## Un champ compact

`timeLayout="input"`. Flèches, molette, touches haut et bas, et saisie.
Format 12 heures là où la locale écrit les heures ainsi.

<Live widget="TimeInput" :options="{ locale: 'fr-FR', stepMinutes: 15, value: null }" />

Chaque case boucle sur elle-même : faire passer les minutes au-delà de l’heure
décalerait un rendez-vous d’une heure que personne n’a demandée.

## Deux menus

`timeLayout="select"` — un menu d’heures et un de minutes, à la minute près
(`minuteStep`). Ce sont de vrais `<select>` : le clavier fonctionne, rien ne
peut les rogner, et un téléphone ouvre son propre sélecteur.

<Live widget="TimeSelect" :options="{ locale: 'fr-FR', minuteStep: 15, date: '2026-10-25', timeZone: 'Europe/Paris' }" />

Avec un jour et un fuseau — que les champs transmettent — les menus montrent
ce jour tel qu’il est vraiment. L’exemple ci-dessus est le 25 octobre 2026 à
Paris : **02 apparaît deux fois**, été et hiver, et en choisir une répond à la
question d’emblée. Le 29 mars, elle manque tout simplement.

## Les créneaux du jour

`timeLayout="list"` — tous les créneaux réservables du jour, ce que veut un
écran de réservation. L’heure qui ne peut pas avoir lieu est barrée, celle qui
a lieu deux fois est proposée deux fois, et `isDisabled` grise ce qui est déjà
pris.

<Live widget="TimeSlots" :options="{ date: '2026-10-25', timeZone: 'Europe/Paris', stepMinutes: 60, locale: 'fr-FR' }" />

## L’heure qui a lieu deux fois

Quelle que soit la façon dont l’heure est demandée, la valeur est un
`Instant` — un moment, pas un cadran. Quand le cadran est ambigu :

- les **menus** proposent les deux lectures, nommées *été* et *hiver* ;
- le **champ compact** demande, une fois, avec les deux mêmes mots, et son
  texte dit ensuite laquelle il contient : `25/10/2026 02:30 (hiver)` ;
- la **liste** montre les deux, avec leurs décalages en dessous.

## L’heure qui n’existe pas

La taper amène au premier moment qui existe, et le dit. Les flèches
l’enjambent — 03:00 vers le bas donne 01:00 ce matin-là. Les menus et la liste
ne la proposent pas du tout.
