# tzslot — context for Claude Code

Date and time pickers built on Temporal that handle daylight saving: the hour
that is skipped, the hour that happens twice, the real length of an interval.
A real client need; the owner tests every release in their own Angular 19 app.

## Layout

- `packages/core` — `@tzslot/core`: pure Temporal logic, no DOM.
- `packages/dom` — `@tzslot/dom`: every widget in plain DOM (`create…`). Messages
  EN/FR live here. **New behaviour goes here first.**
- `packages/angular` — `@tzslot/angular`: thin wrappers (signals, `model()`,
  ControlValueAccessor, widget calls `untracked` inside effects). Angular 18–21.
- `packages/theme` — `@tzslot/theme`: `tzslot.scss` is the source; run
  `npm run build:theme` after editing it (a test fails if the CSS drifts).
- `playground/` — `index.html` (Angular), `vanilla.html`, `tailwind.html`.
- `ROADMAP.md` — what is done and what is next. Keep it current.

## Commands

```bash
npm start              # playground on http://localhost:4500 — often already running; don't kill it
npm test               # vitest + jsdom
npm run typecheck      # every package, tests and playground
npm run build          # each package into packages/*/dist (only dist/ is published)
npm run pack:local     # tarballs into packed/
npm run publish:dry    # what would be published
npm run publish:next   # publish a pre-release under the `next` tag — run by the owner (npm login, OTP)
```

## Releases

- 0.1.0-beta.0 of all four packages is on npm (org `tzslot`), tagged
  `v0.1.0-beta.0` in git. npm also set `latest` to it (first publish always does).
- Next beta: bump the version in every `packages/*/package.json` **and** the
  internal `@tzslot/*` dependency pins, `npm run publish:dry`, the owner runs
  `npm run publish:next`, then tag and push the tag. npm never accepts the same
  version twice.
- Licence MIT © Plinthworks. The Temporal polyfill stays a static import
  (≈19 kB gzipped of the core's 20) — decided by the owner.

## Working rules

- Verify before saying done: scripted edits must assert they matched; measure
  sizes and behaviour rather than asserting them; after a change that affects
  consumers, reinstall the packed packages into a throwaway Angular app and
  `ng build` it.
- jsdom checks behaviour, never layout. Say plainly what was not seen in a real
  browser; headless system Chrome through `playwright-core` (`channel: 'chrome'`)
  works without downloading a browser.
- Talk to the owner in French. Validate structural decisions with them before
  coding.
