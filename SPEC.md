# lift — minimal workout app + platform pattern

Replaces Go+HTMX `Health`. First consumer of `core` platform.

## 0. Decisions (fixed)

| Topic           | Decision                                                                                                                                                    | Why                                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| UI              | htmx **4.0** (released 2026-08-28, npm tag `next`), vanilla JS, JSDoc + `tsc --checkJs`                                                                     | v4 is fetch-based; transport override = replace `ctx.fetch` in `htmx:config:request` (~20 LOC). v2 needs XHR hacks. Pin exact version. |
| Server contract | One fn: `handle(req: Request, env: Env) => Promise<Response>`                                                                                               | Web-standard `Request/Response` runs unchanged in Workers, Node ≥18/Bun, and in-page on Android.                                       |
| Storage         | Local-first flat JSON files, Syncthing-synced                                                                                                               | Existing flow.                                                                                                                         |
| Targets         | 3 adapters, 1 handler                                                                                                                                       | see §3                                                                                                                                 |
| Android sync    | Syncthing-Fork (`researchxxl/syncthing-android`); official app discontinued                                                                                 | forum.syncthing.net                                                                                                                    |
| Android FS      | SAF tree URI (user picks folder once, persisted). **Not** `MANAGE_EXTERNAL_STORAGE` (Play rejects), **not** `Download/` or storage root (SAF refuses grant) | capawesome.io scoped-storage article                                                                                                   |

## 1. Data (files are the DB)

```
data/
  exercises/<slug>.json
  routines/<slug>.json
  sessions/<YYYY>/W<ww>/<YYYYMMDDTHHmm>-<deviceId>.json   # ISO week partition
```

```js
/** @typedef {string[]} Tags  // "push", "equip:barbell", "block:hyp-1" — flat, `k:v` by convention only */
/** @typedef {{id:string, name:string, tags:Tags, unit?:'kg'|'lb'|'s'|'m'}} Exercise */
/** @typedef {{reps?:number, load?:number, dur?:number, dist?:number, note?:string}} SetSpec */
/** @typedef {{id:string, name:string, tags:Tags, items:{ex:string, sets:SetSpec[]}[]}} Routine */
/** @typedef {SetSpec & {at:string}} SetDone                    // ISO timestamp */
/** @typedef {{id:string, routine?:string, device:string, start:string, end:string|null,
 *            tags:Tags, entries:{ex:string, sets:SetDone[]}[]}} Session  // active ⇔ end===null */
```

Rules:

- Session = one file, single writer (`device` in name) → Syncthing conflicts impossible by construction.
- Exercises/routines edited by hand/git; app treats as read-mostly. Any `*.sync-conflict-*` file → banner, never auto-merge.
- Week listing = `list("sessions/2026/W38/")` — no index, no scan of history.
- Routine snapshot not copied into session; session stores only what was done. Routine = template.
- Tags: generic `match(tags, query)` — query `a b -c k:v` = all-of, `-` excludes. Same fn for all record types. Zero other tag logic.

## 2. UI — single page `/`

```
[active sessions]  one card per end===null: exercises, set rows, [+set] [finish]
[start ▾ routine | empty]
[tag filter input]  hx-get=/history?week=…&q=… hx-trigger="input changed delay:300ms"
[history]  « W37 | W38 | W39 »   sessions grouped by day, collapsed entries
```

Endpoints (all return HTML fragments; `/` returns full page):

| Method | Path                                  | Effect                                                   |
| ------ | ------------------------------------- | -------------------------------------------------------- |
| GET    | `/`                                   | page                                                     |
| GET    | `/history?week=2026-W38&q=`           | week fragment                                            |
| POST   | `/sessions` `routine=`                | create file, return card                                 |
| POST   | `/sessions/:id/sets` `ex,reps,load,…` | append set, return card                                  |
| POST   | `/sessions/:id/finish`                | set `end`, return card moved to history (`<hx-partial>`) |
| DELETE | `/sessions/:id/sets/:i`               | undo                                                     |

No JSON API. No client state beyond htmx.

## 3. Runtime layout

```js
/** @typedef {{list(prefix:string):Promise<string[]>, get(path:string):Promise<string|null>, put(path:string, body:string):Promise<void>}} Store */
/** @typedef {{store:Store, device:string, now():Date}} Env */
```

| Target              | Entry                                              | Store adapter                                     | Transport                                                                                |
| ------------------- | -------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Desktop / Mac Mini  | `node serve.js` (or `bun`)                         | `fs` on Syncthing folder                          | real HTTP                                                                                |
| Cloudflare Workers  | `export default {fetch:(r,e)=>handle(r,mkEnv(e))}` | R2 (demo/e2e only — Workers can't join Syncthing) | real HTTP                                                                                |
| Android (Capacitor) | `index.html` + bundled `handle`                    | SAF tree URI plugin                               | in-page: `htmx:config:request` → `ctx.fetch = (u,i)=>handle(new Request(abs(u),i), env)` |

`Store` is the only platform seam. Contract test suite runs against all adapters (in-memory, fs, R2 via miniflare/wrangler, SAF via instrumented Android emulator run).

## 4. Platform: `core` repo (distributed, versioned)

```
core/
  packages/hx/            # npm: @core/hx
    handle.js             # tiny router: [method, pattern, fn][]; URLPattern where available
    store/{memory,fs,r2,saf}.js
    store/contract.test.js   # exported; consumers run it against their adapter
    tags.js               # match()
    html.js               # tagged template w/ escaping
    transport.js          # htmx4 in-page ctx.fetch hook
  .github/
    workflows/            # on: workflow_call
      ci.yml              # calls JakobMelchard/.github node.yml
      e2e-playwright.yml  # inputs: start-cmd, url
      worker-deploy.yml   # wrangler
      android-build.yml   # capacitor sync + gradle assemble, emulator tests
      consumers-e2e.yml   # matrix over consumer repos @ core PR sha  ← closes the loop
    actions/              # composite
      cache-gradle/ syncthing-fixture/
  .pre-commit-config.yaml  # prek: JakobMelchard/.githooks pinned by tag, plus local tsc + test
  devcontainer/
    features/hx-app/      # node, wrangler, jdk, android sdk cmdline-tools; published to GHCR (devcontainers/action)
    templates/hx-app/
  agents/skills/
    new-hx-app/SKILL.md          # scaffold consumer from template
    add-store-adapter/SKILL.md
    promote-pattern/SKILL.md     # extract from consumer → core PR
    upgrade-core/SKILL.md
  consumers.json          # [{repo, ref, e2e:"npm run e2e"}]
```

Consumer (`lift`) contains only: `src/handlers/*.js`, `src/views/*.js`, `data/` fixtures, `e2e/`, thin workflow files calling `JakobMelchard/.github/.github/workflows/node.yml@main`, `.devcontainer/devcontainer.json` referencing the feature, `.githooks` → shared hooks from `JakobMelchard/.github`, `.agents/skills` → synced from core (copy on `upgrade-core`, not symlink — agents in sandboxes don't follow external links).

## 5. Self-improving loop

```
consumer hits gap ─► implements locally under src/_candidate/<name>/ + test
        │
        ▼  skill: promote-pattern (agent)
core PR: move code + generalize + contract test + docs + bump minor
        │
        ▼  consumers-e2e.yml: checkout each consumers.json repo, override @core/* and workflow refs to PR sha, run their e2e
all green ─► merge ─► release tag vX.Y ─► Renovate/Dependabot PRs in consumers (npm + github-actions refs)
        │
        ▼  skill: upgrade-core — delete local _candidate copy, rerun e2e
```

Invariants:

- Core never merges without ≥1 real consumer using the feature (no speculative abstractions).
- Promotion criterion: pattern exists in ≥2 consumers, or is a `Store`/transport/CI seam.
- Every core export has a contract test that consumers can import.
- Consumers pin tags; `main` of core never referenced.

## 6. Known risks (verify during impl)

- htmx 4 `ctx.fetch` override is discussed in issue #3664 as extension point; confirm exact ctx shape in 4.0.0 source before building `transport.js`.
- SAF plugin choice (Capawesome File Manager vs custom 60-line Kotlin plugin using `DocumentFile`): SAF I/O per file is slow → week partition keeps listings small; benchmark `list` on 500 files.
- `URLPattern`: Workers + Node 23+ have it; Android WebView version-dependent → router falls back to split-segment matcher. Simpler: always use segment matcher.
- Syncthing-Fork on Android must have folder under a SAF-grantable path (e.g. `Documents/lift/`, not `Download/`).
