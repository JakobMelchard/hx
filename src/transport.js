/**
 * Serve htmx requests in-page (Android/offline). htmx 4.0.0 calls `ctx.fetch ||= window.fetch`
 * after `htmx:config:request`, so assigning it there replaces the network.
 * @param {(req:Request, env:import('./types.js').Env) => Promise<Response>} handle
 * @param {import('./types.js').Env} env
 * @param {EventTarget} [target]
 */
export const installLocalTransport = (handle, env, target = document) =>
  target.addEventListener('htmx:config:request', (e) => {
    ;/** @type {any} */ (e).detail.ctx.fetch = (
      /** @type {string} */ url,
      /** @type {RequestInit} */ init,
    ) => handle(new Request(new URL(url, location.href), init), env)
  })
