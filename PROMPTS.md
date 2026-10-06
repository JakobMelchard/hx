# Agent prompts — run in order. Each = one PR. Read SPEC.md first.

Global rules (prepend to every prompt):

> Vanilla JS ESM, JSDoc types, `tsc --noEmit --checkJs --strict` must pass. `node --test` for units. No deps beyond: htmx@4.0.x (exact), wrangler, @capacitor/*, playwright, typescript (dev). No frameworks, no bundler unless stated (esbuild allowed only for Android bundle). Comments only for non-obvious why. Shortest correct code. Stop and report if a SPEC assumption is false — do not work around silently.

---

## P1 — core: `@core/hx` skeleton + Store contract

Repo `core`. Create `packages/hx` with `Store`/`Env` typedefs (SPEC §3), `store/memory.js`, `store/fs.js` (node:fs/promises, `put` = write tmp + rename for atomicity; `list(prefix)` returns sorted relative paths, non-recursive into prefix dir only if prefix ends with `/`, else recursive — pick one, document in contract), `store/contract.test.js` exporting `runStoreContract(name, mkStore)` covering: missing get→null, put/get roundtrip, list ordering, list on absent prefix → [], unicode, ignores `*.sync-conflict-*` flagged separately via `conflicts(prefix)`. Run contract against memory + fs. Add `tags.js` `match(tags, query)` + table tests (`a b -c k:v`, empty query matches all). Add `html.js` tagged template escaping interpolations, `raw()` opt-out. Done = CI-less local `npm test` + `tsc` green.

## P2 — core: router + transport

`handle.js`: `router(routes) => (req, env) => Promise<Response>`; routes `[method, "/sessions/:id/sets", fn]`; segment matcher (no URLPattern); 404/405; form body parse via `req.formData()`; `fn(ctx)` where ctx = `{req, env, params, form, url}` returns string (→ text/html) or Response. `transport.js`: `installLocalTransport(htmx, handle, env)` — hook `htmx:config:request`, replace `ctx.fetch`. FIRST: read htmx 4.0.x source, confirm ctx field name and event name; write finding into `packages/hx/NOTES.md`. Test with happy-dom or jsdom only if unavoidable; else Playwright page loading a static fixture.

## P3 — lift: domain + handlers (desktop target)

Repo `lift`, depends on `@core/hx` via `file:` path for now. Implement SPEC §1 typedefs in `src/types.js`; `src/paths.js` (`isoWeek(date)`, `sessionPath(start, device)`); handlers for every SPEC §2 endpoint; views as `html` templates; `serve.js` = node:http → Request adapter → `handle` with fs store at `$LIFT_DATA`. Fixtures in `data/` (5 exercises, 2 routines, 6 sessions across 2 weeks, 1 active). Unit tests per handler using memory store. Page must work with JS disabled for GET `/` (history visible).

## P4 — lift: Playwright e2e

`e2e/flow.spec.js`: start routine → add 3 sets → undo 1 → finish → appears in current week → navigate W−1 → tag filter narrows list. Runs against `$BASE_URL`; `npm run e2e` starts `serve.js` on temp copy of `data/`. Assert resulting session JSON on disk matches expected (read file after finish).

## P5 — lift: Workers target

`worker.js` + `wrangler.toml`, R2 bucket binding `DATA`. Add `store/r2.js` to **core** (P5a PR in core, run contract via `wrangler dev`/miniflare), consume in lift. Same e2e passes with `BASE_URL` pointed at `wrangler dev` seeded from `data/`.

## P6 — lift: Android target

Capacitor app in `android/`. `www/index.html` loads htmx + bundled `handle` (esbuild, one file). `store/saf.js` in core: evaluate Capawesome File Manager plugin vs minimal custom Kotlin plugin (`DocumentFile`, `takePersistableUriPermission`); pick fewer LOC + no Play-restricted perms; record decision in core `NOTES.md`. First launch: folder picker → persist URI → `installLocalTransport`. Device id = persisted random 6 chars. Emulator e2e: same flow as P4 via Playwright over CDP (WebView debugging) or Maestro — pick whichever reuses P4 spec, document.

## P7 — core: CI platform

Reusable workflows + composite actions per SPEC §4 (`on: workflow_call`, typed inputs, no secrets inheritance by default). `consumers-e2e.yml`: read `consumers.json`, matrix checkout, rewrite consumer's `@core/hx` dep to PR checkout and workflow refs to PR sha, run `e2e`. Lift: replace local CI with 3-line callers. Add Renovate config to lift for npm + github-actions refs.

## P8 — core: devcontainer + hooks + skills

Devcontainer feature `hx-app` (node LTS, wrangler, JDK 21, Android cmdline-tools, playwright chromium), publish via `devcontainers/action` to GHCR. Hooks: use the shared set from `JakobMelchard/.github`; core-only checks go in `.githooks/pre-commit.local`. Write skills (`agents/skills/*/SKILL.md`, frontmatter `name`, `description`): `new-hx-app` (scaffold from `templates/hx-app`, register in `consumers.json`), `add-store-adapter` (must pass `runStoreContract`), `promote-pattern` (SPEC §5 criteria, checklist), `upgrade-core`. Validate `new-hx-app` by scaffolding a throwaway second consumer (e.g. `habits`: same Session shape, no routines) and running its e2e in `consumers-e2e`.

## P9 — migrate Health data

Script `scripts/import-health.js`: read old Health JSON (inspect real files first; map Segment types → `SetSpec` fields; unmapped → `note`), write into `data/` layout, report counts + unmapped fields. Dry-run default.
