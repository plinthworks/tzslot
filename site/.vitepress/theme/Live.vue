<script setup lang="ts">
/**
 * One live example: the widget, running, with what it currently holds shown
 * underneath. The code beside it is written in the Markdown, so what a reader
 * copies is what they see working.
 */
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import * as tzslot from '@tzslot/dom';

const props = withDefaults(
  defineProps<{
    /** The factory to call, without the `create`: 'Calendar', 'DateTimeField'… */
    widget: string;
    /** Its options. Functions and Temporal values are passed straight through. */
    options?: Record<string, unknown>;
    /** How to write the value under it. Left out, it is stringified. */
    show?: (value: unknown) => string;
    /** Buttons beside it, each given the widget to drive. */
    controls?: { label: string; run: (widget: any) => void }[];
    /**
     * Palette properties set on a box around the widget, so a theming example
     * shows the theme rather than describing it. Exactly what an application
     * would write in its own CSS, spelt as an object.
     */
    theme?: Record<string, string>;
    /** `dark` or `light` on that box, as data-theme would be in a page. */
    scheme?: 'dark' | 'light';
  }>(),
  { options: () => ({}), show: undefined, controls: () => [], theme: undefined, scheme: undefined },
);

const stage = ref<HTMLElement>();
/**
 * The words follow the page.
 *
 * `locale` decides what Intl writes — month names, the order of a date — and
 * nothing else: everything the library says itself comes from a bundle. A
 * French page showing a widget labelled "From / To" is the page failing to
 * say which of the two it is demonstrating.
 */
const french = () => typeof window !== 'undefined' && window.location.pathname.includes('/fr/');
const held = ref(french() ? 'rien choisi' : 'nothing chosen');
const instance = shallowRef<{ destroy(): void } | null>(null);

onMounted(() => {
  const create = (tzslot as Record<string, unknown>)[`create${props.widget}`] as
    | ((host: HTMLElement, options: unknown) => { destroy(): void })
    | undefined;
  if (!create || !stage.value) return;
  instance.value = create(stage.value, {
    // The page decides, not the reader's browser: an English page showing
    // "septembre 2026" is the example demonstrating the wrong thing. An
    // explicit locale in the options still wins — it is spread after this.
    ...(french() ? { locale: 'fr-FR', messages: tzslot.FR } : { locale: 'en-GB' }),
    ...props.options,
    onChange: (value: unknown) => {
      held.value = props.show ? props.show(value) : describe(value);
    },
  });
});

onBeforeUnmount(() => instance.value?.destroy());

/** Whatever a widget hands back, in one line a reader can compare with theirs. */
function describe(value: unknown): string {
  const nothing = french() ? 'rien choisi' : 'nothing chosen';
  if (value === null || value === undefined) return nothing;
  if (Array.isArray(value)) return value.length ? value.map(describe).join(', ') : nothing;
  // A Temporal value is an object that knows how to write itself; only a plain
  // one gets taken apart, or a date would read as "{ }".
  if (typeof value === 'object' && value.toString !== Object.prototype.toString) {
    return String(value);
  }
  if (typeof value === 'object') {
    const parts = Object.entries(value as Record<string, unknown>)
      .map(([key, each]) => `${key}: ${describe(each)}`)
      .join(', ');
    return `{ ${parts} }`;
  }
  return String(value);
}
</script>

<template>
  <div class="live">
    <!-- The widget claims the element it is given — display, class and all —
         so it gets one of its own rather than the panel's own box. The theme
         goes on the box around it: a field's panel is drawn on the body, and
         it carries the palette of the element it was opened from. -->
    <div class="live__stage" :style="theme" :data-theme="scheme"><div ref="stage" /></div>
    <div v-if="controls.length" class="live__controls">
      <button v-for="control of controls" :key="control.label" type="button"
              @click="instance && control.run(instance)">
        {{ control.label }}
      </button>
    </div>
    <div class="live__value">{{ held }}</div>
    <slot />
  </div>
</template>
