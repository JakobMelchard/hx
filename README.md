# hx

Library for minimal htmx 4 + JSDoc apps that run as a Node server, a Cloudflare Worker, or in-page (Android/offline).

```sh
npm i @jakobmelchard/hx
```

- `@jakobmelchard/hx/handle` router `(Request, Env) → Response`, with same-origin checks on non-GET requests
- `@jakobmelchard/hx/html` tagged template with escaping · `@jakobmelchard/hx/tags` `match()`
- `@jakobmelchard/hx/transport` in-page htmx transport
- `@jakobmelchard/hx/node` `nodeListener` for `node:http`
- `@jakobmelchard/hx/store/{memory,fs,kv,r2,saf}` Store adapters · `store/contract` `runStoreContract` · `store/conflict` `isConflict`
- `@jakobmelchard/hx/types` shared typedefs (`Store`, `Env`)
- Types: JSDoc only; the package ships emitted `.d.ts` so consumers can run `tsc --strict`

Design notes and contributor docs are in the [repository](https://github.com/JakobMelchard/hx).

```sh
npm ci && npx tsc && npm test && npm run e2e   # e2e: CHROMIUM_PATH=/path/to/chrome if needed
```
