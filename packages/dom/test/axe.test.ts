import { describe, it, expect, afterEach } from 'vitest';
import axe from 'axe-core';
import * as tzslot from '../src/index.js';
import { Temporal } from '@tzslot/core';

/**
 * Every widget, and its panel, run through axe.
 *
 * Four of the ten things a consumer reported against 2.2.0 were accessibility
 * defects, all four found by their axe sweep and none by the 1 413 tests here.
 * Two of them — a month title named by its action while showing a month, and
 * `aria-expanded` on a text box with no role — are rules axe already knows:
 * `label-content-name-mismatch` and `aria-allowed-attr`. Nothing of ours
 * looked, so a consumer looked for us, twice, a release apart.
 *
 * What this cannot do is colour. `color-contrast` needs layout, and jsdom has
 * none — axe skips the rule rather than passing it, so a contrast failure is
 * still invisible here. The fourth report was exactly that: faded days at
 * `opacity: 0.35` falling under 4.5:1. That one needs a browser or a
 * calculation over the palette, and this file does not pretend otherwise.
 *
 * Each widget is checked closed and then open, because a field closed is a
 * button and a field open is most of the markup.
 */

let built: { destroy(): void } | undefined;
afterEach(() => {
  built?.destroy();
  built = undefined;
  document.body.replaceChildren();
});

const paris = 'Europe/Paris';
const today = Temporal.PlainDate.from('2026-09-20');

const day = Temporal.PlainDate.from('2026-09-23');
const at = Temporal.Instant.from('2026-09-23T12:30:00Z');

/**
 * Every widget the dom package makes, empty and holding something.
 *
 * Both, because the defects live in different states. A trigger that leaves
 * its value out of its accessible name only does so once there is a value —
 * built empty, the first version of this file exercised nothing and missed the
 * very defect it was written for. A panel's markup only exists once it opens.
 */
const WIDGETS: ReadonlyArray<{
  name: string;
  options: Record<string, unknown>;
  filled?: Record<string, unknown>;
}> = [
  { name: 'Calendar', options: { buttons: ['today', 'clear'] }, filled: { value: day } },
  { name: 'MultiDate', options: {}, filled: { value: [day] } },
  { name: 'DateRange', options: {}, filled: { value: { start: day, end: day.add({ days: 4 }) } } },
  { name: 'DateField', options: {}, filled: { value: day } },
  { name: 'DateTimeField', options: { timeZone: paris }, filled: { value: at } },
  {
    name: 'RangeField',
    options: { timeZone: paris, months: 1 },
    filled: { value: { start: at, end: at.add({ hours: 72 }) } },
  },
  {
    name: 'DateTimeRange',
    options: { timeZone: paris },
    filled: { value: { start: at, end: at.add({ hours: 8 }) } },
  },
  { name: 'DailyRange', options: { timeZone: paris } },
  { name: 'TimeSlots', options: { timeZone: paris, date: '2026-09-20', stepMinutes: 60 } },
  { name: 'DateInput', options: {}, filled: { value: { date: day, time: null } } },
  { name: 'TimeInput', options: {} },
  { name: 'TimeSelect', options: {} },
];

/**
 * The rules worth asserting in jsdom.
 *
 * Narrowed deliberately. A document with one widget in it and no landmarks,
 * no `<html lang>` and no heading order has page-level failures that belong to
 * a page rather than to a widget, and asserting them here would mean a wall of
 * noise nobody reads — which is how a check like this gets deleted. These are
 * the rules that describe a control: its name, its role, the attributes it is
 * allowed, and the relationships it claims.
 */
const RULES = [
  'aria-allowed-attr',
  'aria-allowed-role',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-roles',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'button-name',
  'duplicate-id-aria',
  'input-button-name',
  'label',
  'label-content-name-mismatch',
  'nested-interactive',
  'select-name',
  'aria-hidden-focus',
];

/**
 * What axe can actually decide here.
 *
 * Violations only. An `incomplete` result means axe is asking for a human, and
 * in jsdom it asks a lot: `label-content-name-mismatch` cannot be decided
 * without knowing what is visible, and jsdom has no layout. Asserting on
 * `incomplete` was tried — it fired on correct code, on `‹` named "Previous
 * month", which is a button named by words and a symbol on its face. Ten
 * failures with the defect present and ten with it absent is not a signal.
 *
 * So that one rule is checked below by hand, and axe is left the rules it can
 * rule on: roles, allowed attributes, attribute values, names that are absent
 * rather than mismatched.
 */
const complaints = async (): Promise<string[]> => {
  const results = await axe.run(document.body, {
    runOnly: { type: 'rule', values: RULES },
    resultTypes: ['violations'],
  });
  return results.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.html.slice(0, 120)}`),
  );
};

/**
 * WCAG 2.5.3, checked ourselves: a button's name must contain what it says.
 *
 * `aria-label` replaces an element's contents for a screen reader, so a button
 * reading "September 2026" and labelled "Choose a month" is announced without
 * the month — and someone using voice control cannot say what they can see.
 * A consumer's axe sweep, in a real browser, reported this as
 * `label-content-name-mismatch` on the month title of the calendar and of the
 * period field. Ours could not: see above.
 *
 * Two things are left alone. A button whose face carries no letter and no
 * digit — `‹`, `›`, a cross, an icon — because the rule is about text labels
 * and a chevron is not one. And a field showing its placeholder, which this
 * check first reported and should not have: WCAG 2.5.3 is about *labels* that
 * include text, and a placeholder is what stands there in the absence of a
 * value, not a label. Asserting it made an empty period field announce
 * "Choose a range, Start date – End date", broke two tests that were right,
 * and I changed the library before reading the criterion. The field says which
 * state it is in, so this asks it.
 */
const WORDS = /[\p{L}\p{N}]/u;
const mismatched = (): string[] => {
  const wrong: string[] = [];
  for (const button of document.querySelectorAll('button, [role="button"]')) {
    const shown = (button.textContent ?? '').trim();
    const name = button.getAttribute('aria-label');
    if (!name || !shown || !WORDS.test(shown)) continue;
    if (button.classList.contains('tz-field__trigger--empty')) continue;
    // Compared with spaces normalised and case folded: "Choose a month,
    // September 2026" contains "September 2026", and a name that merely
    // differs in spacing is not a defect anybody can hear.
    const flat = (text: string) => text.replace(/\s+/g, ' ').toLocaleLowerCase();
    if (!flat(name).includes(flat(shown))) {
      wrong.push(`shows "${shown}" and is named "${name}"`);
    }
  }
  return wrong;
};

const build = (name: string, options: Record<string, unknown>) => {
  const host = document.createElement('div');
  document.body.append(host);
  const create = (tzslot as Record<string, unknown>)[`create${name}`] as (
    host: HTMLElement,
    options: unknown,
  ) => { destroy(): void };
  built = create(host, { locale: 'en-GB', today, ...options });
  return host;
};

describe('axe, on every widget', () => {
  it('has a rule list that axe still recognises', () => {
    // A guard on the guard: a renamed or removed rule would silently narrow
    // this file to nothing, and `runOnly` does not complain about a rule it
    // has never heard of.
    const known = new Set(axe.getRules().map((rule) => rule.ruleId));
    const unknown = RULES.filter((rule) => !known.has(rule));
    expect(unknown).toEqual([]);
  });

  for (const { name, options } of WIDGETS) {
    it(`${name}, as it is built`, async () => {
      build(name, options);
      expect(await complaints()).toEqual([]);
      expect(mismatched()).toEqual([]);
    });

    if (options && WIDGETS.find((w) => w.name === name)?.filled) {
      it(`${name}, holding a value`, async () => {
        const filled = WIDGETS.find((w) => w.name === name)!.filled!;
        const host = build(name, { ...options, ...filled });
        expect(await complaints()).toEqual([]);
        expect(mismatched()).toEqual([]);
        const trigger = host.querySelector<HTMLButtonElement>('.tz-field__trigger');
        if (!trigger) return;
        trigger.click();
        expect(await complaints()).toEqual([]);
        expect(mismatched()).toEqual([]);
      });
    }

    it(`${name}, with its panel open`, async () => {
      const host = build(name, options);
      const trigger = host.querySelector<HTMLButtonElement>('.tz-field__trigger');
      // Only four of the twelve have a panel; the rest are already on screen.
      if (!trigger) return;
      trigger.click();
      expect(document.querySelector('.tz-field__panel')).not.toBeNull();
      expect(await complaints()).toEqual([]);
      expect(mismatched()).toEqual([]);
    });
  }
});
