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

## The period field, and why it looks like that

`createRangeField` / `<tz-range-field>` is the widget the owner exercises
hardest; most of the library's recent decisions were made in it and have not
yet been generalised.

- Its panel is **two fields (From/To) plus one calendar**, not a two-click
  range: a click fills the *armed* field only, so one date can be corrected
  without redoing both. Filling the start arms the end — unless the reader
  armed a field themselves, in which case they are correcting that one.
- Both fields are typed into (`date-input.ts`, a bare field with no panel of
  its own). The hour sits **inside** each field: `timeLayout: 'select'` (two
  menus, the default) or `'input'` (figures with arrows above and below).
- **There is no "all day" switch.** `showTime` decides; `defaultTimes` says
  what hour a chosen day gets. A value handed in keeps its own hours.
- A shortcut named in days still means whole days whatever the screen shows —
  "this quarter" ends at the midnight *after* 30 September.
- Emptying a field is what says "open at that end" (`openEnded`), and it never
  forgets the arrows' step.
- On the morning an hour repeats, the menus offer it twice and **star the
  second** (`02`, `02*`), with a line under the field naming the reading *in
  force*. The figures cannot say it, so there a pair of buttons appears.
- A typed length (`lengthBox`) **never rewrites an end that exists**: it fills
  a missing one, and is otherwise only the arrows' step.
- Icons live in `icons.ts`, drawn here rather than taken from Lucide, and are
  used so far only by the period field's two date inputs.

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
  works without downloading a browser. **Element screenshots there are taken by
  coordinates after scrolling** and can capture a different part of the page —
  clip a full-page screenshot to the element's box instead.
- A framework hands the value straight back after every change. Panel state
  (which field is armed, which reading was picked) must survive `update({ value })`
  or it resets between two clicks — this has bitten twice.
- Where jsdom cannot see a rule that matters (a wrap, a min-width, a border),
  assert the CSS text itself in a test.
- Talk to the owner in French. Validate structural decisions with them before
  coding.
