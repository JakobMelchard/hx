import { test } from 'node:test'
import assert from 'node:assert/strict'

export { isConflict } from './conflict.js'

/** Every Store adapter must pass this. @param {string} name @param {() => Promise<import('../types.js').Store>} mk */
export const runStoreContract = (name, mk) => test(`store contract: ${name}`, async t => {
  await t.test('missing get → null', async () => assert.equal(await (await mk()).get('nope/x.json'), null))
  await t.test('put/get roundtrip, unicode', async () => {
    const s = await mk(); await s.put('a/b/ü.json', '{"x":"ß"}')
    assert.equal(await s.get('a/b/ü.json'), '{"x":"ß"}')
  })
  await t.test('overwrite', async () => {
    const s = await mk(); await s.put('o.json', '1'); await s.put('o.json', '2')
    assert.equal(await s.get('o.json'), '2')
  })
  await t.test('list: recursive, sorted, prefix-filtered', async () => {
    const s = await mk()
    for (const k of ['s/2026/W02/b.json', 's/2026/W01/a.json', 's/2026/W10/c.json', 'x/y.json']) await s.put(k, '{}')
    assert.deepEqual(await s.list('s/2026/W0'), ['s/2026/W01/a.json', 's/2026/W02/b.json'])
    assert.deepEqual(await s.list('s/'), ['s/2026/W01/a.json', 's/2026/W02/b.json', 's/2026/W10/c.json'])
  })
  await t.test('list absent → []', async () => assert.deepEqual(await (await mk()).list('none/'), []))
  await t.test('del', async () => {
    const s = await mk(); await s.put('d.json', '1'); await s.del('d.json'); await s.del('d.json')
    assert.equal(await s.get('d.json'), null)
  })
  // Flat keyspaces keep `..` as plain text, path-backed ones refuse the key. Neither may store it where list cannot see it.
  await t.test('.. in a key: refused, or kept as an ordinary key', async () => {
    const s = await mk(), k = '../up.json'
    const kept = await s.put(k, '1').then(() => true, () => false)
    assert.deepEqual(await s.list(''), kept ? [k] : [])
    assert.equal(await s.get(k), kept ? '1' : null)
  })
})
