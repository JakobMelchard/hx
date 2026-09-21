import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runStoreContract } from '../src/store/contract.js'
import { r2Store } from '../src/store/r2.js'

/**
 * In-memory double of the R2 subset r2Store uses. `pageSize` forces the cursor
 * path that a real bucket only takes past 1000 keys.
 * @param {number} pageSize
 */
const fakeBucket = (pageSize = 1000) => {
  /** @type {Map<string,string>} */ const m = new Map()
  return {
    /** @param {{prefix:string, cursor?:string}} o */
    async list(o) {
      const all = [...m.keys()].filter(k => k.startsWith(o.prefix)).sort()
      const start = o.cursor ? Number(o.cursor) : 0
      const end = start + pageSize
      const truncated = end < all.length
      return { objects: all.slice(start, end).map(key => ({ key })), truncated, cursor: truncated ? String(end) : undefined }
    },
    /** @param {string} k */
    async get(k) { const v = m.get(k); return v === undefined ? null : { text: async () => v } },
    /** @param {string} k @param {string} v */
    async put(k, v) { m.set(k, v) },
    /** @param {string} k */
    async delete(k) { m.delete(k) },
  }
}

runStoreContract('r2', async () => r2Store(fakeBucket()))
runStoreContract('r2, two-key pages', async () => r2Store(fakeBucket(2)))

test('r2 list follows the cursor past the page limit', async () => {
  const s = r2Store(fakeBucket(3))
  const keys = Array.from({ length: 10 }, (_, i) => `s/2026/W01/${String(i).padStart(2, '0')}.json`)
  for (const k of keys) await s.put(k, '{}')
  assert.deepEqual(await s.list('s/'), keys)
})
