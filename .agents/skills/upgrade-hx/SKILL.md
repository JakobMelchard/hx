---
name: upgrade-hx
description: Upgrade a consumer repo to a newer JakobMelchard/hx tag and resync org skills. Use on Renovate PRs for hx or when asked to update hx.
---
1. `npm i github:JakobMelchard/hx#<tag>`.
2. `agents-sync` (JakobMelchard/bin) refreshes `.agents/skills` from `JakobMelchard/.agents` — copied, not symlinked: sandboxed agents do not follow links out of the repo. Skills no longer ship inside the hx package.
3. Read hx CHANGELOG/PR bodies since the old tag; apply migrations; delete any `src/_candidate/*` now provided by hx.
4. `npx tsc && npm test && npm run e2e`. Commit `chore: hx <old>→<tag>`.
