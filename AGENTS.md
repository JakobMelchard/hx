# hx — htmx 4 platform for Node, Workers, and in-page apps

Distributed as an npm package (`@jakobmelchard/hx`). JSDoc only, no TypeScript syntax; `tsc --checkJs` is the type gate.

## Commands

```sh
npm ci
npx tsc          # type gate, also run by the local tsc hook
npm run lint     # eslint, org config from @jakobmelchard/config
npm run format   # prettier, org config; CI runs format:check
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
- `src/node.js` `nodeListener(handle, env, {assets})` for `node:http`: fixed asset map, handler errors become 500
- `src/store/{memory,fs,kv,r2,saf}.js` Store adapters, `src/store/contract.js` `runStoreContract`, `src/store/conflict.js` `isConflict` (import-free, Workers-safe)
- `src/types.js` shared typedefs
- Agent skills are kept outside this repo; nothing ships inside this package
- `tsconfig.json` extends `@jakobmelchard/config/tsconfig` (the `JakobMelchard/.config` package, pinned
  to a tag in `package.json`) and only adds `include`; `.editorconfig`, `.gitleaks.toml` are copied by `config-sync`
- `.devcontainer/` this repo's dev environment
- `SPEC.md` design, `PROMPTS.md` roadmap as one PR per prompt

## Invariants

- Every export has a contract test consumers can import. New Store adapter means
  `runStoreContract('<name>', mk)` passes before anything else.
- No speculative abstraction. Core does not merge a feature without at least one
  real consumer using it. Promote when a pattern exists in two consumers, or is a
  Store, transport, or CI seam.
- Consumers install released versions from npmjs.org. Nothing references hx `main`.
  Releases come from release-please: merging its release PR tags `v<version>`, `publish.yml`
  stages it on npm, and the owner approves it (2FA). Use conventional commit types so `src/`
  changes produce a release, or consumers cannot pick the change up.
- `matchPath` is a split-segment matcher, deliberately not `URLPattern`: Android
  WebView support varies. Do not "modernise" it.
- The router answers before any route runs: 400 for a path with a malformed escape, 403 for a
  non-GET/HEAD request the browser marks `Sec-Fetch-Site: cross-site`, or, without that header,
  whose `Origin` host is not the request host. Requests with neither header pass (curl, tests,
  the in-page transport). A param is one segment: a value decoding to contain `/` or `\` is no match.
- `fsStore` keys never leave the root: `get` null, `list` empty, `put` and `del` reject.
- Types are emitted, not written. `prepare` runs `tsc -p tsconfig.build.json` into
  `types/` (gitignored) so consumers can run `tsc --strict`.

## CI

- `ci.yml` calls the shared `JakobMelchard/.github` `node.yml` (lint and format check, tsc, tests,
  e2e). Shared workflows are pinned by sha; Renovate bumps them.
- There is no consumer matrix in CI. Consumers pin released versions and test them in their own
  CI when Renovate bumps hx.
- Hooks: prek from `.pre-commit-config.yaml` (`JakobMelchard/.githooks` pinned by tag, Renovate bumps it) plus
  local `tsc` and `test` hooks: hx is a dependency, so a broken export must fail before it is released.

## Gotchas

- `SPEC.md` section 4 is aspirational and does not match the tree. It describes
  `packages/hx/` and an `@hx/hx` package name; the real layout is flat `src/` with
  subpath exports from `@jakobmelchard/hx`. Trust the tree, not the spec, for layout.
- `SPEC.md` is titled for `lift`, the app hx was extracted from. It is still the design document for both.
