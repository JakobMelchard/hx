import { readFile } from 'node:fs/promises'

/**
 * `node:http` listener for an hx handler. Assets come from a fixed map, so no request path
 * reaches the filesystem. A throwing handler becomes a 500 instead of a dropped request.
 * @param {(req:Request, env:import('./types.js').Env) => Promise<Response>} handle
 * @param {import('./types.js').Env} env
 * @param {{assets?: Record<string, [file:URL, headers:Record<string,string>]>}} [opts]
 * @returns {(req:import('node:http').IncomingMessage, res:import('node:http').ServerResponse) => Promise<void>}
 */
export const nodeListener = (handle, env, { assets = {} } = {}) => async (req, res) => {
  const asset = assets[req.url ?? '']
  if (asset) return void res.writeHead(200, asset[1]).end(await readFile(asset[0]))
  const chunks = []
  for await (const c of req) chunks.push(c)
  const r = await handle(new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method, headers: /** @type {Record<string,string>} */ (req.headers), body: chunks.length ? Buffer.concat(chunks) : undefined,
  }), env).catch(e => (console.error(e), new Response(String(e), { status: 500 })))
  res.writeHead(r.status, Object.fromEntries(r.headers)).end(Buffer.from(await r.arrayBuffer()))
}
