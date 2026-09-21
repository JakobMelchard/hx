/** Minimal structural types for the KV surface used here, so core stays dependency-free. */
/** @typedef {{name:string}} KVKey */
/** @typedef {{keys:KVKey[], list_complete:boolean, cursor?:string}} KVListing */
/** @typedef {{list(opts:{prefix:string, cursor?:string}):Promise<KVListing>, get(key:string):Promise<string|null>, put(key:string, value:string):Promise<unknown>, delete(key:string):Promise<unknown>}} KVNamespace */

/**
 * KV is eventually consistent: a `put` is not guaranteed to show up in a `list`
 * or in a `get` from another colo for up to a minute. Prefer r2Store where a
 * write has to be visible to the next request.
 * @param {KVNamespace} ns @returns {import('../types.js').Store}
 */
export const kvStore = ns => ({
  async list(p) {
    /** @type {string[]} */ const keys = []
    /** @type {string|undefined} */ let cursor
    // KV caps a listing at 1000 keys, so the cursor has to be followed or a
    // large prefix truncates silently.
    for (;;) {
      const r = await ns.list({ prefix: p, cursor })
      for (const k of r.keys) keys.push(k.name)
      if (r.list_complete) break
      cursor = r.cursor
    }
    // KV orders by UTF-8 bytes, JS sorts by UTF-16 code units. Sort here so all
    // adapters agree on ordering for non-ASCII keys.
    return keys.sort()
  },
  get: k => ns.get(k),
  put: async (k, v) => void (await ns.put(k, v)),
  del: async k => void (await ns.delete(k)),
})
