import { describe, it, expect, afterEach } from 'vitest';
import { createDateTimeField, type DateTimeFieldInstance } from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * The options of an hour menu carry their own pair of colours.
 *
 * An option inherits the menu's text colour and none of its background, and
 * the popup is a surface the browser paints rather than the select's own box.
 * Measured on Edge in a dark theme: the closed control was right and the list
 * it opened was white text on white, with only the row under the pointer
 * readable because the browser's highlight brings its own pair. color-scheme
 * resolves correctly here -- that is why the text was light in the first
 * place -- so the defect was simply that no rule in the library gave an option
 * a background. Firefox was fine on the same stylesheet: Gecko paints the
 * popup from the select's background, Blink from the options alone.
 *
 * jsdom neither computes a popup nor resolves var(), so what is checked is the
 * part it can see and the part that was missing: that a rule matches the
 * option elements at all. Whether the browser then paints it dark is a thing
 * only the browser can answer.
 */
let field: DateTimeFieldInstance;
let host: HTMLElement;

afterEach(() => {
  field?.destroy();
  host?.remove();
  document.querySelectorAll('.tz-field__panel').forEach((n) => n.remove());
});

describe('a native menu in a dark page', () => {
  it('gives its options the field colours, not the browser default', () => {
    host = document.createElement('div');
    document.body.append(host);
    field = createDateTimeField(host, {
      timeZone: 'Europe/Paris',
      locale: 'fr-FR',
      timeLayout: 'select',
      minuteStep: 15,
      value: Temporal.ZonedDateTime.from({
        year: 2026, month: 10, day: 13, hour: 10, minute: 0, timeZone: 'Europe/Paris',
      }).toInstant(),
    });
    host.querySelector<HTMLButtonElement>('.tz-field__trigger')!.click();
    const panel = document.querySelector<HTMLElement>('.tz-field__panel')!;
    const option = panel.querySelector<HTMLOptionElement>('.tz-timeselect__menu option')!;
    expect(option).not.toBeNull();

    // The declaration lands on the option, reading the same tokens as the
    // closed menu, so a screen overriding --tz-time-bg moves both together.
    // Lowercased: jsdom normalises the casing of a system colour keyword, and
    // which way it does that is not what this test is about.
    const style = getComputedStyle(option);
    expect(style.backgroundColor.toLowerCase()).toBe('var(--tz-time-bg, var(--tz-bg, canvas))');
    expect(style.color.toLowerCase()).toBe('var(--tz-time-fg, var(--tz-fg, canvastext))');
  });
});
