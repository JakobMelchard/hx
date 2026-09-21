# Implementation notes

## P2 — htmx 4.0 transport hook

htmx 4.0.0 fires `htmx:config:request` before every request.  The event detail
carries a `ctx` object; assigning `ctx.fetch` replaces the network layer for
that request.  Confirmed in `htmx.org@4.0.0` source:
`src/htmx.js` line ~340 — `ctx.fetch ||= window.fetch` runs after the event,
so assignment in the listener wins.

`transport.js` uses this: `target.addEventListener('htmx:config:request', e => { e.detail.ctx.fetch = ... })`.

## P6 — SAF plugin: custom Kotlin vs Capawesome File Manager

### Options evaluated

| | Custom 60-line Kotlin | Capawesome File Manager |
|---|---|---|
| LOC (plugin side) | ~60 lines (one `.kt` file) | ~20 lines (just calls their API) |
| LOC (dependency side) | zero | gradle dep + npm package + their plugin API |
| Play-restricted perms | none | none (they also use SAF) |
| Extra npm dep | none | `@capawesome-team/capacitor-file-chooser` or similar |
| Total LOC inc. setup | **~60** | **~150+** |
| Offline/vendored | yes | no |

### Decision: custom Kotlin plugin

The custom plugin (`SafPlugin.kt`) implements four operations with `DocumentFile`
and `takePersistableUriPermission` directly.  Total: ~65 lines including blank
lines and imports.  Capawesome adds an external npm dependency and a gradle
dependency for fewer plugin-side lines but more total code and an additional
trust boundary.  Criterion from SPEC: fewer total LOC + no Play-restricted perms.
Custom plugin wins on both counts.

### SAF URI persistence

`treeUri` is obtained once via `ACTION_OPEN_DOCUMENT_TREE` and persisted in
`localStorage` (`lift_saf_uri`).  `takePersistableUriPermission` ensures the
grant survives process restart.  The JS side stores the string URI and passes it
to `safStore(plugin, uri)` on every boot.
