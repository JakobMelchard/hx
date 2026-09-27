---
name: new-hx-app
description: Scaffold a new htmx+JSDoc consumer app on JakobMelchard/hx (file-based data, Store adapters, shared CI, devcontainer). Use when starting a new app of this kind.
---
Reference consumer: JakobMelchard/lift. Copy its shape, not its domain.

1. `org-repo new <name> --template hx-app` (JakobMelchard/bin). That creates the private repo, applies the devcontainer template from `JakobMelchard/.devcontainer`, vendors hooks (`.githooks`), configs (`.config`) and skills (`.agents`), and writes `.github/workflows/ci.yml` calling `node.yml@main` with `e2e-cmd: npm run e2e` and `browsers: true`.
2. Layout: `src/{app.js,views.js,paths.js,types.js}`, `serve.js`, `data/` fixtures, `test/*.test.js`, `e2e/*.test.js`. `app.js` exports `handle = router([...])` only. All I/O via `env.store`. One file per record, single writer.
3. Unit tests drive `handle` with `memoryStore`; e2e drives `serve.js` on a temp copy of `data/`.
4. Pin `@jakobmelchard/hx` to a tag: `npm i github:JakobMelchard/hx#v<x.y.z>`.
5. Register `{repo, ref}` in hx `consumers.json` (PR to hx) so `consumers-e2e` runs this app against every hx change.
