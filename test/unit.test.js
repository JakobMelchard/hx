import { test } from 'node:test'
import assert from 'node:assert/strict'
import { match } from '../src/tags.js'
import { html, raw, esc } from '../src/html.js'
import { router } from '../src/handle.js'
import { memoryStore } from '../src/store/memory.js'

test('tags.match', () => {
  const t = ['push', 'equip:barbell']
  for (const [q, want] of /** @type {[string,boolean][]} */ ([
    ['', true],
    ['push', true],
    ['push equip:barbell', true],
    ['pull', false],
    ['-push', false],
    ['push -pull', true],
  ]))
    assert.equal(match(t, q), want, q)
})

test('html escapes, nests, raw opt-out', () => {
  assert.equal(
    String(html`<p>${'<b>'}${[html`<i>${'&'}</i>`]}${raw('<br>')}${null}${false}${0}</p>`),
    '<p>&#60;b&#62;<i>&#38;</i><br>0</p>',
  )
})

test('esc escapes quotes too', () => {
  assert.equal(esc(`"a" 'b'`), '&#34;a&#34; &#39;b&#39;')
  assert.equal(String(html`<input value="${`"x"`}" />`), '<input value="&#34;x&#34;" />')
  // Unquoted attributes are not covered: space and `=` pass through, so a value adds attributes.
  assert.equal(String(html`<input value=${'x onfocus=f()'} />`), '<input value=x onfocus=f() />')
})

test('router', async () => {
  const env = { store: memoryStore(), device: 't', now: () => new Date(0) }
  const h = router([
    ['GET', '/s/:id', (c) => html`${c.params.id}:${c.form.get('q')}`],
    ['POST', '/s/:id', (c) => new Response(c.form.get('a'), { status: 201 })],
  ])
  const r = await h(new Request('http://x/s/a%20b?q=1'), env)
  assert.equal(await r.text(), 'a b:1')
  assert.match(r.headers.get('content-type') ?? '', /text\/html/)
  const p = await h(
    new Request('http://x/s/1', { method: 'POST', body: new URLSearchParams({ a: 'z' }) }),
    env,
  )
  assert.equal(p.status, 201)
  assert.equal(await p.text(), 'z')
  assert.equal((await h(new Request('http://x/s/1', { method: 'PUT' }), env)).status, 405)
  assert.equal((await h(new Request('http://x/nope'), env)).status, 404)
})

test('router: a param is one path segment, a malformed escape is 400', async () => {
  const env = { store: memoryStore(), device: 't', now: () => new Date(0) }
  const h = router([['GET', '/s/:id', (c) => new Response(c.params.id)]])
  const get = (/** @type {string} */ p) => h(new Request(`http://x/s/${p}`), env)
  for (const p of ['..%2Fx', 'a%2Fb', 'a%2fb', '..%5Cx', '%2E%2E%2Fx'])
    assert.equal((await get(p)).status, 404, p)
  for (const p of ['%zz', '%', '%C3']) assert.equal((await get(p)).status, 400, p)
  // the URL parser drops dot segments, encoded or not, before the router sees them
  for (const p of ['..', '%2e%2e', '.%2E']) assert.equal((await get(p)).status, 404, p)
  assert.equal(await (await get('a..b%20c')).text(), 'a..b c')
})

test('router: writes from another site are 403', async () => {
  const env = { store: memoryStore(), device: 't', now: () => new Date(0) }
  const h = router([
    ['GET', '/s', () => 'ok'],
    ['POST', '/s', () => 'ok'],
    ['DELETE', '/s', () => 'ok'],
  ])
  const send = (/** @type {string} */ method, /** @type {Record<string,string>} */ headers) =>
    h(new Request('http://app.test:8080/s', { method, headers }), env)
  for (const [headers, want] of /** @type {[Record<string,string>, number][]} */ ([
    [{}, 200], // curl, tests, in-page transport
    [{ 'sec-fetch-site': 'same-origin' }, 200],
    [{ 'sec-fetch-site': 'same-site' }, 200],
    [{ 'sec-fetch-site': 'none' }, 200],
    [{ 'sec-fetch-site': 'cross-site' }, 403],
    [{ 'sec-fetch-site': 'cross-site', origin: 'http://app.test:8080' }, 403],
    // a proxy may rewrite Host; the browser's own verdict wins over the Origin comparison
    [{ 'sec-fetch-site': 'same-origin', origin: 'https://front.test' }, 200],
    [{ origin: 'http://app.test:8080' }, 200],
    [{ origin: 'https://app.test:8080' }, 200], // TLS ends at a proxy, the host is what counts
    [{ origin: 'http://other.test:8080' }, 403],
    [{ origin: 'http://app.test' }, 403],
    [{ origin: 'null' }, 403],
  ])) {
    assert.equal((await send('POST', headers)).status, want, JSON.stringify(headers))
    assert.equal((await send('DELETE', headers)).status, want, JSON.stringify(headers))
    assert.equal((await send('GET', headers)).status, 200, JSON.stringify(headers))
  }
  // only GET and HEAD themselves are exempt, not a method that contains them
  const forget = router([['FORGET', '/s', () => 'ok']])
  assert.equal(
    (
      await forget(
        new Request('http://app.test/s', {
          method: 'FORGET',
          headers: { 'sec-fetch-site': 'cross-site' },
        }),
        env,
      )
    ).status,
    403,
  )
})
