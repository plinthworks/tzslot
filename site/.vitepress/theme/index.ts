import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import Live from './Live.vue';
import '@tzslot/theme';
import './docs.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Live', Live);
  },
} satisfies Theme;
