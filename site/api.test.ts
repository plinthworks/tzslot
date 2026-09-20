// @vitest-environment node
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WIDGETS, tableFor, fieldsOf } from '../scripts/api.mjs';

/**
 * The API pages are written from the source by scripts/api.mjs. A table kept
 * by hand describes an option that was renamed two releases ago; this fails
 * instead, and `npm run docs:api` puts it right.
 */
const site = fileURLToPath(new URL('.', import.meta.url));

describe('the options tables', () => {
  it.each(WIDGETS)('$name is what its source says', (widget) => {
    const page = readFileSync(`${site}api/${widget.file.replace('.ts', '.md')}`, 'utf8');
    expect(page, `run npm run docs:api`).toContain(tableFor(widget));
  });

  it('describes every option, and nothing else', () => {
    const documented = fieldsOf('datetime-field.ts', 'DateTimeFieldSettings').map((f) => f.name);
    expect(documented).toContain('timeLayout');
    expect(documented).toContain('defaultTime');
    // A field with no comment would read as an empty cell, which is worse
    // than no row at all.
    const silent = fieldsOf('datetime-field.ts', 'DateTimeFieldSettings').filter((f) => !f.note);
    expect(silent.map((f) => f.name)).toEqual([]);
  });
});
