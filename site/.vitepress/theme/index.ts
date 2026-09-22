import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { Temporal } from '@tzslot/core';
import { icon, EN, FR } from '@tzslot/dom';
import Live from './Live.vue';
import '@tzslot/theme';
import './docs.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Live', Live);
    /**
     * What an example needs in order to be written exactly as an application
     * would write it. Without these, a live example taking a date would have
     * to pass a string where the types ask for a PlainDate, and the code shown
     * beside it would no longer be the code running.
     */
    app.config.globalProperties.Temporal = Temporal;
    // The options of every example are evaluated when the page is prerendered,
    // where there is no document to draw into. Nothing is lost: a widget only
    // mounts in the browser, so the node this would have made is never used
    // server-side anyway.
    app.config.globalProperties.icon = (name: Parameters<typeof icon>[0]) =>
      typeof document === 'undefined' ? null : icon(name);
    app.config.globalProperties.EN = EN;
    app.config.globalProperties.FR = FR;
  },
} satisfies Theme;
