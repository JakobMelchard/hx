// Proves the Android seam: real htmx 4 in Chromium, zero network, requests served by in-page router.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const src = async (/** @type {string} */ p) => readFile(new URL(p, import.meta.url), 'utf8')
const mod = (/** @type {string} */ code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`

test('htmx 4 local transport', async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  try {
    const page = await browser.newPage()
    await page.route('http://app.local/**', (r) =>
      r.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }),
    )
    await page.goto('http://app.local/')
    let net = 0
    page.on('request', (r) => {
      if (r.url().startsWith('http://app.local/') && r.url() !== 'http://app.local/') net++
    })
    const html = mod(await src('../../src/html.js'))
    const handle = mod((await src('../../src/handle.js')).replace('./html.js', html))
    const transport = mod(await src('../../src/transport.js'))
    await page.addScriptTag({ content: await src('../../node_modules/htmx.org/dist/htmx.js') })
    await page.evaluate(
      async ([handle, transport]) => {
        const { router } = await import(handle)
        const { installLocalTransport } = await import(transport)
        const h = router([
          ['POST', '/echo', (/** @type {any} */ c) => `<b id=out>${c.form.get('v')}</b>`],
        ])
        installLocalTransport(h, { store: null, device: 'e2e', now: () => new Date() })
        document.body.innerHTML =
          '<form hx-post="/echo" hx-target="#t" hx-swap="innerHTML"><input name=v value=hi><button>go</button></form><div id=t></div>'
        // @ts-ignore
        htmx.process(document.body)
      },
      [handle, transport],
    )
    await page.click('button')
    assert.equal(await page.textContent('#out', { timeout: 3000 }), 'hi')
    assert.equal(net, 0)
  } finally {
    await browser.close()
  }
})
