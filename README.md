# core

Platform for minimal htmx 4 + JSDoc apps that run as Node server, Cloudflare Worker, or in-page (Android/offline).

- `src/handle.js` router `(Request, Env) → Response` · `src/transport.js` in-page htmx transport · `src/store/*` Store adapters + `runStoreContract` · `src/html.js` · `src/tags.js`
- CI: calls the shared `JakobMelchard/.github` `node.yml`. `consumers-e2e.yml` (core-only) runs every repo in `consumers.json` against a core sha
- Hooks: shared set from `JakobMelchard/.github`, plus `.githooks/pre-commit.local` for tsc + tests
- `templates/hx-app/` devcontainer · `agents/skills/` promote-pattern, upgrade-core, new-hx-app, add-store-adapter
- Types: JSDoc only; `prepare` emits `.d.ts` into `types/` (gitignored) so consumers can run `tsc --strict`. Bump the version and tag when `src/` changes — consumers pin a tag.
- Design: `SPEC.md` · roadmap prompts: `PROMPTS.md`

Status: P1, P2, P5a (R2 store), core of P7/P8 done. Next: rest of P5 (lift `worker.js` + `wrangler.toml` on the R2 binding), P6 (SAF store + Capacitor).

```
npm ci && npx tsc && npm test && npm run e2e   # e2e: CHROMIUM_PATH=/path/to/chrome if needed
```
