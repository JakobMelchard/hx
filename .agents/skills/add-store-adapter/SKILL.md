---
name: add-store-adapter
description: Add a Store adapter (R2, SAF, KV, …) to JakobMelchard/hx. Use when a new runtime target needs storage.
---
1. `src/store/<name>.js` exporting `<name>Store(...)` returning `Store` from `src/types.js` (list/get/put/del).
2. `list(prefix)`: plain string-prefix, recursive, sorted — same as R2 semantics. `put` must be atomic from a sync tool's view.
3. Test: `runStoreContract('<name>', mk)` from `src/store/contract.js`, run against the real runtime (wrangler dev / emulator), not a mock.
4. Add an `exports` entry; bump minor; follow `promote-pattern` steps 4–6.
