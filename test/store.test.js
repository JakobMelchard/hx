import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runStoreContract } from '../src/store/contract.js'
import { memoryStore } from '../src/store/memory.js'
import { fsStore } from '../src/store/fs.js'

runStoreContract('memory', async () => memoryStore())
// one level down, so a key that leaves the root still lands in this test's own temp dir
runStoreContract('fs', async () => fsStore(join(await mkdtemp(join(tmpdir(), 'store-')), 'data')))

test('fs store: keys stay inside the root', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'store-')), out = join(dir, 'out.json'), sib = join(dir, 'data-old', 'x.json')
  await mkdir(join(dir, 'data-old'))
  for (const f of [out, sib]) await writeFile(f, 'keep')
  const s = fsStore(join(dir, 'data'))
  await s.put('in.json', '1')
  // the last one shares the root's name as a string prefix
  for (const k of ['../out.json', 'a/../../out.json', '../data-old/x.json']) {
    assert.equal(await s.get(k), null, k)
    await assert.rejects(s.put(k, 'x'), /outside store root/, k)
    await assert.rejects(s.del(k), /outside store root/, k)
  }
  for (const p of ['../', '../out', '../data-old/', 'a/../../']) assert.deepEqual(await s.list(p), [], p)
  for (const f of [out, sib]) assert.equal(await readFile(f, 'utf8'), 'keep')
  await s.put('a/..b.json', '2')
  assert.equal(await s.get('a/../in.json'), '1')
  assert.deepEqual(await s.list(''), ['a/..b.json', 'in.json'])
})
