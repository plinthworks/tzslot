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

  readonly previousMonth: string;
  readonly nextMonth: string;

  /** What clicking the calendar title does, announced to a screen reader. */
  readonly chooseMonth: string;
  readonly chooseYear: string;

  readonly availableTimes: string;
  /** Marks a time the clocks skipped. Short: it sits under a slot. */
  readonly skipped: string;
  readonly noTimes: string;

  readonly from: string;
  readonly to: string;
  readonly endBeforeStart: string;
  readonly rangeCrossesUnavailable: string;

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
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  chooseMonth: 'Choose a month',
  chooseYear: 'Choose a year',
  availableTimes: 'Available times',
  skipped: 'skipped',
  noTimes: 'No times available.',
  from: 'From',
  to: 'To',
  endBeforeStart: 'The end is before the start.',
  rangeCrossesUnavailable: 'That range crosses an unavailable day.',
  nonExistentTime: (time) => `${time} does not exist on this date — the clocks move forward.`,
  repeatedTime: (time, offset) =>
    `${time} happens twice on this date. This is the reading at UTC${offset}.`,
  clockChange: ({ direction, by, apparent, real }) =>
    `The clocks go ${direction} by ${by} during this range, so it reads as ${apparent} but lasts ${real}.`,
};

/** French, shipped because the first consumer needs it and it proves the shape. */
export const FR: TzslotMessages = {
  chooseDate: 'Choisir une date',
  previousMonth: 'Mois précédent',
  nextMonth: 'Mois suivant',
  chooseMonth: 'Choisir un mois',
  chooseYear: 'Choisir une année',
  availableTimes: 'Horaires disponibles',
  skipped: 'inexistant',
  noTimes: 'Aucun horaire disponible.',
  from: 'Du',
  to: 'Au',
  endBeforeStart: 'La fin précède le début.',
  rangeCrossesUnavailable: 'Cette plage traverse un jour indisponible.',
  nonExistentTime: (time) => `${time} n'existe pas ce jour-là : les pendules avancent.`,
  repeatedTime: (time, offset) =>
    `${time} a lieu deux fois ce jour-là. Voici la lecture à UTC${offset}.`,
  // Note the order: French leads with the real duration, English with the cause.
  clockChange: ({ direction, by, apparent, real }) =>
    `Cet intervalle dure ${real} et non ${apparent} : les pendules ${
      direction === 'back' ? 'reculent' : 'avancent'
    } de ${by} pendant cette période.`,
};
