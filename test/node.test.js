import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { nodeListener } from '../src/node.js'
import { router } from '../src/handle.js'
import { memoryStore } from '../src/store/memory.js'
import { isConflict } from '../src/store/conflict.js'
import { isConflict as viaContract } from '../src/store/contract.js'

test('nodeListener: routes, form bodies, assets, errors', async t => {
  const env = { store: memoryStore(), device: 't', now: () => new Date(0) }
  const handle = router([
    ['GET', '/s/:id', c => `get ${c.params.id}`],
    ['POST', '/s/:id', c => `post ${c.form.get('a')}`],
    ['GET', '/boom', () => { throw new Error('boom') }],
  ])
  /** @type {Record<string, [URL, Record<string,string>]>} */
  const assets = { '/a.txt': [new URL('../package.json', import.meta.url), { 'content-type': 'application/json' }] }
  const server = createServer(nodeListener(handle, env, { assets }))
  await new Promise(r => server.listen(0, '127.0.0.1', () => r(undefined)))
  t.after(() => server.close())
  const base = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (server.address()).port}`
  const origError = console.error
  console.error = () => {}
  t.after(() => { console.error = origError })

  const g = await fetch(`${base}/s/a%20b`)
  assert.equal(await g.text(), 'get a b')
  assert.match(g.headers.get('content-type') ?? '', /text\/html/)
  assert.equal(await (await fetch(`${base}/s/1`, { method: 'POST', body: new URLSearchParams({ a: 'z' }) })).text(), 'post z')

  const a = await fetch(`${base}/a.txt`)
  assert.equal(a.headers.get('content-type'), 'application/json')
  assert.equal(await a.text(), await readFile(new URL('../package.json', import.meta.url), 'utf8'))

  assert.equal((await fetch(`${base}/nope`)).status, 404)
  const b = await fetch(`${base}/boom`)
  assert.equal(b.status, 500)
  assert.equal((await fetch(`${base}/s/2`)).status, 200, 'server survives a throwing handler')
})

test('store/conflict is Workers-safe and matches contract re-export', async () => {
  assert.equal(isConflict('a/b.sync-conflict-20260101-x.json'), true)
  assert.equal(isConflict('a/b.json'), false)
  assert.equal(viaContract, isConflict)
  assert.doesNotMatch(await readFile(new URL('../src/store/conflict.js', import.meta.url), 'utf8'), /\bimport\b/)
})
