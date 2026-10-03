import { test } from 'node:test'
import assert from 'node:assert/strict'
import { match } from '../src/tags.js'
import { html, raw, esc } from '../src/html.js'
import { router } from '../src/handle.js'
import { memoryStore } from '../src/store/memory.js'

test('tags.match', () => {
  const t = ['push', 'equip:barbell']
  for (const [q, want] of /** @type {[string,boolean][]} */ ([['', true], ['push', true], ['push equip:barbell', true], ['pull', false], ['-push', false], ['push -pull', true]]))
    assert.equal(match(t, q), want, q)
})

test('html escapes, nests, raw opt-out', () => {
  assert.equal(String(html`<p>${'<b>'}${[html`<i>${'&'}</i>`]}${raw('<br>')}${null}${false}${0}</p>`), '<p>&#60;b&#62;<i>&#38;</i><br>0</p>')
})

test('esc escapes quotes too', () => {
  assert.equal(esc(`"a" 'b'`), '&#34;a&#34; &#39;b&#39;')
  assert.equal(String(html`<input value="${`"x"`}">`), '<input value="&#34;x&#34;">')
})

test('router', async () => {
  const env = { store: memoryStore(), device: 't', now: () => new Date(0) }
  const h = router([
    ['GET', '/s/:id', c => html`${c.params.id}:${c.form.get('q')}`],
    ['POST', '/s/:id', c => new Response(c.form.get('a'), { status: 201 })],
  ])
  const r = await h(new Request('http://x/s/a%20b?q=1'), env)
  assert.equal(await r.text(), 'a b:1')
  assert.match(r.headers.get('content-type') ?? '', /text\/html/)
  const p = await h(new Request('http://x/s/1', { method: 'POST', body: new URLSearchParams({ a: 'z' }) }), env)
  assert.equal(p.status, 201); assert.equal(await p.text(), 'z')
  assert.equal((await h(new Request('http://x/s/1', { method: 'PUT' }), env)).status, 405)
  assert.equal((await h(new Request('http://x/nope'), env)).status, 404)
})
