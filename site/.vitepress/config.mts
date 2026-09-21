import { defineConfig } from 'vitepress';

/**
 * The documentation. Every example on these pages is the real widget running
 * in the page, not a picture of one: the library needs no framework, so the
 * docs can simply call it.
 */
export default defineConfig({
  title: 'tzslot',
  description: 'Date and time pickers that know what daylight saving does.',
  lang: 'en-GB',
  cleanUrls: true,
  // Served from https://plinthworks.github.io/tzslot/ unless told otherwise.
  base: process.env.DOCS_BASE ?? '/tzslot/',
  head: [['meta', { name: 'color-scheme', content: 'light dark' }]],
  /**
   * Two languages, one set of examples.
   *
   * The API tables are generated from the doc comments in the source and stay
   * in English: translating them would mean a second source to keep in step
   * with the first, and the first is the one that ships.
   */
  locales: {
    root: {
      label: 'English',
      lang: 'en-GB',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Examples', link: '/examples' },
          { text: 'API', link: '/api/calendar' },
          { text: 'Changelog', link: 'https://github.com/plinthworks/tzslot/blob/main/CHANGELOG.md' },
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Getting started', link: '/guide/getting-started' },
              { text: 'Angular', link: '/guide/angular' },
              { text: 'Without a framework', link: '/guide/vanilla' },
              { text: 'Choosing a period', link: '/guide/period' },
              { text: 'What you get back', link: '/guide/values' },
              { text: 'Choosing a time', link: '/guide/time' },
              { text: 'Driving it from outside', link: '/guide/external' },
              { text: 'Formatting and typing', link: '/guide/formatting' },
              { text: 'Localization', link: '/guide/localization' },
              { text: 'Theming', link: '/guide/theming' },
            ],
          },
          { text: 'Examples', link: '/examples' },
      {
        text: 'API',
        items: [
          { text: 'createCalendar', link: '/api/calendar' },
          { text: 'createMultiDate', link: '/api/multi-date' },
          { text: 'createDateField', link: '/api/date-field' },
          { text: 'createDateTimeField', link: '/api/datetime-field' },
          { text: 'createRangeField', link: '/api/range-field' },
          { text: 'createDateRange', link: '/api/date-range' },
          { text: 'createTimeSlots', link: '/api/time-slots' },
          { text: 'createDateTimeRange', link: '/api/datetime-range' },
          { text: 'createDailyRange', link: '/api/daily-range' },
          { text: 'createTimeInput', link: '/api/time-input' },
          { text: 'createTimeSelect', link: '/api/time-select' },
        ],
      },
        ],
      },
    },
    fr: {
      label: 'Français',
      lang: 'fr-FR',
      description: 'Des sélecteurs de date et d’heure qui savent ce que fait le changement d’heure.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/fr/guide/demarrer' },
          { text: 'Exemples', link: '/fr/exemples' },
          { text: 'API', link: '/api/calendar' },
          { text: 'Journal', link: 'https://github.com/plinthworks/tzslot/blob/main/CHANGELOG.md' },
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Démarrer', link: '/fr/guide/demarrer' },
              { text: 'Angular', link: '/fr/guide/angular' },
              { text: 'Sans framework', link: '/fr/guide/sans-framework' },
              { text: 'Choisir une période', link: '/fr/guide/periode' },
              { text: 'Ce qu’on récupère', link: '/fr/guide/valeurs' },
              { text: 'Choisir une heure', link: '/fr/guide/heure' },
              { text: 'Piloter depuis l’extérieur', link: '/fr/guide/exterieur' },
              { text: 'Format et saisie', link: '/fr/guide/format' },
              { text: 'Langue et locale', link: '/fr/guide/langue' },
              { text: 'Thème', link: '/fr/guide/theme' },
            ],
          },
          { text: 'Exemples', link: '/fr/exemples' },
          {
            text: 'API (en anglais)',
            items: [
              { text: 'createCalendar', link: '/api/calendar' },
              { text: 'createRangeField', link: '/api/range-field' },
              { text: 'createDateTimeField', link: '/api/datetime-field' },
              { text: 'createDateField', link: '/api/date-field' },
              { text: 'createDateRange', link: '/api/date-range' },
              { text: 'createMultiDate', link: '/api/multi-date' },
              { text: 'createTimeSlots', link: '/api/time-slots' },
              { text: 'createDateTimeRange', link: '/api/datetime-range' },
              { text: 'createDailyRange', link: '/api/daily-range' },
              { text: 'createTimeInput', link: '/api/time-input' },
              { text: 'createTimeSelect', link: '/api/time-select' },
            ],
          },
        ],
      },
    },
  },
  themeConfig: {
    socialLinks: [{ icon: 'github', link: 'https://github.com/plinthworks/tzslot' }],
    search: { provider: 'local' },
    footer: { message: 'MIT', copyright: '© 2026 Plinthworks' },
  },
});
