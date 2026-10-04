import { Raw } from './html.js'

/** @typedef {{req:Request, env:import('./types.js').Env, params:Record<string,string>, url:URL, form:URLSearchParams}} Ctx */
/** @typedef {[method:string, pattern:string, fn:(c:Ctx)=>Promise<Raw|string|Response>|Raw|string|Response]} Route */

/**
 * Segment matcher, not URLPattern: Android WebView support varies. A param is one segment: a
 * value that decodes to contain a separator does not match.
 * @param {string} pat @param {string} path
 */
const matchPath = (pat, path) => {
  const a = pat.split('/'), b = path.split('/')
  if (a.length !== b.length) return null
  /** @type {Record<string,string>} */ const p = {}
  return a.every((s, i) => s[0] === ':' ? !/[/\\]/.test(p[s.slice(1)] = decodeURIComponent(b[i])) : s === b[i]) ? p : null
}

/** @param {Route[]} routes @returns {(req:Request, env:import('./types.js').Env) => Promise<Response>} */
export const router = routes => async (req, env) => {
  const url = new URL(req.url)
  // A path that decodes as a whole decodes per segment, so matchPath cannot throw past this.
  try { decodeURIComponent(url.pathname) } catch { return new Response('bad request', { status: 400 }) }
  // Writes must come from this site. Browsers say so in Sec-Fetch-Site; where that is missing
  // (plain http off localhost) Origin must name the request host. Callers that send neither
  // (curl, tests, the in-page transport) pass.
  const site = req.headers.get('sec-fetch-site'), origin = req.headers.get('origin')
  if (!/GET|HEAD/.test(req.method) && (site ? site === 'cross-site' : origin !== null && origin.split('://')[1] !== url.host))
    return new Response('cross-site request', { status: 403 })
  let allowed = false
  for (const [m, pat, fn] of routes) {
    const params = matchPath(pat, url.pathname)
    if (!params) continue
    allowed = true
    if (m !== req.method) continue
    const form = /GET|DELETE/.test(m) ? url.searchParams : new URLSearchParams(await req.text())
    const out = await fn({ req, env, params, url, form })
    return out instanceof Response ? out : new Response(String(out), { headers: { 'content-type': 'text/html; charset=utf-8' } })
  }
  return new Response(allowed ? 'method not allowed' : 'not found', { status: allowed ? 405 : 404 })
}
