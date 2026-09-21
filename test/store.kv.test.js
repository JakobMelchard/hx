import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runStoreContract } from '../src/store/contract.js'
import { kvStore } from '../src/store/kv.js'

/**
 * In-memory double of the KV subset kvStore uses. `pageSize` forces the cursor
 * path that a real namespace only takes past 1000 keys.
 * @param {number} pageSize
 */
const fakeNamespace = (pageSize = 1000) => {
  /** @type {Map<string,string>} */ const m = new Map()
  return {
    /** @param {{prefix:string, cursor?:string}} o */
    async list(o) {
      const all = [...m.keys()].filter(k => k.startsWith(o.prefix)).sort()
      const start = o.cursor ? Number(o.cursor) : 0
      const end = start + pageSize
      const list_complete = end >= all.length
      return { keys: all.slice(start, end).map(name => ({ name })), list_complete, cursor: list_complete ? undefined : String(end) }
    },
    /** @param {string} k */
    async get(k) { return m.get(k) ?? null },
    /** @param {string} k @param {string} v */
    async put(k, v) { m.set(k, v) },
    /** @param {string} k */
    async delete(k) { m.delete(k) },
  }
}

runStoreContract('kv', async () => kvStore(fakeNamespace()))
runStoreContract('kv, two-key pages', async () => kvStore(fakeNamespace(2)))

test('kv list follows the cursor past the page limit', async () => {
  const s = kvStore(fakeNamespace(3))
  const keys = Array.from({ length: 10 }, (_, i) => `s/2026/W01/${String(i).padStart(2, '0')}.json`)
  for (const k of keys) await s.put(k, '{}')
  assert.deepEqual(await s.list('s/'), keys)
})
