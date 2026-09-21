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
    socialLinks: [{ icon: 'github', link: 'https://github.com/plinthworks/tzslot' }],
    search: { provider: 'local' },
    footer: { message: 'MIT', copyright: '© 2026 Plinthworks' },
  },
});
