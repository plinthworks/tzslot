import type { PresetName } from '@tzslot/core';

/**
 * Every word the components say.
 *
 * One bundle, handed to every widget, rather than a string option on each:
 * translating an application should not mean passing fifteen settings at
 * every call site, and a label that has to be repeated is a label that will
 * eventually disagree with itself.
 *
 * Month and weekday names are not here — those come from `Intl` through the
 * `locale` option, which already knows them in every language the browser ships.
 * This is only the text the library adds.
 */
export interface TzslotMessages {
  /** The field's placeholder and its accessible name. */
  readonly chooseDate: string;
  /** The same, for a field that takes a time as well. */
  readonly chooseDateTime: string;
  /** Above the time inside a date-and-time panel. */
  readonly timeLabel: string;
  /** The two readings of a repeated hour, offered side by side. */
  readonly whichReading: string;
  /**
   * The two readings of a repeated hour, in the words everyone uses: the one
   * with the larger offset is summer time, the other is winter time. The
   * zone's official name for each is kept for the tooltip.
   */
  readonly summerTime: string;
  readonly winterTime: string;
  /** Which of the two is in force, once one has been chosen. */
  readingChosen(parts: { name: string; offset: string }): string;

  /** The column of week numbers: its heading, and what it is called in full. */
  readonly weekShort: string;
  readonly weekLabel: string;

  readonly previousMonth: string;
  readonly nextMonth: string;

  /** What clicking the calendar title does, announced to a screen reader. */
  readonly chooseMonth: string;
  readonly chooseYear: string;

  /** The buttons under the grid, when asked for. */
  readonly today: string;
  readonly clear: string;

  readonly availableTimes: string;
  /** Marks a time the clocks skipped. Short: it sits under a slot. */
  readonly skipped: string;
  readonly noTimes: string;

  readonly from: string;
  readonly to: string;
  /** The switch that turns an interval into whole days. */
  readonly allDay: string;
  /** The range field: what it says when empty, and its two footer buttons. */
  readonly chooseRange: string;
  readonly apply: string;
  readonly cancel: string;
  /** The named ranges offered beside the calendar. */
  readonly presets: Record<PresetName, string>;
  /** The arrows that step a selection to the period before or after it. */
  readonly previousPeriod: string;
  readonly nextPeriod: string;
  /**
   * What a closed field asks for when it holds nothing: one date, or two.
   *
   * Names rather than a mask. Twelve dashes for a date were noise, and the
   * question the field is asking — how many dates, and which is which — is
   * what a reader needs from a line they have not opened yet.
   */
  readonly singleDate: string;
  readonly startDate: string;
  readonly endDate: string;
  /** The menu between the arrows, when the reader chooses how far one press goes. */
  readonly stepLabel: string;
  /** Said of a step the field's shape cannot take — an hour inside one day. */
  readonly stepTooShort: string;
  /**
   * A period with one end left open: the three ways to mean it, and the two
   * ways to say a chosen end no longer applies. 'From' and 'Until' are read
   * before a date — "From 14/09/2026" — so they carry no trailing colon.
   */
  readonly between: string;
  readonly fromDate: string;
  readonly untilDate: string;
  readonly clearStart: string;
  readonly clearEnd: string;
  /** The cross that empties one of the two fields in a period. */
  readonly clearField: string;
  /** Above the two fields of a period: the day it runs from, the day it runs to. */
  readonly rangeStart: string;
  readonly rangeEnd: string;
  /**
   * What a screen reader hears on a day of the grid, after the date itself.
   *
   * A cell said "21" and nothing else — no month, no year, no weekday, and no
   * word for whether it was the start of the period, the end, or inside it.
   * `aria-selected` was set on the two ends alike, so nothing told them apart
   * and everything between was announced as unselected.
   */
  readonly dayIsStart: string;
  readonly dayIsEnd: string;
  readonly dayWithin: string;
  /** Said after the value whenever it changes, in the panel's live region. */
  readonly selectedRange: (period: string) => string;
  readonly endBeforeStart: string;
  readonly rangeCrossesUnavailable: string;

  /** The daily range: its two parts, and the two ends of the hours. */
  readonly days: string;
  readonly hours: string;
  readonly timeFrom: string;
  readonly timeTo: string;
  /** The compact time input: its two fields and its AM/PM button. */
  readonly hourLabel: string;
  readonly minuteLabel: string;
  readonly meridiemLabel: string;
  readonly am: string;
  readonly pm: string;

  /** Under an end time that falls on the following day. Short. */
  readonly nextDay: string;
  /** "5 days · 40h" */
  dailySummary(parts: { days: number; total: string }): string;
  /**
   * A day that differs from the others, and why: the clocks went back or
   * forward during it, or one of its times fell in the hour they skipped or
   * repeated.
   */
  unusualDay(parts: { date: string; real: string; change: 'back' | 'forward' | 'skipped' | 'repeated' }): string;

  /** Said on a slot that the clocks skipped, as a tooltip. */
  nonExistentTime(time: string): string;
  /** Said on one of the two readings of a repeated hour. */
  repeatedTime(time: string, offset: string): string;

  /**
   * The sentence explaining why an interval lasts something other than it
   * reads. A function, not a template with holes, because languages do not
   * agree on where the pieces go — French puts the duration before the reason,
   * German puts the verb at the end, and a format string cannot express either.
   */
  clockChange(parts: {
    direction: 'back' | 'forward';
    by: string;
    apparent: string;
    real: string;
  }): string;
}

export const EN: TzslotMessages = {
  chooseDate: 'Choose a date',
  chooseDateTime: 'Choose a date and a time',
  timeLabel: 'Time',
  whichReading: 'This hour happens twice. Which one?',
  summerTime: 'summer',
  winterTime: 'winter',
  readingChosen: ({ name, offset }) => `${name} (UTC${offset}).`,
  weekShort: 'Wk',
  weekLabel: 'Week',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  chooseMonth: 'Choose a month',
  chooseYear: 'Choose a year',
  today: 'Today',
  clear: 'Clear',
  availableTimes: 'Available times',
  skipped: 'skipped',
  noTimes: 'No times available.',
  from: 'From',
  to: 'To',
  allDay: 'All day',
  chooseRange: 'Choose a range',
  apply: 'Apply',
  cancel: 'Cancel',
  presets: {
    today: 'Today',
    yesterday: 'Yesterday',
    last7Days: 'Last 7 days',
    last14Days: 'Last 14 days',
    last30Days: 'Last 30 days',
    thisWeek: 'This week',
    lastWeek: 'Last week',
    thisMonth: 'This month',
    lastMonth: 'Last month',
    thisQuarter: 'This quarter',
    lastQuarter: 'Last quarter',
    nextQuarter: 'Next quarter',
    thisQuarterHour: 'This quarter hour',
    lastHour: 'Previous hour',
    thisHour: 'This hour',
    nextHour: 'Next hour',
    tomorrow: 'Tomorrow',
    next7Days: 'Next 7 days',
    next30Days: 'Next 30 days',
    thisYear: 'This year',
  },
  previousPeriod: 'Previous period',
  nextPeriod: 'Next period',
  singleDate: 'Date',
  startDate: 'Start date',
  endDate: 'End date',
  stepLabel: 'Step',
  stepTooShort: 'Shorter than the day this field holds',
  between: 'Between',
  fromDate: 'From',
  untilDate: 'Until',
  clearStart: 'No start',
  clearEnd: 'No end',
  clearField: 'Empty this field',
  rangeStart: 'From',
  rangeEnd: 'To',
  dayIsStart: 'start of the period',
  dayIsEnd: 'end of the period',
  dayWithin: 'in the period',
  selectedRange: (period) => `Selected: ${period}`,
  endBeforeStart: 'The end is before the start.',
  rangeCrossesUnavailable: 'That range crosses an unavailable day.',
  days: 'Days',
  hours: 'Hours',
  timeFrom: 'From',
  timeTo: 'Until',
  nextDay: 'next day',
  hourLabel: 'Hour',
  minuteLabel: 'Minute',
  meridiemLabel: 'Before or after noon',
  am: 'AM',
  pm: 'PM',
  dailySummary: ({ days, total }) => `${days} ${days === 1 ? 'day' : 'days'} · ${total}`,
  unusualDay: ({ date, real, change }) =>
    ({
      back: `${date} lasts ${real}: the clocks go back.`,
      forward: `${date} lasts ${real}: the clocks go forward.`,
      skipped: `${date}: a time falls in the hour the clocks skip, so it is read an hour later.`,
      repeated: `${date}: a time falls in the hour that happens twice; the window covers both.`,
    })[change],
  nonExistentTime: (time) => `${time} does not exist on this date — the clocks move forward.`,
  repeatedTime: (time, offset) =>
    `${time} happens twice on this date. This is the reading at UTC${offset}.`,
  clockChange: ({ direction, by, apparent, real }) =>
    `The clocks go ${direction} by ${by} during this range, so it reads as ${apparent} but lasts ${real}.`,
};

/** French, shipped because the first consumer needs it and it proves the shape. */
export const FR: TzslotMessages = {
  chooseDate: 'Choisir une date',
  chooseDateTime: 'Choisir une date et une heure',
  timeLabel: 'Heure',
  whichReading: 'Cette heure a lieu deux fois. Laquelle ?',
  summerTime: 'été',
  winterTime: 'hiver',
  readingChosen: ({ name, offset }) => `${name} (UTC${offset}).`,
  weekShort: 'Sem.',
  weekLabel: 'Semaine',
  previousMonth: 'Mois précédent',
  nextMonth: 'Mois suivant',
  chooseMonth: 'Choisir un mois',
  chooseYear: 'Choisir une année',
  today: "Aujourd'hui",
  clear: 'Effacer',
  availableTimes: 'Horaires disponibles',
  skipped: 'inexistant',
  noTimes: 'Aucun horaire disponible.',
  from: 'Du',
  to: 'Au',
  allDay: 'Toute la journée',
  chooseRange: 'Choisir une période',
  apply: 'Valider',
  cancel: 'Annuler',
  presets: {
    today: "Aujourd'hui",
    yesterday: 'Hier',
    last7Days: '7 derniers jours',
    last14Days: '14 derniers jours',
    last30Days: '30 derniers jours',
    thisWeek: 'Cette semaine',
    lastWeek: 'La semaine dernière',
    thisMonth: 'Ce mois-ci',
    lastMonth: 'Le mois dernier',
    thisQuarter: 'Ce trimestre',
    lastQuarter: 'Le trimestre dernier',
    nextQuarter: 'Le trimestre prochain',
    thisQuarterHour: "Le quart d'heure courant",
    lastHour: "L'heure précédente",
    thisHour: "L'heure courante",
    nextHour: "L'heure suivante",
    tomorrow: 'Demain',
    next7Days: '7 prochains jours',
    next30Days: '30 prochains jours',
    thisYear: 'Cette année',
  },
  previousPeriod: 'Période précédente',
  nextPeriod: 'Période suivante',
  singleDate: 'Date',
  startDate: 'Date de début',
  endDate: 'Date de fin',
  stepLabel: 'Pas',
  stepTooShort: "Plus court que la journée que porte ce champ",
  between: 'Entre',
  fromDate: 'À partir du',
  untilDate: "Jusqu'au",
  clearStart: 'Sans début',
  clearEnd: 'Sans fin',
  clearField: 'Vider ce champ',
  rangeStart: 'Du',
  rangeEnd: 'Au',
  dayIsStart: 'début de la période',
  dayIsEnd: 'fin de la période',
  dayWithin: 'dans la période',
  selectedRange: (period) => `Sélection : ${period}`,
  endBeforeStart: 'La fin précède le début.',
  rangeCrossesUnavailable: 'Cette plage traverse un jour indisponible.',
  days: 'Jours',
  hours: 'Horaires',
  timeFrom: 'De',
  timeTo: "Jusqu'à",
  nextDay: 'lendemain',
  hourLabel: 'Heure',
  minuteLabel: 'Minute',
  meridiemLabel: 'Avant ou après midi',
  am: 'AM',
  pm: 'PM',
  dailySummary: ({ days, total }) => `${days} ${days === 1 ? 'jour' : 'jours'} · ${total}`,
  unusualDay: ({ date, real, change }) =>
    ({
      back: `${date} dure ${real} : les pendules reculent.`,
      forward: `${date} dure ${real} : les pendules avancent.`,
      skipped: `${date} : une heure tombe dans l'heure sautée, elle est lue une heure plus tard.`,
      repeated: `${date} : une heure tombe dans l'heure répétée ; la plage couvre les deux.`,
    })[change],
  nonExistentTime: (time) => `${time} n'existe pas ce jour-là : les pendules avancent.`,
  repeatedTime: (time, offset) =>
    `${time} a lieu deux fois ce jour-là. Voici la lecture à UTC${offset}.`,
  // Note the order: French leads with the real duration, English with the cause.
  clockChange: ({ direction, by, apparent, real }) =>
    `Cet intervalle dure ${real} et non ${apparent} : les pendules ${
      direction === 'back' ? 'reculent' : 'avancent'
    } de ${by} pendant cette période.`,
};
