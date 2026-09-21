/** Minimal structural types for the R2 surface used here, so core stays dependency-free. */
/** @typedef {{key:string}} R2Obj */
/** @typedef {{objects:R2Obj[], truncated:boolean, cursor?:string}} R2Listing */
/** @typedef {{list(opts:{prefix:string, cursor?:string}):Promise<R2Listing>, get(key:string):Promise<{text():Promise<string>}|null>, put(key:string, body:string):Promise<unknown>, delete(key:string):Promise<unknown>}} R2Bucket */

/** @param {R2Bucket} bucket @returns {import('../types.js').Store} */
export const r2Store = bucket => ({
  async list(p) {
    /** @type {string[]} */ const keys = []
    /** @type {string|undefined} */ let cursor
    // R2 caps a listing at 1000 keys. A single week stays far under, a history
    // query does not, so the cursor has to be followed or results truncate silently.
    for (;;) {
      const r = await bucket.list({ prefix: p, cursor })
      for (const o of r.objects) keys.push(o.key)
      if (!r.truncated) break
      cursor = r.cursor
    }
    // R2 orders by UTF-8 bytes, JS sorts by UTF-16 code units. Sort here so all
    // three adapters agree on ordering for non-ASCII keys.
    return keys.sort()
  },
  get: async k => (await bucket.get(k))?.text() ?? null,
  put: async (k, v) => void (await bucket.put(k, v)),
  del: async k => void (await bucket.delete(k)),
})
