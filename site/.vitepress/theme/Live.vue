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
  }>(),
  { options: () => ({}), show: undefined, controls: () => [] },
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
    ...(french() ? { locale: 'fr-FR', messages: tzslot.FR } : {}),
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
         so it gets one of its own rather than the panel's own box. -->
    <div class="live__stage"><div ref="stage" /></div>
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
