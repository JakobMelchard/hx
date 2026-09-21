/** Minimal structural types for the KV surface used here, so hx stays dependency-free. */
/** @typedef {{name:string}} KVKey */
/** @typedef {{keys:KVKey[], list_complete:boolean, cursor?:string}} KVListing */
/** @typedef {{list(opts:{prefix:string, cursor?:string}):Promise<KVListing>, get(key:string):Promise<string|null>, put(key:string, value:string):Promise<unknown>, delete(key:string):Promise<unknown>}} KVNamespace */

/**
 * `get` is read-your-write within a colo, but `list` lags by up to a minute, so
 * a freshly written key can be missing from the next listing. Prefer r2Store
 * when a write has to show up in a listing immediately.
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
