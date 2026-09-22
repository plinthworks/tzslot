import { describe, it, expect, afterEach } from 'vitest';
import * as tzslot from '../src/index.js';

/**
 * Every widget, alone on an empty page.
 *
 * Two bugs shipped in 1.0.0 because nothing ever checked this: a date field
 * drew a column of unstyled buttons where its calendar should be, and it
 * looked right anywhere a second widget had already injected that sheet —
 * which is every documentation page and every test that mounts more than one
 * thing.
 *
 * The check is mechanical: a widget that renders `.tz-cal` must have declared
 * the calendar sheet, `.tz-slots` the slots sheet, and so on. A class with no
 * rules behind it is an element with no layout.
 */
const SHEET_OF: Record<string, string> = {
  'tz-cal': 'calendar',
  'tz-field': 'field',
  'tz-slots': 'slots',
  'tz-range': 'range',
  'tz-dtr': 'dtr',
  'tz-daily': 'daily',
  'tz-time': 'time',
  'tz-datetime': 'datetime',
  'tz-timeselect': 'timeselect',
  'tz-dateinput': 'dateinput',
  'tz-rangefield': 'rangefield',
};

/** Each widget, with whatever it needs in order to draw anything at all. */
const WIDGETS: { name: string; options?: Record<string, unknown> }[] = [
  { name: 'Calendar' },
  { name: 'MultiDate' },
  { name: 'DateField' },
  { name: 'DateTimeField' },
  { name: 'DateTimeField', options: { timeLayout: 'select' } },
  { name: 'DateTimeField', options: { timeLayout: 'list' } },
  { name: 'DateRange' },
  { name: 'RangeField' },
  { name: 'RangeField', options: { showTime: true } },
  { name: 'TimeSlots', options: { date: '2026-09-22', timeZone: 'Europe/Paris' } },
  { name: 'DateTimeRange' },
  { name: 'DailyRange' },
  { name: 'TimeInput' },
  { name: 'TimeSelect' },
];

let made: { destroy(): void } | null = null;

afterEach(() => {
  made?.destroy();
  made = null;
  document.body.replaceChildren();
  for (const style of document.head.querySelectorAll('style[data-tzslot]')) style.remove();
});

/** The class families actually rendered, and the sheets actually declared. */
function paint(name: string, options: Record<string, unknown>) {
  const host = document.createElement('div');
  document.body.append(host);
  const create = (tzslot as unknown as Record<string, (h: HTMLElement, o: unknown) => { destroy(): void; open?(): void }>)[
    `create${name}`
  ]!;
  const widget = create(host, { timeZone: 'Europe/Paris', locale: 'en-GB', ...options });
  made = widget;
  widget.open?.();

  const families = new Set<string>();
  for (const el of document.querySelectorAll('[class*="tz-"]')) {
    for (const cls of el.classList) {
      const family = cls.split('__')[0]!.split('--')[0]!;
      if (family in SHEET_OF) families.add(family);
    }
  }
  const sheets = new Set(
    [...document.querySelectorAll<HTMLStyleElement>('style[data-tzslot]')].map((s) => s.dataset['tzslot']!),
  );
  return { families: [...families].sort(), sheets };
}

describe('a widget on a page of its own brings its own layout', () => {
  for (const { name, options = {} } of WIDGETS) {
    const label = Object.keys(options).length ? `${name} (${JSON.stringify(options)})` : name;
    it(label, () => {
      const { families, sheets } = paint(name, options);
      expect(families.length, 'it should render something').toBeGreaterThan(0);
      const missing = families.filter((f) => !sheets.has(SHEET_OF[f]!));
      expect(missing, `no rules behind ${missing.join(', ')}`).toEqual([]);
    });
  }
});
