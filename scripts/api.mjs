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
  { name: 'createMultiDate', file: 'multi-date.ts', settings: 'MultiDateSettings', angular: 'tz-multi-date' },
  { name: 'createDateField', file: 'date-field.ts', settings: 'DateFieldSettings', angular: 'tz-date-field' },
  { name: 'createDateTimeField', file: 'datetime-field.ts', settings: 'DateTimeFieldSettings', angular: 'tz-datetime-field' },
  { name: 'createDateRange', file: 'date-range.ts', settings: 'DateRangeSettings', angular: 'tz-date-range' },
  { name: 'createTimeSlots', file: 'time-slots.ts', settings: 'TimeSlotsSettings', angular: 'tz-time-slots' },
  { name: 'createDateTimeRange', file: 'datetime-range.ts', settings: 'DateTimeRangeSettings', angular: 'tz-datetime-range' },
  { name: 'createDailyRange', file: 'daily-range.ts', settings: 'DailyRangeSettings', angular: 'tz-daily-range' },
  { name: 'createTimeInput', file: 'time-input.ts', settings: 'TimeInputSettings', angular: null },
  { name: 'createTimeSelect', file: 'time-select.ts', settings: 'TimeSelectSettings', angular: null },
];

const sourceOf = (file) =>
  ts.createSourceFile(file, readFileSync(join(root, 'packages/dom/src', file), 'utf8'), ts.ScriptTarget.ES2022, true);

/** The comment above a field, as one line of prose. */
function commentOf(node, text) {
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
  const raw = ranges.map((r) => text.slice(r.pos, r.end)).join('\n');
  return raw
    .replace(/\/\*\*?|\*\/|^\s*\*\s?/gm, '')
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
    .map((member) => ({
      name: member.name.getText(source),
      type: oneLine(member.type?.getText(source) ?? 'unknown'),
      note: commentOf(member, text),
    }));
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
  const fields = fieldsOf(widget.file, widget.settings);
  const defaults = defaultsOf(widget.file);
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
