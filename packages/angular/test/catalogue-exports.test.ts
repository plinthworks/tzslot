import { describe, it, expect } from 'vitest';
import * as dom from '@tzslot/dom';
import * as angular from '../src/index.js';

/**
 * Every catalogue the dom package ships, reachable from the Angular one.
 *
 * `AR` was not. `messages.ts` re-exported all three from the dom package and
 * `index.ts` forwarded two, naming them one by one — so an Angular screen
 * could not compose an Arabic catalogue without importing from
 * `@tzslot/dom`, which is not its declared dependency. Reported by a consumer
 * who went and declared it, which is a borrowing one export line avoids.
 *
 * The release whose headline was Arabic shipped Arabic unreachable from
 * Angular, and it shipped twice. Nothing read the export list, so this does:
 * mechanically, by name, so the next catalogue cannot be forgotten the same
 * way. The same spirit as the audit of every settings key against every
 * wrapper input — that one was written after the same class of defect.
 */
const CATALOGUE = /^[A-Z]{2}$/;

describe('the catalogues an Angular screen can reach', () => {
  it('is every one the dom package exports', () => {
    const shipped = Object.keys(dom).filter(
      (name) => CATALOGUE.test(name) && typeof (dom as Record<string, unknown>)[name] === 'object',
    );
    // A guard on the guard: if the shape of a catalogue name ever changes,
    // this finds nothing and would pass by saying nothing at all.
    expect(shipped.length).toBeGreaterThanOrEqual(3);
    expect(shipped).toContain('AR');
    for (const name of shipped) expect(angular).toHaveProperty(name);
  });

  it('and they are the same objects, not copies', () => {
    expect((angular as Record<string, unknown>).AR).toBe(dom.AR);
    expect((angular as Record<string, unknown>).FR).toBe(dom.FR);
  });
});
