/**
 * Loads Temporal the way an application does, before any test runs.
 *
 * `@tzslot/core` installs the polyfill as its entry point evaluates, so a
 * consumer never thinks about it. A test that reaches past the entry — and
 * many do, importing `../src/grid.js` to test one function — skips that, and
 * on Node, which has no Temporal of its own, every call then throws.
 *
 * Importing the entry once here is exactly what a consumer's first import
 * does. It also means the error a reader gets from the lazy path stays real
 * rather than being papered over: two test files hit it the moment the
 * polyfill stopped being imported by `temporal.ts`, and said so clearly.
 */
import '../src/index.js';
