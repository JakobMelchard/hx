# core — htmx 4 platform for Node, Workers, and in-page apps

Distributed as an npm package (`@jakobmelchard/core`), consumed by the repos in
`consumers.json`. JSDoc only, no TypeScript syntax; `tsc --checkJs` is the type gate.

## Commands

```sh
npm ci
npx tsc          # type gate, also run by .githooks/pre-commit.local
npm test         # node:test, test/*.test.js
npm run e2e      # test/e2e/*.test.js, needs Chromium
```

On macOS Playwright's own browser is usually absent. Use the installed app:

```sh
CHROMIUM_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" npm run e2e
```

## Layout

- `src/handle.js` `router(routes)` returning `(Request, Env) => Promise<Response>`
- `src/html.js` tagged template with escaping, `Raw` opt-out
- `src/tags.js` `match()`
- `src/transport.js` htmx 4 in-page `ctx.fetch` override, the Android seam
- `src/store/{memory,fs,r2}.js` Store adapters, `src/store/contract.js` `runStoreContract`
- `src/types.js` shared typedefs
- `agents/skills/` promote-pattern, upgrade-core, new-hx-app, add-store-adapter
- `templates/hx-app/`, `.devcontainer/` consumer scaffold
- `SPEC.md` design, `PROMPTS.md` roadmap as one PR per prompt

## Invariants

- Every export has a contract test consumers can import. New Store adapter means
  `runStoreContract('<name>', mk)` passes before anything else.
- No speculative abstraction. Core does not merge a feature without at least one
  real consumer using it. Promote when a pattern exists in two consumers, or is a
  Store, transport, or CI seam.
- Consumers pin tags. Nothing references core `main`. Bump `version` and tag when
  `src/` changes, or consumers cannot pick the change up.
- `matchPath` is a split-segment matcher, deliberately not `URLPattern`: Android
  WebView support varies. Do not "modernise" it.
- Types are emitted, not written. `prepare` runs `tsc -p tsconfig.build.json` into
  `types/` (gitignored) so consumers can run `tsc --strict`.

## CI

- `ci.yml` calls the shared `JakobMelchard/.github` `node.yml`, then `consumers-e2e.yml`.
- `consumers-e2e.yml` checks out every repo in `consumers.json`, installs core at the
  PR sha, runs that consumer's full suite. It cannot call the shared `node.yml`,
  which only builds its own caller's checkout.
- Hooks come from `JakobMelchard/.github`. `.githooks/pre-commit.local` adds tsc and
  tests locally, because a broken export reaches consumers before their CI runs.

## Gotchas

- `SPEC.md` section 4 is aspirational and does not match the tree. It describes
  `packages/hx/` and an `@core/hx` package name; the real layout is flat `src/` with
  subpath exports from `@jakobmelchard/core`. Trust the tree, not the spec, for layout.
- `SPEC.md` is titled for `lift` because core was extracted from it. It is still the
  design document for both.
