import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { join } from 'node:path';

/**
 * Every setting a dom widget takes, reachable as an input on its wrapper.
 *
 * 2.1.0 did this once, by hand, and found four gaps — three of them real:
 * `endBeforeStartMessage` and `emptyPeriodMessage` went into the period field
 * in 2.0.0 and were never wired, so the release that introduced them shipped
 * them unreachable from Angular, and `mask` existed on two of the three
 * moment widgets. A one-off audit finds what is wrong today; it does nothing
 * about tomorrow, and `showZone` was added to the dom package an hour ago and
 * would have been missed the same way.
 *
 * So the audit runs. For each widget: the keys of its settings interface
 * against the `input()` declarations of the component that wraps it, read with
 * the compiler rather than by grep, so a rename moves both or fails here.
 *
 * The same shape as the catalogue-export check beside it, and for the same
 * reason — a piece written and a wire not run is the defect this repository
 * produces most, and neither grep nor a reader finds it.
 *
 * `createDateInput` is absent from the list: there is no `tz-date-input`
 * component at all. It is the box the period panel builds its two ends from,
 * exported because the panel's own documentation refers to it, and it has no
 * guide page either. If it ever gets a wrapper it belongs here.
 */

const root = join(process.cwd(), 'packages');

/** Widget → its settings interface in dom, and the Angular component for it. */
const PAIRS = [
  { settings: 'CalendarSettings', dom: 'dom/src/calendar.ts', ng: 'angular/src/calendar.ts' },
  { settings: 'MultiDateSettings', dom: 'dom/src/multi-date.ts', ng: 'angular/src/multi-date.ts' },
  { settings: 'DateRangeSettings', dom: 'dom/src/date-range.ts', ng: 'angular/src/date-range.ts' },
  { settings: 'DateFieldSettings', dom: 'dom/src/date-field.ts', ng: 'angular/src/date-field.ts' },
  {
    settings: 'DateTimeFieldSettings',
    dom: 'dom/src/datetime-field.ts',
    ng: 'angular/src/datetime-field.ts',
  },
  { settings: 'RangeFieldSettings', dom: 'dom/src/range-field.ts', ng: 'angular/src/range-field.ts' },
  {
    settings: 'DateTimeRangeSettings',
    dom: 'dom/src/datetime-range.ts',
    ng: 'angular/src/datetime-range.ts',
  },
  { settings: 'DailyRangeSettings', dom: 'dom/src/daily-range.ts', ng: 'angular/src/daily-range.ts' },
  {
    settings: 'TimeSlotsSettings',
    dom: 'dom/src/time-slots.ts',
    ng: 'angular/src/time-slot-picker.ts',
  },

  { settings: 'TimeInputSettings', dom: 'dom/src/time-input.ts', ng: 'angular/src/time-input.ts' },
  { settings: 'TimeSelectSettings', dom: 'dom/src/time-select.ts', ng: 'angular/src/time-select.ts' },
];

/**
 * Settings a wrapper is right not to expose as an input.
 *
 * Each one is a decision, not an oversight, and says which. A list that grows
 * without a reason beside each line is this check being emptied one entry at a
 * time.
 */
const NOT_INPUTS: Record<string, string> = {
  value: 'two-way, through the component’s model rather than a plain input',
  onChange: 'an Angular output, not an input',
  onOpen: 'an Angular output',
  onClose: 'an Angular output',
  onViewChange: 'an Angular output',
};

const program = ts.createProgram(
  PAIRS.flatMap((pair) => [join(root, pair.dom), join(root, pair.ng)]),
  {
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    experimentalDecorators: true,
    skipLibCheck: true,
    noEmit: true,
  },
);
const checker = program.getTypeChecker();

/**
 * The property names of a settings type declared in a file.
 *
 * An interface or a type alias: `MultiDateSettings` is
 * `GridSettings<readonly PlainDate[]>`, and a first version of this read only
 * interfaces, found no keys for it, and compared nothing to nothing — which
 * passed. Hence the guard below that every list has keys in it.
 */
function settingsOf(file: string, name: string): string[] {
  const source = program.getSourceFile(join(root, file));
  if (!source) return [];
  const found: string[] = [];
  source.forEachChild((node) => {
    const matches =
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
      node.name.text === name;
    if (!matches) return;
    for (const member of checker.getPropertiesOfType(checker.getTypeAtLocation(node))) {
      found.push(member.name);
    }
  });
  return found.sort();
}

/** Every `readonly x = input(…)` or `input.required(…)` in a component file. */
function inputsOf(file: string): string[] {
  const source = program.getSourceFile(join(root, file));
  if (!source) return [];
  const found: string[] = [];
  const walk = (node: ts.Node): void => {
    if (ts.isPropertyDeclaration(node) && node.initializer && ts.isIdentifier(node.name)) {
      const text = node.initializer.getText(source);
      if (/^input(\.required)?[<(]/.test(text) || /^model(\.required)?[<(]/.test(text)) {
        found.push(node.name.text);
      }
    }
    node.forEachChild(walk);
  };
  walk(source);
  return found.sort();
}

describe('every dom setting is an Angular input', () => {
  it('reads both sides at all', () => {
    // A guard on the guard. A moved file or a renamed interface would make
    // every list below empty, and twelve comparisons of nothing to nothing
    // pass in silence.
    for (const pair of PAIRS) {
      expect(settingsOf(pair.dom, pair.settings).length, `${pair.settings} has no keys`).toBeGreaterThan(3);
      expect(inputsOf(pair.ng).length, `${pair.ng} has no inputs`).toBeGreaterThan(3);
    }
  });

  for (const pair of PAIRS) {
    it(pair.settings, () => {
      const inputs = new Set(inputsOf(pair.ng));
      const missing = settingsOf(pair.dom, pair.settings).filter(
        (key) => !inputs.has(key) && !(key in NOT_INPUTS),
      );
      expect(missing).toEqual([]);
    });
  }

  it('and every exception still corresponds to a setting somewhere', () => {
    // An exception for a setting that no longer exists is an exception that
    // will one day excuse a real gap under the same name.
    const everywhere = new Set(PAIRS.flatMap((pair) => settingsOf(pair.dom, pair.settings)));
    const stale = Object.keys(NOT_INPUTS).filter((key) => !everywhere.has(key));
    expect(stale).toEqual([]);
  });
});
