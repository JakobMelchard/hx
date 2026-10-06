import { readFile } from 'node:fs/promises'

/**
 * `node:http` listener for an hx handler. Assets come from a fixed map, so no request path
 * reaches the filesystem. Any failure (handler, asset read, body) becomes a logged 500
 * instead of a dropped request or an unhandled rejection.
 * @param {(req:Request, env:import('./types.js').Env) => Promise<Response>} handle
 * @param {import('./types.js').Env} env
 * @param {{assets?: Record<string, [file:URL, headers:Record<string,string>]>}} [opts]
 * @returns {(req:import('node:http').IncomingMessage, res:import('node:http').ServerResponse) => Promise<void>}
 */
export const nodeListener =
  (handle, env, { assets = {} } = {}) =>
  async (req, res) => {
    try {
      const asset = assets[req.url ?? '']
      if (asset) {
        const f = await readFile(asset[0])
        return void res.writeHead(200, asset[1]).end(f)
      }
      const chunks = []
      for await (const c of req) chunks.push(c)
      const r = await handle(
        new Request(`http://${req.headers.host}${req.url}`, {
          method: req.method,
          headers: /** @type {Record<string,string>} */ (req.headers),
          body: chunks.length ? Buffer.concat(chunks) : undefined,
        }),
        env,
      )
      const body = Buffer.from(await r.arrayBuffer())
      // Object.fromEntries keeps only the last set-cookie; node takes an array for several
      /** @type {Record<string, string|string[]>} */ const headers = Object.fromEntries(r.headers)
      const cookies = r.headers.getSetCookie()
      if (cookies.length) headers['set-cookie'] = cookies
      res.writeHead(r.status, headers).end(body)
    } catch (e) {
      console.error(e)
      if (res.headersSent) res.destroy()
      else res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end('internal error')
    }
  }
