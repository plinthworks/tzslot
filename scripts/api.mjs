/**
 * The options tables in the documentation, written from the source.
 *
 * Every widget's settings are an interface with a comment on each field. Those
 * comments are the documentation; copying them into Markdown by hand is how a
 * table ends up describing an option that was renamed two releases ago. This
 * reads the interfaces and writes the tables, and `npm test` fails when what
 * is written no longer matches.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const root = new URL('..', import.meta.url).pathname;

/** Every widget, with the interface that describes what it takes. */
export const WIDGETS = [
  { name: 'createCalendar', file: 'calendar.ts', settings: 'CalendarSettings', angular: 'tz-calendar' },
  {
    name: 'createMultiDate',
    file: 'multi-date.ts',
    // Its settings are the calendar's, with a different value and one addition.
    settings: 'CalendarSettings',
    from: 'calendar.ts',
    overrides: {
      value: { type: 'readonly PlainDate[]', note: 'The chosen days, always in date order.', fallback: '[]' },
    },
    extra: [
      {
        name: 'maxDates',
        type: 'number | undefined',
        fallback: 'undefined',
        note: 'Once this many days are chosen, the others stop taking clicks until one is removed.',
      },
    ],
    angular: 'tz-multi-date',
  },
  { name: 'createDateField', file: 'date-field.ts', settings: 'DateFieldSettings', angular: 'tz-date-field' },
  { name: 'createDateTimeField', file: 'datetime-field.ts', settings: 'DateTimeFieldSettings', angular: 'tz-datetime-field' },
  { name: 'createRangeField', file: 'range-field.ts', settings: 'RangeFieldSettings', angular: 'tz-range-field' },
  { name: 'createDateRange', file: 'date-range.ts', settings: 'DateRangeSettings', angular: 'tz-date-range' },
  { name: 'createTimeSlots', file: 'time-slots.ts', settings: 'TimeSlotsSettings', angular: 'tz-time-slots' },
  { name: 'createDateTimeRange', file: 'datetime-range.ts', settings: 'DateTimeRangeSettings', angular: 'tz-datetime-range' },
  { name: 'createDailyRange', file: 'daily-range.ts', settings: 'DailyRangeSettings', angular: 'tz-daily-range' },
  { name: 'createTimeInput', file: 'time-input.ts', settings: 'TimeInputSettings', angular: 'tz-time-input' },
  { name: 'createTimeSelect', file: 'time-select.ts', settings: 'TimeSelectSettings', angular: 'tz-time-select' },
];

/**
 * What the options that recur mean. Writing the same sentence into ten
 * interfaces would only guarantee that they drift apart; a field's own
 * comment always wins over what is here.
 */
export const COMMON = {
  locale: "A BCP-47 tag for the month and weekday names, and the order of a date. The browser's own when left out.",
  timeZone: "An IANA identifier — 'Europe/Paris', never an offset. Offsets change twice a year.",
  min: 'The earliest day that can be chosen.',
  max: 'The latest day that can be chosen.',
  minTime: 'The earliest time offered.',
  maxTime: 'The latest time offered.',
  today: 'Which day is today. Settable so a test does not depend on the day it runs.',
  firstDayOfWeek: 'Which day a week starts on, as ISO-8601 numbers them: 1 is Monday, 7 is Sunday.',
  isDateDisabled: 'Rules out individual days inside the range: closures, weekends, days already full.',
  renderCell: 'Adds to each day: a note under the number, a class of your own, a tooltip, or a reason to rule it out.',
  buttons: "Buttons under the grid: 'today', 'clear'. None by default.",
  stepMinutes: 'Minutes between the times offered.',
  hour12: 'Twelve-hour with an AM/PM control. The locale decides when left out.',
  mode: "'popup' hangs the panel under the field; 'dialog' centres it over the page.",
  placeholder: 'What the field shows while it holds nothing.',
  ariaLabel: 'The accessible name, for a screen reader.',
  dateStyle: "Intl's own form for the date, when the field is not typed into.",
  timeStyle: "Intl's own form for the time, when the field is not typed into.",
  disabled: 'Nothing can be chosen while this is set.',
  messages: 'The words the widget says. One bundle, English and French included.',
  onChange: 'Called when the user chooses, changes or clears the value.',
  onOpen: 'Called when the panel opens.',
  onClose: 'Called when the panel closes.',
  onViewChange: 'Called when the grid moves between days, months and years.',
};

const sourceOf = (file) =>
  ts.createSourceFile(file, readFileSync(join(root, 'packages/dom/src', file), 'utf8'), ts.ScriptTarget.ES2022, true);

/** The comment above a field, as one line of prose. */
function commentOf(node, text) {
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
  const raw = ranges.map((r) => text.slice(r.pos, r.end)).join('\n');
  return raw
    // The fences first: stripping line by line would leave the closing slash
    // behind, because the star of "*/" looks like the star of a comment line.
    .replace(/\/\*\*?/g, '')
    .replace(/\*\//g, '')
    .replace(/^\s*\*\s?/gm, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const oneLine = (text) => text.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();

/** The fields of one settings interface: name, type, and what its comment says. */
export function fieldsOf(file, interfaceName) {
  const source = sourceOf(file);
  const text = source.getFullText();
  let found = null;
  source.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) found = node;
  });
  if (!found) throw new Error(`${interfaceName} not found in ${file}`);

  return found.members
    .filter(ts.isPropertySignature)
    .map((member) => {
      const name = member.name.getText(source);
      return {
        name,
        type: oneLine(member.type?.getText(source) ?? 'unknown'),
        // A field's own comment first; the shared sentence otherwise.
        note: commentOf(member, text) || COMMON[name] || '',
      };
    });
}

/** The defaults, read from the object every widget starts from. */
export function defaultsOf(file) {
  const source = sourceOf(file);
  let defaults = {};
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(source) === 's' &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const property of node.initializer.properties) {
        if (ts.isPropertyAssignment(property)) {
          defaults[property.name.getText(source)] = oneLine(property.initializer.getText(source));
        }
      }
    }
    node.forEachChild(visit);
  };
  source.forEachChild(visit);
  return defaults;
}

const escape = (text) => text.replace(/\|/g, '\\|');

export function tableFor(widget) {
  const fields = fieldsOf(widget.from ?? widget.file, widget.settings)
    .map((field) => {
      const override = widget.overrides?.[field.name];
      return override ? { ...field, ...override } : field;
    })
    .concat(widget.extra ?? []);
  const defaults = { ...defaultsOf(widget.from ?? widget.file) };
  for (const field of fields) if (field.fallback !== undefined) defaults[field.name] = field.fallback;
  const rows = fields
    .filter((field) => !field.name.startsWith('on'))
    .map((field) => {
      const fallback = defaults[field.name];
      const shown = fallback === undefined || fallback === 'undefined' ? '—' : `\`${escape(fallback)}\``;
      return `| \`${field.name}\` | \`${escape(field.type)}\` | ${shown} | ${escape(field.note)} |`;
    });
  const events = fields
    .filter((field) => field.name.startsWith('on'))
    .map((field) => `| \`${field.name}\` | \`${escape(field.type)}\` | ${escape(field.note)} |`);

  return [
    `### Options`,
    '',
    '| Option | Type | Default | |',
    '|---|---|---|---|',
    ...rows,
    '',
    ...(events.length ? ['### Callbacks', '', '| | Type | |', '|---|---|---|', ...events, ''] : []),
  ].join('\n');
}

if (process.argv[1]?.endsWith('api.mjs')) {
  mkdirSync(join(root, 'site/api'), { recursive: true });
  for (const widget of WIDGETS) {
    const title = widget.angular ? `${widget.name} · \`<${widget.angular}>\`` : `${widget.name}`;
    writeFileSync(
      join(root, `site/api/${widget.file.replace('.ts', '.md')}`),
      `<!-- Written by scripts/api.mjs from packages/dom/src/${widget.file}. Do not edit. -->\n\n# ${title}\n\n${tableFor(widget)}\n`,
    );
  }
  console.log(`Wrote ${WIDGETS.length} API pages into site/api`);
}
